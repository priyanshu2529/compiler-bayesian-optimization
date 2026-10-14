import React from 'react';

export default function MetricCard({ title, value, unit = '', subtext, icon: Icon, badge, color = 'green' }) {
  const colorMap = {
    green: 'text-[#10b981]',
    orange: 'text-[#f97316]',
    blue: 'text-[#38bdf8]',
    gray: 'text-[#8b909e]'
  };

  return (
    <div className="tech-card p-4 rounded flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-[#8b909e] uppercase tracking-wider">{title}</span>
        {Icon && <Icon className="w-4 h-4 text-[#8b909e]" />}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className={`text-2xl font-mono font-bold tracking-tight ${colorMap[color] || 'text-[#e2e4e9]'}`}>
          {value !== null && value !== undefined ? value : '—'}
        </span>
        {unit && <span className="text-xs font-mono text-[#8b909e]">{unit}</span>}
        {badge && (
          <span className="ml-2 badge-tech badge-green text-[10px]">
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <div className="text-[11px] font-mono text-[#5c6270] truncate mt-1">
          {subtext}
        </div>
      )}
    </div>
  );
}
