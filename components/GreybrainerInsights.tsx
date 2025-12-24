
import React, { useState, useEffect, useCallback } from 'react';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { generateGreybrainerInsightWithGemini, generateDetailedReportFromInsightWithGemini, generateMovieAnchoredInsightWithGemini, generateExpandedPublicationInsight, LogTokenUsageFn } from '../services/geminiService';
import { RefreshIcon } from './icons/RefreshIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon'; // New Icon for detailed report
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ReadMoreLess } from './ReadMoreLess'; // For potentially long detailed reports
import GeminiCanvasExport from './GeminiCanvasExport';
import { FileText, Newspaper } from 'lucide-react';

interface GreybrainerInsightsProps {
  logTokenUsage?: LogTokenUsageFn;
}

type InsightMode = 'on-demand' | 'movie-anchored';
type AnalysisLayer = 'story' | 'orchestration' | 'performance' | 'morphokinetics' | 'random';

export const GreybrainerInsights: React.FC<GreybrainerInsightsProps> = ({ logTokenUsage }) => {
  // Mode selection
  const [insightMode, setInsightMode] = useState<InsightMode>('on-demand');
  
  // On-demand insight state (existing)
  const [dynamicInsightText, setDynamicInsightText] = useState<string | null>(null);
  const [isFetchingDynamicInsight, setIsFetchingDynamicInsight] = useState<boolean>(true);
  const [dynamicInsightError, setDynamicInsightError] = useState<string | null>(null);

  const [detailedReportText, setDetailedReportText] = useState<string | null>(null);
  const [isGeneratingDetailedReport, setIsGeneratingDetailedReport] = useState<boolean>(false);
  const [detailedReportError, setDetailedReportError] = useState<string | null>(null);
  
  const [copiedDetailedReport, setCopiedDetailedReport] = useState<boolean>(false);

  // Publication expansion state (new)
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState<boolean>(false);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [copiedArticle, setCopiedArticle] = useState<boolean>(false);

  // Movie-anchored insight state (new)
  const [selectedMovie, setSelectedMovie] = useState<string>('');
  const [selectedLayer, setSelectedLayer] = useState<AnalysisLayer>('random');
  const [movieAnchoredInsight, setMovieAnchoredInsight] = useState<string>('');
  const [isGeneratingMovieInsight, setIsGeneratingMovieInsight] = useState(false);
  const [movieInsightError, setMovieInsightError] = useState<string | null>(null);

  // Movie-anchored publication expansion state
  const [expandedMovieArticle, setExpandedMovieArticle] = useState<string | null>(null);
  const [isGeneratingMovieArticle, setIsGeneratingMovieArticle] = useState<boolean>(false);
  const [movieArticleError, setMovieArticleError] = useState<string | null>(null);
  const [copiedMovieArticle, setCopiedMovieArticle] = useState<boolean>(false);


  const fetchDynamicInsight = useCallback(async () => {
    setIsFetchingDynamicInsight(true);
    setDynamicInsightError(null);
    setDetailedReportText(null); // Clear previous detailed report when fetching new insight
    setDetailedReportError(null);
    try {
      const newInsight = await generateGreybrainerInsightWithGemini(logTokenUsage);
      setDynamicInsightText(newInsight);
    } catch (err) {
      console.error("Failed to fetch Greybrainer insight:", err);
      setDynamicInsightError(err instanceof Error ? err.message : "An unknown error occurred while fetching the insight.");
      setDynamicInsightText(null); 
    } finally {
      setIsFetchingDynamicInsight(false);
    }
  }, [logTokenUsage]);

  useEffect(() => {
    fetchDynamicInsight();
  }, [fetchDynamicInsight]);

  const handleGenerateDetailedReport = useCallback(async () => {
    if (!dynamicInsightText || isGeneratingDetailedReport) return;

    setIsGeneratingDetailedReport(true);
    setDetailedReportError(null);
    setDetailedReportText(null);
    try {
      const report = await generateDetailedReportFromInsightWithGemini(dynamicInsightText, logTokenUsage);
      setDetailedReportText(report);
    } catch (err) {
      console.error("Failed to generate detailed report:", err);
      setDetailedReportError(err instanceof Error ? err.message : "An unknown error occurred while generating the detailed report.");
    } finally {
      setIsGeneratingDetailedReport(false);
    }
  }, [dynamicInsightText, isGeneratingDetailedReport, logTokenUsage]);

  const handleCopyDetailedReport = () => {
    if (!detailedReportText) return;
    navigator.clipboard.writeText(detailedReportText).then(() => {
        setCopiedDetailedReport(true);
        setTimeout(() => setCopiedDetailedReport(false), 2500);
    }).catch(err => {
        console.error('Failed to copy detailed report: ', err);
    });
  };

  const handleDownloadDetailedReportMarkdown = () => {
    if (!detailedReportText) return;
    
    // Basic Markdown: Use double newlines for paragraphs.
    // More complex Markdown (headings, lists) would depend on AI output structure.
    // For now, treat AI output as pre-formatted or just needing paragraph breaks.
    const markdownContent = detailedReportText.replace(/\n\s*\n/g, '\n\n'); 
    
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeInsightStart = dynamicInsightText?.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'insight';
    link.download = `detailed_report_${safeInsightStart}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Publication expansion handlers
  const handleGenerateExpandedArticle = useCallback(async () => {
    if (!dynamicInsightText || isGeneratingArticle) return;

    setIsGeneratingArticle(true);
    setArticleError(null);
    setExpandedArticle(null);
    try {
      const article = await generateExpandedPublicationInsight(dynamicInsightText, logTokenUsage);
      setExpandedArticle(article);
    } catch (err) {
      console.error("Failed to generate expanded article:", err);
      setArticleError(err instanceof Error ? err.message : "An unknown error occurred while generating the article.");
    } finally {
      setIsGeneratingArticle(false);
    }
  }, [dynamicInsightText, isGeneratingArticle, logTokenUsage]);

  const handleCopyExpandedArticle = () => {
    if (!expandedArticle) return;
    navigator.clipboard.writeText(expandedArticle).then(() => {
        setCopiedArticle(true);
        setTimeout(() => setCopiedArticle(false), 2500);
    }).catch(err => {
        console.error('Failed to copy article: ', err);
    });
  };

  const handleDownloadExpandedArticle = () => {
    if (!expandedArticle) return;
    
    const markdownContent = expandedArticle.replace(/\n\s*\n/g, '\n\n'); 
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeInsightStart = dynamicInsightText?.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'insight';
    link.download = `publication_article_${safeInsightStart}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Movie-anchored publication expansion handlers
  const handleGenerateExpandedMovieArticle = useCallback(async () => {
    if (!movieAnchoredInsight || isGeneratingMovieArticle) return;

    setIsGeneratingMovieArticle(true);
    setMovieArticleError(null);
    setExpandedMovieArticle(null);
    try {
      const article = await generateExpandedPublicationInsight(movieAnchoredInsight, logTokenUsage);
      setExpandedMovieArticle(article);
    } catch (err) {
      console.error("Failed to generate expanded movie article:", err);
      setMovieArticleError(err instanceof Error ? err.message : "An unknown error occurred while generating the article.");
    } finally {
      setIsGeneratingMovieArticle(false);
    }
  }, [movieAnchoredInsight, isGeneratingMovieArticle, logTokenUsage]);

  const handleCopyExpandedMovieArticle = () => {
    if (!expandedMovieArticle) return;
    navigator.clipboard.writeText(expandedMovieArticle).then(() => {
        setCopiedMovieArticle(true);
        setTimeout(() => setCopiedMovieArticle(false), 2500);
    }).catch(err => {
        console.error('Failed to copy movie article: ', err);
    });
  };

  const handleDownloadExpandedMovieArticle = () => {
    if (!expandedMovieArticle) return;
    
    const markdownContent = expandedMovieArticle.replace(/\n\s*\n/g, '\n\n'); 
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeMovieTitle = selectedMovie.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'movie';
    link.download = `publication_article_${safeMovieTitle}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Movie-anchored insight handler
  const handleGenerateMovieAnchoredInsight = async () => {
    if (!selectedMovie.trim() || isGeneratingMovieInsight) return;
    
    setIsGeneratingMovieInsight(true);
    setMovieInsightError(null);
    setMovieAnchoredInsight('');
    
    try {
      const insight = await generateMovieAnchoredInsightWithGemini(
        selectedMovie,
        selectedLayer,
        logTokenUsage
      );
      setMovieAnchoredInsight(insight);
    } catch (err) {
      console.error('Failed to generate movie-anchored insight:', err);
      setMovieInsightError(err instanceof Error ? err.message : 'An unknown error occurred while generating movie-anchored insight.');
    } finally {
      setIsGeneratingMovieInsight(false);
    }
  };


  return (
    <div className="mt-12 p-6 bg-slate-800/70 rounded-xl shadow-2xl border border-slate-700">
      <div className="flex items-center mb-4">
        <InformationCircleIcon className="w-7 h-7 text-yellow-400 mr-3" />
        <h2 className="text-xl md:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">
          Greybrainer Insights & Research
        </h2>
      </div>
      
      <div className="text-slate-300 text-sm space-y-2 gb-content-area">
        <p>
          Explore patterns and evolution in Indian cinema and OTT content across Story, Orchestration, Performance, and Morphokinetics layers.
        </p>
        
        {/* Mode Tabs */}
        <div className="flex gap-2 my-4 border-b border-slate-700 pb-2">
          <button
            onClick={() => setInsightMode('on-demand')}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition ${
              insightMode === 'on-demand'
                ? 'bg-amber-500 text-black'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            On-Demand Insight
          </button>
          <button
            onClick={() => setInsightMode('movie-anchored')}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition ${
              insightMode === 'movie-anchored'
                ? 'bg-amber-500 text-black'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🎬 Movie-Anchored Insight
          </button>
        </div>

        {/* On-Demand Mode (Existing) */}
        {insightMode === 'on-demand' && (
          <>
            <div className="mt-3 mb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1">
                <p className="font-semibold text-yellow-300 mb-1 sm:mb-0">Dynamic AI Insight:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={fetchDynamicInsight}
                    disabled={isFetchingDynamicInsight || isGeneratingDetailedReport}
                    className="flex items-center px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-yellow-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors disabled:opacity-50"
                    title="Refresh AI Insight"
                  >
                    <RefreshIcon className="w-3 h-3 mr-1.5" />
                    Refresh Insight
                  </button>
                  <button
                    onClick={handleGenerateDetailedReport}
                    disabled={!dynamicInsightText || isGeneratingDetailedReport || isFetchingDynamicInsight}
                    className="flex items-center px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-yellow-300 bg-teal-700 hover:bg-teal-600 rounded-md transition-colors disabled:opacity-50"
                    title="Generate Detailed Report from this Insight"
                  >
                    <DocumentTextIcon className="w-3 h-3 mr-1.5" />
                    Generate Detailed Report
                  </button>
                  <button
                    onClick={handleGenerateExpandedArticle}
                    disabled={!dynamicInsightText || isGeneratingArticle || isFetchingDynamicInsight}
                    className="flex items-center px-2.5 py-1 text-xs font-medium text-white hover:text-amber-200 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-md transition-colors disabled:opacity-50 shadow-lg"
                    title="Expand to Publication-Ready Article (800-1200 words)"
                  >
                    <Newspaper className="w-3 h-3 mr-1.5" />
                    Expand to Publication
                  </button>
                </div>
              </div>
              <blockquote className="border-l-4 border-yellow-500 pl-4 py-2 italic text-slate-400 bg-slate-800/40 rounded-r-md min-h-[50px] flex items-center">
                {isFetchingDynamicInsight && (
                  <div className="flex items-center w-full">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2 text-sm">Fetching fresh insight...</span>
                  </div>
                )}
                {dynamicInsightError && (
                  <p className="text-red-400 text-sm not-italic">
                    <strong>Error fetching insight:</strong> {dynamicInsightError}
                  </p>
                )}
                {!isFetchingDynamicInsight && !dynamicInsightError && dynamicInsightText && (
                  <p className="text-slate-300 not-italic">{dynamicInsightText}</p>
                )}
                {!isFetchingDynamicInsight && !dynamicInsightError && !dynamicInsightText && (
                  <p className="text-slate-500 not-italic">Could not load an insight at this time.</p>
                )}
              </blockquote>
            </div>

            {isGeneratingArticle && (
              <div className="mt-4 p-4 border-t border-purple-700/50 bg-purple-900/20">
                <div className="flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-3 text-slate-300">Generating publication-ready article (800-1200 words)...</span>
                </div>
              </div>
            )}

            {articleError && (
              <div className="mt-4 p-3 bg-red-700/30 text-red-300 border border-red-500 rounded-md">
                <strong>Error generating article:</strong> {articleError}
              </div>
            )}

            {expandedArticle && !isGeneratingArticle && (
              <div className="mt-6 pt-4 border-t border-purple-700/50 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Newspaper className="w-5 h-5 text-purple-400 mr-2" />
                  <h3 className="text-lg font-semibold text-purple-300">Publication-Ready Article</h3>
                  <span className="ml-auto text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">Medium • Newspaper • Blog</span>
                </div>
                <div className="p-4 bg-slate-900/60 rounded-lg border border-purple-500/30 mb-3">
                  <ReadMoreLess 
                    text={expandedArticle} 
                    initialVisibleLines={20} 
                    className="text-slate-100 whitespace-pre-wrap leading-relaxed text-sm gb-content-area prose prose-invert max-w-none" 
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopyExpandedArticle}
                    className="flex items-center px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-md shadow transition-colors"
                    title="Copy publication article"
                  >
                    <ClipboardIcon className="w-3 h-3 mr-1.5" />
                    {copiedArticle ? 'Copied!' : 'Copy Article'}
                  </button>
                  <button
                    onClick={handleDownloadExpandedArticle}
                    className="flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md shadow transition-colors"
                    title="Download as Markdown"
                  >
                    <DownloadIcon className="w-3 h-3 mr-1.5" />
                    Download Article
                  </button>
                  <div className="ml-auto text-xs text-slate-400 flex items-center">
                    <FileText className="w-3 h-3 mr-1" />
                    Ready for Medium, Film Journals, Newspapers
                  </div>
                </div>
              </div>
            )}

            {isGeneratingDetailedReport && (
              <div className="mt-4 p-4 border-t border-slate-700/50">
                <div className="flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-3 text-slate-300">Generating detailed research report...</span>
                </div>
              </div>
            )}

            {detailedReportError && (
              <div className="mt-4 p-3 bg-red-700/30 text-red-300 border border-red-500 rounded-md">
                <strong>Error generating detailed report:</strong> {detailedReportError}
              </div>
            )}

            {detailedReportText && !isGeneratingDetailedReport && (
              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <h3 className="text-lg font-semibold text-yellow-200 mb-2">Detailed Research Report:</h3>
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/70 mb-3">
                  <ReadMoreLess 
                    text={detailedReportText} 
                    initialVisibleLines={15} 
                    className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm gb-content-area" 
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCopyDetailedReport}
                    className="flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md shadow transition-colors"
                    title="Copy detailed report text"
                  >
                    <ClipboardIcon className="w-3 h-3 mr-1.5" />
                    {copiedDetailedReport ? 'Copied!' : 'Copy Detailed Report'}
                  </button>
                  <button
                    onClick={handleDownloadDetailedReportMarkdown}
                    className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-md shadow transition-colors"
                    title="Download detailed report as Markdown"
                  >
                    <DownloadIcon className="w-3 h-3 mr-1.5" />
                    Download Markdown
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Video Export Component - Show after on-demand insight is generated */}
        {insightMode === 'on-demand' && dynamicInsightText && !isFetchingDynamicInsight && (
          <GeminiCanvasExport insightContent={dynamicInsightText} />
        )}

        {/* Movie-Anchored Mode (NEW) */}
        {insightMode === 'movie-anchored' && (
          <div className="space-y-4 mt-4">
            {/* Movie Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Recent Movie/Show (as hook):
              </label>
              <input
                type="text"
                value={selectedMovie}
                onChange={(e) => setSelectedMovie(e.target.value)}
                placeholder="e.g., Pushpa 2, Animal, Heeramandi, The Family Man..."
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
              />
              <p className="text-xs text-slate-400 mt-1">Enter a recent Indian film or OTT show that's fresh in audience's mind</p>
            </div>

            {/* Layer Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Analysis Layer:
              </label>
              <div className="space-y-2">
                {[
                  { value: 'story', label: 'Story Layer', desc: 'Characters, Genre, Narrative' },
                  { value: 'orchestration', label: 'Orchestration Layer', desc: 'Visuals, Casting, Direction' },
                  { value: 'performance', label: 'Performance Layer', desc: 'Acting, Authenticity' },
                  { value: 'morphokinetics', label: 'Morphokinetics', desc: 'Look, Pacing, Speed' },
                  { value: 'random', label: 'Surprise Me', desc: 'AI chooses the most relevant layer' }
                ].map(({ value, label, desc }) => (
                  <label key={value} className="flex items-start text-slate-300 cursor-pointer hover:bg-slate-700/30 p-2 rounded">
                    <input
                      type="radio"
                      name="layer"
                      value={value}
                      checked={selectedLayer === value}
                      onChange={(e) => setSelectedLayer(e.target.value as AnalysisLayer)}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-slate-400">{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateMovieAnchoredInsight}
              disabled={!selectedMovie.trim() || isGeneratingMovieInsight}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition"
            >
              {isGeneratingMovieInsight ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Generating Insight...</span>
                </span>
              ) : (
                '🎬 Generate Movie-Anchored Insight'
              )}
            </button>

            {/* Error Display */}
            {movieInsightError && (
              <div className="mt-4 p-3 bg-red-700/30 text-red-300 border border-red-500 rounded-md">
                <strong>Error:</strong> {movieInsightError}
              </div>
            )}

            {/* Insight Display */}
            {movieAnchoredInsight && !isGeneratingMovieInsight && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/80 rounded-lg border border-amber-500/30">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-semibold text-amber-300">Generated Insight:</h3>
                    <button
                      onClick={handleGenerateExpandedMovieArticle}
                      disabled={isGeneratingMovieArticle}
                      className="flex items-center px-2.5 py-1 text-xs font-medium text-white hover:text-amber-200 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-md transition-colors disabled:opacity-50 shadow-lg"
                      title="Expand to Publication-Ready Article (800-1200 words)"
                    >
                      <Newspaper className="w-3 h-3 mr-1.5" />
                      Expand to Publication
                    </button>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{movieAnchoredInsight}</p>
                </div>

                {isGeneratingMovieArticle && (
                  <div className="p-4 border-t border-purple-700/50 bg-purple-900/20 rounded-lg">
                    <div className="flex items-center justify-center">
                      <LoadingSpinner />
                      <span className="ml-3 text-slate-300">Generating publication-ready article (800-1200 words)...</span>
                    </div>
                  </div>
                )}

                {movieArticleError && (
                  <div className="p-3 bg-red-700/30 text-red-300 border border-red-500 rounded-md">
                    <strong>Error generating article:</strong> {movieArticleError}
                  </div>
                )}

                {expandedMovieArticle && !isGeneratingMovieArticle && (
                  <div className="pt-4 border-t border-purple-700/50 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Newspaper className="w-5 h-5 text-purple-400 mr-2" />
                      <h3 className="text-lg font-semibold text-purple-300">Publication-Ready Article</h3>
                      <span className="ml-auto text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">Medium • Newspaper • Blog</span>
                    </div>
                    <div className="p-4 bg-slate-900/60 rounded-lg border border-purple-500/30 mb-3">
                      <ReadMoreLess 
                        text={expandedMovieArticle} 
                        initialVisibleLines={20} 
                        className="text-slate-100 whitespace-pre-wrap leading-relaxed text-sm gb-content-area prose prose-invert max-w-none" 
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleCopyExpandedMovieArticle}
                        className="flex items-center px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-md shadow transition-colors"
                        title="Copy publication article"
                      >
                        <ClipboardIcon className="w-3 h-3 mr-1.5" />
                        {copiedMovieArticle ? 'Copied!' : 'Copy Article'}
                      </button>
                      <button
                        onClick={handleDownloadExpandedMovieArticle}
                        className="flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md shadow transition-colors"
                        title="Download as Markdown"
                      >
                        <DownloadIcon className="w-3 h-3 mr-1.5" />
                        Download Article
                      </button>
                      <div className="ml-auto text-xs text-slate-400 flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        Ready for Medium, Film Journals, Newspapers
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Video Export Component - Show after movie-anchored insight is generated */}
            {movieAnchoredInsight && !isGeneratingMovieInsight && (
              <GeminiCanvasExport 
                insightContent={movieAnchoredInsight} 
                movieTitle={selectedMovie}
                layerFocus={selectedLayer === 'random' ? undefined : selectedLayer}
              />
            )}
          </div>
        )}

        <p className="mt-4 pt-4 border-t border-slate-700">
          Stay tuned for more curated research and articles. Learn more about our <a href="mailto:consultancy@greybrainer.ai" className="text-indigo-400 hover:underline">consultancy services</a>.
        </p>
      </div>
    </div>
  );
};
