import React, { useState } from 'react';
import { XMarkIcon } from './icons/XMarkIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { LayerAnalysisData, SummaryReportData, PersonnelData, ActualPerformanceData, FinancialAnalysisData } from '../types';
import { LAYER_DEFINITIONS, LAYER_SHORT_NAMES } from '../constants';
import { generateDirectorModeBlogPost } from '../services/geminiService';

interface BlogExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  summaryReportData: SummaryReportData;
  layerAnalyses: LayerAnalysisData[];
  personnelData?: PersonnelData;
  actualPerformance?: ActualPerformanceData;
  financialAnalysisData?: FinancialAnalysisData;
  maxScore: number;
}

export const BlogExportModal: React.FC<BlogExportModalProps> = ({
  isOpen,
  onClose,
  title,
  summaryReportData,
  layerAnalyses,
  personnelData,
  actualPerformance,
  financialAnalysisData,
  maxScore
}) => {
  const [copiedBlog, setCopiedBlog] = useState(false);
  const [copiedSocial, setCopiedSocial] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'blog' | 'social'>('blog');
  const [directorMode, setDirectorMode] = useState(false);
  const [isGeneratingDirectorMode, setIsGeneratingDirectorMode] = useState(false);
  const [directorModeContent, setDirectorModeContent] = useState<string | null>(null);

  if (!isOpen) return null;

  const overallScore = layerAnalyses.reduce((sum, layer) => sum + (layer.userScore || 0), 0);

  const handleGenerateDirectorMode = async () => {
    setIsGeneratingDirectorMode(true);
    try {
      const content = await generateDirectorModeBlogPost(title, summaryReportData.reportText);
      setDirectorModeContent(content);
    } catch (error) {
      console.error("Failed to generate director mode blog post:", error);
    } finally {
      setIsGeneratingDirectorMode(false);
    }
  };

  const generateBlogPost = (): string => {
    if (directorMode && directorModeContent) {
      return directorModeContent;
    }

    let blog = `# 🎬 Greybrainer AI Movie Review: ${title}\n\n`;
    
    // Hero section with score
    blog += `## 🏆 Overall Greybrainer Score: ${overallScore.toFixed(1)}/${maxScore}\n\n`;
    
    // Quick stats if available
    if (actualPerformance?.rtCriticsScore || actualPerformance?.rtAudienceScore || actualPerformance?.metacriticScore) {
      blog += `### 📊 Critical Reception\n`;
      if (actualPerformance.rtCriticsScore) blog += `- **Rotten Tomatoes (Critics):** ${actualPerformance.rtCriticsScore}%\n`;
      if (actualPerformance.rtAudienceScore) blog += `- **Rotten Tomatoes (Audience):** ${actualPerformance.rtAudienceScore}%\n`;
      if (actualPerformance.metacriticScore) blog += `- **Metacritic:** ${actualPerformance.metacriticScore}/100\n`;
      blog += `\n`;
    }

    // Key personnel
    if (personnelData?.director || personnelData?.mainCast?.length) {
      blog += `### 🎭 Key Personnel\n`;
      if (personnelData.director) blog += `- **Director:** ${personnelData.director}\n`;
      if (personnelData.mainCast?.length) blog += `- **Main Cast:** ${personnelData.mainCast.join(', ')}\n`;
      blog += `\n`;
    }

    // Financial insights
    if (financialAnalysisData?.userProvidedBudget || financialAnalysisData?.fetchedBudget) {
      blog += `### 💰 Financial Overview\n`;
      if (financialAnalysisData.userProvidedBudget) {
        blog += `- **Budget:** $${financialAnalysisData.userProvidedBudget} USD\n`;
      } else if (financialAnalysisData.fetchedBudget) {
        blog += `- **Estimated Budget:** ~${financialAnalysisData.fetchedBudget} ${financialAnalysisData.fetchedBudgetCurrency || 'USD'}\n`;
      }
      if (financialAnalysisData.fetchedDuration) {
        blog += `- **Production Duration:** ${financialAnalysisData.fetchedDuration}\n`;
      }
      blog += `\n`;
    }

    // Executive summary
    blog += `## 📝 Executive Summary\n\n`;
    blog += `${summaryReportData.reportText}\n\n`;

    // Layer breakdown with visual indicators
    blog += `## 🎯 Greybrainer Layer Analysis\n\n`;
    blog += `*The Greybrainer methodology analyzes films through three core layers:*\n\n`;

    const orderedLayers = [
      layerAnalyses.find(l => l.id === 'STORY'),
      layerAnalyses.find(l => l.id === 'CONCEPTUALIZATION'), 
      layerAnalyses.find(l => l.id === 'PERFORMANCE')
    ].filter(Boolean) as LayerAnalysisData[];

    orderedLayers.forEach((layer, index) => {
      const layerDef = LAYER_DEFINITIONS.find(ld => ld.id === layer.id);
      const scoreDisplay = layer.userScore !== undefined ? `${layer.userScore.toFixed(1)}/${maxScore}` : 'Not Scored';
      const ringPosition = index === 0 ? '🎯 Core' : index === 1 ? '🔄 Middle' : '🌟 Outer';
      
      blog += `### ${ringPosition} Ring: ${layer.title} - ${scoreDisplay}\n\n`;
      if (layerDef) {
        blog += `*${layerDef.description}*\n\n`;
      }
      blog += `${layer.editedText}\n\n`;
      
      if (layer.improvementSuggestions) {
        blog += `**💡 Enhancement Opportunities:**\n`;
        const suggestions = Array.isArray(layer.improvementSuggestions) 
          ? layer.improvementSuggestions 
          : [layer.improvementSuggestions];
        suggestions.forEach(suggestion => {
          blog += `- ${suggestion}\n`;
        });
        blog += `\n`;
      }
    });

    // Overall improvement suggestions
    if (summaryReportData.overallImprovementSuggestions) {
      blog += `## 🚀 Overall Enhancement Opportunities\n\n`;
      const overallSuggestions = Array.isArray(summaryReportData.overallImprovementSuggestions)
        ? summaryReportData.overallImprovementSuggestions
        : [summaryReportData.overallImprovementSuggestions];
      overallSuggestions.forEach(suggestion => {
        blog += `- ${suggestion}\n`;
      });
      blog += `\n`;
    }

    // ROI Analysis if available
    if (financialAnalysisData?.qualitativeROIAnalysis) {
      blog += `## 📈 ROI & Market Analysis\n\n`;
      blog += `${financialAnalysisData.qualitativeROIAnalysis}\n\n`;
    }

    // Footer
    blog += `---\n\n`;
    blog += `*This analysis was generated using Greybrainer AI, a comprehensive movie review methodology that evaluates films through multiple analytical layers.*\n\n`;
    blog += `**Methodology Note:** Greybrainer uses a three-layer concentric analysis approach:\n`;
    blog += `- **Core (Story):** Narrative foundation, themes, character development\n`;
    blog += `- **Middle (Conceptualization):** Director's vision, editing, casting decisions\n`;
    blog += `- **Outer (Performance):** Acting, cinematography, music, technical execution\n\n`;
    
    return blog;
  };

  const generateSocialPost = (): string => {
    let social = `🎬 Just analyzed "${title}" with Greybrainer AI!\n\n`;
    social += `🏆 Overall Score: ${overallScore.toFixed(1)}/${maxScore}\n\n`;
    
    // Layer scores in emoji format
    const orderedLayers = [
      layerAnalyses.find(l => l.id === 'STORY'),
      layerAnalyses.find(l => l.id === 'CONCEPTUALIZATION'),
      layerAnalyses.find(l => l.id === 'PERFORMANCE')
    ].filter(Boolean) as LayerAnalysisData[];

    social += `📊 Layer Breakdown:\n`;
    orderedLayers.forEach((layer, index) => {
      const emoji = index === 0 ? '🎯' : index === 1 ? '🔄' : '🌟';
      const scoreDisplay = layer.userScore !== undefined ? `${layer.userScore.toFixed(1)}/${maxScore}` : 'N/A';
      social += `${emoji} ${LAYER_SHORT_NAMES[layer.id]}: ${scoreDisplay}\n`;
    });

    // Quick highlight
    const topLayer = orderedLayers.reduce((prev, current) => 
      (current.userScore || 0) > (prev.userScore || 0) ? current : prev
    );
    
    if (topLayer.userScore) {
      social += `\n✨ Strongest aspect: ${LAYER_SHORT_NAMES[topLayer.id]} (${topLayer.userScore.toFixed(1)}/${maxScore})\n`;
    }

    // Add actual performance if available
    if (actualPerformance?.rtCriticsScore || actualPerformance?.rtAudienceScore) {
      social += `\n🍅 RT: `;
      if (actualPerformance.rtCriticsScore) social += `${actualPerformance.rtCriticsScore}% Critics`;
      if (actualPerformance.rtAudienceScore) {
        if (actualPerformance.rtCriticsScore) social += ` | `;
        social += `${actualPerformance.rtAudienceScore}% Audience`;
      }
      social += `\n`;
    }

    social += `\n#MovieReview #FilmAnalysis #GreybrainerAI #${title.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    return social;
  };

  const handleCopy = (type: 'blog' | 'social') => {
    const content = type === 'blog' ? generateBlogPost() : generateSocialPost();
    navigator.clipboard.writeText(content).then(() => {
      if (type === 'blog') {
        setCopiedBlog(true);
        setTimeout(() => setCopiedBlog(false), 2500);
      } else {
        setCopiedSocial(true);
        setTimeout(() => setCopiedSocial(false), 2500);
      }
    }).catch(err => {
      console.error(`Failed to copy ${type}:`, err);
    });
  };

  const handleDownload = () => {
    const content = selectedFormat === 'blog' ? generateBlogPost() : generateSocialPost();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const suffix = selectedFormat === 'blog' ? (directorMode ? 'director_cut' : 'blog_post') : 'social_post';
    link.download = `${safeTitle}_${suffix}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-semibold text-slate-100">Export for Blog/Social</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Format Selection */}
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setSelectedFormat('blog')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFormat === 'blog'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                📝 Blog Post Format
              </button>
              <button
                onClick={() => setSelectedFormat('social')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFormat === 'social'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                📱 Social Media Format
              </button>
            </div>

            {selectedFormat === 'blog' && (
              <div className="flex items-center space-x-3 bg-slate-700/30 p-3 rounded-lg border border-slate-600/50">
                <div className="flex items-center h-5">
                  <input
                    id="director-mode"
                    type="checkbox"
                    checked={directorMode}
                    onChange={(e) => setDirectorMode(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-2"
                  />
                </div>
                <div className="ml-2 text-sm">
                  <label htmlFor="director-mode" className="font-medium text-slate-200">
                    🎬 Director Mode (Cinematic Narrative)
                  </label>
                  <p className="text-slate-400 text-xs">
                    Transforms the review into a cinematic story with visual moments and strategic content hooks.
                  </p>
                </div>
                {directorMode && !directorModeContent && (
                  <button
                    onClick={handleGenerateDirectorMode}
                    disabled={isGeneratingDirectorMode}
                    className={`ml-auto px-3 py-1.5 text-xs font-medium rounded-md text-white transition-colors ${
                      isGeneratingDirectorMode 
                        ? 'bg-indigo-500/50 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    {isGeneratingDirectorMode ? 'Generating...' : 'Generate Cinematic Cut'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-slate-900 rounded-lg p-4 mb-6 border border-slate-600">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">
              Preview: {directorMode && selectedFormat === 'blog' ? '🎬 Director\'s Cut' : ''}
            </h3>
            <div className="bg-slate-800 rounded p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                {selectedFormat === 'blog' 
                  ? (directorMode && !directorModeContent 
                      ? (isGeneratingDirectorMode ? "Generating cinematic narrative... please wait..." : "Enable Director Mode and click 'Generate Cinematic Cut' to create a story-driven blog post.") 
                      : generateBlogPost())
                  : generateSocialPost()}
              </pre>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleCopy(selectedFormat)}
              disabled={selectedFormat === 'blog' && directorMode && !directorModeContent}
              className={`flex items-center px-4 py-2 font-medium rounded-lg transition-colors ${
                selectedFormat === 'blog' && directorMode && !directorModeContent
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <ClipboardIcon className="w-4 h-4 mr-2" />
              {selectedFormat === 'blog' 
                ? (copiedBlog ? 'Blog Copied!' : 'Copy Blog Post')
                : (copiedSocial ? 'Social Copied!' : 'Copy Social Post')
              }
            </button>
            
            <button
              onClick={handleDownload}
              disabled={selectedFormat === 'blog' && directorMode && !directorModeContent}
              className={`flex items-center px-4 py-2 font-medium rounded-lg transition-colors ${
                selectedFormat === 'blog' && directorMode && !directorModeContent
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download {selectedFormat === 'blog' ? 'Blog' : 'Social'} Post
            </button>
          </div>

          {/* Features Note */}
          <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
            <h4 className="text-sm font-semibold text-slate-200 mb-2">✨ What's Included:</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Complete analysis with scores and layer breakdown</li>
              <li>• Key personnel and financial insights</li>
              <li>• Enhancement opportunities and suggestions</li>
              <li>• Formatted for immediate publishing</li>
              <li>• Social media optimized with hashtags and emojis</li>
              <li>• Clean sources (filtered irrelevant URLs)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
