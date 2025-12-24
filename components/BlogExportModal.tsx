import React, { useState } from 'react';
import { XMarkIcon } from './icons/XMarkIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { LayerAnalysisData, SummaryReportData, PersonnelData, ActualPerformanceData, FinancialAnalysisData } from '../types';
import { LAYER_DEFINITIONS, LAYER_SHORT_NAMES } from '../constants';
import { generateDirectorModeBlogPost, LogTokenUsageFn } from '../services/geminiService';
import { generateEnhancedBlogPost, formatBlogForPlatform } from '../services/blogImageService';
import { LoadingSpinner } from './LoadingSpinner';

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
  logTokenUsage?: LogTokenUsageFn;
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
  maxScore,
  logTokenUsage
}) => {
  const [copiedBlog, setCopiedBlog] = useState(false);
  const [copiedSocial, setCopiedSocial] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'blog' | 'social'>('blog');
  const [directorMode, setDirectorMode] = useState(false);
  const [isGeneratingDirectorMode, setIsGeneratingDirectorMode] = useState(false);
  const [directorModeContent, setDirectorModeContent] = useState<string | null>(null);
  
  // New state for enhanced blog with images
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [isGeneratingEnhanced, setIsGeneratingEnhanced] = useState(false);
  const [enhancedBlogData, setEnhancedBlogData] = useState<any>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'markdown' | 'medium' | 'wordpress' | 'html'>('markdown');

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

  const handleGenerateEnhancedBlog = async () => {
    setIsGeneratingEnhanced(true);
    setEnhancedMode(true);
    try {
      const currentBlog = generateBlogPost();
      const enhanced = await generateEnhancedBlogPost(title, currentBlog, logTokenUsage);
      setEnhancedBlogData(enhanced);
    } catch (error: any) {
      console.error("Failed to generate enhanced blog post:", error);
      const errorMessage = error?.message || "Failed to generate enhanced blog post with images. Please try again.";
      alert(errorMessage);
      setEnhancedMode(false); // Reset enhanced mode on error
    } finally {
      setIsGeneratingEnhanced(false);
    }
  };

  const generateBlogPost = (): string => {
    // If enhanced mode is active and we have enhanced data, use formatted version
    if (enhancedMode && enhancedBlogData) {
      return formatBlogForPlatform(enhancedBlogData, selectedPlatform);
    }

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
              <>
                {/* Director Mode */}
                <div className="flex items-center space-x-3 bg-slate-700/30 p-3 rounded-lg border border-slate-600/50 mb-3">
                  <div className="flex items-center h-5">
                    <input
                      id="director-mode"
                      type="checkbox"
                      checked={directorMode}
                      onChange={(e) => setDirectorMode(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-2"
                    />
                  </div>
                  <div className="ml-2 text-sm flex-1">
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

                {/* Enhanced Mode with Images */}
                <div className="flex items-center space-x-3 bg-gradient-to-r from-purple-700/30 to-pink-700/30 p-3 rounded-lg border border-purple-500/50">
                  <div className="flex items-center h-5">
                    <input
                      id="enhanced-mode"
                      type="checkbox"
                      checked={enhancedMode}
                      onChange={(e) => setEnhancedMode(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-500 rounded focus:ring-purple-500 focus:ring-2"
                    />
                  </div>
                  <div className="ml-2 text-sm flex-1">
                    <label htmlFor="enhanced-mode" className="font-medium text-purple-200 flex items-center gap-2">
                      🖼️ Enhanced Mode (Images + SEO) <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">NEW</span>
                    </label>
                    <p className="text-purple-200 text-xs">
                      AI-generated image prompts, thumbnails, and complete SEO metadata. Publish-ready, viral-optimized!
                    </p>
                  </div>
                  {enhancedMode && !enhancedBlogData && (
                    <button
                      onClick={handleGenerateEnhancedBlog}
                      disabled={isGeneratingEnhanced}
                      className={`ml-auto px-3 py-1.5 text-xs font-medium rounded-md text-white transition-colors flex items-center gap-2 ${
                        isGeneratingEnhanced 
                          ? 'bg-purple-500/50 cursor-not-allowed' 
                          : 'bg-purple-600 hover:bg-purple-500'
                      }`}
                    >
                      {isGeneratingEnhanced ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Generating...
                        </>
                      ) : (
                        '✨ Generate Enhanced Version'
                      )}
                    </button>
                  )}
                </div>

                {/* Platform Selector for Enhanced Mode */}
                {enhancedMode && enhancedBlogData && (
                  <div className="mt-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      Export Platform:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['markdown', 'medium', 'wordpress', 'html'] as const).map((platform) => (
                        <button
                          key={platform}
                          onClick={() => setSelectedPlatform(platform)}
                          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                            selectedPlatform === platform
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          }`}
                        >
                          {platform === 'markdown' ? '📝 Markdown' : 
                           platform === 'medium' ? '📰 Medium' :
                           platform === 'wordpress' ? '🌐 WordPress' : '💻 HTML'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preview */}
          <div className="bg-slate-900 rounded-lg p-4 mb-6 border border-slate-600">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">
              Preview: {enhancedMode && enhancedBlogData ? '✨ Enhanced with Images' : directorMode && selectedFormat === 'blog' ? '🎬 Director\'s Cut' : ''}
            </h3>
            <div className="bg-slate-800 rounded p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                {selectedFormat === 'blog' 
                  ? (directorMode && !directorModeContent 
                      ? (isGeneratingDirectorMode ? "Generating cinematic narrative... please wait..." : "Enable Director Mode and click 'Generate Cinematic Cut' to create a story-driven blog post.") 
                      : (enhancedMode && !enhancedBlogData
                          ? (isGeneratingEnhanced ? "Generating enhanced version with images and SEO... please wait..." : "Enable Enhanced Mode and click 'Generate Enhanced Version' to add AI-generated images and SEO!")
                          : generateBlogPost()))
                  : generateSocialPost()}
              </pre>
            </div>
          </div>

          {/* Image Prompts Section (Enhanced Mode) */}
          {enhancedMode && enhancedBlogData && selectedFormat === 'blog' && (
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg p-4 mb-6 border-2 border-purple-500/50">
              <h3 className="text-lg font-semibold text-purple-200 mb-3 flex items-center gap-2">
                🖼️ AI Image Prompts ({enhancedBlogData.images.length} images)
              </h3>
              <p className="text-xs text-purple-200 mb-4">
                Copy these prompts to Midjourney, DALL-E, or Imagen to generate stunning visuals for your blog post!
              </p>
              
              <div className="space-y-4">
                {enhancedBlogData.images.map((img: any, index: number) => (
                  <div key={index} className="bg-slate-800/70 rounded-lg p-3 border border-purple-500/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-semibold text-purple-300">Image {index + 1}</span>
                        <h4 className="text-sm font-medium text-slate-200">{img.title}</h4>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(img.imagePrompt);
                        }}
                        className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded transition-colors"
                      >
                        Copy Prompt
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{img.description}</p>
                    <div className="bg-slate-900/50 rounded p-2 mb-2">
                      <p className="text-xs font-mono text-green-300">{img.imagePrompt}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-slate-400">Alt:</span>
                      <span className="text-slate-300">{img.altText}</span>
                    </div>
                    <div className="flex gap-2 text-xs mt-1">
                      <span className="text-slate-400">Caption:</span>
                      <span className="text-slate-300 italic">{img.caption}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* SEO Metadata */}
              <div className="mt-6 pt-4 border-t border-purple-500/30">
                <h4 className="text-sm font-semibold text-purple-200 mb-3">📊 SEO Metadata</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Meta Title:</span>
                    <p className="text-slate-300">{enhancedBlogData.seoMetadata.metaTitle}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Meta Description:</span>
                    <p className="text-slate-300">{enhancedBlogData.seoMetadata.metaDescription}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Keywords:</span>
                    <p className="text-slate-300">{enhancedBlogData.seoMetadata.keywords.join(', ')}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">OG Title:</span>
                    <p className="text-slate-300">{enhancedBlogData.seoMetadata.ogTitle}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">OG Description:</span>
                    <p className="text-slate-300">{enhancedBlogData.seoMetadata.ogDescription}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

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
