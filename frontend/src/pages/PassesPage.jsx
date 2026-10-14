import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Search, 
  CheckSquare, 
  Square, 
  Terminal, 
  Copy, 
  Check, 
  CheckCircle2, 
  Info,
  Filter,
  Zap
} from 'lucide-react';
import { fetchPasses, previewCompilerCommand } from '../services/api';

export default function PassesPage({ setCurrentRoute }) {
  const [passes, setPasses] = useState([]);
  const [selectedPassIds, setSelectedPassIds] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [commandPreview, setCommandPreview] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    fetchPasses().then(data => {
      setPasses(data.passes);
      const def = data.passes.filter(p => p.default).map(p => p.id);
      setSelectedPassIds(def);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    previewCompilerCommand({
      benchmark_id: 'matrix_mul',
      base_opt: '-O1',
      pass_ids: selectedPassIds
    }).then(res => setCommandPreview(res.command_string)).catch(console.error);
  }, [selectedPassIds]);

  const categories = ['ALL', ...Array.from(new Set(passes.map(p => p.category)))];

  const filteredPasses = passes.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.flag.toLowerCase().includes(search.toLowerCase()) ||
                          p.description.toLowerCase().includes(search.toLowerCase()) ||
                          p.impact.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const togglePass = (id) => {
    if (selectedPassIds.includes(id)) {
      setSelectedPassIds(selectedPassIds.filter(pid => pid !== id));
    } else {
      setSelectedPassIds([...selectedPassIds, id]);
    }
  };

  const handleSelectAll = () => setSelectedPassIds(passes.map(p => p.id));
  const handleDeselectAll = () => setSelectedPassIds([]);

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(commandPreview);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="tech-panel p-5 rounded">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-tech badge-green">PASS EXPLORER</span>
              <span className="badge-tech badge-gray">GCC 16.2.0 GIMPLE / SSA / RTL</span>
            </div>
            <h1 className="text-lg font-mono font-bold text-[#e2e4e9]">
              Compiler Optimization Pass Architecture
            </h1>
            <p className="text-xs text-[#8b909e] mt-1 font-sans">
              Inspect supported intermediate representation (IR), Tree SSA, and machine-level flags. 
              Toggle individual passes to observe the synthesized invocation and analyze pass impacts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentRoute('/optimizer')}
              className="btn-primary text-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Tune with Bayesian Optimization</span>
            </button>
          </div>
        </div>

        {/* Live Command Line Preview */}
        <div className="mt-4 pt-4 tech-border-t">
          <div className="flex items-center justify-between text-xs font-mono text-[#8b909e] mb-2">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="text-[#e2e4e9] font-medium">Compiler Invocation Preview ({selectedPassIds.length} passes active):</span>
            </span>
            <button
              onClick={handleCopyCmd}
              className="text-xs text-[#8b909e] hover:text-[#e2e4e9] flex items-center gap-1 font-mono"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd ? 'Copied' : 'Copy Invocation'}</span>
            </button>
          </div>
          <code className="block bg-[#0b0c0e] p-3 rounded tech-border text-xs font-mono text-[#38bdf8] overflow-x-auto whitespace-pre">
            {commandPreview || 'gcc -O1 ...'}
          </code>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="tech-panel p-4 rounded flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#8b909e]">Filter Category:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/50 font-bold'
                  : 'bg-[#16181d] text-[#8b909e] hover:text-[#e2e4e9] tech-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5c6270] absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search pass name or flag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#16181d] text-xs font-mono text-[#e2e4e9] pl-8 pr-3 py-1 rounded tech-border focus:outline-none focus:border-[#10b981] w-48 sm:w-60"
            />
          </div>

          <button
            onClick={handleSelectAll}
            className="text-[11px] text-[#8b909e] hover:text-[#e2e4e9] px-2.5 py-1 rounded bg-[#16181d] tech-border"
          >
            Enable All
          </button>
          <button
            onClick={handleDeselectAll}
            className="text-[11px] text-[#8b909e] hover:text-[#e2e4e9] px-2.5 py-1 rounded bg-[#16181d] tech-border"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Passes Detailed Table / Cards */}
      <div className="space-y-3">
        {filteredPasses.map(pass => {
          const isSelected = selectedPassIds.includes(pass.id);
          return (
            <div
              key={pass.id}
              onClick={() => togglePass(pass.id)}
              className={`p-4 rounded tech-border cursor-pointer transition-all ${
                isSelected ? 'bg-[#181c22] border-[#10b981]/50' : 'bg-[#14161c] hover:bg-[#1a1c24]'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-[#5c6270] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-[#e2e4e9]">
                        {pass.name}
                      </span>
                      <code className="text-xs font-mono text-[#38bdf8] bg-[#0b0c0e] px-1.5 py-0.5 rounded">
                        {pass.flag}
                      </code>
                      <span className="badge-tech badge-green text-[10px]">
                        VERIFIED GCC 16.2
                      </span>
                    </div>

                    <p className="text-xs text-[#8b909e] mt-1.5 font-sans leading-relaxed">
                      {pass.description}
                    </p>
                  </div>
                </div>

                <div className="flex md:flex-col items-end gap-1.5 shrink-0 text-xs font-mono">
                  <span className="badge-tech badge-gray text-[10.5px]">
                    {pass.category}
                  </span>
                  <span className={`text-[11px] font-semibold ${isSelected ? 'text-[#10b981]' : 'text-[#5c6270]'}`}>
                    {isSelected ? 'ENABLED IN CONFIG' : 'DISABLED'}
                  </span>
                </div>
              </div>

              {/* Technical Impact / Rationale */}
              {pass.impact && (
                <div className="mt-3 pt-2.5 tech-border-t flex items-center gap-2 text-xs font-mono text-[#fbbf24]">
                  <Info className="w-3.5 h-3.5 shrink-0 text-[#f97316]" />
                  <span><strong>Performance Impact:</strong> {pass.impact}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
