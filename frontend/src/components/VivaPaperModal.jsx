import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  HelpCircle, 
  Cpu, 
  Database, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { fetchVivaMetadata, fetchManuscriptMarkdown, fetchVivaGuideMarkdown } from '../services/api';

export default function VivaPaperModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('viva_qa'); // 'viva_qa', 'parameters', 'algorithm', 'dataset', 'architecture', 'manuscript'
  const [vivaData, setVivaData] = useState(null);
  const [manuscriptText, setManuscriptText] = useState('');
  const [copied, setCopied] = useState(false);
  const [openQAs, setOpenQAs] = useState({ 0: true, 1: true });

  useEffect(() => {
    if (isOpen) {
      fetchVivaMetadata().then(setVivaData).catch(console.error);
      fetchManuscriptMarkdown().then(res => setManuscriptText(res.content)).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleQA = (idx) => {
    setOpenQAs(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopyManuscript = () => {
    navigator.clipboard.writeText(manuscriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename, content) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#121418] tech-border rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#16181d] tech-border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#f97316]/10 text-[#f97316] tech-border border-[#f97316]/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-[#e2e4e9]">
                ACADEMIC RESEARCH MANUSCRIPT & VIVA DEFENSE DOSSIER
              </h2>
              <p className="text-xs text-[#8b909e] font-sans">
                Automatic Compiler Optimization Using Bayesian Optimization — Computer Science Project Defense
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#8b909e] hover:text-[#e2e4e9] p-1.5 rounded hover:bg-[#1f2128]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap bg-[#0e1014] tech-border-b px-4 text-xs font-mono">
          {[
            { id: 'viva_qa', label: '1. Viva Defense Q&A' },
            { id: 'parameters', label: '2. Parameters & Hyperspace' },
            { id: 'algorithm', label: '3. Algorithm & Math' },
            { id: 'dataset', label: '4. Real Benchmarks' },
            { id: 'architecture', label: '5. Backend & Database' },
            { id: 'manuscript', label: '6. Research Manuscript (IEEE/ACM)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3 text-xs font-mono border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#f97316] text-[#fb923c] bg-[#16181d]/50 font-semibold'
                  : 'border-transparent text-[#8b909e] hover:text-[#e2e4e9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm font-sans space-y-6">
          {/* TAB 1: VIVA DEFENSE Q&A */}
          {activeTab === 'viva_qa' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#16181d] tech-border rounded text-xs font-mono text-[#fb923c] border-l-4 border-l-[#f97316]">
                💡 <strong>Viva Tip for Examiner:</strong> Focus on why standard -O3 leads to performance regressions (the "Optimization Paradox"), how Gaussian Process quantifies uncertainty, and why median timing with nanosecond resolution rejects OS jitter.
              </div>

              <div className="space-y-3">
                {vivaData?.viva_questions?.map((item, idx) => (
                  <div key={idx} className="tech-panel rounded overflow-hidden">
                    <button
                      onClick={() => toggleQA(idx)}
                      className="w-full p-3.5 flex items-center justify-between text-left text-xs font-mono font-bold text-[#e2e4e9] bg-[#181a20] hover:bg-[#1f222a] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[#f97316]">Q{idx + 1}:</span>
                        <span>{item.q}</span>
                      </span>
                      {openQAs[idx] ? <ChevronUp className="w-4 h-4 text-[#8b909e]" /> : <ChevronDown className="w-4 h-4 text-[#8b909e]" />}
                    </button>
                    {openQAs[idx] && (
                      <div className="p-4 text-xs font-sans text-[#c8cbd5] leading-relaxed bg-[#121418] tech-border-t">
                        <div className="font-mono text-[11px] text-[#10b981] mb-1 font-semibold">MODEL ANSWER:</div>
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PARAMETERS */}
          {activeTab === 'parameters' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="tech-panel rounded p-4">
                <h3 className="text-xs font-bold text-[#f97316] uppercase mb-3">
                  Summary of System Parameters (Viva Reference)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="tech-border-b text-left text-[#8b909e] text-[11px]">
                        <th className="py-2 px-3">Parameter Name</th>
                        <th className="py-2 px-3">Value in System</th>
                        <th className="py-2 px-3">Engineering Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#272a33]">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#e2e4e9]">Search Space Dimension (D)</td>
                        <td className="py-2.5 px-3 text-[#38bdf8]">24 binary passes</td>
                        <td className="py-2.5 px-3 text-[#8b909e] font-sans">Spans 2^24 = 16,777,216 combinatorial flag combinations across vectorization, loops, inlining, and SSA.</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#e2e4e9]">Surrogate Model</td>
                        <td className="py-2.5 px-3 text-[#38bdf8]">Gaussian Process Regression (GPR)</td>
                        <td className="py-2.5 px-3 text-[#8b909e] font-sans">Non-parametric Bayesian model quantifying mean μ(x) and epistemic uncertainty σ(x).</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#e2e4e9]">Covariance Kernel</td>
                        <td className="py-2.5 px-3 text-[#38bdf8]">Matérn 5/2 (ν = 2.5)</td>
                        <td className="py-2.5 px-3 text-[#8b909e] font-sans">Models realistic non-smooth compiler response surfaces without assuming infinite differentiability (unlike RBF).</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#e2e4e9]">Measurement Regularizer</td>
                        <td className="py-2.5 px-3 text-[#38bdf8]">WhiteKernel(noise=1e-3)</td>
                        <td className="py-2.5 px-3 text-[#8b909e] font-sans">Accommodates microarchitectural execution timing variance and OS context switches.</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#e2e4e9]">Acquisition Strategy</td>
                        <td className="py-2.5 px-3 text-[#38bdf8]">Expected Improvement (EI)</td>
                        <td className="py-2.5 px-3 text-[#8b909e] font-sans">Computes expectation of improvement below incumbent best runtime y*.</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#e2e4e9]">Exploration Factor (ξ)</td>
                        <td className="py-2.5 px-3 text-[#38bdf8]">0.01</td>
                        <td className="py-2.5 px-3 text-[#8b909e] font-sans">Minimum margin required over best-so-far to encourage exploration of unvisited Hamming spaces.</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#e2e4e9]">Evaluation Budget (T)</td>
                        <td className="py-2.5 px-3 text-[#38bdf8]">15 – 25 iterations</td>
                        <td className="py-2.5 px-3 text-[#8b909e] font-sans">Sufficient for GP convergence while completing physical compilations within 60–120 seconds.</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#e2e4e9]">Repetitions per Eval (K)</td>
                        <td className="py-2.5 px-3 text-[#38bdf8]">3 runs (Median)</td>
                        <td className="py-2.5 px-3 text-[#8b909e] font-sans">Median computation after 1 warmup run rejects non-Gaussian OS scheduling spikes.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALGORITHM */}
          {activeTab === 'algorithm' && (
            <div className="space-y-4">
              <div className="tech-panel p-4 rounded text-xs font-mono space-y-3">
                <div className="text-sm font-bold text-[#10b981]">
                  Algorithm: Sequential Model-Based Optimization with Gaussian Process (SMBO-GP)
                </div>
                <pre className="bg-[#0b0c0e] p-3 rounded tech-border text-[#e2e4e9] overflow-x-auto leading-relaxed">
{`1. Input: Benchmark B, Search Space X = {0, 1}^24, Budget T, Acquisition α(x)
2. Calibrate Baselines:
   Measure y_O0, y_O1, y_O2, y_O3 by compiling B with standard GCC levels.
3. Initial Exploration (t = 1 to N_0 = 5):
   Sample candidate masks uniformly at random: x_t ~ Uniform(X)
   Compile B with x_t; measure median execution time y_t.
   Initialize Dataset D = {(x_1, y_1), ..., (x_N0, y_N0)}.
4. Active Bayesian Optimization (t = N_0 + 1 to T):
   a. Fit Gaussian Process: GPR(x) on D using Matérn-5/2 kernel:
      k(x, x') = σ_f^2 (1 + √5 d/l + 5 d^2 / (3 l^2)) exp(-√5 d/l) + σ_n^2
   b. Generate Candidate Pool: 
      Hamming 1-bit & 2-bit flips around current incumbent x* + uniform samples.
   c. Optimize Acquisition Function:
      Compute Expected Improvement:
      EI(x) = (y* - μ(x) - ξ) Φ(Z) + σ(x) φ(Z) where Z = (y* - μ(x) - ξ) / σ(x)
      Select candidate x_t = argmax EI(x).
   d. Physical Compilation & Execution:
      Invoke: gcc [base_opt] [flags(x_t)] B.c -o B.exe
      Execute binary K=3 times; record median execution latency y_t.
   e. Update incumbent: If y_t < y*, set y* = y_t and x* = x_t.
   f. Augment Dataset: D = D ∪ {(x_t, y_t)}.
5. Output: Optimal configuration x*, best execution time y*, and speedup vs -O3.`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: REAL BENCHMARKS */}
          {activeTab === 'dataset' && (
            <div className="space-y-4">
              <div className="tech-panel p-4 rounded">
                <h3 className="text-xs font-mono font-bold text-[#e2e4e9] mb-3">
                  Verified Real-Life C Benchmark Suite (In Repository)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {vivaData?.dataset?.map((bench) => (
                    <div key={bench.id} className="tech-card p-3 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-[#e2e4e9]">{bench.name}</span>
                        <span className="badge-tech badge-blue text-[10px]">{bench.category}</span>
                      </div>
                      <div className="font-mono text-[11px] text-[#38bdf8] mb-1.5">{bench.file}</div>
                      <div className="text-[#8b909e] text-xs space-y-1">
                        <div><strong className="text-[#c8cbd5]">Workload:</strong> {bench.workload}</div>
                        <div><strong className="text-[#c8cbd5]">Passes Target:</strong> {bench.optimization_targets}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ARCHITECTURE & PERSISTENCE */}
          {activeTab === 'architecture' && (
            <div className="space-y-4 text-xs font-mono">
              <div className="tech-panel p-4 rounded space-y-3">
                <div className="text-sm font-bold text-[#38bdf8]">
                  Backend Location & Database Persistence Architecture
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="font-bold text-[#e2e4e9]">1. Backend Service</div>
                    <div className="text-[#8b909e] space-y-1">
                      <div>• <strong>Directory:</strong> <code className="text-[#38bdf8]">backend/</code></div>
                      <div>• <strong>Entry Point:</strong> <code className="text-[#38bdf8]">backend/run_backend.py</code></div>
                      <div>• <strong>Framework:</strong> FastAPI on Uvicorn ASGI Server (Port 8000)</div>
                      <div>• <strong>Engine:</strong> <code className="text-[#38bdf8]">backend/app/bo_engine.py</code> (Background Worker Thread)</div>
                      <div>• <strong>Harness:</strong> <code className="text-[#38bdf8]">backend/app/executor.py</code> (Nanosecond Monotonic Timer)</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-[#e2e4e9]">2. Database Persistence</div>
                    <div className="text-[#8b909e] space-y-1">
                      <div>• <strong>DB File:</strong> <code className="text-[#10b981]">backend/data/experiments.db</code></div>
                      <div>• <strong>Engine:</strong> SQLite 3 with Write-Ahead Logging (WAL mode)</div>
                      <div>• <strong>Tables:</strong> <code className="text-[#10b981]">experiments</code> (ACID run records) and <code className="text-[#10b981]">evaluations</code> (iteration steps)</div>
                      <div>• <strong>Run Logs:</strong> <code className="text-[#10b981]">backend/data/runs/*.json</code></div>
                      <div>• <strong>Exports:</strong> <code className="text-[#10b981]">backend/data/exports/*.csv</code></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MANUSCRIPT */}
          {activeTab === 'manuscript' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 tech-border-b">
                <div className="text-xs font-mono text-[#8b909e]">
                  Full IEEE/ACM Academic Manuscript (Markdown & LaTeX Source)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyManuscript}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                  <button
                    onClick={() => handleDownload('MANUSCRIPT.md', manuscriptText)}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .md</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#0b0c0e] p-4 rounded tech-border max-h-[60vh] overflow-y-auto font-mono text-xs text-[#c8cbd5] leading-relaxed whitespace-pre-wrap select-text">
                {manuscriptText}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#16181d] tech-border-t flex items-center justify-between text-xs font-mono text-[#8b909e]">
          <span>Department of Computer Science & Engineering — Systems & Compilers Laboratory</span>
          <button onClick={onClose} className="btn-secondary text-xs">
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
