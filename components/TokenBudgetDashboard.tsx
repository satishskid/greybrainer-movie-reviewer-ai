
import React, { useState, useMemo, useEffect } from 'react';
import { TokenBudgetConfig, TokenUsageEntry } from '../types';
import { CHARS_PER_TOKEN_ESTIMATE, MAX_TOKEN_LOG_ENTRIES } from '../constants';
import { XMarkIcon } from './icons/XMarkIcon'; // For close button
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { TrashIcon } from './icons/TrashIcon';

interface TokenBudgetDashboardProps {
  config: TokenBudgetConfig;
  setConfig: (config: TokenBudgetConfig) => void;
  usageLog: TokenUsageEntry[];
  clearLog: () => void;
  onClose: () => void;
}

export const TokenBudgetDashboard: React.FC<TokenBudgetDashboardProps> = ({
  config,
  setConfig,
  usageLog,
  clearLog,
  onClose,
}) => {
  const [localConfig, setLocalConfig] = useState<TokenBudgetConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setLocalConfig(prev => ({ ...prev, [name]: checked }));
    } else {
      setLocalConfig(prev => ({ ...prev, [name]: value === '' ? undefined : parseInt(value) }));
    }
  };

  const handleSaveChanges = () => {
    setConfig(localConfig);
  };
  
  const handleResetDailyCount = () => {
     const newConfig = { ...localConfig, lastDailyResetTimestamp: Date.now() };
     setLocalConfig(newConfig);
     setConfig(newConfig); // Persist immediately
  };

  const queriesToday = useMemo(() => {
    if (!config.isEnabled) return 0;
    const todayStart = new Date(config.lastDailyResetTimestamp).setHours(0,0,0,0); // Start of day of last reset
    // If last reset was some days ago, treat "today" as starting from that reset time, until next reset.
    // Or, more simply, count since lastDailyResetTimestamp.
    return usageLog.filter(entry => entry.timestamp >= config.lastDailyResetTimestamp).length;
  }, [usageLog, config.lastDailyResetTimestamp, config.isEnabled]);

  const queriesThisMinute = useMemo(() => {
    if (!config.isEnabled) return 0;
    const oneMinuteAgo = Date.now() - 60000;
    return usageLog.filter(entry => entry.timestamp >= oneMinuteAgo).length;
  }, [usageLog, config.isEnabled]);


  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex justify-center items-start p-4 overflow-y-auto">
      <div className="bg-slate-800 p-6 rounded-lg shadow-2xl border border-slate-700 w-full max-w-2xl my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-100 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
          aria-label="Close token dashboard"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold text-amber-400 mb-4">Token Usage Estimator Dashboard</h2>
        
        <div className="p-3 mb-6 bg-amber-900/30 border border-amber-700/50 rounded-md text-amber-200 text-xs space-y-1">
          <div className="flex items-start">
            <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-amber-400" />
            <p><strong>Important Disclaimer:</strong> This dashboard provides a <strong className="underline">ROUGH ESTIMATION</strong> of token usage based on character counts (approx. {CHARS_PER_TOKEN_ESTIMATE} chars/token).</p>
          </div>
          <p className="pl-6">It <strong className="underline">DOES NOT</strong> reflect actual token billing, free tier limits, or precise usage as per Google's official accounting. Always refer to your Google Cloud Console or AI Studio for accurate billing and usage information.</p>
          <p className="pl-6">This tool is for general awareness and relative comparison of different operations only.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="isEnabled" className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                id="isEnabled"
                name="isEnabled"
                checked={localConfig.isEnabled}
                onChange={handleConfigChange}
                className="form-checkbox h-5 w-5 text-amber-500 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-slate-200">Enable Usage Estimation</span>
            </label>
          </div>
        </div>

        {localConfig.isEnabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="freeTierQueriesPerDay" className="block text-sm font-medium text-slate-300 mb-1">
                  Est. Free Queries/Day (Your Info)
                </label>
                <input
                  type="number"
                  id="freeTierQueriesPerDay"
                  name="freeTierQueriesPerDay"
                  value={localConfig.freeTierQueriesPerDay === undefined ? '' : localConfig.freeTierQueriesPerDay}
                  onChange={handleConfigChange}
                  placeholder="e.g., 1500"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label htmlFor="freeTierQueriesPerMinute" className="block text-sm font-medium text-slate-300 mb-1">
                  Est. Free Queries/Minute (Your Info)
                </label>
                <input
                  type="number"
                  id="freeTierQueriesPerMinute"
                  name="freeTierQueriesPerMinute"
                  value={localConfig.freeTierQueriesPerMinute === undefined ? '' : localConfig.freeTierQueriesPerMinute}
                  onChange={handleConfigChange}
                  placeholder="e.g., 60"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-start mb-6">
                 <button 
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-md shadow"
                 >
                    Save Configuration
                </button>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-slate-700/50 rounded-md">
              <div>
                <h4 className="text-sm text-slate-400">Est. Queries Since Last Reset:</h4>
                <p className="text-lg font-semibold text-amber-400">
                  {queriesToday}
                  {config.freeTierQueriesPerDay !== undefined && ` / ${config.freeTierQueriesPerDay}`}
                </p>
                <button
                    onClick={handleResetDailyCount}
                    className="mt-1 text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md"
                    title={`Last reset: ${new Date(config.lastDailyResetTimestamp).toLocaleString()}`}
                 >
                    Reset Daily Count Now
                </button>
              </div>
              <div>
                <h4 className="text-sm text-slate-400">Est. Queries This Minute:</h4>
                <p className="text-lg font-semibold text-amber-400">
                  {queriesThisMinute}
                  {config.freeTierQueriesPerMinute !== undefined && ` / ${config.freeTierQueriesPerMinute}`}
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-semibold text-slate-200">Recent Estimated Usage Log (Last {MAX_TOKEN_LOG_ENTRIES}):</h3>
                <button
                    onClick={clearLog}
                    disabled={usageLog.length === 0}
                    className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs font-medium rounded-md shadow disabled:opacity-50 flex items-center"
                    title="Clear usage log"
                >
                   <TrashIcon className="w-3 h-3 mr-1" /> Clear Log
                </button>
              </div>
              {usageLog.length > 0 ? (
                <div className="max-h-60 overflow-y-auto custom-scrollbar bg-slate-700/30 p-3 rounded-md border border-slate-600/50">
                  <ul className="space-y-2">
                    {usageLog.map(entry => (
                      <li key={entry.id} className="text-xs p-2 bg-slate-600/50 rounded">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-300">{entry.operation}</span>
                            <span className="text-amber-300">~{entry.estimatedTokens} tokens</span>
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                            {new Date(entry.timestamp).toLocaleString()} (In: {entry.estimatedInputChars}c, Out: {entry.estimatedOutputChars}c)
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-4">No usage logged yet or logging is disabled.</p>
              )}
            </div>
          </>
        )}
        {!localConfig.isEnabled && (
             <p className="text-sm text-slate-400 italic text-center py-4">Enable usage estimation to see details.</p>
        )}

      </div>
    </div>
  );
};
