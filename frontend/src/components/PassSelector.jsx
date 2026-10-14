import React, { useState } from 'react';
import { Layers, CheckSquare, Square, Search, Filter } from 'lucide-react';

export default function PassSelector({ 
  passes = [], 
  selectedPassIds = [], 
  onChange, 
  readOnly = false 
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = ['ALL', ...Array.from(new Set(passes.map(p => p.category)))];

  const filteredPasses = passes.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.flag.toLowerCase().includes(search.toLowerCase()) ||
                          p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const togglePass = (id) => {
    if (readOnly) return;
    if (selectedPassIds.includes(id)) {
      onChange(selectedPassIds.filter(pid => pid !== id));
    } else {
      onChange([...selectedPassIds, id]);
    }
  };

  const selectAll = () => {
    if (readOnly) return;
    onChange(passes.map(p => p.id));
  };

  const deselectAll = () => {
    if (readOnly) return;
    onChange([]);
  };

  return (
    <div className="tech-panel rounded overflow-hidden">
      {/* Header Controls */}
      <div className="bg-[#121418] p-3 tech-border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#10b981]" />
          <span className="font-semibold text-[#e2e4e9]">Compiler Optimization Passes</span>
          <span className="badge-tech badge-green">
            {selectedPassIds.length} / {passes.length} ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] text-[#8b909e] hover:text-[#e2e4e9] px-2 py-1 rounded bg-[#1c1e24] tech-border"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="text-[11px] text-[#8b909e] hover:text-[#e2e4e9] px-2 py-1 rounded bg-[#1c1e24] tech-border"
              >
                Disable All
              </button>
            </>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5c6270] absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search flags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#1a1c23] text-xs font-mono text-[#e2e4e9] pl-8 pr-2.5 py-1 rounded border border-[#272a33] focus:outline-none focus:border-[#10b981] w-36 sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="p-2.5 bg-[#14161c] tech-border-b flex flex-wrap gap-1.5 text-xs font-mono">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
              selectedCategory === cat
                ? 'bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/40 font-medium'
                : 'bg-[#1a1c22] text-[#8b909e] hover:text-[#e2e4e9] border border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Pass Grid */}
      <div className="p-3 max-h-96 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
        {filteredPasses.map(pass => {
          const isSelected = selectedPassIds.includes(pass.id);
          return (
            <div
              key={pass.id}
              onClick={() => togglePass(pass.id)}
              className={`p-2.5 rounded text-left transition-all ${
                readOnly ? 'cursor-default' : 'cursor-pointer'
              } ${
                isSelected 
                  ? 'bg-[#1c2226] border border-[#10b981]/40' 
                  : 'bg-[#16181d] border border-[#22252e] hover:border-[#2e323e]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-[#5c6270] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-mono font-semibold text-[#e2e4e9]">
                      {pass.name}
                    </div>
                    <code className="text-[11px] font-mono text-[#38bdf8] bg-[#0b0c0e] px-1 py-0.2 rounded inline-block mt-0.5">
                      {pass.flag}
                    </code>
                  </div>
                </div>

                <span className="badge-tech badge-gray text-[10px] shrink-0">
                  {pass.category}
                </span>
              </div>

              <div className="text-[11px] text-[#8b909e] mt-1.5 line-clamp-2">
                {pass.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
