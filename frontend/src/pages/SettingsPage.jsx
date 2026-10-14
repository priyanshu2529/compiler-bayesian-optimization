import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  Database, 
  Clock, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { fetchSettings, updateSettings, verifyEnvironment } from '../services/api';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    compiler_path: 'gcc',
    cxx_compiler_path: 'g++',
    timeout_seconds: 12.0,
    measurement_repetitions: 3,
    warmup_runs: 1,
    default_base_opt: '-O1',
    default_budget: 15,
    default_init_evals: 5,
    default_acquisition: 'ei',
    xi_exploration: 0.01,
    kappa_ucb: 2.576
  });

  const [verifyStatus, setVerifyStatus] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings().then(setFormData).catch(console.error);
    handleVerify();
  }, []);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await verifyEnvironment();
      setVerifyStatus(res);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      handleVerify();
    } catch (err) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="tech-panel p-5 rounded">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-tech badge-green">SYSTEM CONFIGURATION</span>
              <span className="badge-tech badge-gray">ENVIRONMENT AUDIT</span>
            </div>
            <h1 className="text-lg font-mono font-bold text-[#e2e4e9]">
              Compiler Toolchain & Execution Harness Settings
            </h1>
            <p className="text-xs text-[#8b909e] mt-1 font-sans">
              Manage compiler binaries, measurement isolation parameters, process execution timeouts, and Gaussian Process defaults.
            </p>
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying}
            className="btn-secondary text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>Verify Environment</span>
          </button>
        </div>
      </div>

      {/* Environment Verification Card */}
      {verifyStatus && (
        <div className="tech-panel p-5 rounded space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 tech-border-b">
            <span className="flex items-center gap-2 text-[#e2e4e9] font-bold">
              <Cpu className="w-4 h-4 text-[#10b981]" />
              <span>Toolchain Verification Status:</span>
            </span>
            <span className={`badge-tech ${verifyStatus.compiler?.available ? 'badge-green' : 'badge-red'}`}>
              {verifyStatus.compiler?.available ? 'TOOLCHAIN VERIFIED' : 'COMPILER ERROR'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#121418] p-3 rounded tech-border">
            <div>
              <span className="text-[#5c6270] text-[10px] block">COMPILER EXECUTABLE</span>
              <span className="text-[#38bdf8] font-bold mt-0.5 block truncate">
                {verifyStatus.compiler?.path || 'gcc'}
              </span>
            </div>
            <div>
              <span className="text-[#5c6270] text-[10px] block">TARGET ARCHITECTURE</span>
              <span className="text-[#e2e4e9] font-bold mt-0.5 block truncate">
                {verifyStatus.compiler?.target || 'x86_64-w64-mingw32'}
              </span>
            </div>
            <div>
              <span className="text-[#5c6270] text-[10px] block">SQLITE DATABASE</span>
              <span className="text-[#10b981] font-bold mt-0.5 block truncate">
                experiments.db [ONLINE]
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Form Settings Grid */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compiler Binaries & Timing */}
          <div className="tech-panel p-5 rounded space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#e2e4e9] pb-2 tech-border-b">
              <Cpu className="w-4 h-4 text-[#10b981]" />
              <span>Compiler Binaries & Execution Harness</span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-[#8b909e] block mb-1">C Compiler Executable Path:</label>
                <input
                  type="text"
                  value={formData.compiler_path}
                  onChange={(e) => setFormData({ ...formData, compiler_path: e.target.value })}
                  className="w-full bg-[#16181d] text-[#e2e4e9] p-2 rounded tech-border focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="text-[#8b909e] block mb-1">C++ Compiler Path:</label>
                <input
                  type="text"
                  value={formData.cxx_compiler_path}
                  onChange={(e) => setFormData({ ...formData, cxx_compiler_path: e.target.value })}
                  className="w-full bg-[#16181d] text-[#e2e4e9] p-2 rounded tech-border focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8b909e] block mb-1">Timeout (seconds):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="3"
                    max="60"
                    value={formData.timeout_seconds}
                    onChange={(e) => setFormData({ ...formData, timeout_seconds: parseFloat(e.target.value) })}
                    className="w-full bg-[#16181d] text-[#e2e4e9] p-2 rounded tech-border"
                  />
                </div>
                <div>
                  <label className="text-[#8b909e] block mb-1">Measurement Reps:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.measurement_repetitions}
                    onChange={(e) => setFormData({ ...formData, measurement_repetitions: parseInt(e.target.value) })}
                    className="w-full bg-[#16181d] text-[#e2e4e9] p-2 rounded tech-border"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#8b909e] block mb-1">Warmup Runs (discarded):</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={formData.warmup_runs}
                  onChange={(e) => setFormData({ ...formData, warmup_runs: parseInt(e.target.value) })}
                  className="w-full bg-[#16181d] text-[#e2e4e9] p-2 rounded tech-border"
                />
              </div>
            </div>
          </div>

          {/* Bayesian Optimization Defaults */}
          <div className="tech-panel p-5 rounded space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#e2e4e9] pb-2 tech-border-b">
              <Sliders className="w-4 h-4 text-[#38bdf8]" />
              <span>Bayesian Optimization Defaults</span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8b909e] block mb-1">Default Budget (T):</label>
                  <input
                    type="number"
                    min="6"
                    max="50"
                    value={formData.default_budget}
                    onChange={(e) => setFormData({ ...formData, default_budget: parseInt(e.target.value) })}
                    className="w-full bg-[#16181d] text-[#e2e4e9] p-2 rounded tech-border"
                  />
                </div>
                <div>
                  <label className="text-[#8b909e] block mb-1">Initial Seeds (N0):</label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={formData.default_init_evals}
                    onChange={(e) => setFormData({ ...formData, default_init_evals: parseInt(e.target.value) })}
                    className="w-full bg-[#16181d] text-[#e2e4e9] p-2 rounded tech-border"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#8b909e] block mb-1">Default Acquisition Strategy:</label>
                <select
                  value={formData.default_acquisition}
                  onChange={(e) => setFormData({ ...formData, default_acquisition: e.target.value })}
                  className="w-full bg-[#16181d] text-[#e2e4e9] p-2 rounded tech-border"
                >
                  <option value="ei">Expected Improvement (EI)</option>
                  <option value="ucb">Upper Confidence Bound (UCB)</option>
                  <option value="pi">Probability of Improvement (PI)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8b909e] block mb-1">Exploration ξ (EI):</label>
                  <input
                    type="number"
                    step="0.005"
                    min="0"
                    max="0.5"
                    value={formData.xi_exploration}
                    onChange={(e) => setFormData({ ...formData, xi_exploration: parseFloat(e.target.value) })}
                    className="w-full bg-[#16181d] text-[#e2e4e9] p-2 rounded tech-border"
                  />
                </div>
                <div>
                  <label className="text-[#8b909e] block mb-1">Confidence κ (UCB):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="4.0"
                    value={formData.kappa_ucb}
                    onChange={(e) => setFormData({ ...formData, kappa_ucb: parseFloat(e.target.value) })}
                    className="w-full bg-[#16181d] text-[#e2e4e9] p-2 rounded tech-border"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Footer Bar */}
        <div className="flex items-center justify-between p-4 bg-[#14161c] tech-border rounded">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b909e]">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-[#10b981] font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Configuration saved and verified!</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
