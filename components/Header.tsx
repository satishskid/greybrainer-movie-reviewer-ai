


import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';


interface HeaderProps {
  onToggleTokenDashboard: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleTokenDashboard }) => {
  return (
    <header className="sticky top-0 z-50 border-b border-fuchsia-500/20 bg-slate-950/70 backdrop-blur-xl shadow-lg shadow-fuchsia-950/10 p-4">
      <div className="container mx-auto flex items-center justify-between max-w-5xl gap-4">
        <div className="flex items-center min-w-0">
          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-lg shadow-fuchsia-950/30">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300">
                Greybrainer Groq Lab
              </h1>
              <span className="inline-flex rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-200">
                Sandbox
              </span>
            </div>
            <p className="truncate text-xs text-slate-400">
              Experimental publishing workspace • separate from stable Netlify
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
           <button
            onClick={onToggleTokenDashboard}
            className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-slate-300 hover:text-fuchsia-200 bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700 rounded-md transition-colors"
            title="Toggle Token Usage Estimator"
          >
            <ChartBarIcon className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Estimator</span>
          </button>

        </div>
      </div>
    </header>
  );
};