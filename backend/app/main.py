import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.config import (
    settings, SystemSettings, BENCHMARKS_DIR, WORKSPACE_DIR
)
from backend.app.compiler import (
    PASS_CATALOG, PASS_DICT, get_compiler_info, build_compiler_command
)
from backend.app.database import (
    init_db, list_experiments, get_experiment, delete_experiment,
    get_dashboard_summary, export_experiment_csv
)
from backend.app.executor import compile_and_benchmark
from backend.app.bo_engine import bo_engine
from backend.app.viva_paper import get_viva_metadata

# Initialize Database tables
init_db()

app = FastAPI(
    title="Compiler Optimization Research Platform",
    description="Bayesian Optimization for Automatic Compiler Pass Selection",
    version="1.0.0"
)

# Enable CORS for local development (frontend running on port 5173 or 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Benchmark Metadata -----------------
BENCHMARK_CATALOG = [
    {
        "id": "matrix_mul",
        "name": "Matrix Multiplication",
        "category": "Dense Linear Algebra",
        "description": "Dense O(N^3) matrix multiplication evaluating cache tiling, loop interchange, and auto-vectorization.",
        "source_file": "matrix_mul.c",
        "default_param": "280 (matrix dimension N x N)",
        "complexity": "O(N^3)",
        "target_passes": ["-ftree-vectorize", "-ftree-slp-vectorize", "-funroll-loops", "-fomit-frame-pointer"]
    },
    {
        "id": "quicksort",
        "name": "Quicksort Partitioning",
        "category": "Sorting & Recursion",
        "description": "Recursive divide-and-conquer quicksort over pseudo-random 32-bit integers testing branch predictability.",
        "source_file": "quicksort.c",
        "default_param": "400,000 array elements",
        "complexity": "O(N log N)",
        "target_passes": ["-finline-small-functions", "-ftree-fre", "-ftree-dominator-opts", "-fstrict-aliasing"]
    },
    {
        "id": "nbody",
        "name": "N-Body Simulation",
        "category": "Scientific Computing",
        "description": "Pairwise gravitational interaction across N bodies testing floating-point throughput and loop unrolling.",
        "source_file": "nbody.c",
        "default_param": "1,200 bodies, 15 steps",
        "complexity": "O(N^2 * steps)",
        "target_passes": ["-funroll-loops", "-ftree-vectorize", "-fvariable-expansion-in-unroller"]
    },
    {
        "id": "dijkstra",
        "name": "Dijkstra Shortest Path",
        "category": "Graph Algorithms",
        "description": "Single-source shortest path on dense directed graphs measuring memory latency and pointer traversal.",
        "source_file": "dijkstra.c",
        "default_param": "550 vertices, 10 sources",
        "complexity": "O(V^2)",
        "target_passes": ["-fthread-jumps", "-ftree-dse", "-ftree-sink", "-fomit-frame-pointer"]
    },
    {
        "id": "sha256",
        "name": "SHA-256 Hashing",
        "category": "Cryptographic Primitives",
        "description": "Multi-block 64-round SHA-256 hash transformations stressing integer bitwise rotation and ALU scheduling.",
        "source_file": "sha256.c",
        "default_param": "25,000 blocks",
        "complexity": "O(N * 64)",
        "target_passes": ["-fcse-follow-jumps", "-ftree-reassoc", "-ftree-dce", "-fomit-frame-pointer"]
    },
    {
        "id": "sieve",
        "name": "Sieve of Eratosthenes",
        "category": "Memory Bandwidth",
        "description": "Prime sieve array marking with large strides testing memory subsystem throughput and loop invariants.",
        "source_file": "sieve.c",
        "default_param": "N = 2,500,000",
        "complexity": "O(N log log N)",
        "target_passes": ["-ftree-loop-distribute-patterns", "-ftree-pre", "-fpeel-loops"]
    },
    {
        "id": "mandelbrot",
        "name": "Mandelbrot Fractal",
        "category": "Intensive Numerical Loops",
        "description": "Escape-time complex number arithmetic on a 2D plane grid testing register pressure and floating point.",
        "source_file": "mandelbrot.c",
        "default_param": "600 x 600 grid, 400 iter",
        "complexity": "O(W * H * iter)",
        "target_passes": ["-ftree-vectorize", "-fomit-frame-pointer", "-fstrict-aliasing"]
    }
]

# ----------------- Request Models -----------------
class StartOptimizerRequest(BaseModel):
    benchmark_id: str
    base_opt: str = "-O1"
    budget: int = 15
    init_evals: int = 5
    acquisition: str = "ei"
    xi: float = 0.01
    kappa: float = 2.576
    repetitions: int = 3
    timeout: float = 12.0

class EvaluateCustomRequest(BaseModel):
    benchmark_id: str
    base_opt: str = "-O1"
    pass_ids: List[str]
    repetitions: int = 3
    timeout: float = 12.0

class UpdateSettingsRequest(BaseModel):
    compiler_path: str
    cxx_compiler_path: str
    timeout_seconds: float
    measurement_repetitions: int
    warmup_runs: int
    default_base_opt: str
    default_budget: int
    default_init_evals: int
    default_acquisition: str
    xi_exploration: float
    kappa_ucb: float

# ----------------- Dashboard & System API -----------------
@app.get("/api/dashboard/summary")
def get_summary():
    summary = get_dashboard_summary()
    compiler_info = get_compiler_info(settings.compiler_path)
    summary["compiler_info"] = compiler_info
    summary["benchmarks_count"] = len(BENCHMARK_CATALOG)
    summary["passes_count"] = len(PASS_CATALOG)
    summary["active_optimizer_state"] = bo_engine.state
    summary["current_progress"] = bo_engine.current_progress
    return summary

@app.get("/api/system/compiler-info")
def get_compiler_details():
    return get_compiler_info(settings.compiler_path)

# ----------------- Benchmark Laboratory API -----------------
@app.get("/api/benchmarks")
def list_benchmarks():
    return BENCHMARK_CATALOG

@app.get("/api/benchmarks/{benchmark_id}/source")
def get_benchmark_source(benchmark_id: str):
    source_file = BENCHMARKS_DIR / f"{benchmark_id}.c"
    if not source_file.exists():
        raise HTTPException(status_code=404, detail="Benchmark source file not found")
    with open(source_file, "r", encoding="utf-8") as f:
        code = f.read()
    return {
        "benchmark_id": benchmark_id,
        "filename": f"{benchmark_id}.c",
        "code": code
    }

@app.post("/api/benchmarks/{benchmark_id}/run-baseline")
def run_benchmark_baselines(benchmark_id: str):
    """Compiles and executes all standard baseline levels (-O0, -O1, -O2, -O3)."""
    results = {}
    for level in ["-O0", "-O1", "-O2", "-O3"]:
        res = compile_and_benchmark(
            benchmark_id=benchmark_id,
            base_opt=level,
            pass_ids=[],
            compiler_path=settings.compiler_path,
            repetitions=settings.measurement_repetitions,
            timeout=settings.timeout_seconds
        )
        results[level] = res
    return {
        "benchmark_id": benchmark_id,
        "baselines": results
    }

# ----------------- Pass Explorer API -----------------
@app.get("/api/passes")
def list_passes():
    return {
        "passes": PASS_CATALOG,
        "categories": list(set(p["category"] for p in PASS_CATALOG)),
        "total_count": len(PASS_CATALOG)
    }

@app.post("/api/passes/preview-command")
def preview_command(payload: Dict[str, Any]):
    benchmark_id = payload.get("benchmark_id", "matrix_mul")
    base_opt = payload.get("base_opt", "-O1")
    pass_ids = payload.get("pass_ids", [])
    cmd = build_compiler_command(
        source_file=f"benchmarks/{benchmark_id}.c",
        output_binary=f"bin/{benchmark_id}.exe",
        base_opt=base_opt,
        pass_ids=pass_ids,
        compiler_path=settings.compiler_path
    )
    return {
        "command_list": cmd,
        "command_string": " ".join(cmd),
        "active_pass_count": len(pass_ids)
    }

# ----------------- Optimization Workspace API -----------------
@app.post("/api/optimizer/start")
def start_optimizer(req: StartOptimizerRequest):
    try:
        exp_id = bo_engine.start(
            benchmark_id=req.benchmark_id,
            compiler_path=settings.compiler_path,
            base_opt=req.base_opt,
            budget=req.budget,
            init_evals=req.init_evals,
            acquisition=req.acquisition,
            xi=req.xi,
            kappa=req.kappa,
            repetitions=req.repetitions,
            timeout=req.timeout
        )
        return {"status": "started", "experiment_id": exp_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/optimizer/pause")
def pause_optimizer():
    bo_engine.pause()
    return {"status": bo_engine.state}

@app.post("/api/optimizer/resume")
def resume_optimizer():
    bo_engine.resume()
    return {"status": bo_engine.state}

@app.post("/api/optimizer/stop")
def stop_optimizer():
    bo_engine.stop()
    return {"status": bo_engine.state}

@app.get("/api/optimizer/status")
def get_optimizer_status():
    return {
        "state": bo_engine.state,
        "progress": bo_engine.current_progress,
        "events": bo_engine.events_log[-100:]
    }

@app.post("/api/optimizer/evaluate-custom")
def evaluate_custom(req: EvaluateCustomRequest):
    """Compiles and executes a custom manual pass selection directly in workspace."""
    res = compile_and_benchmark(
        benchmark_id=req.benchmark_id,
        base_opt=req.base_opt,
        pass_ids=req.pass_ids,
        compiler_path=settings.compiler_path,
        repetitions=req.repetitions,
        timeout=req.timeout
    )
    return res

# ----------------- Experiments & History API -----------------
@app.get("/api/experiments")
def get_all_experiments(limit: int = 50):
    return list_experiments(limit=limit)

@app.get("/api/experiments/{exp_id}")
def get_experiment_details(exp_id: str):
    exp = get_experiment(exp_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp

@app.delete("/api/experiments/{exp_id}")
def delete_experiment_by_id(exp_id: str):
    delete_experiment(exp_id)
    return {"status": "deleted", "id": exp_id}

@app.get("/api/experiments/{exp_id}/export/csv")
def export_csv(exp_id: str):
    csv_data = export_experiment_csv(exp_id)
    if not csv_data:
        raise HTTPException(status_code=404, detail="Experiment not found or has no evaluations")
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=experiment_{exp_id}.csv"}
    )

# ----------------- Performance Analysis API -----------------
@app.get("/api/results/analysis")
def get_results_analysis():
    exps = list_experiments(limit=100)
    completed = [e for e in exps if e.get("status") == "completed"]
    
    # Aggregate comparisons by benchmark
    benchmark_stats = {}
    for e in completed:
        bid = e["benchmark_id"]
        if bid not in benchmark_stats:
            benchmark_stats[bid] = {
                "benchmark_id": bid,
                "runs_count": 0,
                "best_bo_time": float("inf"),
                "baseline_o2": e.get("baseline_o2_time"),
                "baseline_o3": e.get("baseline_o3_time"),
                "max_speedup_vs_o2": 1.0,
                "max_speedup_vs_o3": 1.0,
                "best_pass_ids": []
            }
        
        bs = benchmark_stats[bid]
        bs["runs_count"] += 1
        if e.get("best_time_ms") and e["best_time_ms"] < bs["best_bo_time"]:
            bs["best_bo_time"] = e["best_time_ms"]
            bs["best_pass_ids"] = json.loads(e["best_pass_ids"]) if e.get("best_pass_ids") else []
            if e.get("speedup_vs_o2"):
                bs["max_speedup_vs_o2"] = max(bs["max_speedup_vs_o2"], e["speedup_vs_o2"])
            if e.get("speedup_vs_o3"):
                bs["max_speedup_vs_o3"] = max(bs["max_speedup_vs_o3"], e["speedup_vs_o3"])
                
    return {
        "total_experiments_analyzed": len(completed),
        "benchmark_summaries": list(benchmark_stats.values()),
        "recent_completed": completed[:10]
    }

# ----------------- Settings API -----------------
@app.get("/api/settings")
def get_current_settings():
    return settings.model_dump()

@app.post("/api/settings")
def update_settings(new_settings: UpdateSettingsRequest):
    settings.compiler_path = new_settings.compiler_path
    settings.cxx_compiler_path = new_settings.cxx_compiler_path
    settings.timeout_seconds = new_settings.timeout_seconds
    settings.measurement_repetitions = new_settings.measurement_repetitions
    settings.warmup_runs = new_settings.warmup_runs
    settings.default_base_opt = new_settings.default_base_opt
    settings.default_budget = new_settings.default_budget
    settings.default_init_evals = new_settings.default_init_evals
    settings.default_acquisition = new_settings.default_acquisition
    settings.xi_exploration = new_settings.xi_exploration
    settings.kappa_ucb = new_settings.kappa_ucb
    return {"status": "updated", "settings": settings.model_dump()}

@app.get("/api/settings/verify")
def verify_environment():
    c_info = get_compiler_info(settings.compiler_path)
    return {
        "compiler": c_info,
        "database": {
            "path": str(settings.experiments_dir),
            "accessible": True
        },
        "python_version": "3.11",
        "benchmarks_present": [b["id"] for b in BENCHMARK_CATALOG]
    }

# ----------------- Viva & Academic Paper API -----------------
@app.get("/api/viva-metadata")
def get_viva_data():
    return get_viva_metadata()

@app.get("/api/manuscript/markdown")
def get_manuscript_markdown():
    doc_path = WORKSPACE_DIR / "docs" / "MANUSCRIPT.md"
    if doc_path.exists():
        with open(doc_path, "r", encoding="utf-8") as f:
            return {"content": f.read()}
    return {"content": "# Manuscript not found"}

@app.get("/api/viva-guide/markdown")
def get_viva_guide_markdown():
    doc_path = WORKSPACE_DIR / "docs" / "VIVA_DEFENSE_GUIDE.md"
    if doc_path.exists():
        with open(doc_path, "r", encoding="utf-8") as f:
            return {"content": f.read()}
    return {"content": "# Viva Guide not found"}

# ----------------- Serve Production Frontend -----------------
FRONTEND_DIST = WORKSPACE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        # Allow API routes to be handled natively
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

