import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Zap, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight,
  RefreshCw,
  Layers
} from 'lucide-react';
import { fetchResultsAnalysis, fetchExperiments, fetchExperiment } from '../services/api';

export default function ResultsPage({ setCurrentRoute }) {
  const [analysis, setAnalysis] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [selectedExpId, setSelectedExpId] = useState(null);
  const [selectedExpFull, setSelectedExpFull] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchResultsAnalysis(),
      fetchExperiments(50)
    ]).then(([anaRes, expList]) => {
      setAnalysis(anaRes);
      setExperiments(expList);
      if (expList.length > 0 && !selectedExpId) {
        setSelectedExpId(expList[0].id);
      }
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedExpId) {
      fetchExperiment(selectedExpId)
        .then(setSelectedExpFull)
        .catch(console.error);
    }
  }, [selectedExpId]);

  const summaries = analysis?.benchmark_summaries || [];

  // Compute convergence curve points for the selected experiment
  const evaluations = selectedExpFull?.evaluations || [];
  let runningBest = Infinity;
  const convergencePoints = evaluations
    .filter(e => e.execution_time_ms !== null)
    .map(e => {
      if (e.execution_time_ms < runningBest) runningBest = e.execution_time_ms;
      return {
        eval_number: e.eval_number,
        time_ms: e.execution_time_ms,
        best_so_far: runningBest,
        is_best: e.is_best === 1
      };
    });

  const maxVal = convergencePoints.length > 0 ? Math.max(...convergencePoints.map(p => p.time_ms)) : 100;
  const minVal = convergencePoints.length > 0 ? Math.min(...convergencePoints.map(p => p.best_so_far)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="tech-panel p-5 rounded">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-tech badge-green">PERFORMANCE ANALYSIS</span>
              <span className="badge-tech badge-orange">CONVERGENCE & SPEEDUPS</span>
            </div>
            <h1 className="text-lg font-mono font-bold text-[#e2e4e9]">
              Comparative Optimization Metrics & Empirical Speedup Validation
            </h1>
            <p className="text-xs text-[#8b909e] mt-1 font-sans">
              Rigorous comparative analysis across conventional GCC levels (<code className="text-[#38bdf8]">-O0</code>, <code className="text-[#38bdf8]">-O1</code>, <code className="text-[#38bdf8]">-O2</code>, <code className="text-[#38bdf8]">-O3</code>) versus Bayesian Optimization synthesized configurations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={loadData} className="btn-secondary text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <button onClick={() => setCurrentRoute('/optimizer')} className="btn-primary text-xs">
              <Zap className="w-3.5 h-3.5" />
              <span>New Benchmark Run</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Benchmark Summary Table */}
      <div className="tech-panel p-5 rounded space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#10b981]" />
            <h2 className="text-xs font-mono font-bold uppercase text-[#e2e4e9]">
              Cross-Benchmark Speedup Matrix vs Conventional -O2 and -O3
            </h2>
          </div>
          <span className="text-xs font-mono text-[#8b909e]">
            {summaries.length} Workloads Analyzed
          </span>
        </div>

        {summaries.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-[#5c6270]">
            No completed optimization runs recorded yet. Run experiments to view real baseline comparisons.
          </div>
        ) : (
          <div className="overflow-x-auto tech-border rounded">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-[#14161c] text-[#8b909e] tech-border-b text-[11px]">
                  <th className="p-3">Benchmark</th>
                  <th className="p-3">Baseline -O2</th>
                  <th className="p-3">Baseline -O3</th>
                  <th className="p-3">Best BO Config</th>
                  <th className="p-3">Speedup vs -O2</th>
                  <th className="p-3">Speedup vs -O3</th>
                  <th className="p-3">Discovered Passes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22252e]">
                {summaries.map(bs => {
                  const spO3 = bs.max_speedup_vs_o3;
                  const isImprovement = spO3 && spO3 >= 1.0;
                  return (
                    <tr key={bs.benchmark_id} className="hover:bg-[#16181f]">
                      <td className="p-3 font-bold text-[#e2e4e9]">
                        {bs.benchmark_id}
                      </td>
                      <td className="p-3 text-[#8b909e]">
                        {bs.baseline_o2 ? `${bs.baseline_o2} ms` : '—'}
                      </td>
                      <td className="p-3 text-[#38bdf8]">
                        {bs.baseline_o3 ? `${bs.baseline_o3} ms` : '—'}
                      </td>
                      <td className="p-3 font-bold text-[#10b981]">
                        {bs.best_bo_time !== Infinity ? `${bs.best_bo_time} ms` : '—'}
                      </td>
                      <td className="p-3 text-[#e2e4e9]">
                        {bs.max_speedup_vs_o2 ? `${bs.max_speedup_vs_o2}x` : '—'}
                      </td>
                      <td className="p-3">
                        <span className={`badge-tech ${isImprovement ? 'badge-green' : 'badge-orange'}`}>
                          {spO3 ? `${spO3}x` : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-[10.5px] text-[#8b909e] truncate max-w-xs">
                        {bs.best_pass_ids ? bs.best_pass_ids.join(' ') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Experiment Convergence Analysis */}
      {selectedExpFull && (
        <div className="tech-panel p-5 rounded space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 tech-border-b">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#f97316]" />
              <h3 className="text-xs font-mono font-bold uppercase text-[#e2e4e9]">
                Sequential Convergence Curve — {selectedExpFull.name} ({selectedExpFull.benchmark_id})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#8b909e]">Select Run:</span>
              <select
                value={selectedExpId || ''}
                onChange={(e) => setSelectedExpId(e.target.value)}
                className="bg-[#16181d] text-xs font-mono text-[#e2e4e9] tech-border rounded px-2.5 py-1"
              >
                {experiments.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.id})
                  </option>
                ))}
              </select>

              <a
                href={`/api/experiments/${selectedExpId}/export/csv`}
                download
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
            </div>
          </div>

          {/* Convergence Chart (Visual bar & step trace) */}
          <div className="bg-[#0b0c0e] p-4 rounded tech-border space-y-4">
            <div className="flex items-center justify-between text-[11px] text-[#8b909e]">
              <span>Iteration Progress & Measured Runtimes (ms):</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#10b981] rounded-xs inline-block"></span>
                  <span>New Best Minimum</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#38bdf8] rounded-xs inline-block"></span>
                  <span>Evaluated Candidate</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-[#f97316] inline-block"></span>
                  <span>-O3 Baseline</span>
                </span>
              </div>
            </div>

            {/* Custom SVG / Structured Bar Chart */}
            <div className="h-56 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-l border-[#272a33] overflow-x-auto">
              {convergencePoints.map(pt => {
                const heightPct = Math.max(10, Math.min(100, Math.round((pt.time_ms / maxVal) * 100)));
                const bestPct = Math.max(10, Math.min(100, Math.round((pt.best_so_far / maxVal) * 100)));

                return (
                  <div key={pt.eval_number} className="flex-1 min-w-8 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-14 hidden group-hover:flex flex-col items-center bg-[#181a20] tech-border p-1.5 rounded z-20 text-[10px] whitespace-nowrap shadow-lg">
                      <span className="text-[#e2e4e9]">Iter {pt.eval_number}: {pt.time_ms} ms</span>
                      <span className="text-[#10b981]">Best: {pt.best_so_far} ms</span>
                    </div>

                    <div className="w-full flex justify-center items-end h-40">
                      <div 
                        className={`w-4/5 rounded-xs transition-all ${
                          pt.is_best ? 'bg-[#10b981]' : 'bg-[#38bdf8]/40 hover:bg-[#38bdf8]/70'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-[#5c6270]">
                      #{pt.eval_number}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Baseline comparison metrics bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#121418] p-3 rounded tech-border text-center text-xs">
              <div>
                <span className="text-[#5c6270] text-[10.5px]">OPTIMIZATION BASELINE (-O3)</span>
                <div className="text-[#f97316] font-bold text-sm mt-0.5">
                  {selectedExpFull.baseline_o3_time ? `${selectedExpFull.baseline_o3_time} ms` : '—'}
                </div>
              </div>
              <div>
                <span className="text-[#5c6270] text-[10.5px]">BEST DISCOVERED RUNTIME</span>
                <div className="text-[#10b981] font-bold text-sm mt-0.5">
                  {selectedExpFull.best_time_ms ? `${selectedExpFull.best_time_ms} ms` : '—'}
                </div>
              </div>
              <div>
                <span className="text-[#5c6270] text-[10.5px]">NET SPEEDUP RATIO</span>
                <div className="text-[#38bdf8] font-bold text-sm mt-0.5">
                  {selectedExpFull.speedup_vs_o3 ? `${selectedExpFull.speedup_vs_o3}x` : '—'}
                </div>
              </div>
              <div>
                <span className="text-[#5c6270] text-[10.5px]">TOTAL SEARCH TIME</span>
                <div className="text-[#e2e4e9] font-bold text-sm mt-0.5">
                  {selectedExpFull.total_duration_sec ? `${selectedExpFull.total_duration_sec} s` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
