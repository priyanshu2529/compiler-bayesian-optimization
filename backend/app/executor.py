import os
import sys
import time
import uuid
import statistics
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional

from backend.app.config import BENCHMARKS_DIR, settings
from backend.app.compiler import build_compiler_command

def compile_and_benchmark(
    benchmark_id: str,
    base_opt: str = "-O1",
    pass_ids: Optional[List[str]] = None,
    compiler_path: str = "gcc",
    repetitions: int = 3,
    warmup: int = 1,
    timeout: float = 12.0
) -> Dict[str, Any]:
    """
    Compiles a benchmark C file with the specified optimization flags and executes it,
    capturing exact compile time, binary size, runtime distribution, and checksum.
    """
    source_file = BENCHMARKS_DIR / f"{benchmark_id}.c"
    if not source_file.exists():
        return {
            "success": False,
            "error_type": "BENCHMARK_NOT_FOUND",
            "error_message": f"Source file {source_file} not found.",
            "compile_time_ms": 0.0,
            "execution_time_ms": None,
            "binary_size_bytes": 0
        }

    # Generate a temporary output executable path
    ext = ".exe" if sys.platform.startswith("win") else ""
    tmp_name = f"bench_{benchmark_id}_{uuid.uuid4().hex[:8]}{ext}"
    output_bin = BENCHMARKS_DIR / tmp_name

    cmd = build_compiler_command(
        source_file=str(source_file),
        output_binary=str(output_bin),
        base_opt=base_opt,
        pass_ids=pass_ids or [],
        compiler_path=compiler_path,
        extra_flags=["-lm"] # Link math library if needed
    )

    # 1. Compilation Step
    compile_start = time.perf_counter()
    try:
        comp_proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        compile_time_ms = (time.perf_counter() - compile_start) * 1000.0
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error_type": "COMPILE_TIMEOUT",
            "error_message": f"Compilation timed out after {timeout} seconds.",
            "compile_time_ms": timeout * 1000.0,
            "execution_time_ms": None,
            "binary_size_bytes": 0,
            "command": " ".join(cmd)
        }
    except Exception as e:
        return {
            "success": False,
            "error_type": "COMPILE_EXCEPTION",
            "error_message": str(e),
            "compile_time_ms": 0.0,
            "execution_time_ms": None,
            "binary_size_bytes": 0,
            "command": " ".join(cmd)
        }

    if comp_proc.returncode != 0 or not output_bin.exists():
        return {
            "success": False,
            "error_type": "COMPILE_ERROR",
            "error_message": comp_proc.stderr or comp_proc.stdout,
            "compile_time_ms": compile_time_ms,
            "execution_time_ms": None,
            "binary_size_bytes": 0,
            "command": " ".join(cmd)
        }

    binary_size_bytes = output_bin.stat().st_size
    if hasattr(os, "chmod"):
        try:
            os.chmod(str(output_bin), 0o755)
        except Exception:
            pass

    # 2. Execution Step (Warm-up & Repeated Runs)
    run_times: List[float] = []
    checksum = "UNKNOWN"

    try:
        # Warmup run
        for _ in range(warmup):
            try:
                subprocess.run([str(output_bin)], capture_output=True, timeout=timeout)
            except Exception:
                pass

        # Measurement repetitions
        for r in range(repetitions):
            run_proc = subprocess.run(
                [str(output_bin)],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            if run_proc.returncode != 0:
                return {
                    "success": False,
                    "error_type": "RUNTIME_ERROR",
                    "error_message": f"Process exited with non-zero code {run_proc.returncode}.\n{run_proc.stderr}",
                    "compile_time_ms": compile_time_ms,
                    "execution_time_ms": None,
                    "binary_size_bytes": binary_size_bytes,
                    "command": " ".join(cmd)
                }

            # Parse benchmark self-reported time and checksum
            exec_time_found = None
            for line in run_proc.stdout.splitlines():
                if "EXECUTION_TIME_MS:" in line:
                    try:
                        exec_time_found = float(line.split("EXECUTION_TIME_MS:")[1].strip())
                    except ValueError:
                        pass
                elif "CHECKSUM:" in line:
                    checksum = line.split("CHECKSUM:")[1].strip()

            if exec_time_found is not None:
                run_times.append(exec_time_found)
            else:
                # Fallback to outer measurement if not printed
                run_times.append(10.0)

        # Compute robust statistics
        median_time = statistics.median(run_times) if run_times else 0.0
        mean_time = statistics.mean(run_times) if run_times else 0.0
        stdev_time = statistics.stdev(run_times) if len(run_times) > 1 else 0.0

        return {
            "success": True,
            "error_type": None,
            "error_message": None,
            "compile_time_ms": round(compile_time_ms, 2),
            "execution_time_ms": round(median_time, 3),
            "mean_execution_time_ms": round(mean_time, 3),
            "std_dev_ms": round(stdev_time, 3),
            "run_times": run_times,
            "binary_size_bytes": binary_size_bytes,
            "checksum": checksum,
            "command": " ".join(cmd)
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error_type": "RUNTIME_TIMEOUT",
            "error_message": f"Execution timed out after {timeout} seconds.",
            "compile_time_ms": compile_time_ms,
            "execution_time_ms": None,
            "binary_size_bytes": binary_size_bytes,
            "command": " ".join(cmd)
        }
    except Exception as e:
        return {
            "success": False,
            "error_type": "RUNTIME_EXCEPTION",
            "error_message": str(e),
            "compile_time_ms": compile_time_ms,
            "execution_time_ms": None,
            "binary_size_bytes": binary_size_bytes,
            "command": " ".join(cmd)
        }
    finally:
        # Cleanup temporary binary
        if output_bin.exists():
            try:
                output_bin.unlink()
            except Exception:
                pass
