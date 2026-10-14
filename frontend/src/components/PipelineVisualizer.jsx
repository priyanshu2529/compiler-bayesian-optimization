import React from 'react';
import { 
  FileCode2, 
  Binary, 
  BrainCircuit, 
  Cpu, 
  Timer, 
  CheckCircle, 
  TrendingUp, 
  ArrowRight 
} from 'lucide-react';

export default function PipelineVisualizer({ activeStep = 0, status = 'idle' }) {
  const steps = [
    { id: 1, label: '1. Benchmark', sub: 'C Source', icon: FileCode2 },
    { id: 2, label: '2. Search Space', sub: '24-Flag Cube', icon: Binary },
    { id: 3, label: '3. BO Candidate', sub: 'EI Acquisition', icon: BrainCircuit },
    { id: 4, label: '4. GCC Compile', sub: 'IR & RTL passes', icon: Cpu },
    { id: 5, label: '5. Monotonic Exec', sub: 'timespec_get', icon: Timer },
    { id: 6, label: '6. Checksum', sub: 'Semantic check', icon: CheckCircle },
    { id: 7, label: '7. GP Update', sub: 'Matérn 5/2', icon: TrendingUp }
  ];

  return (
    <div className="tech-panel p-4 rounded">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></div>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#e2e4e9]">
            Active Optimization Pipeline
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#8b909e]">Loop Status:</span>
          <span className={`badge-tech ${
            status === 'running' ? 'badge-green' :
            status === 'completed' ? 'badge-blue' :
            status === 'paused' ? 'badge-orange' : 'badge-gray'
          }`}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Steps Flow Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {steps.map((st, idx) => {
          const Icon = st.icon;
          const isCurrent = (status === 'running' && (idx % 7) === (activeStep % 7));
          return (
            <div
              key={st.id}
              className={`p-2.5 rounded tech-border text-center transition-all ${
                isCurrent 
                  ? 'bg-[#10b981]/10 border-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                  : 'bg-[#16181d] border-[#272a33]'
              }`}
            >
              <div className="flex justify-center mb-1.5">
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-[#10b981]' : 'text-[#8b909e]'}`} />
              </div>
              <div className="text-[11px] font-mono font-medium text-[#e2e4e9] truncate">
                {st.label}
              </div>
              <div className="text-[10px] font-mono text-[#8b909e] truncate mt-0.5">
                {st.sub}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
