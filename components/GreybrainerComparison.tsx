import React, { useState, useCallback } from 'react';
import { ScaleIcon } from './icons/ScaleIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { generateGreybrainerComparisonWithGemini, LogTokenUsageFn } from '../services/geminiService';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ReadMoreLess } from './ReadMoreLess';

interface ComparisonItem {
  title: string;
  type: 'Movie' | 'Series' | 'Scene' | 'Artist' | 'Director';
  description?: string;
}

interface GreybrainerComparisonProps {
  logTokenUsage?: LogTokenUsageFn;
}

export const GreybrainerComparison: React.FC<GreybrainerComparisonProps> = ({ logTokenUsage }) => {
  const [item1, setItem1] = useState<ComparisonItem>({ title: '', type: 'Movie' });
  const [item2, setItem2] = useState<ComparisonItem>({ title: '', type: 'Movie' });
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [isGeneratingComparison, setIsGeneratingComparison] = useState<boolean>(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerateComparison = useCallback(async () => {
    if (!item1.title.trim() || !item2.title.trim()) {
      setComparisonError('Please enter both items to compare.');
      return;
    }

    setIsGeneratingComparison(true);
    setComparisonError(null);
    setComparisonResult(null);

    try {
      const comparison = await generateGreybrainerComparisonWithGemini(item1, item2, logTokenUsage);
      setComparisonResult(comparison);
    } catch (err) {
      console.error("Failed to generate comparison:", err);
      setComparisonError(err instanceof Error ? err.message : "An unknown error occurred while generating the comparison.");
    } finally {
      setIsGeneratingComparison(false);
    }
  }, [item1, item2, logTokenUsage]);

  const handleCopyComparison = () => {
    if (!comparisonResult) return;
    navigator.clipboard.writeText(comparisonResult).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(err => {
      console.error('Failed to copy comparison: ', err);
    });
  };

  const typeOptions: ComparisonItem['type'][] = ['Movie', 'Series', 'Scene', 'Artist', 'Director'];

  return (
    <div className="mt-12 p-6 bg-slate-800/70 rounded-xl shadow-2xl border border-slate-700">
      <div className="flex items-center mb-4">
        <ScaleIcon className="w-7 h-7 text-blue-400 mr-3" />
        <h2 className="text-xl md:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
          Greybrainer Comparison Analysis
        </h2>
      </div>
      
      <div className="text-slate-300 text-sm space-y-4">
        <p>
          Compare two movies, scenes, artists, or directors using our advanced AI analysis. Get insights into similarities, differences, and unique characteristics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Item 1 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-blue-300">First Item</h3>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
              <select
                value={item1.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setItem1(prev => ({ ...prev, type: e.target.value as ComparisonItem['type'] }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {typeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Title/Name</label>
              <input
                type="text"
                value={item1.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItem1(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`Enter ${item1.type.toLowerCase()} title/name`}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
              <textarea
                value={item1.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setItem1(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional context or specific aspects to focus on"
                rows={2}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Item 2 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-cyan-300">Second Item</h3>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
              <select
                value={item2.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setItem2(prev => ({ ...prev, type: e.target.value as ComparisonItem['type'] }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                {typeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Title/Name</label>
              <input
                type="text"
                value={item2.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItem2(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`Enter ${item2.type.toLowerCase()} title/name`}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
              <textarea
                value={item2.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setItem2(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional context or specific aspects to focus on"
                rows={2}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={handleGenerateComparison}
            disabled={isGeneratingComparison || !item1.title.trim() || !item2.title.trim()}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingComparison ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Generating Comparison...</span>
              </>
            ) : (
              <>
                <ScaleIcon className="w-4 h-4 mr-2" />
                Generate Comparison
              </>
            )}
          </button>
        </div>

        {comparisonError && (
          <div className="mt-4 p-3 bg-red-700/30 text-red-300 border border-red-500 rounded-md">
            <strong>Error:</strong> {comparisonError}
          </div>
        )}

        {comparisonResult && !isGeneratingComparison && (
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-200">Comparison Analysis</h3>
              <button
                onClick={handleCopyComparison}
                className="flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md shadow transition-colors"
                title="Copy comparison analysis"
              >
                <ClipboardIcon className="w-3 h-3 mr-1.5" />
                {copied ? 'Copied!' : 'Copy Analysis'}
              </button>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/70">
              <ReadMoreLess 
                text={comparisonResult} 
                initialVisibleLines={20} 
                className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm" 
              />
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-slate-500 italic">
          <p>
            Comparison analysis is powered by AI and provides subjective insights for creative and analytical purposes. 
            Results may vary and should be used as a starting point for deeper discussion.
          </p>
        </div>
      </div>
    </div>
  );
};