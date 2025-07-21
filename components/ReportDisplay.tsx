

import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon'; // New Icon
import { LayerAnalysisData, GroundingChunkWeb, PersonnelData, SummaryReportData, ActualPerformanceData, FinancialAnalysisData } from '../types'; 
import { LAYER_DEFINITIONS, MAX_SCORE, LAYER_SHORT_NAMES } from '../constants'; 
import { ConcentricRingsVisualization } from './ConcentricRingsVisualization';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { TicketIcon } from './icons/TicketIcon'; // For actual performance section
import { CheckCircleIcon } from './icons/CheckCircleIcon'; // For save button
import { BlogExportModal } from './BlogExportModal';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { LinkIcon } from './icons/LinkIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { ChartPieIcon } from './icons/ChartPieIcon'; // For Financial/ROI section
import { TwitterIcon } from './icons/TwitterIcon';
import { LinkedInIcon } from './icons/LinkedInIcon';


interface ReportDisplayProps {
  summaryReportData: SummaryReportData;
  title: string;
  layerAnalyses: LayerAnalysisData[];
  personnelData: PersonnelData; 
  maxScore: number;
  initialActualPerformance: ActualPerformanceData | null;
  onActualPerformanceChange: (data: ActualPerformanceData) => void;
  financialAnalysisData: FinancialAnalysisData | null; // Added
}

export const ReportDisplay: React.FC<ReportDisplayProps> = ({ 
  summaryReportData, 
  title, 
  layerAnalyses, 
  personnelData, 
  maxScore,
  initialActualPerformance,
  onActualPerformanceChange,
  financialAnalysisData 
}) => {
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedTwitter, setCopiedTwitter] = useState(false);
  const [copiedLinkedIn, setCopiedLinkedIn] = useState(false);
  const [localActualPerformance, setLocalActualPerformance] = useState<ActualPerformanceData>(initialActualPerformance || {});
  const [showActualsInput, setShowActualsInput] = useState(false);
  const [showBlogExportModal, setShowBlogExportModal] = useState(false);

  useEffect(() => {
    setLocalActualPerformance(initialActualPerformance || {});
    if (initialActualPerformance && Object.keys(initialActualPerformance).some(key => initialActualPerformance[key as keyof ActualPerformanceData] !== undefined && initialActualPerformance[key as keyof ActualPerformanceData] !== '')) {
        setShowActualsInput(true);
    } else {
        setShowActualsInput(false);
    }
  }, [initialActualPerformance]);

  const { reportText, socialSnippets, overallImprovementSuggestions } = summaryReportData;

  const overallScore = useMemo(() => {
    const scoredLayers = layerAnalyses.filter(l => typeof l.userScore === 'number');
    if (scoredLayers.length === 0) return null;
    const totalScore = scoredLayers.reduce((sum, l) => sum + (l.userScore as number), 0);
    return (totalScore / scoredLayers.length);
  }, [layerAnalyses]);

  const handleActualPerformanceInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalActualPerformance(prev => ({
      ...prev,
      [name]: e.target.type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value,
    }));
  };

  const handleSaveActualPerformance = () => {
    onActualPerformanceChange(localActualPerformance);
  };

  const formatSuggestionsForCopyOrMarkdown = (suggestions: string | string[] | undefined, forMarkdown: boolean = false): string => {
    if (!suggestions) return "N/A";
    const prefix = forMarkdown ? "- " : "- "; // Markdown list item
    if (Array.isArray(suggestions)) return suggestions.map(s => `${prefix}${s}`).join(forMarkdown ? '\n' : '\n');
    // If it's a string that might contain its own newlines and potential bullets
    if (typeof suggestions === 'string' && forMarkdown) {
        // Attempt to convert pre-existing bullet-like lines in a string to Markdown lists
        return suggestions.split('\n').map(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.match(/^[-•*+]\s+/)) { // If line already looks like a bullet item
                return `- ${trimmedLine.replace(/^[-•*+]\s+/, '')}`;
            }
            return trimmedLine ? `- ${trimmedLine}` : ''; // Default to making it a list item if not empty
        }).filter(Boolean).join('\n');
    }
    return suggestions;
  };

  const handleCopyToClipboard = (textToCopy: string, type: 'report' | 'twitter' | 'linkedin') => {
    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
      switch (type) {
        case 'report':
          setCopiedReport(true);
          setTimeout(() => setCopiedReport(false), 2500);
          break;
        case 'twitter':
          setCopiedTwitter(true);
          setTimeout(() => setCopiedTwitter(false), 2500);
          break;
        case 'linkedin':
          setCopiedLinkedIn(true);
          setTimeout(() => setCopiedLinkedIn(false), 2500);
          break;
      }
    }).catch(err => {
      console.error(`Failed to copy ${type}: `, err);
    });
  };
  
  const generateFullReportTextForCopy = (): string => {
    let fullReport = `Greybrainer Report: ${title}\n\n`;
    if (overallScore !== null) {
      fullReport += `Overall Greybrainer Score: ${overallScore.toFixed(1)} / ${maxScore}\n`;
    }
    if (localActualPerformance.rtCriticsScore || localActualPerformance.rtAudienceScore || localActualPerformance.metacriticScore || localActualPerformance.boxOfficePerformanceNotes) {
        fullReport += `Actual Performance (User Input):\n`;
        if (localActualPerformance.rtCriticsScore) fullReport += `  - Rotten Tomatoes (Critics): ${localActualPerformance.rtCriticsScore}%\n`;
        if (localActualPerformance.rtAudienceScore) fullReport += `  - Rotten Tomatoes (Audience): ${localActualPerformance.rtAudienceScore}%\n`;
        if (localActualPerformance.metacriticScore) fullReport += `  - Metacritic: ${localActualPerformance.metacriticScore}/100\n`;
        if (localActualPerformance.boxOfficePerformanceNotes) fullReport += `  - Box Office Notes: ${localActualPerformance.boxOfficePerformanceNotes}\n`;
    }
    fullReport += `\n`;

    // Financial Analysis Data for Copy
    if (financialAnalysisData) {
      fullReport += `Financial & ROI Insights:\n`;
      if (financialAnalysisData.userProvidedBudget) {
        fullReport += `  - User Provided Budget: ${financialAnalysisData.userProvidedBudget} USD\n`;
      } else if (financialAnalysisData.fetchedBudget) {
        fullReport += `  - AI-Estimated Budget: Approx. ${financialAnalysisData.fetchedBudget} ${financialAnalysisData.fetchedBudgetCurrency || 'USD'}\n`;
        if (financialAnalysisData.fetchedDuration) {
          fullReport += `  - AI-Estimated Production Duration: ${financialAnalysisData.fetchedDuration}\n`;
        }
        if (financialAnalysisData.fetchedBudgetSources && financialAnalysisData.fetchedBudgetSources.length > 0) {
           fullReport += `  - Budget/Duration Sources (AI Found): ${financialAnalysisData.fetchedBudgetSources.map(s => `${s.title || 'Source'}: ${s.uri}`).join('; ')}\n`;
        }
      }
      if (financialAnalysisData.qualitativeROIAnalysis) {
        fullReport += `\nQualitative ROI Potential:\n${financialAnalysisData.qualitativeROIAnalysis}\n`;
      }
      fullReport += `\n`;
    }


    if (personnelData && (personnelData.director || (personnelData.mainCast && personnelData.mainCast.length > 0))) {
      fullReport += `Key Personnel (AI Found):\n`;
      if (personnelData.director) fullReport += `Director: ${personnelData.director}\n`;
      if (personnelData.mainCast && personnelData.mainCast.length > 0) fullReport += `Main Cast: ${personnelData.mainCast.join(', ')}\n`;
      if (personnelData.sources && personnelData.sources.length > 0) {
        fullReport += `Sources: ${personnelData.sources.map(s => `${s.title || 'Source'}: ${s.uri}`).join('; ')}\n`;
      }
      fullReport += `\n`;
    }
    fullReport += `Overall Summary:\n${reportText}\n\n`;

    if (overallImprovementSuggestions) {
      fullReport += `Overall Improvement Opportunities:\n${formatSuggestionsForCopyOrMarkdown(overallImprovementSuggestions)}\n\n`;
    }

    fullReport += `Visual Layer Overview & Scores:\n`;
    const orderedLayersForRings = [
      layerAnalyses.find(l => l.id === 'STORY'),
      layerAnalyses.find(l => l.id === 'CONCEPTUALIZATION'),
      layerAnalyses.find(l => l.id === 'PERFORMANCE')
    ].filter(Boolean) as LayerAnalysisData[];
    orderedLayersForRings.forEach((layer, index) => {
        let prefix = '';
        if (index === 0) prefix = '(Innermost Ring) ';
        else if (index === 1) prefix = '(Middle Ring) ';
        else if (index === 2) prefix = '(Outermost Ring) ';
        const scoreDisplay = layer.userScore !== undefined ? `${layer.userScore.toFixed(1)}/${maxScore}` : 'Not Scored';
        fullReport += `${prefix}${LAYER_SHORT_NAMES[layer.id] || layer.title}: ${scoreDisplay}\n`;
    });
    fullReport += `\n`;
    fullReport += `Detailed Layer Analysis, Ratings & Suggestions:\n\n`;
    layerAnalyses.forEach(layer => {
      const layerDef = LAYER_DEFINITIONS.find(ld => ld.id === layer.id);
      const scoreDisplay = layer.userScore !== undefined ? `Score: ${layer.userScore.toFixed(1)}/${maxScore}` : 'Not Scored';
      fullReport += `--- ${layer.title} (${scoreDisplay}) ---\n`;
      if (layerDef) {
        fullReport += `(${layerDef.description})\n`;
      }
      fullReport += `${layer.editedText}\n`;
      if (layer.improvementSuggestions) {
        fullReport += `Potential Enhancements: ${formatSuggestionsForCopyOrMarkdown(layer.improvementSuggestions)}\n`;
      }
      if (layer.groundingSources && layer.groundingSources.length > 0) {
        fullReport += `Layer Sources: ${layer.groundingSources.map(s => `${s.title || 'Source'}: ${s.uri}`).join('; ')}\n`;
      }
      fullReport += `\n`;
    });
    return fullReport.trim();
  };

  const generateMarkdownReport = (): string => {
    let mdReport = `# Greybrainer Report: ${title}\n\n`;
    if (overallScore !== null) {
      mdReport += `## Overall Greybrainer Score: ${overallScore.toFixed(1)} / ${maxScore}\n\n`;
    }

    if (localActualPerformance.rtCriticsScore || localActualPerformance.rtAudienceScore || localActualPerformance.metacriticScore || localActualPerformance.boxOfficePerformanceNotes) {
        mdReport += `## Actual Performance (User Input)\n`;
        if (localActualPerformance.rtCriticsScore) mdReport += `- Rotten Tomatoes (Critics): ${localActualPerformance.rtCriticsScore}%\n`;
        if (localActualPerformance.rtAudienceScore) mdReport += `- Rotten Tomatoes (Audience): ${localActualPerformance.rtAudienceScore}%\n`;
        if (localActualPerformance.metacriticScore) mdReport += `- Metacritic: ${localActualPerformance.metacriticScore}/100\n`;
        if (localActualPerformance.boxOfficePerformanceNotes) mdReport += `- Box Office Notes: ${localActualPerformance.boxOfficePerformanceNotes}\n`;
        mdReport += `\n`;
    }

    // Financial Analysis Data for Markdown
    if (financialAnalysisData) {
      mdReport += `## Financial & ROI Insights\n\n`;
      if (financialAnalysisData.userProvidedBudget) {
        mdReport += `**User Provided Budget:** ${financialAnalysisData.userProvidedBudget} USD\n\n`;
      } else if (financialAnalysisData.fetchedBudget) {
        mdReport += `**AI-Estimated Budget:** Approx. ${financialAnalysisData.fetchedBudget} ${financialAnalysisData.fetchedBudgetCurrency || 'USD'}\n`;
        if (financialAnalysisData.fetchedDuration) {
          mdReport += `**AI-Estimated Production Duration:** ${financialAnalysisData.fetchedDuration}\n`;
        }
        if (financialAnalysisData.fetchedBudgetSources && financialAnalysisData.fetchedBudgetSources.length > 0) {
           mdReport += `**Budget/Duration Sources (AI Found):**\n${financialAnalysisData.fetchedBudgetSources.map(s => `- [${s.title || s.uri}](${s.uri})`).join('\n')}\n\n`;
        } else {
           mdReport += `\n`;
        }
      }
      if (financialAnalysisData.qualitativeROIAnalysis) {
        mdReport += `### Qualitative ROI Potential\n${financialAnalysisData.qualitativeROIAnalysis.replace(/\n\s*\n/g, '\n\n')}\n\n`;
      }
    }


    if (personnelData && (personnelData.director || (personnelData.mainCast && personnelData.mainCast.length > 0))) {
      mdReport += `## Key Personnel (AI Found)\n`;
      if (personnelData.director) mdReport += `**Director:** ${personnelData.director}\n`;
      if (personnelData.mainCast && personnelData.mainCast.length > 0) mdReport += `**Main Cast:** ${personnelData.mainCast.join(', ')}\n`;
      if (personnelData.sources && personnelData.sources.length > 0) {
        mdReport += `**Sources:**\n${personnelData.sources.map(s => `- [${s.title || s.uri}](${s.uri})`).join('\n')}\n`;
      }
      mdReport += `\n`;
    }

    mdReport += `## Overall Summary\n${reportText.replace(/\n\s*\n/g, '\n\n')}\n\n`; // Ensure paragraphs for MD

    if (overallImprovementSuggestions) {
      mdReport += `## Overall Improvement Opportunities\n${formatSuggestionsForCopyOrMarkdown(overallImprovementSuggestions, true)}\n\n`;
    }

    mdReport += `## Core Layers Overview & Scores\n`;
    const orderedLayersForRings = [
      layerAnalyses.find(l => l.id === 'STORY'),
      layerAnalyses.find(l => l.id === 'CONCEPTUALIZATION'),
      layerAnalyses.find(l => l.id === 'PERFORMANCE')
    ].filter(Boolean) as LayerAnalysisData[];
    orderedLayersForRings.forEach((layer, index) => {
        let prefix = '';
        if (index === 0) prefix = '(Innermost Ring) ';
        else if (index === 1) prefix = '(Middle Ring) ';
        else if (index === 2) prefix = '(Outermost Ring) ';
        const scoreDisplay = layer.userScore !== undefined ? `${layer.userScore.toFixed(1)}/${maxScore}` : 'Not Scored';
        mdReport += `- ${prefix}**${LAYER_SHORT_NAMES[layer.id] || layer.title}:** ${scoreDisplay}\n`;
    });
    mdReport += `\n`;

    mdReport += `## Detailed Layer Analysis, Ratings & Suggestions\n\n`;
    layerAnalyses.forEach(layer => {
      const layerDef = LAYER_DEFINITIONS.find(ld => ld.id === layer.id);
      const scoreDisplay = layer.userScore !== undefined ? `Score: ${layer.userScore.toFixed(1)}/${maxScore}` : 'Not Scored';
      mdReport += `### ${layer.title} (${scoreDisplay})\n`;
      if (layerDef) {
        mdReport += `*(${layerDef.description})*\n\n`;
      }
      mdReport += `${layer.editedText.replace(/\n\s*\n/g, '\n\n')}\n\n`; // Ensure paragraphs for MD
      if (layer.improvementSuggestions) {
        mdReport += `**Potential Enhancements:**\n${formatSuggestionsForCopyOrMarkdown(layer.improvementSuggestions, true)}\n\n`;
      }
      if (layer.groundingSources && layer.groundingSources.length > 0) {
        mdReport += `**Layer Sources:**\n${layer.groundingSources.map(s => `- [${s.title || s.uri}](${s.uri})`).join('\n')}\n\n`;
      }
    });
    return mdReport.trim();
  };

  const handleDownloadMarkdown = () => {
    const markdownContent = generateMarkdownReport();
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeTitle}_greybrainer_report.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderSuggestions = (suggestions: string | string[] | undefined, baseClasses: string, areaClass: string) => {
    if (!suggestions) return null;
    if (typeof suggestions === 'string') {
      return <p className={`${baseClasses} ${areaClass}`}>{suggestions}</p>;
    }
    return (
      <ul className={`list-disc list-inside space-y-1 ${baseClasses} ${areaClass}`}>
        {suggestions.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  };


  return (
    <div className="mt-10 p-6 bg-slate-800/80 rounded-xl shadow-2xl border border-slate-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-3 sm:mb-0">
          Greybrainer Report: <span className="italic">{title}</span>
        </h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <button
              onClick={() => setShowBlogExportModal(true)}
              className="flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg shadow-md transition-colors duration-150 w-full sm:w-auto"
              title="Export for blog/social media with all content and diagrams"
            >
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              Blog/Social Export
            </button>
            <button
              onClick={() => handleCopyToClipboard(generateFullReportTextForCopy(), 'report')}
              className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-md transition-colors duration-150 w-full sm:w-auto"
              title="Copy full report (summary + layer details + scores + sources + suggestions)"
            >
              <ClipboardIcon className="w-4 h-4 mr-2" />
              {copiedReport ? 'Report Copied!' : 'Copy Full Report'}
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center justify-center px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg shadow-md transition-colors duration-150 w-full sm:w-auto"
              title="Download full report as Markdown (.md) file"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download Markdown
            </button>
        </div>
      </div>
      
      {/* Score and Actuals Comparison Display */}
      <div className="mb-6 p-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 rounded-lg shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="text-center md:text-left">
                <h3 className="text-xl font-semibold text-slate-100 mb-1">Overall Greybrainer Score</h3>
                <p className="text-4xl font-bold text-white">
                {overallScore !== null ? overallScore.toFixed(1) : '-'}{' '}
                <span className="text-2xl text-slate-200">/ {maxScore}</span>
                </p>
            </div>
            <div className="text-xs text-slate-200 space-y-1 text-center md:text-right">
                {localActualPerformance.rtCriticsScore !== undefined && <p>Rotten Tomatoes (Critics): <strong>{localActualPerformance.rtCriticsScore}%</strong></p>}
                {localActualPerformance.rtAudienceScore !== undefined && <p>Rotten Tomatoes (Audience): <strong>{localActualPerformance.rtAudienceScore}%</strong></p>}
                {localActualPerformance.metacriticScore !== undefined && <p>Metacritic: <strong>{localActualPerformance.metacriticScore}/100</strong></p>}
                {localActualPerformance.boxOfficePerformanceNotes && <p>Box Office: <strong>{localActualPerformance.boxOfficePerformanceNotes}</strong></p>}
                {(localActualPerformance.rtCriticsScore === undefined && localActualPerformance.rtAudienceScore === undefined && localActualPerformance.metacriticScore === undefined && !localActualPerformance.boxOfficePerformanceNotes) && (
                    <p className="italic">No actual performance data entered yet.</p>
                )}
            </div>
        </div>
      </div>
      
      {socialSnippets && (socialSnippets.twitter || socialSnippets.linkedin) && (
          <div className="mb-6 p-4 bg-slate-700/60 rounded-lg border border-slate-600/70">
              <h3 className="text-lg font-semibold text-sky-300 mb-4">Generated Social Media Posts</h3>
              <div className="space-y-6">
                  {/* Twitter Post */}
                  {socialSnippets.twitter && (
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center space-x-2">
                                  <TwitterIcon className="w-5 h-5 text-[#1DA1F2]" />
                                  <h4 className="font-semibold text-slate-200">For X (Twitter)</h4>
                              </div>
                              <button
                                  onClick={() => handleCopyToClipboard(socialSnippets.twitter!, 'twitter')}
                                  className="flex items-center px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-md shadow transition-colors duration-150"
                                  title="Copy Twitter post"
                              >
                                  <ClipboardIcon className="w-3 h-3 mr-1.5" />
                                  {copiedTwitter ? 'Copied!' : 'Copy Post'}
                              </button>
                          </div>
                          <blockquote className="border-l-4 border-[#1DA1F2] p-3 bg-slate-800/50 rounded-r-md">
                              <p className="text-sm text-slate-300 whitespace-pre-wrap gb-content-area">{socialSnippets.twitter}</p>
                          </blockquote>
                      </div>
                  )}
                  
                  {/* LinkedIn Post */}
                  {socialSnippets.linkedin && (
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center space-x-2">
                                  <LinkedInIcon className="w-5 h-5 text-[#0A66C2]" />
                                  <h4 className="font-semibold text-slate-200">For LinkedIn</h4>
                              </div>
                              <button
                                  onClick={() => handleCopyToClipboard(socialSnippets.linkedin!, 'linkedin')}
                                  className="flex items-center px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-md shadow transition-colors duration-150"
                                  title="Copy LinkedIn post"
                              >
                                  <ClipboardIcon className="w-3 h-3 mr-1.5" />
                                  {copiedLinkedIn ? 'Copied!' : 'Copy Post'}
                              </button>
                          </div>
                          <blockquote className="border-l-4 border-[#0A66C2] p-3 bg-slate-800/50 rounded-r-md">
                              <p className="text-sm text-slate-300 whitespace-pre-wrap gb-content-area">{socialSnippets.linkedin}</p>
                          </blockquote>
                      </div>
                  )}
              </div>
          </div>
      )}

      {personnelData && (personnelData.director || (personnelData.mainCast && personnelData.mainCast.length > 0)) && (
        <div className="mb-6 p-4 bg-slate-700/40 rounded-lg border border-slate-600/50">
          <h3 className="text-lg font-semibold text-teal-300 mb-2">Key Personnel (Found by AI)</h3>
          {personnelData.director && <p className="text-sm text-slate-300 gb-content-area"><strong>Director:</strong> {personnelData.director}</p>}
          {personnelData.mainCast && personnelData.mainCast.length > 0 && (
            <p className="text-sm text-slate-300 gb-content-area"><strong>Main Cast:</strong> {personnelData.mainCast.join(', ')}</p>
          )}
          {personnelData.sources && personnelData.sources.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs text-teal-400 mb-1">Information possibly sourced from:</h4>
              <ul className="list-disc list-inside space-y-1 gb-content-area">
                {personnelData.sources.map((source, idx) => (
                  <li key={idx} className="text-xs">
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline truncate" title={source.uri}>
                      {source.title || source.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div className="mb-8 p-4 bg-slate-700/50 rounded-lg">
        <h3 className="text-xl font-semibold text-indigo-300 mb-2">Overall Summary</h3>
        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm md:text-base gb-content-area">
          {reportText}
        </p>
      </div>

      {/* Financial & ROI Insights Section */}
      {financialAnalysisData && (
        <div className="my-8 p-4 bg-slate-700/40 border border-slate-600/60 rounded-lg">
            <div className="flex items-center mb-3">
                <ChartPieIcon className="w-6 h-6 text-green-400 mr-3" />
                <h3 className="text-lg font-semibold text-green-300">Financial & ROI Insights</h3>
            </div>
            
            {financialAnalysisData.isLoadingBudget && (
                <div className="flex items-center justify-center my-3">
                    <LoadingSpinner size="sm" /><span className="ml-2 text-sm text-slate-300">Fetching budget estimates...</span>
                </div>
            )}
            {financialAnalysisData.errorBudget && (
                 <p className="text-sm text-red-400 bg-red-800/30 p-2 rounded-md">Error fetching budget: {financialAnalysisData.errorBudget}</p>
            )}

            {!financialAnalysisData.isLoadingBudget && !financialAnalysisData.errorBudget && (
                <div className="text-sm text-slate-300 space-y-1 mb-3 gb-content-area">
                    {financialAnalysisData.userProvidedBudget && (
                        <p><strong>User Provided Budget:</strong> {financialAnalysisData.userProvidedBudget.toLocaleString()} USD</p>
                    )}
                    {financialAnalysisData.fetchedBudget && !financialAnalysisData.userProvidedBudget && (
                        <p><strong>AI-Estimated Budget:</strong> Approx. {financialAnalysisData.fetchedBudget.toLocaleString()} {financialAnalysisData.fetchedBudgetCurrency || 'USD'}</p>
                    )}
                    {financialAnalysisData.fetchedDuration && !financialAnalysisData.userProvidedBudget && (
                         <p><strong>AI-Estimated Production Duration:</strong> {financialAnalysisData.fetchedDuration}</p>
                    )}
                    {financialAnalysisData.fetchedBudgetSources && financialAnalysisData.fetchedBudgetSources.length > 0 && !financialAnalysisData.userProvidedBudget && (
                        <div className="text-xs mt-1">
                            <span className="text-slate-400">Budget/Duration data possibly from:</span>
                            <ul className="list-disc list-inside ml-4">
                                {financialAnalysisData.fetchedBudgetSources.map((s, i) => (
                                    <li key={`fs-${i}`}><a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">{s.title || s.uri}</a></li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {(!financialAnalysisData.userProvidedBudget && !financialAnalysisData.fetchedBudget) && (
                         <p className="italic text-slate-400">No budget information available for ROI analysis.</p>
                    )}
                </div>
            )}

            {financialAnalysisData.isLoadingROI && (
                <div className="flex items-center justify-center my-3">
                    <LoadingSpinner size="sm" /><span className="ml-2 text-sm text-slate-300">Generating ROI potential analysis...</span>
                </div>
            )}
            {financialAnalysisData.errorROI && (
                <p className="text-sm text-red-400 bg-red-800/30 p-2 rounded-md">Error generating ROI analysis: {financialAnalysisData.errorROI}</p>
            )}
            {financialAnalysisData.qualitativeROIAnalysis && !financialAnalysisData.isLoadingROI && (
                <div className="mt-3 pt-3 border-t border-slate-600/50">
                    <h4 className="text-md font-semibold text-green-200 mb-1.5">Qualitative ROI Potential Analysis:</h4>
                    <p className="text-slate-200 whitespace-pre-wrap text-sm leading-relaxed gb-content-area bg-slate-800/30 p-3 rounded-md">
                        {financialAnalysisData.qualitativeROIAnalysis}
                    </p>
                </div>
            )}
        </div>
      )}


      {overallImprovementSuggestions && (
         <div className="my-6 p-4 bg-sky-800/40 border border-sky-700/60 rounded-lg">
            <div className="flex items-center mb-2">
                <LightBulbIcon className="w-6 h-6 text-sky-400 mr-3 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-sky-300">Overall Improvement Opportunities</h3>
            </div>
            <div className="ml-0 md:ml-9">
                 {renderSuggestions(overallImprovementSuggestions, "text-sky-200 whitespace-pre-wrap text-sm leading-relaxed", "gb-content-area")}
            </div>
        </div>
      )}

      {/* Actual Performance Input Section */}
      <div className="my-8 p-4 bg-slate-700/40 border border-slate-600/60 rounded-lg">
        <button 
            onClick={() => setShowActualsInput(!showActualsInput)}
            className="flex items-center justify-between w-full text-left py-2"
        >
            <div className="flex items-center">
                <TicketIcon className="w-6 h-6 text-green-400 mr-3" />
                <h3 className="text-lg font-semibold text-green-300">Compare with Actual Performance (User Input)</h3>
            </div>
            <span className="text-green-400 text-sm">{showActualsInput ? "Hide" : "Show"} Inputs</span>
        </button>

        {showActualsInput && (
            <div className="mt-4 space-y-4 pt-4 border-t border-slate-600/50">
                <p className="text-xs text-slate-400 italic">Enter known performance metrics for comparison. This data is stored locally with your session.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label htmlFor="rtCriticsScore" className="block text-sm font-medium text-slate-300 mb-1">Rotten Tomatoes (Critics %)</label>
                    <input type="number" name="rtCriticsScore" id="rtCriticsScore" min="0" max="100" value={localActualPerformance.rtCriticsScore ?? ''} onChange={handleActualPerformanceInputChange} className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-sm" />
                    </div>
                    <div>
                    <label htmlFor="rtAudienceScore" className="block text-sm font-medium text-slate-300 mb-1">Rotten Tomatoes (Audience %)</label>
                    <input type="number" name="rtAudienceScore" id="rtAudienceScore" min="0" max="100" value={localActualPerformance.rtAudienceScore ?? ''} onChange={handleActualPerformanceInputChange} className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-sm" />
                    </div>
                    <div>
                    <label htmlFor="metacriticScore" className="block text-sm font-medium text-slate-300 mb-1">Metacritic Score (/100)</label>
                    <input type="number" name="metacriticScore" id="metacriticScore" min="0" max="100" value={localActualPerformance.metacriticScore ?? ''} onChange={handleActualPerformanceInputChange} className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-sm" />
                    </div>
                </div>
                <div>
                    <label htmlFor="boxOfficePerformanceNotes" className="block text-sm font-medium text-slate-300 mb-1">Box Office Performance Notes</label>
                    <textarea name="boxOfficePerformanceNotes" id="boxOfficePerformanceNotes" value={localActualPerformance.boxOfficePerformanceNotes ?? ''} onChange={handleActualPerformanceInputChange} rows={2} className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-sm resize-y" placeholder="e.g., Exceeded expectations, Moderate success, Underperformed"></textarea>
                </div>
                <div className="text-right">
                    <button 
                        onClick={handleSaveActualPerformance}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-md shadow flex items-center"
                    >
                       <CheckCircleIcon className="w-4 h-4 mr-1.5" /> Save Actuals
                    </button>
                </div>
            </div>
        )}
      </div>


      <div className="my-8">
        <h3 className="text-xl md:text-2xl font-semibold text-indigo-300 mb-4 pb-2 border-b-2 border-indigo-500/30 text-center">
          Core Layers Overview & Scores
        </h3>
        <ConcentricRingsVisualization layerAnalyses={layerAnalyses} />
      </div>

      <div>
        <h3 className="text-xl md:text-2xl font-semibold text-indigo-300 mb-4 pb-2 border-b-2 border-indigo-500/30">
          Detailed Layer Analysis, Ratings & Suggestions
        </h3>
        <div className="space-y-6">
          {layerAnalyses.map((layer) => {
            const IconComponent = layer.icon;
            const layerDef = LAYER_DEFINITIONS.find(d => d.id === layer.id);
            
            return (
              <div key={layer.id} className="p-5 bg-slate-700/70 rounded-lg shadow-lg border border-slate-600/50">
                <div className="flex flex-col sm:flex-row justify-between items-start w-full mb-3">
                    <div className="flex items-start mb-2 sm:mb-0">
                        <IconComponent className="w-6 h-6 text-indigo-400 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-lg font-semibold text-indigo-300">{layer.title}</h4>
                            {layerDef && <p className="text-xs text-slate-400 mb-1">{layerDef.description}</p>}
                        </div>
                    </div>
                    {layer.userScore !== undefined && (
                        <div className="text-right sm:text-left mt-2 sm:mt-0 flex-shrink-0 ml-0 sm:ml-4">
                            <p className="text-sm text-amber-300 font-semibold">Layer Score:</p>
                            <p className="text-2xl font-bold text-amber-400">
                            {layer.userScore.toFixed(1)}<span className="text-lg text-amber-300"> / {maxScore}</span>
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-2 pl-0 md:pl-9"> 
                  {layer.error ? (
                  <div className="my-2 p-3 bg-red-700/30 text-red-300 border border-red-600 rounded-md text-sm gb-content-area">
                      <strong>Error in this layer's analysis:</strong> {layer.error}
                  </div>
                  ) : (
                  <div className="gb-content-area">
                      <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed mb-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {layer.editedText || "No analysis provided for this layer."}
                      </p>
                      {layer.improvementSuggestions && (
                      <div className="mt-2 p-2.5 bg-sky-800/30 border border-sky-700/50 rounded-md">
                          <div className="flex items-center mb-1">
                              <LightBulbIcon className="w-4 h-4 text-sky-400 mr-2 flex-shrink-0" />
                              <h5 className="text-xs font-semibold text-sky-300">Potential Enhancements:</h5>
                          </div>
                          {renderSuggestions(layer.improvementSuggestions, "text-sky-200 whitespace-pre-wrap text-xs leading-relaxed", "gb-content-area")}
                          </div>
                      )}
                  </div>
                  )}
                  {layer.groundingSources && layer.groundingSources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-600/50">
                      <h5 className="text-xs text-teal-400 mb-1">Layer-specific sources:</h5>
                      <ul className="list-disc list-inside space-y-1 gb-content-area">
                          {layer.groundingSources.map((source, idx) => (
                          <li key={idx} className="text-xs">
                              <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline truncate" title={source.uri}>
                              {source.title || source.uri}
                              </a>
                          </li>
                          ))}
                      </ul>
                      </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blog Export Modal */}
      <BlogExportModal
        isOpen={showBlogExportModal}
        onClose={() => setShowBlogExportModal(false)}
        title={title}
        summaryReportData={summaryReportData}
        layerAnalyses={layerAnalyses}
        personnelData={personnelData}
        actualPerformance={localActualPerformance}
        financialAnalysisData={financialAnalysisData}
        maxScore={maxScore}
      />
    </div>
  );
};
