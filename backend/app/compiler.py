import subprocess
import shutil
from typing import Dict, List, Any, Optional

PASS_CATALOG: List[Dict[str, Any]] = [
    # Vectorization & SIMD
    {
        "id": "tree-vectorize",
        "flag": "-ftree-vectorize",
        "name": "Tree Loop & SLP Vectorize",
        "category": "Vectorization",
        "description": "Enables autovectorization of loops and straight-line code to utilize SIMD registers (SSE/AVX).",
        "default": False,
        "impact": "High speedup on data-parallel arithmetic, but can increase code size."
    },
    {
        "id": "tree-slp-vectorize",
        "flag": "-ftree-slp-vectorize",
        "name": "Superword-Level Parallelism",
        "category": "Vectorization",
        "description": "Vectorizes basic blocks by grouping isomorphic operations across scalar registers.",
        "default": False,
        "impact": "Improves register-level parallel throughput for unrolled blocks."
    },
    {
        "id": "vect-cost-model-cheap",
        "flag": "-fvect-cost-model=cheap",
        "name": "Conservative Vector Cost Model",
        "category": "Vectorization",
        "description": "Applies vectorization only if static analysis predicts minimal peel/remainder overhead.",
        "default": False,
        "impact": "Prevents vectorization slowdowns on loops with small iteration counts."
    },

    # Loop Transformations
    {
        "id": "unroll-loops",
        "flag": "-funroll-loops",
        "name": "Loop Unrolling",
        "category": "Loop Optimizations",
        "description": "Unrolls loops with known or compile-time bounded iteration counts.",
        "default": False,
        "impact": "Decreases loop branch overhead, increases instruction cache pressure."
    },
    {
        "id": "peel-loops",
        "flag": "-fpeel-loops",
        "name": "Loop Peeling",
        "category": "Loop Optimizations",
        "description": "Peels off early loop iterations to simplify loop invariants and align pointer bounds.",
        "default": False,
        "impact": "Aids vector alignment and branch elimination."
    },
    {
        "id": "split-loops",
        "flag": "-fsplit-loops",
        "name": "Loop Splitting",
        "category": "Loop Optimizations",
        "description": "Splits a loop containing conditional breaks into multiple specialized unconditional loops.",
        "default": False,
        "impact": "Reduces branch mispredictions in complex loop bodies."
    },
    {
        "id": "unswitch-loops",
        "flag": "-funswitch-loops",
        "name": "Loop Unswitching",
        "category": "Loop Optimizations",
        "description": "Moves loop-invariant conditional branches outside of the loop structure.",
        "default": False,
        "impact": "Eliminates repeated branch evaluations inside hot loops."
    },
    {
        "id": "tree-loop-distribute",
        "flag": "-ftree-loop-distribute-patterns",
        "name": "Loop Pattern Distribution",
        "category": "Loop Optimizations",
        "description": "Recognizes algorithmic patterns (e.g., memset, memcpy) and replaces loops with optimized routines.",
        "default": False,
        "impact": "Leverages hardware-tuned libc memory primitives."
    },
    {
        "id": "variable-expansion",
        "flag": "-fvariable-expansion-in-unroller",
        "name": "Variable Expansion in Unroller",
        "category": "Loop Optimizations",
        "description": "Expands accumulator variables into multiple registers to break read-after-write dependency chains.",
        "default": False,
        "impact": "Improves instruction-level parallelism in reduction loops."
    },

    # Inlining & Interprocedural Optimization (IPA)
    {
        "id": "inline-functions",
        "flag": "-finline-functions",
        "name": "Aggressive Inlining",
        "category": "Inlining & IPA",
        "description": "Integrates all simple functions into their callers according to heuristic cost thresholds.",
        "default": False,
        "impact": "Eliminates call overhead, exposes inter-functional constants."
    },
    {
        "id": "inline-small-functions",
        "flag": "-finline-small-functions",
        "name": "Inline Small Functions",
        "category": "Inlining & IPA",
        "description": "Inlines functions whose body is smaller than the machine instruction sequence for calling it.",
        "default": True,
        "impact": "Almost always beneficial; zero net code size expansion."
    },
    {
        "id": "ipa-pta",
        "flag": "-fipa-pta",
        "name": "Interprocedural Points-To Analysis",
        "category": "Inlining & IPA",
        "description": "Performs whole-program pointer alias analysis across translation unit functions.",
        "default": False,
        "impact": "Allows compilers to eliminate redundant memory reloads across function boundaries."
    },
    {
        "id": "ipa-cp",
        "flag": "-fipa-cp",
        "name": "Interprocedural Constant Propagation",
        "category": "Inlining & IPA",
        "description": "Propagates known constant argument values into called functions to specialize bodies.",
        "default": False,
        "impact": "Enables aggressive dead branch pruning in specialized subroutines."
    },

    # Redundancy Elimination & SSA Form
    {
        "id": "tree-pre",
        "flag": "-ftree-pre",
        "name": "Partial Redundancy Elimination (PRE)",
        "category": "Redundancy Elimination",
        "description": "Hoists expressions that are computed on some control flow paths so they execute only once.",
        "default": False,
        "impact": "Reduces repeated computation along common join points."
    },
    {
        "id": "tree-fre",
        "flag": "-ftree-fre",
        "name": "Full Redundancy Elimination (FRE)",
        "category": "Redundancy Elimination",
        "description": "Eliminates redundant computations and memory loads across dominator trees.",
        "default": True,
        "impact": "Core SSA optimization that prunes duplicate arithmetic."
    },
    {
        "id": "tree-dse",
        "flag": "-ftree-dse",
        "name": "Dead Store Elimination (DSE)",
        "category": "Redundancy Elimination",
        "description": "Removes memory store instructions to memory addresses that are overwritten before being read.",
        "default": True,
        "impact": "Decreases bus traffic and cache writeback overhead."
    },
    {
        "id": "tree-dce",
        "flag": "-ftree-dce",
        "name": "Dead Code Elimination (DCE)",
        "category": "Redundancy Elimination",
        "description": "Identifies SSA instructions whose return value is never consumed and removes them.",
        "default": True,
        "impact": "Compact binary size and reduced instruction cache footprint."
    },
    {
        "id": "tree-dominator-opts",
        "flag": "-ftree-dominator-opts",
        "name": "Dominator Tree Optimizations",
        "category": "Redundancy Elimination",
        "description": "Performs jump threading, constant folding, and copy propagation using dominance frontiers.",
        "default": True,
        "impact": "Simplifies control flow graph complexity."
    },
    {
        "id": "tree-reassoc",
        "flag": "-ftree-reassoc",
        "name": "Tree Reassociation",
        "category": "Redundancy Elimination",
        "description": "Reorders associative and commutative operations (e.g. + and *) to expose parallel reduction paths.",
        "default": False,
        "impact": "Balances tree expression depth for superscalar execution."
    },
    {
        "id": "tree-sink",
        "flag": "-ftree-sink",
        "name": "SSA Code Sinking",
        "category": "Redundancy Elimination",
        "description": "Sinks invariant calculations down into the specific branch where the result is actually consumed.",
        "default": False,
        "impact": "Avoids paying calculation cost if alternative branch is taken."
    },

    # Machine Code & Control Flow
    {
        "id": "omit-frame-pointer",
        "flag": "-fomit-frame-pointer",
        "name": "Omit Frame Pointer",
        "category": "Code Generation",
        "description": "Frees up the dedicated frame pointer register (RBP/EBP) for general-purpose variable allocation.",
        "default": True,
        "impact": "Gives the register allocator one extra high-speed register."
    },
    {
        "id": "thread-jumps",
        "flag": "-fthread-jumps",
        "name": "Jump Threading",
        "category": "Code Generation",
        "description": "Redirects jumps around intermediary basic blocks whose jump conditions are already known.",
        "default": True,
        "impact": "Eliminates pipeline stalls at basic block boundaries."
    },
    {
        "id": "cse-follow-jumps",
        "flag": "-fcse-follow-jumps",
        "name": "CSE Follow Jumps",
        "category": "Code Generation",
        "description": "Extends common subexpression elimination across jump targets into successor blocks.",
        "default": False,
        "impact": "Widens subexpression sharing across basic blocks."
    },
    {
        "id": "strict-aliasing",
        "flag": "-fstrict-aliasing",
        "name": "Strict Aliasing Rule",
        "category": "Code Generation",
        "description": "Enforces ISO C rules that objects of different types cannot point to the same memory location.",
        "default": True,
        "impact": "Permits aggressive reordering of pointer loads and stores."
    }
]

PASS_DICT = {p["id"]: p for p in PASS_CATALOG}
PASS_IDS = [p["id"] for p in PASS_CATALOG]

def get_compiler_info(compiler_path: str = "gcc") -> Dict[str, Any]:
    """Inspects the compiler binary and returns structured version metadata."""
    found = shutil.which(compiler_path)
    if not found:
        return {
            "available": False,
            "path": compiler_path,
            "version": "Not Found",
            "target": "Unknown",
            "thread_model": "Unknown",
            "raw_output": f"Compiler binary '{compiler_path}' was not found on PATH."
        }
    
    try:
        proc = subprocess.run([found, "-v"], capture_output=True, text=True, timeout=5)
        raw_output = proc.stderr if proc.stderr else proc.stdout
        
        # Parse version
        version = "Unknown"
        target = "Unknown"
        thread_model = "Unknown"
        
        for line in raw_output.splitlines():
            line_s = line.strip()
            if "gcc version" in line_s or "clang version" in line_s:
                version = line_s
            elif line_s.startswith("Target:"):
                target = line_s.replace("Target:", "").strip()
            elif line_s.startswith("Thread model:"):
                thread_model = line_s.replace("Thread model:", "").strip()

        if version == "Unknown" and raw_output.splitlines():
            version = raw_output.splitlines()[0]

        return {
            "available": True,
            "path": found,
            "version": version,
            "target": target,
            "thread_model": thread_model,
            "raw_output": raw_output
        }
    except Exception as e:
        return {
            "available": False,
            "path": found,
            "version": "Error querying compiler",
            "target": "Unknown",
            "thread_model": "Unknown",
            "raw_output": str(e)
        }

def build_compiler_command(
    source_file: str,
    output_binary: str,
    base_opt: str = "-O1",
    pass_ids: Optional[List[str]] = None,
    compiler_path: str = "gcc",
    extra_flags: Optional[List[str]] = None
) -> List[str]:
    """Generates the exact compiler invocation argv list."""
    cmd = [compiler_path, base_opt]
    
    if pass_ids:
        for pid in pass_ids:
            if pid in PASS_DICT:
                cmd.append(PASS_DICT[pid]["flag"])
                
    if extra_flags:
        cmd.extend(extra_flags)
        
    cmd.extend([source_file, "-o", output_binary])
    return cmd
