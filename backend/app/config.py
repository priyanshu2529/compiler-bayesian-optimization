import os
import shutil
import platform
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = BASE_DIR.parent
BENCHMARKS_DIR = BASE_DIR / "benchmarks"
DATA_DIR = BASE_DIR / "data"
RUNS_DIR = DATA_DIR / "runs"
EXPORTS_DIR = DATA_DIR / "exports"
DB_PATH = DATA_DIR / "experiments.db"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
RUNS_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

class SystemSettings(BaseModel):
    compiler_path: str = "gcc"
    cxx_compiler_path: str = "g++"
    timeout_seconds: float = 12.0
    measurement_repetitions: int = 3
    warmup_runs: int = 1
    default_base_opt: str = "-O1"
    default_budget: int = 15
    default_init_evals: int = 5
    default_acquisition: str = "ei" # "ei", "ucb", "pi"
    xi_exploration: float = 0.01
    kappa_ucb: float = 2.576
    experiments_dir: str = str(RUNS_DIR)

# Global in-memory configuration state
settings = SystemSettings()

def detect_compilers():
    """Discover available compilers in the environment."""
    candidates = ["gcc", "g++", "clang", "clang++"]
    results = {}
    for c in candidates:
        found = shutil.which(c)
        results[c] = {
            "found": found is not None,
            "path": found or ""
        }
    return results
