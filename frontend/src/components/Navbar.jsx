import React from 'react';
import { 
  Activity, 
  Cpu, 
  Terminal, 
  Layers, 
  FileCode, 
  BarChart3, 
  Settings, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function Navbar({ currentRoute, setCurrentRoute, compilerInfo, onOpenVivaModal }) {
  const navItems = [
    { id: '/', label: 'Overview', icon: Activity },
    { id: '/optimizer', label: 'Optimizer', icon: Cpu },
    { id: '/benchmarks', label: 'Benchmarks', icon: FileCode },
    { id: '/passes', label: 'Pass Explorer', icon: Layers },
    { id: '/experiments', label: 'Experiments', icon: Terminal },
    { id: '/results', label: 'Performance', icon: BarChart3 },
    { id: '/settings', label: 'Configuration', icon: Settings }
  ];

  const isCompilerReady = compilerInfo?.available ?? true;

  return (
    <header className="sticky top-0 z-40 bg-[#121418] tech-border-b">
      {/* Top micro status bar */}
      <div className="bg-[#0b0c0e] px-4 py-1.5 flex items-center justify-between text-xs font-mono text-[#8b909e] tech-border-b">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${isCompilerReady ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}></span>
            <span className="text-[#e2e4e9] font-medium">COMPILER:</span>
            <span>{compilerInfo?.path || 'gcc'} ({compilerInfo?.version ? compilerInfo.version.split('(')[0].trim() : 'GCC 16.2.0'})</span>
          </span>
          <span className="hidden md:inline-block text-[#5c6270]">|</span>
          <span className="hidden md:inline-block text-[#8b909e]">
            TARGET: <span className="text-[#e2e4e9]">{compilerInfo?.target || 'x86_64-w64-mingw32'}</span>
          </span>
          <span className="hidden md:inline-block text-[#5c6270]">|</span>
          <span className="hidden md:inline-block text-[#8b909e]">
            METHOD: <span className="text-[#10b981] font-semibold">GPR (Matérn 5/2) + Expected Improvement</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenVivaModal}
            className="flex items-center gap-1.5 text-xs text-[#fb923c] hover:text-[#f97316] font-mono bg-[#f97316]/10 px-2.5 py-0.5 rounded border border-[#f97316]/30 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manuscript & Viva Defense</span>
          </button>
        </div>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Identity */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentRoute('/')}>
            <div className="w-8 h-8 rounded bg-[#1c1e24] tech-border flex items-center justify-center font-mono font-bold text-[#10b981]">
              &gt;_
            </div>
            <div>
              <div className="text-sm font-bold font-mono tracking-wider text-[#e2e4e9] flex items-center gap-2">
                <span>BO-COMPILER</span>
                <span className="text-[10px] bg-[#272a33] text-[#8b909e] px-1.5 py-0.2 rounded font-normal">v1.0-RESEARCH</span>
              </div>
              <div className="text-[10.5px] text-[#8b909e] font-sans">
                Bayesian Optimization for Compiler Passes
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentRoute(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                    isActive
                      ? 'bg-[#1c1e24] text-[#10b981] border border-[#272a33] font-semibold shadow-sm'
                      : 'text-[#8b909e] hover:text-[#e2e4e9] hover:bg-[#181a20]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#10b981]' : 'text-[#8b909e]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile menu select */}
          <div className="md:hidden">
            <select
              value={currentRoute}
              onChange={(e) => setCurrentRoute(e.target.value)}
              className="bg-[#1c1e24] text-xs font-mono text-[#e2e4e9] tech-border rounded px-2.5 py-1.5"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
