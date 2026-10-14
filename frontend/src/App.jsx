import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import VivaPaperModal from './components/VivaPaperModal';

// Pages
import OverviewPage from './pages/OverviewPage';
import OptimizerPage from './pages/OptimizerPage';
import BenchmarksPage from './pages/BenchmarksPage';
import PassesPage from './pages/PassesPage';
import ExperimentsPage from './pages/ExperimentsPage';
import ResultsPage from './pages/ResultsPage';
import SettingsPage from './pages/SettingsPage';

import { fetchCompilerInfo } from './services/api';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname || '/');
  const [compilerInfo, setCompilerInfo] = useState(null);
  const [isVivaModalOpen, setIsVivaModalOpen] = useState(false);

  useEffect(() => {
    // Listen to browser navigation (back/forward)
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (route) => {
    setCurrentRoute(route);
    window.history.pushState({}, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    fetchCompilerInfo()
      .then(setCompilerInfo)
      .catch(console.error);
  }, []);

  const renderActivePage = () => {
    switch (currentRoute) {
      case '/':
        return <OverviewPage setCurrentRoute={navigateTo} onOpenVivaModal={() => setIsVivaModalOpen(true)} />;
      case '/optimizer':
        return <OptimizerPage />;
      case '/benchmarks':
        return <BenchmarksPage setCurrentRoute={navigateTo} />;
      case '/passes':
        return <PassesPage setCurrentRoute={navigateTo} />;
      case '/experiments':
        return <ExperimentsPage setCurrentRoute={navigateTo} />;
      case '/results':
        return <ResultsPage setCurrentRoute={navigateTo} />;
      case '/settings':
        return <SettingsPage />;
      default:
        return <OverviewPage setCurrentRoute={navigateTo} onOpenVivaModal={() => setIsVivaModalOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1013] text-[#e2e4e9]">
      {/* Top Navbar */}
      <Navbar
        currentRoute={currentRoute}
        setCurrentRoute={navigateTo}
        compilerInfo={compilerInfo}
        onOpenVivaModal={() => setIsVivaModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderActivePage()}
      </main>

      {/* Compiler Research Technical Footer */}
      <footer className="bg-[#0b0c0e] tech-border-t py-6 text-xs font-mono text-[#5c6270]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#10b981] font-bold">&gt;_ BO-COMPILER</span>
            <span>|</span>
            <span>Undergraduate Research Project in Computer Science & Systems Engineering</span>
          </div>

          <div className="flex items-center gap-4 text-[#8b909e]">
            <button
              onClick={() => setIsVivaModalOpen(true)}
              className="hover:text-[#10b981] transition-colors"
            >
              Viva Defense Dossier
            </button>
            <span>•</span>
            <button
              onClick={() => setIsVivaModalOpen(true)}
              className="hover:text-[#10b981] transition-colors"
            >
              Academic Manuscript
            </button>
            <span>•</span>
            <span className="text-[#38bdf8]">GCC 16.2.0 (UCRT64)</span>
          </div>
        </div>
      </footer>

      {/* Academic Manuscript & Viva Defense Dossier Modal */}
      <VivaPaperModal
        isOpen={isVivaModalOpen}
        onClose={() => setIsVivaModalOpen(false)}
      />
    </div>
  );
}
