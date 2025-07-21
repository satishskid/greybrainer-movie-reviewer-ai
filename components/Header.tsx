


import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ApiStatusIndicator } from './ApiStatusIndicator';

interface HeaderProps {
  onToggleTokenDashboard: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleTokenDashboard }) => {
  return (
    <header className="bg-slate-800/50 backdrop-blur-md shadow-lg p-4 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between max-w-5xl">
        <div className="flex items-center">
          <SparklesIcon className="w-8 h-8 text-indigo-400 mr-3" />
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Greybrainer AI
          </h1>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
           <button
            onClick={onToggleTokenDashboard}
            className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-slate-300 hover:text-indigo-300 bg-slate-700/50 hover:bg-slate-600/50 rounded-md transition-colors"
            title="Toggle Token Usage Estimator"
          >
            <ChartBarIcon className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Estimator</span>
          </button>
          <ApiStatusIndicator />
        </div>
      </div>
    </header>
  );
};