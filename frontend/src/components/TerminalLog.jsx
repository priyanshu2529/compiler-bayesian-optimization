import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Copy, Trash2, Check, ArrowDownCircle } from 'lucide-react';

export default function TerminalLog({ events = [], title = "Compiler & Optimization Event Trace" }) {
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('');
  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  const handleCopy = () => {
    const text = events.map(e => `[${e.timestamp}] [${e.level}] ${e.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredEvents = filter 
    ? events.filter(e => e.message.toLowerCase().includes(filter.toLowerCase()) || e.level.toLowerCase().includes(filter.toLowerCase()))
    : events;

  const getLevelBadge = (level) => {
    switch (level) {
      case 'NEW_BEST':
        return <span className="text-[#10b981] font-bold">[RECORD]</span>;
      case 'BASELINE':
        return <span className="text-[#38bdf8] font-bold">[BASE]</span>;
      case 'ERROR':
      case 'FATAL':
        return <span className="text-[#ef4444] font-bold">[ERR]</span>;
      case 'WARN':
        return <span className="text-[#f97316] font-bold">[WARN]</span>;
      case 'EVAL_START':
        return <span className="text-[#fbbf24]">[EVAL]</span>;
      case 'SUCCESS':
        return <span className="text-[#10b981] font-bold">[DONE]</span>;
      default:
        return <span className="text-[#8b909e]">[INFO]</span>;
    }
  };

  return (
    <div className="terminal-window rounded tech-border overflow-hidden flex flex-col h-80">
      {/* Header */}
      <div className="bg-[#121418] px-3 py-2 tech-border-b flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-[#e2e4e9]">
          <TerminalIcon className="w-3.5 h-3.5 text-[#10b981]" />
          <span>{title}</span>
          <span className="text-[#5c6270]">({events.length} events)</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#1a1c23] text-xs font-mono text-[#e2e4e9] px-2 py-0.5 rounded border border-[#272a33] focus:outline-none focus:border-[#10b981] w-28 sm:w-36"
          />
          <button
            onClick={handleCopy}
            title="Copy logs"
            className="text-[#8b909e] hover:text-[#e2e4e9] p-1 rounded hover:bg-[#1f2128] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Log Output Body */}
      <div className="p-3 flex-1 overflow-y-auto space-y-1 font-mono text-xs select-text">
        {filteredEvents.length === 0 ? (
          <div className="text-[#5c6270] italic py-8 text-center">
            No optimization events recorded yet. Start an experiment to inspect the live compiler execution trace.
          </div>
        ) : (
          filteredEvents.map((evt, idx) => (
            <div key={idx} className="flex items-start gap-2 leading-relaxed hover:bg-[#14161c] px-1 rounded">
              <span className="text-[#5c6270] shrink-0">{evt.timestamp}</span>
              <span className="shrink-0">{getLevelBadge(evt.level)}</span>
              <span className={`text-[#e2e4e9] break-all ${evt.level === 'NEW_BEST' ? 'text-[#34d399] font-medium' : ''}`}>
                {evt.message}
              </span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
