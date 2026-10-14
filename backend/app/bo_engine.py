import time
import json
import uuid
import random
import threading
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern, WhiteKernel, ConstantKernel
from scipy.stats import norm

from backend.app.compiler import PASS_CATALOG, PASS_IDS
from backend.app.executor import compile_and_benchmark
from backend.app.database import save_experiment, record_evaluation, update_experiment_status
from backend.app.config import settings

class BayesianOptimizationEngine:
    """
    Bayesian Optimization Engine for Compiler Pass Tuning.
    Uses Gaussian Process Regression with Matérn 5/2 covariance kernel
    and Expected Improvement / UCB acquisition policies.
    """
    def __init__(self):
        self.active_experiment_id: Optional[str] = None
        self.state: str = "idle" # "idle", "running", "paused", "stopped", "completed", "failed"
        self.worker_thread: Optional[threading.Thread] = None
        self.stop_event = threading.Event()
        self.pause_event = threading.Event()
        self.events_log: List[Dict[str, Any]] = []
        self.current_progress: Dict[str, Any] = {
            "experiment_id": None,
            "status": "idle",
            "evaluations_completed": 0,
            "total_budget": 0,
            "best_time_ms": None,
            "best_pass_ids": [],
            "speedup_vs_o3": None,
            "latest_log": ""
        }

    def log_event(self, level: str, message: str, meta: Optional[Dict[str, Any]] = None):
        entry = {
            "timestamp": datetime.utcnow().strftime("%H:%M:%S.%f")[:-3],
            "level": level,
            "message": message,
            "meta": meta or {}
        }
        self.events_log.append(entry)
        if len(self.events_log) > 500:
            self.events_log = self.events_log[-500:]
        self.current_progress["latest_log"] = message

    def compute_acquisition(
        self,
        gp: GaussianProcessRegressor,
        candidates: np.ndarray,
        best_y: float,
        strategy: str = "ei",
        xi: float = 0.01,
        kappa: float = 2.576
    ) -> np.ndarray:
        """Computes acquisition utility for candidate pass masks."""
        mu, sigma = gp.predict(candidates, return_std=True)
        sigma = np.maximum(sigma, 1e-9)

        if strategy == "ei":
            # For minimization: improvement is best_y - mu - xi
            diff = best_y - mu - xi
            z = diff / sigma
            utility = diff * norm.cdf(z) + sigma * norm.pdf(z)
            return np.maximum(0.0, utility)

        elif strategy == "ucb":
            # Lower confidence bound for minimization (negated to maximize utility)
            # utility = -(mu - kappa * sigma)
            return -mu + kappa * sigma

        elif strategy == "pi":
            diff = best_y - mu - xi
            z = diff / sigma
            return norm.cdf(z)

        else:
            return -mu

    def propose_candidate(
        self,
        gp: Optional[GaussianProcessRegressor],
        X_observed: List[List[int]],
        y_observed: List[float],
        best_mask: List[int],
        strategy: str = "ei",
        xi: float = 0.01,
        kappa: float = 2.576,
        pool_size: int = 400
    ) -> Tuple[List[int], float]:
        """Proposes the next binary pass vector maximizing the acquisition function."""
        D = len(PASS_IDS)

        # Generate candidate pool
        candidates = []

        # 1. Hamming distance 1 and 2 neighbors around incumbent
        for i in range(D):
            nbr1 = list(best_mask)
            nbr1[i] = 1 - nbr1[i]
            candidates.append(nbr1)
            for j in range(i + 1, min(i + 4, D)):
                nbr2 = list(nbr1)
                nbr2[j] = 1 - nbr2[j]
                candidates.append(nbr2)

        # 2. Random binary vectors
        while len(candidates) < pool_size:
            rand_cand = [random.choice([0, 1]) for _ in range(D)]
            candidates.append(rand_cand)

        cand_array = np.array(candidates)

        if gp is None or len(y_observed) == 0:
            chosen = random.choice(candidates)
            return chosen, 0.0

        best_y = min(y_observed)
        acq_values = self.compute_acquisition(gp, cand_array, best_y, strategy=strategy, xi=xi, kappa=kappa)
        best_idx = int(np.argmax(acq_values))
        return candidates[best_idx], float(acq_values[best_idx])

    def mask_to_pass_ids(self, mask: List[int]) -> List[str]:
        return [PASS_IDS[i] for i, val in enumerate(mask) if val == 1]

    def run_optimization_loop(
        self,
        experiment_id: str,
        benchmark_id: str,
        compiler_path: str,
        base_opt: str,
        budget: int,
        init_evals: int,
        acquisition: str,
        xi: float,
        kappa: float,
        repetitions: int,
        timeout: float
    ):
        """Sequential Bayesian Optimization execution loop in background thread."""
        self.state = "running"
        self.active_experiment_id = experiment_id
        start_time = time.time()
        self.log_event("INFO", f"Initializing Bayesian Optimization for benchmark '{benchmark_id}'. Budget={budget}, Base={base_opt}.")

        # 1. Run Standard Baselines (-O0, -O1, -O2, -O3)
        self.log_event("INFO", "Compiling baseline levels (-O0, -O1, -O2, -O3) for comparative benchmarks...")
        baselines: Dict[str, float] = {}
        for opt_level in ["-O0", "-O1", "-O2", "-O3"]:
            res = compile_and_benchmark(
                benchmark_id=benchmark_id,
                base_opt=opt_level,
                pass_ids=[],
                compiler_path=compiler_path,
                repetitions=repetitions,
                timeout=timeout
            )
            baselines[opt_level] = res["execution_time_ms"] if res["success"] else None
            self.log_event("BASELINE", f"Baseline {opt_level}: {res['execution_time_ms']} ms (Compile: {res['compile_time_ms']} ms)")

        # Save initial experiment record
        exp_record = {
            "id": experiment_id,
            "name": f"BO-{benchmark_id.upper()}-{datetime.utcnow().strftime('%Y%m%d-%H%M')}",
            "benchmark_id": benchmark_id,
            "compiler_path": compiler_path,
            "compiler_version": "gcc",
            "base_opt": base_opt,
            "budget": budget,
            "init_evals": init_evals,
            "acquisition": acquisition,
            "status": "running",
            "best_time_ms": None,
            "best_pass_ids": json.dumps([]),
            "baseline_o0_time": baselines.get("-O0"),
            "baseline_o1_time": baselines.get("-O1"),
            "baseline_o2_time": baselines.get("-O2"),
            "baseline_o3_time": baselines.get("-O3"),
            "speedup_vs_o2": None,
            "speedup_vs_o3": None,
            "total_duration_sec": 0.0,
            "evaluations_completed": 0,
            "error_message": None,
            "created_at": datetime.utcnow().isoformat(),
            "finished_at": None
        }
        save_experiment(exp_record)

        X_observed: List[List[int]] = []
        y_observed: List[float] = []
        best_time: Optional[float] = None
        best_mask: List[int] = [0] * len(PASS_IDS)
        best_pass_ids: List[str] = []

        try:
            for iteration in range(1, budget + 1):
                if self.stop_event.is_set():
                    self.log_event("WARN", "Optimization stopped by user signal.")
                    break

                while self.pause_event.is_set():
                    time.sleep(0.5)
                    if self.stop_event.is_set():
                        break

                self.current_progress["evaluations_completed"] = iteration - 1
                self.current_progress["total_budget"] = budget

                # Propose candidate configuration
                is_init_phase = (iteration <= init_evals) or (len(y_observed) < 2)
                gp = None
                acq_val = 0.0

                if not is_init_phase:
                    # Train Gaussian Process Surrogate
                    try:
                        X_arr = np.array(X_observed)
                        y_arr = np.array(y_observed)
                        # Normalize targets to zero-mean unit-variance for stability
                        y_mean = np.mean(y_arr)
                        y_std = np.std(y_arr) if np.std(y_arr) > 1e-6 else 1.0
                        y_norm = (y_arr - y_mean) / y_std

                        kernel = ConstantKernel(1.0, (1e-3, 1e3)) * Matern(length_scale=1.0, length_scale_bounds=(1e-2, 1e2), nu=2.5) + WhiteKernel(noise_level=1e-3)
                        gp = GaussianProcessRegressor(kernel=kernel, n_restarts_optimizer=2, random_state=42)
                        gp.fit(X_arr, y_norm)

                        candidate_mask, acq_val = self.propose_candidate(
                            gp=gp,
                            X_observed=X_observed,
                            y_observed=[float(val) for val in y_norm],
                            best_mask=best_mask,
                            strategy=acquisition,
                            xi=xi,
                            kappa=kappa
                        )
                        phase_desc = f"BO Phase ({acquisition.upper()})"
                    except Exception as e:
                        candidate_mask = [random.choice([0, 1]) for _ in range(len(PASS_IDS))]
                        phase_desc = "BO Fallback Random"
                else:
                    # Initial exploration phase (Uniform Random / Orthogonal sampling)
                    candidate_mask = [random.choice([0, 1]) for _ in range(len(PASS_IDS))]
                    phase_desc = "Initial Exploration Phase"

                candidate_passes = self.mask_to_pass_ids(candidate_mask)
                self.log_event("EVAL_START", f"Iter {iteration}/{budget} [{phase_desc}]: Evaluating {len(candidate_passes)} active passes...")

                # Compile and Benchmark Candidate
                bench_res = compile_and_benchmark(
                    benchmark_id=benchmark_id,
                    base_opt=base_opt,
                    pass_ids=candidate_passes,
                    compiler_path=compiler_path,
                    repetitions=repetitions,
                    timeout=timeout
                )

                if bench_res["success"]:
                    exec_time = bench_res["execution_time_ms"]
                    is_new_best = False
                    if best_time is None or exec_time < best_time:
                        best_time = exec_time
                        best_mask = candidate_mask
                        best_pass_ids = candidate_passes
                        is_new_best = True
                        self.log_event("NEW_BEST", f"★ New Best Found! Iter {iteration}: {exec_time:.3f} ms (Compile: {bench_res['compile_time_ms']:.1f} ms)")

                    X_observed.append(candidate_mask)
                    y_observed.append(exec_time)

                    # Calculate live speedups vs -O3
                    o3_baseline = baselines.get("-O3")
                    sp_o3 = round(o3_baseline / best_time, 3) if o3_baseline and best_time and best_time > 0 else 1.0

                    self.current_progress["best_time_ms"] = best_time
                    self.current_progress["best_pass_ids"] = best_pass_ids
                    self.current_progress["speedup_vs_o3"] = sp_o3

                    eval_record = {
                        "experiment_id": experiment_id,
                        "eval_number": iteration,
                        "pass_ids": json.dumps(candidate_passes),
                        "pass_mask": json.dumps(candidate_mask),
                        "compile_time_ms": bench_res["compile_time_ms"],
                        "execution_time_ms": exec_time,
                        "execution_times_json": json.dumps(bench_res["run_times"]),
                        "binary_size_bytes": bench_res["binary_size_bytes"],
                        "checksum": bench_res["checksum"],
                        "acquisition_val": round(acq_val, 5),
                        "is_best": 1 if is_new_best else 0,
                        "status": "success",
                        "error_details": None,
                        "created_at": datetime.utcnow().isoformat()
                    }
                    record_evaluation(eval_record)
                else:
                    self.log_event("ERROR", f"Iter {iteration} Failed: {bench_res['error_type']} - {bench_res['error_message'][:120]}")
                    eval_record = {
                        "experiment_id": experiment_id,
                        "eval_number": iteration,
                        "pass_ids": json.dumps(candidate_passes),
                        "pass_mask": json.dumps(candidate_mask),
                        "compile_time_ms": bench_res.get("compile_time_ms", 0.0),
                        "execution_time_ms": None,
                        "execution_times_json": json.dumps([]),
                        "binary_size_bytes": bench_res.get("binary_size_bytes", 0),
                        "checksum": None,
                        "acquisition_val": round(acq_val, 5),
                        "is_best": 0,
                        "status": bench_res.get("error_type", "FAILED"),
                        "error_details": bench_res.get("error_message"),
                        "created_at": datetime.utcnow().isoformat()
                    }
                    record_evaluation(eval_record)

            # Finalize experiment record
            total_duration = time.time() - start_time
            o2_baseline = baselines.get("-O2")
            o3_baseline = baselines.get("-O3")
            speedup_o2 = round(o2_baseline / best_time, 3) if o2_baseline and best_time else None
            speedup_o3 = round(o3_baseline / best_time, 3) if o3_baseline and best_time else None

            final_status = "stopped" if self.stop_event.is_set() else "completed"
            self.state = final_status
            self.current_progress["status"] = final_status

            exp_update = {
                "id": experiment_id,
                "name": f"BO-{benchmark_id.upper()}-{datetime.utcnow().strftime('%Y%m%d-%H%M')}",
                "benchmark_id": benchmark_id,
                "compiler_path": compiler_path,
                "compiler_version": "gcc 16.2.0",
                "base_opt": base_opt,
                "budget": budget,
                "init_evals": init_evals,
                "acquisition": acquisition,
                "status": final_status,
                "best_time_ms": best_time,
                "best_pass_ids": json.dumps(best_pass_ids),
                "baseline_o0_time": baselines.get("-O0"),
                "baseline_o1_time": baselines.get("-O1"),
                "baseline_o2_time": baselines.get("-O2"),
                "baseline_o3_time": baselines.get("-O3"),
                "speedup_vs_o2": speedup_o2,
                "speedup_vs_o3": speedup_o3,
                "total_duration_sec": round(total_duration, 2),
                "evaluations_completed": len(X_observed),
                "error_message": None,
                "created_at": exp_record["created_at"],
                "finished_at": datetime.utcnow().isoformat()
            }
            save_experiment(exp_update)
            self.log_event("SUCCESS", f"Optimization {final_status}! Best execution time: {best_time} ms. Speedup vs -O3: {speedup_o3}x.")

        except Exception as e:
            self.state = "failed"
            self.current_progress["status"] = "failed"
            update_experiment_status(experiment_id, "failed", str(e))
            self.log_event("FATAL", f"Optimization encountered unhandled exception: {str(e)}")

    def start(
        self,
        benchmark_id: str,
        compiler_path: str = "gcc",
        base_opt: str = "-O1",
        budget: int = 15,
        init_evals: int = 5,
        acquisition: str = "ei",
        xi: float = 0.01,
        kappa: float = 2.576,
        repetitions: int = 3,
        timeout: float = 12.0
    ) -> str:
        if self.state == "running":
            raise RuntimeError("An optimization run is already in progress.")

        experiment_id = str(uuid.uuid4())[:8]
        self.stop_event.clear()
        self.pause_event.clear()
        self.events_log = []

        self.current_progress = {
            "experiment_id": experiment_id,
            "status": "running",
            "evaluations_completed": 0,
            "total_budget": budget,
            "best_time_ms": None,
            "best_pass_ids": [],
            "speedup_vs_o3": None,
            "latest_log": "Starting optimization worker..."
        }

        self.worker_thread = threading.Thread(
            target=self.run_optimization_loop,
            kwargs={
                "experiment_id": experiment_id,
                "benchmark_id": benchmark_id,
                "compiler_path": compiler_path,
                "base_opt": base_opt,
                "budget": budget,
                "init_evals": init_evals,
                "acquisition": acquisition,
                "xi": xi,
                "kappa": kappa,
                "repetitions": repetitions,
                "timeout": timeout
            },
            daemon=True
        )
        self.worker_thread.start()
        return experiment_id

    def pause(self):
        if self.state == "running":
            self.pause_event.set()
            self.state = "paused"
            self.current_progress["status"] = "paused"
            self.log_event("INFO", "Optimization execution paused.")

    def resume(self):
        if self.state == "paused":
            self.pause_event.clear()
            self.state = "running"
            self.current_progress["status"] = "running"
            self.log_event("INFO", "Optimization execution resumed.")

    def stop(self):
        if self.state in ["running", "paused"]:
            self.stop_event.set()
            self.pause_event.clear()
            self.state = "stopping"
            self.log_event("WARN", "Received cancellation request. Terminating evaluation loop...")

# Singleton BO Engine instance
bo_engine = BayesianOptimizationEngine()
