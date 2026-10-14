import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Play, 
  Code2, 
  Eye, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Layers, 
  X,
  Copy,
  Check
} from 'lucide-react';
import { fetchBenchmarks, fetchBenchmarkSource, runBenchmarkBaselines } from '../services/api';

export default function BenchmarksPage({ setCurrentRoute }) {
  const [benchmarks, setBenchmarks] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeBenchmark, setActiveBenchmark] = useState(null);
  const [sourceCodeModal, setSourceCodeModal] = useState(null);
  const [baselineResults, setBaselineResults] = useState({});
  const [runningBaselines, setRunningBaselines] = useState({});
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetchBenchmarks().then(data => {
      setBenchmarks(data);
      if (data.length > 0) setActiveBenchmark(data[0]);
    }).catch(console.error);
  }, []);

  const categories = ['ALL', ...Array.from(new Set(benchmarks.map(b => b.category)))];

  const filteredBenchmarks = selectedCategory === 'ALL'
    ? benchmarks
    : benchmarks.filter(b => b.category === selectedCategory);

  const handleInspectSource = async (benchmarkId) => {
    try {
      const res = await fetchBenchmarkSource(benchmarkId);
      setSourceCodeModal(res);
    } catch (err) {
      alert(`Failed to load source code: ${err.message}`);
    }
  };

  const handleRunBaselines = async (benchmarkId) => {
    setRunningBaselines(prev => ({ ...prev, [benchmarkId]: true }));
    try {
      const res = await runBenchmarkBaselines(benchmarkId);
      setBaselineResults(prev => ({ ...prev, [benchmarkId]: res.baselines }));
    } catch (err) {
      alert(`Baseline execution error: ${err.message}`);
    } finally {
      setRunningBaselines(prev => ({ ...prev, [benchmarkId]: false }));
    }
  };

  const handleCopySource = () => {
    if (sourceCodeModal?.code) {
      navigator.clipboard.writeText(sourceCodeModal.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="tech-panel p-5 rounded">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-tech badge-green">BENCHMARK LABORATORY</span>
              <span className="badge-tech badge-blue">{benchmarks.length} C WORKLOADS</span>
            </div>
            <h1 className="text-lg font-mono font-bold text-[#e2e4e9]">
              C/C++ Workload Suite & Baseline Performance Profiling
            </h1>
            <p className="text-xs text-[#8b909e] mt-1 font-sans">
              Real computational kernels in C designed to stress memory hierarchy, cache tiling, branch predictors, and vectorization pipelines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentRoute('/optimizer')}
              className="btn-primary text-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Optimize Selected Kernel</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 tech-border-t text-xs font-mono">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/50 font-semibold'
                  : 'bg-[#16181d] text-[#8b909e] hover:text-[#e2e4e9] tech-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredBenchmarks.map(bench => {
          const baselines = baselineResults[bench.id];
          const isRunning = runningBaselines[bench.id];

          return (
            <div key={bench.id} className="tech-panel p-5 rounded space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#1c1e24] tech-border flex items-center justify-center text-[#10b981]">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-[#e2e4e9]">
                      {bench.name}
                    </h3>
                    <code className="text-[11px] font-mono text-[#38bdf8]">
                      backend/benchmarks/{bench.source_file}
                    </code>
                  </div>
                </div>

                <span className="badge-tech badge-blue text-[10.5px]">
                  {bench.category}
                </span>
              </div>

              <p className="text-xs text-[#8b909e] font-sans leading-relaxed">
                {bench.description}
              </p>

              {/* Workload Parameters & Complexity */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#121418] p-3 rounded tech-border">
                <div>
                  <span className="text-[#5c6270] text-[10px] block">DEFAULT WORKLOAD</span>
                  <span className="text-[#e2e4e9] font-medium">{bench.default_param}</span>
                </div>
                <div>
                  <span className="text-[#5c6270] text-[10px] block">TIME COMPLEXITY</span>
                  <span className="text-[#fb923c] font-medium">{bench.complexity}</span>
                </div>
              </div>

              {/* Target GCC Optimization Passes */}
              <div>
                <span className="text-[10px] font-mono text-[#5c6270] uppercase tracking-wider block mb-1.5">
                  Primary Optimization Target Passes:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {bench.target_passes.map(tp => (
                    <span key={tp} className="badge-tech badge-gray text-[10.5px]">
                      {tp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Baseline Execution Section */}
              <div className="pt-2 tech-border-t">
                {baselines ? (
                  <div className="space-y-2">
                    <span className="text-[10.5px] font-mono text-[#10b981] font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Physical Baseline Profiling Results (ms):</span>
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-xs font-mono text-center">
                      {['-O0', '-O1', '-O2', '-O3'].map(lvl => {
                        const run = baselines[lvl];
                        return (
                          <div key={lvl} className="bg-[#14161c] p-2 rounded tech-border">
                            <div className="text-[#5c6270] text-[10px]">{lvl}</div>
                            <div className="text-[#e2e4e9] font-bold mt-0.5">
                              {run?.execution_time_ms ? `${run.execution_time_ms}` : 'ERR'}
                            </div>
                            <div className="text-[9.5px] text-[#5c6270] mt-0.5">
                              {run?.compile_time_ms ? `${run.compile_time_ms}ms c` : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#5c6270]">
                      Baselines unmeasured for current session
                    </span>
                    <button
                      onClick={() => handleRunBaselines(bench.id)}
                      disabled={isRunning}
                      className="btn-secondary text-xs"
                    >
                      <Play className="w-3 h-3 text-[#10b981]" />
                      <span>{isRunning ? 'Compiling (-O0..-O3)...' : 'Run Baselines'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => handleInspectSource(bench.id)}
                  className="text-xs font-mono text-[#38bdf8] hover:underline flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Inspect C Source</span>
                </button>

                <button
                  onClick={() => handleRunBaselines(bench.id)}
                  disabled={isRunning}
                  className="text-xs font-mono text-[#8b909e] hover:text-[#e2e4e9] flex items-center gap-1"
                >
                  <span>Re-measure Baselines</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Source Code Modal */}
      {sourceCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#121418] tech-border rounded-lg max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3.5 bg-[#16181d] tech-border-b flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#10b981]" />
                <span className="text-[#e2e4e9] font-bold">{sourceCodeModal.filename}</span>
                <span className="text-[#5c6270]">(High-precision timing harness)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySource}
                  className="text-[#8b909e] hover:text-[#e2e4e9] p-1.5 rounded hover:bg-[#1f2128]"
                  title="Copy code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setSourceCodeModal(null)}
                  className="text-[#8b909e] hover:text-[#e2e4e9] p-1.5 rounded hover:bg-[#1f2128]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-[#0b0c0e]">
              <pre className="font-mono text-xs text-[#c8cbd5] leading-relaxed whitespace-pre select-text">
                {sourceCodeModal.code}
              </pre>
            </div>

            <div className="p-3 bg-[#16181d] tech-border-t flex items-center justify-between text-xs font-mono text-[#8b909e]">
              <span>Verified C benchmark with timespec_get nanosecond measurement</span>
              <button
                onClick={() => setSourceCodeModal(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
