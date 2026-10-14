import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Sliders, 
  Cpu, 
  FileCode, 
  Copy, 
  Check, 
  Zap, 
  Terminal as TerminalIcon,
  Layers,
  ArrowRight
} from 'lucide-react';
import PassSelector from '../components/PassSelector';
import TerminalLog from '../components/TerminalLog';
import MetricCard from '../components/MetricCard';
import { 
  fetchBenchmarks, 
  fetchPasses, 
  startOptimizer, 
  pauseOptimizer, 
  resumeOptimizer, 
  stopOptimizer, 
  fetchOptimizerStatus,
  evaluateCustomPasses,
  previewCompilerCommand 
} from '../services/api';

export default function OptimizerPage() {
  const [benchmarks, setBenchmarks] = useState([]);
  const [passes, setPasses] = useState([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState('matrix_mul');
  const [baseOpt, setBaseOpt] = useState('-O1');
  const [selectedPassIds, setSelectedPassIds] = useState([]);
  
  // BO Hyperparameters
  const [budget, setBudget] = useState(15);
  const [initEvals, setInitEvals] = useState(5);
  const [acquisition, setAcquisition] = useState('ei');
  const [xi, setXi] = useState(0.01);
  const [kappa, setKappa] = useState(2.576);

  // Runtime State
  const [optimizerStatus, setOptimizerStatus] = useState({
    state: 'idle',
    progress: {},
    events: []
  });
  const [customResult, setCustomResult] = useState(null);
  const [evaluatingCustom, setEvaluatingCustom] = useState(false);
  const [commandPreview, setCommandPreview] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Initial loading
  useEffect(() => {
    fetchBenchmarks().then(data => {
      setBenchmarks(data);
      if (data.length > 0) setSelectedBenchmark(data[0].id);
    }).catch(console.error);

    fetchPasses().then(data => {
      setPasses(data.passes);
      // Select default active passes
      const def = data.passes.filter(p => p.default).map(p => p.id);
      setSelectedPassIds(def);
    }).catch(console.error);
  }, []);

  // Update command preview whenever flags change
  useEffect(() => {
    previewCompilerCommand({
      benchmark_id: selectedBenchmark,
      base_opt: baseOpt,
      pass_ids: selectedPassIds
    }).then(res => setCommandPreview(res.command_string)).catch(console.error);
  }, [selectedBenchmark, baseOpt, selectedPassIds]);

  // Polling optimizer status
  useEffect(() => {
    const poll = () => {
      fetchOptimizerStatus()
        .then(setOptimizerStatus)
        .catch(console.error);
    };
    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    try {
      await startOptimizer({
        benchmark_id: selectedBenchmark,
        base_opt: baseOpt,
        budget: Number(budget),
        init_evals: Number(initEvals),
        acquisition,
        xi: Number(xi),
        kappa: Number(kappa),
        repetitions: 3,
        timeout: 12.0
      });
    } catch (err) {
      alert(`Error starting optimizer: ${err.message}`);
    }
  };

  const handlePauseResume = async () => {
    if (optimizerStatus.state === 'running') {
      await pauseOptimizer();
    } else if (optimizerStatus.state === 'paused') {
      await resumeOptimizer();
    }
  };

  const handleStop = async () => {
    await stopOptimizer();
  };

  const handleEvaluateCustom = async () => {
    setEvaluatingCustom(true);
    try {
      const res = await evaluateCustomPasses({
        benchmark_id: selectedBenchmark,
        base_opt: baseOpt,
        pass_ids: selectedPassIds,
        repetitions: 3,
        timeout: 12.0
      });
      setCustomResult(res);
    } catch (err) {
      alert(`Compilation/Execution failed: ${err.message}`);
    } finally {
      setEvaluatingCustom(false);
    }
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(commandPreview);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const isRunning = optimizerStatus.state === 'running';
  const isPaused = optimizerStatus.state === 'paused';
  const progress = optimizerStatus.progress || {};
  const currentIter = progress.evaluations_completed || 0;
  const totalBudget = progress.total_budget || budget;
  const progressPercent = totalBudget > 0 ? Math.min(100, Math.round((currentIter / totalBudget) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Title & Status Banner */}
      <div className="tech-panel p-5 rounded">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-tech badge-green">OPTIMIZATION WORKSPACE</span>
              <span className={`badge-tech ${isRunning ? 'badge-green animate-pulse' : isPaused ? 'badge-orange' : 'badge-gray'}`}>
                STATUS: {optimizerStatus.state.toUpperCase()}
              </span>
            </div>
            <h1 className="text-lg font-mono font-bold text-[#e2e4e9]">
              Bayesian Optimization Execution & Tuning Control
            </h1>
            <p className="text-xs text-[#8b909e] mt-1 font-sans">
              Configure search space, Bayesian surrogate hyper-parameters, and launch automated pass exploration.
            </p>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-2">
            {!isRunning && !isPaused ? (
              <button
                onClick={handleStart}
                className="btn-primary"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Optimization</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handlePauseResume}
                  className="btn-secondary"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={handleStop}
                  className="btn-danger"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop</span>
                </button>
              </>
            )}

            <button
              onClick={handleEvaluateCustom}
              disabled={evaluatingCustom || isRunning}
              className="btn-secondary text-xs"
              title="Compile and run the currently selected passes once"
            >
              <Cpu className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>{evaluatingCustom ? 'Compiling...' : 'Evaluate Selection Once'}</span>
            </button>
          </div>
        </div>

        {/* Live Progress Bar when running/paused */}
        {(isRunning || isPaused || progress.status === 'completed') && (
          <div className="mt-4 pt-4 tech-border-t">
            <div className="flex items-center justify-between text-xs font-mono text-[#8b909e] mb-1.5">
              <span>
                Evaluation Progress: <strong className="text-[#e2e4e9]">{currentIter}</strong> / {totalBudget} iterations ({progressPercent}%)
              </span>
              <span>
                Best Runtime: <strong className="text-[#10b981]">{progress.best_time_ms ? `${progress.best_time_ms} ms` : 'Searching...'}</strong>
                {progress.speedup_vs_o3 ? ` (${progress.speedup_vs_o3}x vs -O3)` : ''}
              </span>
            </div>
            <div className="w-full bg-[#121418] rounded-full h-2 tech-border overflow-hidden">
              <div 
                className="bg-[#10b981] h-2 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Settings on Left, Interactive Pass Selector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Benchmark & BO Settings */}
        <div className="space-y-4">
          {/* Benchmark Selection */}
          <div className="tech-panel p-4 rounded space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#e2e4e9]">
              <FileCode className="w-3.5 h-3.5 text-[#10b981]" />
              <span>Benchmark Program</span>
            </div>

            <select
              value={selectedBenchmark}
              onChange={(e) => setSelectedBenchmark(e.target.value)}
              disabled={isRunning}
              className="w-full bg-[#16181d] text-xs font-mono text-[#e2e4e9] tech-border rounded p-2 focus:outline-none focus:border-[#10b981]"
            >
              {benchmarks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.category})
                </option>
              ))}
            </select>

            {/* Base Optimization Level */}
            <div>
              <label className="text-[11px] font-mono text-[#8b909e] block mb-1">
                Base Compiler Baseline Flag:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['-O0', '-O1', '-O2'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setBaseOpt(opt)}
                    disabled={isRunning}
                    className={`py-1.5 text-xs font-mono rounded tech-border transition-colors ${
                      baseOpt === opt
                        ? 'bg-[#10b981]/20 text-[#34d399] border-[#10b981]/50 font-bold'
                        : 'bg-[#16181d] text-[#8b909e] hover:text-[#e2e4e9]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bayesian Optimization Settings */}
          <div className="tech-panel p-4 rounded space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#e2e4e9]">
              <Sliders className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Bayesian Optimization Settings</span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-[#8b909e] text-[11px] flex justify-between">
                  <span>Evaluation Budget (T):</span>
                  <span className="text-[#e2e4e9] font-bold">{budget} evals</span>
                </label>
                <input
                  type="range"
                  min="6"
                  max="35"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full accent-[#10b981] mt-1"
                />
              </div>

              <div>
                <label className="text-[#8b909e] text-[11px] flex justify-between">
                  <span>Initial Random Seed (N0):</span>
                  <span className="text-[#e2e4e9] font-bold">{initEvals} evals</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={initEvals}
                  onChange={(e) => setInitEvals(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full accent-[#10b981] mt-1"
                />
              </div>

              <div>
                <label className="text-[#8b909e] text-[11px] block mb-1">
                  Acquisition Strategy:
                </label>
                <select
                  value={acquisition}
                  onChange={(e) => setAcquisition(e.target.value)}
                  disabled={isRunning}
                  className="w-full bg-[#16181d] text-xs font-mono text-[#e2e4e9] tech-border rounded p-2 focus:outline-none"
                >
                  <option value="ei">Expected Improvement (EI, ξ = 0.01)</option>
                  <option value="ucb">Upper Confidence Bound (UCB, κ = 2.576)</option>
                  <option value="pi">Probability of Improvement (PI)</option>
                </select>
              </div>

              <div className="p-2.5 bg-[#121418] rounded tech-border text-[11px] text-[#8b909e] space-y-1 font-sans">
                <div><strong>Surrogate:</strong> Gaussian Process (Matérn 5/2)</div>
                <div><strong>Target:</strong> Minimize Execution Time (ms)</div>
                <div><strong>Repetitions:</strong> 3 runs (Median filter)</div>
              </div>
            </div>
          </div>

          {/* Custom Evaluation Result Card */}
          {customResult && (
            <div className="tech-panel p-4 rounded space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[#10b981] font-bold">
                <span>Custom Run Measurement</span>
                <span className="badge-tech badge-green">VERIFIED</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#121418] p-2.5 rounded tech-border">
                <div>
                  <span className="text-[#5c6270]">EXECUTION:</span>
                  <div className="text-[#10b981] font-bold text-sm">{customResult.execution_time_ms} ms</div>
                </div>
                <div>
                  <span className="text-[#5c6270]">COMPILATION:</span>
                  <div className="text-[#e2e4e9]">{customResult.compile_time_ms} ms</div>
                </div>
                <div>
                  <span className="text-[#5c6270]">BINARY SIZE:</span>
                  <div className="text-[#e2e4e9]">{(customResult.binary_size_bytes / 1024).toFixed(1)} KB</div>
                </div>
                <div>
                  <span className="text-[#5c6270]">CHECKSUM:</span>
                  <div className="text-[#38bdf8] truncate">{customResult.checksum}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pass Selector & Terminal Trace */}
        <div className="lg:col-span-2 space-y-4">
          {/* Compiler Command Preview */}
          <div className="tech-panel p-3 rounded">
            <div className="flex items-center justify-between text-xs font-mono text-[#8b909e] mb-1.5">
              <span className="flex items-center gap-1.5">
                <TerminalIcon className="w-3.5 h-3.5 text-[#10b981]" />
                <span className="text-[#e2e4e9] font-medium">Synthesized Compiler Invocation:</span>
              </span>
              <button
                onClick={handleCopyCmd}
                className="text-[11px] text-[#8b909e] hover:text-[#e2e4e9] flex items-center gap-1"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd ? 'Copied' : 'Copy Invocation'}</span>
              </button>
            </div>
            <code className="block bg-[#0b0c0e] p-2.5 rounded tech-border text-[11px] font-mono text-[#38bdf8] overflow-x-auto whitespace-pre">
              {commandPreview || 'gcc -O1 ...'}
            </code>
          </div>

          {/* Interactive Pass Selector */}
          <PassSelector
            passes={passes}
            selectedPassIds={selectedPassIds}
            onChange={setSelectedPassIds}
            readOnly={isRunning}
          />

          {/* Terminal Event Log */}
          <TerminalLog events={optimizerStatus.events} />
        </div>
      </div>
    </div>
  );
}
