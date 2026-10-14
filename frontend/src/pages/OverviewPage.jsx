import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  Layers, 
  FileCode, 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  Zap,
  Terminal,
  RefreshCw
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import PipelineVisualizer from '../components/PipelineVisualizer';
import { fetchDashboardSummary } from '../services/api';

export default function OverviewPage({ setCurrentRoute, onOpenVivaModal }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    fetchDashboardSummary()
      .then(data => {
        setSummary(data);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const latestExp = summary?.latest_experiment;
  const bestOverall = summary?.best_overall;
  const compilerInfo = summary?.compiler_info;

  return (
    <div className="space-y-6">
      {/* Top Banner / System Title */}
      <div className="tech-panel p-6 rounded relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="badge-tech badge-green">SYSTEMS RESEARCH</span>
              <span className="badge-tech badge-gray">GCC 16.2.0 TOOLCHAIN</span>
              <span className="badge-tech badge-blue">BAYESIAN OPTIMIZATION</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-mono font-bold text-[#e2e4e9] tracking-tight">
              Automatic Selection of Compiler Optimization Passes Using Bayesian Optimization
            </h1>
            <p className="text-xs sm:text-sm text-[#8b909e] mt-2 max-w-3xl leading-relaxed">
              Autonomous compiler tuning platform exploring combinatorial optimization pass spaces. 
              By training Gaussian Process surrogates with Matérn 5/2 kernels and evaluating Expected Improvement, 
              the system discovers program-specific pass configurations that circumvent the optimization paradox 
              and outperform standard <code className="text-[#38bdf8] font-mono">-O3</code> baselines in 15–25 physical evaluations.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <button
              onClick={() => setCurrentRoute('/optimizer')}
              className="btn-primary"
            >
              <Zap className="w-4 h-4" />
              <span>Launch Workspace</span>
            </button>
            <button
              onClick={onOpenVivaModal}
              className="btn-secondary"
            >
              <span>Viva Defense Dossier</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Toolchain"
          value={compilerInfo?.available ? 'GCC 16.2.0' : 'Unavailable'}
          subtext={compilerInfo?.target || 'x86_64-w64-mingw32'}
          icon={Cpu}
          color={compilerInfo?.available ? 'green' : 'gray'}
          badge={compilerInfo?.available ? 'ONLINE' : 'OFFLINE'}
        />

        <MetricCard
          title="Configured Benchmarks"
          value={summary?.benchmarks_count || 7}
          unit="C Kernels"
          subtext="Dense LinAlg, Sort, Graph, Crypto"
          icon={FileCode}
          color="blue"
        />

        <MetricCard
          title="Physical Evaluations"
          value={summary?.total_evaluations || 0}
          unit="runs"
          subtext={`${summary?.total_experiments || 0} experiments recorded`}
          icon={Activity}
          color="green"
        />

        <MetricCard
          title="Peak Speedup Recorded"
          value={bestOverall?.max_speedup_vs_o3 ? `${bestOverall.max_speedup_vs_o3}x` : '—'}
          unit={bestOverall?.best_time_ms ? `(${bestOverall.best_time_ms} ms)` : ''}
          subtext={bestOverall?.benchmark_id ? `on ${bestOverall.benchmark_id}` : 'No experiments completed yet'}
          icon={Zap}
          color="orange"
          badge={bestOverall?.max_speedup_vs_o3 && bestOverall.max_speedup_vs_o3 > 1.0 ? 'OUTPERFORMS -O3' : undefined}
        />
      </div>

      {/* Visual Optimization Pipeline */}
      <PipelineVisualizer 
        activeStep={summary?.active_optimizer_state === 'running' ? 3 : 0}
        status={summary?.active_optimizer_state || 'idle'}
      />

      {/* Two Column Layout: Latest Run Status & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Experiment Status Card */}
        <div className="lg:col-span-2 tech-panel p-5 rounded">
          <div className="flex items-center justify-between pb-3 tech-border-b mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#10b981]" />
              <h3 className="text-xs font-mono font-bold uppercase text-[#e2e4e9]">
                Latest Experiment Status
              </h3>
            </div>
            <button 
              onClick={loadData}
              className="text-[#8b909e] hover:text-[#e2e4e9] p-1 rounded hover:bg-[#1a1c22]"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {latestExp ? (
            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#121418] p-3 rounded tech-border">
                <div>
                  <div className="text-[#5c6270] text-[10px]">EXPERIMENT ID</div>
                  <div className="text-[#38bdf8] font-bold mt-0.5">{latestExp.id}</div>
                </div>
                <div>
                  <div className="text-[#5c6270] text-[10px]">BENCHMARK</div>
                  <div className="text-[#e2e4e9] font-bold mt-0.5">{latestExp.benchmark_id}</div>
                </div>
                <div>
                  <div className="text-[#5c6270] text-[10px]">STATUS</div>
                  <div className="mt-0.5">
                    <span className={`badge-tech ${latestExp.status === 'completed' ? 'badge-blue' : latestExp.status === 'running' ? 'badge-green' : 'badge-orange'}`}>
                      {latestExp.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[#5c6270] text-[10px]">BEST RUNTIME</div>
                  <div className="text-[#10b981] font-bold mt-0.5">
                    {latestExp.best_time_ms ? `${latestExp.best_time_ms} ms` : 'Evaluating...'}
                  </div>
                </div>
              </div>

              {bestOverall?.best_pass_ids && bestOverall.best_pass_ids.length > 0 && (
                <div>
                  <div className="text-[11px] text-[#8b909e] mb-1.5 font-semibold">
                    DISCOVERED OPTIMAL PASS CONFIGURATION:
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#0b0c0e] rounded tech-border">
                    {bestOverall.best_pass_ids.map(pid => (
                      <span key={pid} className="badge-tech badge-green text-[10.5px]">
                        -f{pid}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[#5c6270]">
                  Recorded on: {new Date(latestExp.created_at).toLocaleString()}
                </span>
                <button
                  onClick={() => setCurrentRoute('/experiments')}
                  className="text-xs text-[#10b981] hover:underline flex items-center gap-1 font-mono"
                >
                  <span>View All Experiment Traces</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs font-mono text-[#5c6270]">
              <div className="mb-2">No experiments recorded in SQLite database yet.</div>
              <button
                onClick={() => setCurrentRoute('/optimizer')}
                className="btn-primary text-xs mt-2"
              >
                Start First Bayesian Optimization Run
              </button>
            </div>
          )}
        </div>

        {/* Quick Navigation Panels */}
        <div className="tech-panel p-5 rounded space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase text-[#e2e4e9] pb-3 tech-border-b">
            Platform Routing
          </h3>

          <div className="space-y-2">
            {[
              { id: '/optimizer', title: 'Optimization Workspace', desc: 'Configure search space, budget & run active BO', icon: Zap },
              { id: '/benchmarks', title: 'Benchmark Laboratory', desc: 'Inspect C benchmarks & execute baselines', icon: FileCode },
              { id: '/passes', title: 'Compiler Pass Explorer', desc: 'Browse 24 GCC optimization flags & preview commands', icon: Layers },
              { id: '/results', title: 'Performance Analysis', desc: 'Compare speedup curves vs -O2 and -O3', icon: BarChart3 }
            ].map(link => {
              const Icon = link.icon;
              return (
                <div
                  key={link.id}
                  onClick={() => setCurrentRoute(link.id)}
                  className="p-2.5 rounded bg-[#16181d] hover:bg-[#1f2128] tech-border cursor-pointer transition-all flex items-start gap-3"
                >
                  <Icon className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-mono font-semibold text-[#e2e4e9]">
                      {link.title}
                    </div>
                    <div className="text-[11px] text-[#8b909e] mt-0.5 font-sans">
                      {link.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
