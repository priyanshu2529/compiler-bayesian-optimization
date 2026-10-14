const API_BASE = '/api';

export async function fetchDashboardSummary() {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch dashboard summary`);
  return res.json();
}

export async function fetchCompilerInfo() {
  const res = await fetch(`${API_BASE}/system/compiler-info`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch compiler info`);
  return res.json();
}

export async function fetchBenchmarks() {
  const res = await fetch(`${API_BASE}/benchmarks`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch benchmarks`);
  return res.json();
}

export async function fetchBenchmarkSource(id) {
  const res = await fetch(`${API_BASE}/benchmarks/${id}/source`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch benchmark source`);
  return res.json();
}

export async function runBenchmarkBaselines(id) {
  const res = await fetch(`${API_BASE}/benchmarks/${id}/run-baseline`, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to run benchmark baselines`);
  return res.json();
}

export async function fetchPasses() {
  const res = await fetch(`${API_BASE}/passes`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch passes`);
  return res.json();
}

export async function previewCompilerCommand(payload) {
  const res = await fetch(`${API_BASE}/passes/preview-command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to preview command`);
  return res.json();
}

export async function startOptimizer(payload) {
  const res = await fetch(`${API_BASE}/optimizer/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to start' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function pauseOptimizer() {
  const res = await fetch(`${API_BASE}/optimizer/pause`, { method: 'POST' });
  return res.json();
}

export async function resumeOptimizer() {
  const res = await fetch(`${API_BASE}/optimizer/resume`, { method: 'POST' });
  return res.json();
}

export async function stopOptimizer() {
  const res = await fetch(`${API_BASE}/optimizer/stop`, { method: 'POST' });
  return res.json();
}

export async function fetchOptimizerStatus() {
  const res = await fetch(`${API_BASE}/optimizer/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function evaluateCustomPasses(payload) {
  const res = await fetch(`${API_BASE}/optimizer/evaluate-custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchExperiments(limit = 50) {
  const res = await fetch(`${API_BASE}/experiments?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchExperiment(id) {
  const res = await fetch(`${API_BASE}/experiments/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteExperiment(id) {
  const res = await fetch(`${API_BASE}/experiments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchResultsAnalysis() {
  const res = await fetch(`${API_BASE}/results/analysis`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateSettings(payload) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function verifyEnvironment() {
  const res = await fetch(`${API_BASE}/settings/verify`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchVivaMetadata() {
  const res = await fetch(`${API_BASE}/viva-metadata`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchManuscriptMarkdown() {
  const res = await fetch(`${API_BASE}/manuscript/markdown`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchVivaGuideMarkdown() {
  const res = await fetch(`${API_BASE}/viva-guide/markdown`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
