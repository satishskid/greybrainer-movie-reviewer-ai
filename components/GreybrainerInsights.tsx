
import React, { useState, useEffect, useCallback } from 'react';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { generateGreybrainerInsightWithGemini, generateDetailedReportFromInsightWithGemini, LogTokenUsageFn } from '../services/groqService';
import { RefreshIcon } from './icons/RefreshIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon'; // New Icon for detailed report
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ReadMoreLess } from './ReadMoreLess'; // For potentially long detailed reports

interface GreybrainerInsightsProps {
  logTokenUsage?: LogTokenUsageFn;
}

export const GreybrainerInsights: React.FC<GreybrainerInsightsProps> = ({ logTokenUsage }) => {
  const [dynamicInsightText, setDynamicInsightText] = useState<string | null>(null);
  const [isFetchingDynamicInsight, setIsFetchingDynamicInsight] = useState<boolean>(true);
  const [dynamicInsightError, setDynamicInsightError] = useState<string | null>(null);

  const [detailedReportText, setDetailedReportText] = useState<string | null>(null);
  const [isGeneratingDetailedReport, setIsGeneratingDetailedReport] = useState<boolean>(false);
  const [detailedReportError, setDetailedReportError] = useState<string | null>(null);
  
  const [copiedDetailedReport, setCopiedDetailedReport] = useState<boolean>(false);


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
          Welcome to the Greybrainer Insights corner! This section showcases the power of deep AI analysis in understanding film and narrative trends. All features are currently enabled for testing, or contact us for bespoke consultancy.
        </p>
        
        <div className="mt-3 mb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1">
                <p className="font-semibold text-yellow-300 mb-1 sm:mb-0">Dynamic AI Insight:</p>
                <div className="flex space-x-2">
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

        <p className="mt-4">
          Stay tuned for more curated research and articles. Learn more about our <a href="mailto:consultancy@greybrainer.ai" className="text-indigo-400 hover:underline">consultancy services</a>.
        </p>
      </div>
    </div>
  );
};
