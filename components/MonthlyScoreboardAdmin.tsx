import React, { useState, useEffect } from 'react';
import { MonthlyScoreboardService } from '../services/monthlyScoreboardService';
import { LoadingSpinner } from './LoadingSpinner';
import { TrophyIcon } from './icons/TrophyIcon';
import { CalendarIcon } from './icons/CalendarIcon';

interface MonthlyScoreboardAdminProps {
  currentUser?: any;
  logTokenUsage?: (operation: string, inputChars: number, outputChars: number) => void;
}

export const MonthlyScoreboardAdmin: React.FC<MonthlyScoreboardAdminProps> = ({ 
  currentUser, 
  logTokenUsage 
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('November');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<any[]>([]);
  const [lastGenerated, setLastGenerated] = useState<any>(null);

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    loadAvailableMonths();
  }, []);

  const loadAvailableMonths = async () => {
    try {
      const months = await MonthlyScoreboardService.getAvailableMonths();
      setAvailableMonths(months);
    } catch (error) {
      console.error('Failed to load available months:', error);
    }
  };

  const handleGenerateScoreboard = async () => {
    if (!currentUser) {
      setGenerationStatus('Error: No user authenticated');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Starting generation...');

    try {
      setGenerationStatus('Searching for monthly releases...');
      
      const result = await MonthlyScoreboardService.generateMonthlyScoreboard(
        selectedYear,
        selectedMonth,
        currentUser.uid,
        logTokenUsage
      );

      setGenerationStatus(`Successfully generated ${result.totalItems} entries!`);
      setLastGenerated(result);
      await loadAvailableMonths(); // Refresh available months
      
      setTimeout(() => {
        setGenerationStatus('');
      }, 5000);

    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const isMonthAvailable = (year: number, month: string) => {
    return availableMonths.some(m => 
      m.year === year && m.month === month
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <TrophyIcon className="w-6 h-6 text-amber-400" />
        <h3 className="text-xl font-semibold text-slate-200">Monthly Magic Scoreboard Generator</h3>
      </div>

      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h4 className="text-lg font-medium text-slate-200 mb-4">Generate New Scoreboard</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              disabled={isGenerating}
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              disabled={isGenerating}
            >
              {MONTHS.map(month => (
                <option key={month} value={month}>
                  {month} {isMonthAvailable(selectedYear, month) ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <button
            onClick={handleGenerateScoreboard}
            disabled={isGenerating || !currentUser}
            className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner />
                <span>Generating Scoreboard...</span>
              </>
            ) : (
              <>
                <CalendarIcon className="w-5 h-5" />
                <span>Generate {selectedMonth} {selectedYear} Scoreboard</span>
              </>
            )}
          </button>
        </div>

        {generationStatus && (
          <div className={`p-3 rounded-md text-sm ${
            generationStatus.includes('Error') 
              ? 'bg-red-900/50 text-red-300 border border-red-700' 
              : generationStatus.includes('Successfully')
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-blue-900/50 text-blue-300 border border-blue-700'
          }`}>
            {generationStatus}
          </div>
        )}

        {lastGenerated && (
          <div className="mt-4 p-4 bg-slate-700/50 rounded-md">
            <h5 className="font-medium text-slate-200 mb-2">Last Generated:</h5>
            <div className="text-sm text-slate-300 space-y-1">
              <p><strong>Month:</strong> {lastGenerated.month}</p>
              <p><strong>Items:</strong> {lastGenerated.totalItems}</p>
              <p><strong>Generated:</strong> {new Date(lastGenerated.generatedAt).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h4 className="text-lg font-medium text-slate-200 mb-4">Available Scoreboards</h4>
        
        {availableMonths.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableMonths.map((month, index) => (
              <div key={index} className="p-3 bg-slate-700/50 rounded-md text-center">
                <div className="text-sm font-medium text-slate-200">
                  {month.month} {month.year}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  ✓ Available
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No scoreboards generated yet.</p>
        )}
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 p-4 rounded-md">
        <h5 className="text-amber-300 font-medium mb-2">⚠️ Important Notes:</h5>
        <ul className="text-amber-200 text-sm space-y-1">
          <li>• Generation uses your Gemini API key and may consume significant tokens</li>
          <li>• Each movie gets full 3-layer Greybrainer analysis (Story + Conceptualization + Performance)</li>
          <li>• Process takes 5-10 minutes depending on number of releases found</li>
          <li>• Generated data is cached for all users to access</li>
          <li>• Only generate once per month to avoid duplicate API costs</li>
        </ul>
      </div>
    </div>
  );
};