# Automatic Selection of Compiler Optimization Passes Using Bayesian Optimization

An end-to-end computer systems engineering and compiler research platform that formulates compiler pass selection as a sequential model-based global optimization problem.

By employing **Gaussian Process Regression (GPR)** with a **Matérn 5/2 covariance kernel** and an **Expected Improvement (EI)** acquisition function, the system autonomously explores a 24-dimensional binary flag hypercube ($2^{24} \approx 1.68 \times 10^7$ candidate configurations) to discover workload-specific optimization pass combinations that outperform standard `-O3` baselines in 15–25 physical evaluations.

---

## 1. Research Highlights & Key Parameters

| Category | Specification | Description / Engineering Rationale |
|---|---|---|
| **Search Space** | $\mathbf{x} \in \{0, 1\}^{24}$ | 24 verified GCC optimization flags across Vectorization, Loops, Inlining, SSA Redundancy, and Code Generation. |
| **Base Flag** | `-O1` (or `-O2`) | Baseline flag ensures standard SSA canonicalization without introducing aggressive code expansion. |
| **Surrogate Model** | **Gaussian Process (GPR)** | Non-parametric Bayesian model quantifying predictive mean $\mu(x)$ and epistemic uncertainty $\sigma(x)$. |
| **Kernel Function** | **Matérn 5/2 ($\nu = 2.5$)** | Models realistic non-smooth objective functions without assuming infinite differentiability (unlike RBF). |
| **Measurement Regularizer**| `WhiteKernel(1e-3)` | Accounts for microarchitectural execution timing variance and OS context switches. |
| **Acquisition Policy** | **Expected Improvement (EI)** | Balances exploration of high-variance regions with exploitation of low-mean regions ($\xi = 0.01$). |
| **Alternative Policy** | **Upper Confidence Bound (UCB)**| Lower Confidence Bound ($\mu(x) - \kappa \sigma(x)$) with $\kappa = 2.576$ (99% confidence threshold). |
| **Evaluation Budget** | **15 – 25 iterations** | Realistic search budget; achieves convergence in under 2 minutes of compilation. |
| **Noise Filtering** | **3 runs (Median)** | High-precision monotonic timing (`timespec_get`, nanosecond resolution) taking the median across 3 runs after 1 warmup run. |
| **Target Compiler** | **GCC 16.2.0 (MSYS2 UCRT64)**| Host-discovered x86_64 compiler toolchain executing authentic, physical compilations. |

---

## 2. Real-Life C Benchmark Suite

The platform includes seven verified C benchmarks located in `backend/benchmarks/`:

1. **`matrix_mul.c`** (Dense Linear Algebra): $280 \times 280$ matrix multiplication. Stresses L1/L2 cache locality, loop interchange, and auto-vectorization (`-ftree-vectorize`, `-ftree-slp-vectorize`).
2. **`quicksort.c`** (Sorting & Branch Prediction): 400,000 pseudo-random integers with recursive partitioning. Stresses branch predictors and function call inlining (`-finline-small-functions`).
3. **`nbody.c`** (Astrophysics Simulation): Pairwise gravitational interaction across 1,200 bodies over 15 time steps. Stresses floating-point arithmetic pipelines and loop unrolling (`-funroll-loops`).
4. **`dijkstra.c`** (Graph Algorithms): Single-source shortest path on a 550-vertex, 6,000-edge directed graph. Stresses pointer-chasing and jump threading (`-fthread-jumps`).
5. **`sha256.c`** (Cryptographic Hashing): 25,000 64-round compression block hashes. Stresses bitwise rotation and common subexpression elimination (`-fcse-follow-jumps`).
6. **`sieve.c`** (Memory Bandwidth): Prime sieve filtering up to $N = 2,500,000$. Stresses memory access strides and loop invariants (`-ftree-loop-distribute-patterns`).
7. **`mandelbrot.c`** (Fractal Simulation): Complex escape-time iterations on a $600 \times 600$ plane. Stresses register allocation and frame pointer omission (`-fomit-frame-pointer`).

---

## 3. System Architecture & Project Layout

```
compiler/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI REST endpoints & SPA static file server
│   │   ├── bo_engine.py         # Gaussian Process Bayesian Optimization worker
│   │   ├── compiler.py          # GCC 16.2.0 pass catalog & command synthesizer
│   │   ├── executor.py          # Subprocess compilation & monotonic timing harness
│   │   ├── database.py          # SQLite 3 relational persistence (WAL mode)
│   │   ├── config.py            # System configuration & compiler discovery
│   │   └── viva_paper.py        # Viva defense explanations & manuscript metadata
│   ├── benchmarks/              # Real C computational kernels
│   ├── data/
│   │   ├── experiments.db       # ACID SQLite database
│   │   ├── runs/                # JSON snapshots of completed optimization runs
│   │   └── exports/             # Exportable CSV benchmark traces
│   └── run_backend.py           # Launch script for backend server
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Global header with live compiler status & routing
│   │   │   ├── PipelineVisualizer.jsx # 7-stage optimization workflow diagram
│   │   │   ├── MetricCard.jsx   # Technical stat card component
│   │   │   ├── TerminalLog.jsx  # Monospace live trace log viewer
│   │   │   ├── PassSelector.jsx # Searchable compiler flag matrix with categories
│   │   │   └── VivaPaperModal.jsx # Academic manuscript & 15 viva defense Q&A
│   │   ├── pages/
│   │   │   ├── OverviewPage.jsx      # Route "/" (Dashboard & Status)
│   │   │   ├── OptimizerPage.jsx     # Route "/optimizer" (Tuning workspace)
│   │   │   ├── BenchmarksPage.jsx    # Route "/benchmarks" (Laboratory & Source)
│   │   │   ├── PassesPage.jsx        # Route "/passes" (24 GCC flag explorer)
│   │   │   ├── ExperimentsPage.jsx   # Route "/experiments" (Trace audit & CSV)
│   │   │   ├── ResultsPage.jsx       # Route "/results" (Speedup & Convergence)
│   │   │   └── SettingsPage.jsx      # Route "/settings" (Environment & Binaries)
│   │   ├── services/api.js      # Typed API client
│   │   ├── App.jsx              # Client-side router & layout
│   │   └── index.css            # Compiler engineering dark design system
│   ├── vite.config.js
│   └── package.json
├── docs/
│   ├── MANUSCRIPT.md            # Full academic paper (ACM/IEEE format)
│   ├── MANUSCRIPT.tex           # Publication-ready LaTeX source file
│   └── VIVA_DEFENSE_GUIDE.md    # Viva defense questions, parameters & answers
└── README.md
```

---

## 4. How to Launch & Run Locally

### Option A: Complete Unified Server (Recommended)
Since the production frontend build is bundled into `frontend/dist/`, you can launch the **entire platform (Frontend + Backend + Compiler Sandbox)** with one Python command:

```powershell
python backend/run_backend.py
```

Then open your browser at:
👉 **`http://127.0.0.1:8000`**

### Option B: Frontend Hot-Reload Development Mode
If modifying frontend components:

1. In Terminal 1 (Backend):
   ```powershell
   python backend/run_backend.py
   ```
2. In Terminal 2 (Frontend Dev Server):
   ```powershell
   cd frontend
   npm run dev
   ```
   Open **`http://localhost:5173`** (Vite proxies all API requests automatically to port 8000).

---

## 5. Where the Backend is & How Data is Saved

- **Backend Location:** `c:\Users\Priyanshu\OneDrive\Desktop\compiler\backend\`
- **Database Engine:** SQLite 3 configured with Write-Ahead Logging (`PRAGMA journal_mode=WAL;`) for high concurrency.
- **Database File:** `backend/data/experiments.db`
  - Table `experiments`: Stores experiment ID, benchmark name, compiler version, budget, baselines (`-O0`, `-O1`, `-O2`, `-O3`), best runtime, speedups, and timestamps.
  - Table `evaluations`: Stores step-by-step evaluations with pass flag bitmasks, compile time (ms), binary size (bytes), execution latency distribution (ms), acquisition score, and output checksum.
- **Run Snapshots:** JSON dumps in `backend/data/runs/`.
- **CSV Exports:** Downloadable via the UI or directly from `GET /api/experiments/{id}/export/csv`.

---

## 6. Academic Paper & Viva Defense Dossier

- **Academic Paper (Markdown):** `docs/MANUSCRIPT.md`
- **Publication-Ready LaTeX:** `docs/MANUSCRIPT.tex`
- **Viva Defense Questions & Model Answers:** `docs/VIVA_DEFENSE_GUIDE.md`

You can also access the interactive **"Manuscript & Viva Defense Dossier"** anytime by clicking the button in the top navigation bar of the web interface!
