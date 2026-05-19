import React, { useState } from 'react';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { extractNewsletterThemeFromReview, generateGenericPublisherEditorial, generateGreybrainerResearch, generateGreyVerdictEditorial, LogTokenUsageFn } from '../services/geminiService';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ReadMoreLess } from './ReadMoreLess';
import { FileText, Newspaper, Target, Sparkles, Globe, BrainCircuit } from 'lucide-react';
import { trendIntelligenceService } from '../services/trendIntelligenceService';
import { autoArchiveToHub, auth } from '../services/firebaseConfig';

interface GreybrainerInsightsProps {
  logTokenUsage?: LogTokenUsageFn;
  analyzedMovieTitle?: string;
  analyzedMovieSummary?: string;
}

type UnifiedLens = 'research' | 'verdict' | 'intelligence' | 'editorial';

export const GreybrainerInsights: React.FC<GreybrainerInsightsProps> = ({
  logTokenUsage,
  analyzedMovieTitle,
  analyzedMovieSummary,
}) => {
  const [unifiedInput, setUnifiedInput] = useState<string>('');
  
  // Theme Extraction State
  const [isExtractingTheme, setIsExtractingTheme] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  // Active Lens State
  const [activeLens, setActiveLens] = useState<UnifiedLens | null>(null);
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputResult, setOutputResult] = useState<string | null>(null);
  const [intelligenceReport, setIntelligenceReport] = useState<any>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExtractTheme = async () => {
    if (!analyzedMovieTitle || !analyzedMovieSummary) {
        setThemeError("No analyzed movie found. Please run a movie analysis first.");
        return;
    }
    setIsExtractingTheme(true);
    setThemeError(null);
    try {
        const theme = await extractNewsletterThemeFromReview(analyzedMovieTitle, analyzedMovieSummary, logTokenUsage);
        setUnifiedInput(theme);
    } catch (err) {
        setThemeError(err instanceof Error ? err.message : "Failed to extract theme.");
    } finally {
        setIsExtractingTheme(false);
    }
  };

  const handleGenerate = async (lens: UnifiedLens) => {
    if (!unifiedInput.trim() || isGenerating) return;
    setActiveLens(lens);
    setIsGenerating(true);
    setGenerationError(null);
    setOutputResult(null);
    setIntelligenceReport(null);

    try {
        if (lens === 'research') {
            const report = await generateGreybrainerResearch(unifiedInput, undefined, logTokenUsage);
            setOutputResult(report);
            await autoArchiveToHub(analyzedMovieTitle || "Research", 'research', report, auth.currentUser?.email);
        } else if (lens === 'verdict') {
            const editorial = await generateGreyVerdictEditorial(analyzedMovieTitle || "Current Trend", unifiedInput, undefined, logTokenUsage);
            setOutputResult(editorial);
            await autoArchiveToHub(analyzedMovieTitle || "Verdict", 'editorial', editorial, auth.currentUser?.email);
        } else if (lens === 'editorial') {
            const editorial = await generateGenericPublisherEditorial("Newsletter Editorial", unifiedInput, logTokenUsage);
            setOutputResult(editorial);
            await autoArchiveToHub("Newsletter Editorial", 'editorial', editorial, auth.currentUser?.email);
        } else if (lens === 'intelligence') {
            const urls = unifiedInput.split('\n').filter(u => u.trim().startsWith('http'));
            const report = await trendIntelligenceService.runAnalysisCycle(urls.length > 0 ? urls : undefined);
            setIntelligenceReport(report);
            await autoArchiveToHub("Trend Intelligence", 'intelligence', JSON.stringify(report, null, 2), auth.currentUser?.email);
        }
    } catch (err) {
        setGenerationError(err instanceof Error ? err.message : "Failed to generate output.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!outputResult) return;
    navigator.clipboard.writeText(outputResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!outputResult) return;
    const blob = new Blob([outputResult], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (analyzedMovieTitle || 'greybrain').substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `greybrain_newsletter_${safeTitle}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-12 p-6 bg-slate-800/70 rounded-xl shadow-2xl border border-slate-700">
      <div className="flex items-center mb-4">
        <InformationCircleIcon className="w-7 h-7 text-yellow-400 mr-3" />
        <h2 className="text-xl md:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">
          Greybrainer Newsletter Hub
        </h2>
      </div>
      
      <div className="text-slate-300 text-sm space-y-4 gb-content-area">
        <p>
          Transform movie analysis into continuous cultural narratives. Extract the core theme from your current review, then expand it into a publishable newsletter.
        </p>

        {/* Unified Input Area */}
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-600/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                <label className="text-sm font-semibold text-slate-300">
                    Newsletter Theme / Cultural Trend
                </label>
                <button
                    onClick={handleExtractTheme}
                    disabled={isExtractingTheme || !analyzedMovieTitle || !analyzedMovieSummary}
                    className="mt-2 sm:mt-0 flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-medium rounded-md shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExtractingTheme ? (
                        <><LoadingSpinner size="sm" /><span className="ml-2">Extracting...</span></>
                    ) : (
                        <><BrainCircuit className="w-3.5 h-3.5 mr-1.5" /> Extract from Current Review</>
                    )}
                </button>
            </div>
            
            <textarea
                value={unifiedInput}
                onChange={(e) => setUnifiedInput(e.target.value)}
                placeholder="Extract a theme from the current movie, or type a cultural trend here..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {themeError && <p className="text-red-400 text-xs mt-2">{themeError}</p>}
        </div>

        {/* Lenses Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <button
                onClick={() => handleGenerate('editorial')}
                disabled={isGenerating || !unifiedInput.trim()}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    activeLens === 'editorial' && isGenerating 
                    ? 'bg-amber-600 border-amber-500 text-white' 
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-amber-500'
                }`}
            >
                <Newspaper className="w-5 h-5 mb-1 text-amber-400" />
                <span className="text-xs font-semibold">Write Editorial</span>
            </button>

            <button
                onClick={() => handleGenerate('verdict')}
                disabled={isGenerating || !unifiedInput.trim()}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    activeLens === 'verdict' && isGenerating 
                    ? 'bg-purple-600 border-purple-500 text-white' 
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-purple-500'
                }`}
            >
                <Sparkles className="w-5 h-5 mb-1 text-purple-400" />
                <span className="text-xs font-semibold">Grey Verdict</span>
            </button>

            <button
                onClick={() => handleGenerate('research')}
                disabled={isGenerating || !unifiedInput.trim()}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    activeLens === 'research' && isGenerating 
                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-indigo-500'
                }`}
            >
                <FileText className="w-5 h-5 mb-1 text-indigo-400" />
                <span className="text-xs font-semibold">Deep Research</span>
            </button>

            <button
                onClick={() => handleGenerate('intelligence')}
                disabled={isGenerating || !unifiedInput.trim()}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    activeLens === 'intelligence' && isGenerating 
                    ? 'bg-emerald-600 border-emerald-500 text-white' 
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-emerald-500'
                }`}
            >
                <Globe className="w-5 h-5 mb-1 text-emerald-400" />
                <span className="text-xs font-semibold">Trend Intelligence</span>
            </button>
        </div>

        {/* Output Area */}
        {generationError && (
            <div className="mt-4 p-3 bg-red-900/30 text-red-300 border border-red-500 rounded-md text-sm">
                <strong>Generation Error:</strong> {generationError}
            </div>
        )}

        {isGenerating && (
            <div className="mt-6 p-8 border-t border-slate-700/50 flex flex-col items-center justify-center">
                <LoadingSpinner size="lg" />
                <span className="mt-4 text-slate-300">Generating {activeLens} output...</span>
            </div>
        )}

        {outputResult && !isGenerating && (
            <div className="mt-6 pt-4 border-t border-slate-700/50 animate-fadeIn">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-amber-300 flex items-center capitalize">
                        <Newspaper className="w-5 h-5 mr-2" />
                        Generated {activeLens}
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handleCopy} className="flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-md shadow transition-colors">
                            <ClipboardIcon className="w-3 h-3 mr-1.5" />
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <button onClick={handleDownload} className="flex items-center px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-md shadow transition-colors">
                            <DownloadIcon className="w-3 h-3 mr-1.5" />
                            Download
                        </button>
                    </div>
                </div>
                <div className="p-5 bg-slate-900/60 rounded-xl border border-amber-500/30">
                    <ReadMoreLess 
                        text={outputResult} 
                        initialVisibleLines={20} 
                        className="text-slate-100 whitespace-pre-wrap leading-relaxed text-sm prose prose-invert max-w-none" 
                    />
                </div>
            </div>
        )}

        {intelligenceReport && !isGenerating && (
             <div className="mt-6 pt-4 border-t border-slate-700/50 animate-fadeIn">
                <h3 className="text-lg font-semibold text-emerald-300 flex items-center mb-4">
                    <Target className="w-5 h-5 mr-2" />
                    Trend Intelligence Report
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {intelligenceReport.primaryTrends?.map((trend: any, i: number) => (
                    <div key={i} className="p-4 bg-slate-900/40 rounded-xl border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-900/30 text-amber-400">
                          {trend.impact} Impact
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-2">{trend.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{trend.description}</p>
                    </div>
                  ))}
                </div>
             </div>
        )}

      </div>
    </div>
  );
};
