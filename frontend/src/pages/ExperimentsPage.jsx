import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Zap, 
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { fetchExperiments, fetchExperiment, deleteExperiment } from '../services/api';

export default function ExperimentsPage({ setCurrentRoute }) {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = () => {
    setLoading(true);
    fetchExperiments(50)
      .then(data => {
        setExperiments(data);
        if (data.length > 0 && !expandedId) {
          handleToggleExpand(data[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleExpand = async (expId) => {
    if (expandedId === expId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(expId);
    if (!expandedDetails[expId]) {
      try {
        const full = await fetchExperiment(expId);
        setExpandedDetails(prev => ({ ...prev, [expId]: full }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDelete = async (expId) => {
    if (confirm(`Delete experiment ${expId} and its associated evaluations?`)) {
      await deleteExperiment(expId);
      loadData();
    }
  };

  const filteredExperiments = experiments.filter(e => {
    const matchesSearch = e.id.toLowerCase().includes(search.toLowerCase()) ||
                          e.benchmark_id.toLowerCase().includes(search.toLowerCase()) ||
                          e.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="tech-panel p-5 rounded">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-tech badge-green">EXPERIMENT TRACKING</span>
              <span className="badge-tech badge-blue">ACID SQLITE STORAGE</span>
            </div>
            <h1 className="text-lg font-mono font-bold text-[#e2e4e9]">
              Physical Compilation & Optimization Evaluation Traces
            </h1>
            <p className="text-xs text-[#8b909e] mt-1 font-sans">
              Reproducible audit logs of Bayesian Optimization iterations, capturing exact pass bitmasks, compilation time, binary sizes, and nanosecond runtime distributions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="btn-secondary text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Records</span>
            </button>
            <button
              onClick={() => setCurrentRoute('/optimizer')}
              className="btn-primary text-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>New Experiment</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 tech-border-t text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#8b909e]">Filter:</span>
            {['ALL', 'completed', 'running', 'stopped', 'failed'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded capitalize ${
                  statusFilter === st
                    ? 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/50 font-bold'
                    : 'bg-[#16181d] text-[#8b909e] hover:text-[#e2e4e9] tech-border'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5c6270] absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search experiments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#16181d] text-xs font-mono text-[#e2e4e9] pl-8 pr-3 py-1 rounded tech-border focus:outline-none focus:border-[#10b981] w-48 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* Experiments List */}
      {filteredExperiments.length === 0 ? (
        <div className="tech-panel p-10 rounded text-center text-xs font-mono text-[#5c6270]">
          No experiments match current query or none recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExperiments.map(exp => {
            const isExpanded = expandedId === exp.id;
            const fullData = expandedDetails[exp.id];
            const bestPasses = exp.best_pass_ids ? JSON.parse(exp.best_pass_ids) : [];

            return (
              <div key={exp.id} className="tech-panel rounded overflow-hidden">
                {/* Experiment Row Header */}
                <div 
                  onClick={() => handleToggleExpand(exp.id)}
                  className="p-4 bg-[#14161c] hover:bg-[#181b22] cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#1c1e24] tech-border flex items-center justify-center text-[#10b981] font-mono font-bold text-xs">
                      EXP
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#e2e4e9]">
                          {exp.name}
                        </span>
                        <code className="text-[11px] font-mono text-[#38bdf8] bg-[#0b0c0e] px-1.5 py-0.2 rounded">
                          {exp.id}
                        </code>
                        <span className={`badge-tech ${
                          exp.status === 'completed' ? 'badge-blue' :
                          exp.status === 'running' ? 'badge-green animate-pulse' : 'badge-orange'
                        }`}>
                          {exp.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#8b909e] mt-0.5">
                        Benchmark: <strong className="text-[#e2e4e9]">{exp.benchmark_id}</strong> | Method: <strong className="text-[#10b981]">BO ({exp.acquisition?.toUpperCase() || 'EI'})</strong> | Created: {new Date(exp.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Stats on Row */}
                  <div className="flex items-center gap-4 font-mono text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-[#5c6270] block">BEST RUNTIME</span>
                      <span className="text-[#10b981] font-bold">
                        {exp.best_time_ms ? `${exp.best_time_ms} ms` : '—'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#5c6270] block">SPEEDUP VS -O3</span>
                      <span className={`font-bold ${exp.speedup_vs_o3 && exp.speedup_vs_o3 > 1.0 ? 'text-[#f97316]' : 'text-[#8b909e]'}`}>
                        {exp.speedup_vs_o3 ? `${exp.speedup_vs_o3}x` : '—'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#5c6270] block">PROGRESS</span>
                      <span className="text-[#e2e4e9]">
                        {exp.evaluations_completed} / {exp.budget}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pl-2">
                      <a
                        href={`/api/experiments/${exp.id}/export/csv`}
                        onClick={(e) => e.stopPropagation()}
                        download
                        className="p-1.5 rounded bg-[#1c1e24] hover:bg-[#22252e] text-[#8b909e] hover:text-[#e2e4e9] tech-border"
                        title="Export as CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
                        className="p-1.5 rounded bg-[#1c1e24] hover:bg-[#2e1d1d] text-[#8b909e] hover:text-[#f87171] tech-border"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button className="text-[#8b909e] p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Trace View */}
                {isExpanded && (
                  <div className="p-5 tech-border-t bg-[#0e1014] space-y-4 font-mono text-xs">
                    {/* Baselines comparison header */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#121418] p-3 rounded tech-border text-center">
                      <div>
                        <span className="text-[#5c6270] text-[10px]">BASELINE -O0</span>
                        <div className="text-[#e2e4e9] font-bold mt-0.5">{exp.baseline_o0_time ? `${exp.baseline_o0_time} ms` : '—'}</div>
                      </div>
                      <div>
                        <span className="text-[#5c6270] text-[10px]">BASELINE -O1</span>
                        <div className="text-[#e2e4e9] font-bold mt-0.5">{exp.baseline_o1_time ? `${exp.baseline_o1_time} ms` : '—'}</div>
                      </div>
                      <div>
                        <span className="text-[#5c6270] text-[10px]">BASELINE -O2</span>
                        <div className="text-[#e2e4e9] font-bold mt-0.5">{exp.baseline_o2_time ? `${exp.baseline_o2_time} ms` : '—'}</div>
                      </div>
                      <div>
                        <span className="text-[#5c6270] text-[10px]">BASELINE -O3</span>
                        <div className="text-[#38bdf8] font-bold mt-0.5">{exp.baseline_o3_time ? `${exp.baseline_o3_time} ms` : '—'}</div>
                      </div>
                    </div>

                    {/* Discovered Best Pass Sequence */}
                    {bestPasses.length > 0 && (
                      <div>
                        <span className="text-[#8b909e] text-[11px] block mb-1 font-semibold">
                          Optimal Discovered Pass Sequence ({bestPasses.length} active passes):
                        </span>
                        <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#14161c] rounded tech-border">
                          {bestPasses.map(pid => (
                            <span key={pid} className="badge-tech badge-green text-[10.5px]">
                              -f{pid}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step-by-Step Evaluations Table */}
                    <div className="overflow-x-auto tech-border rounded">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#16181d] text-[#8b909e] tech-border-b">
                            <th className="p-2.5">#</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Execution Time</th>
                            <th className="p-2.5">Compile Time</th>
                            <th className="p-2.5">Binary Size</th>
                            <th className="p-2.5">Acquisition</th>
                            <th className="p-2.5">Checksum</th>
                            <th className="p-2.5">Active Passes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#22252e]">
                          {fullData?.evaluations?.map(ev => {
                            const pList = ev.pass_ids ? JSON.parse(ev.pass_ids) : [];
                            return (
                              <tr 
                                key={ev.id}
                                className={`hover:bg-[#14161c] ${ev.is_best ? 'bg-[#10b981]/5 text-[#34d399]' : ''}`}
                              >
                                <td className="p-2.5 font-bold">
                                  {ev.eval_number} {ev.is_best ? '★' : ''}
                                </td>
                                <td className="p-2.5">
                                  <span className={`badge-tech ${ev.status === 'success' ? 'badge-green' : 'badge-red'}`}>
                                    {ev.status}
                                  </span>
                                </td>
                                <td className="p-2.5 font-bold text-[#e2e4e9]">
                                  {ev.execution_time_ms ? `${ev.execution_time_ms} ms` : '—'}
                                </td>
                                <td className="p-2.5 text-[#8b909e]">
                                  {ev.compile_time_ms ? `${ev.compile_time_ms} ms` : '—'}
                                </td>
                                <td className="p-2.5 text-[#8b909e]">
                                  {ev.binary_size_bytes ? `${(ev.binary_size_bytes / 1024).toFixed(1)} KB` : '—'}
                                </td>
                                <td className="p-2.5 text-[#38bdf8]">
                                  {ev.acquisition_val !== null ? ev.acquisition_val : '—'}
                                </td>
                                <td className="p-2.5 text-[#5c6270] truncate max-w-28">
                                  {ev.checksum || '—'}
                                </td>
                                <td className="p-2.5 text-[#8b909e] truncate max-w-xs">
                                  {pList.join(' ')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
