// Content Publishing Service - Integrates AI analysis with Firebase
import { contentService, GreybrainerUser } from './firebaseConfig';
import { LayerAnalysisData, ReviewStage } from '../types';

export interface PublishableReport {
  title: string;
  type: 'film_review' | 'research' | 'insight' | 'comparison';
  content: string;
  summary: string;
  greybrainerScore?: number;
  category: string;
  tags: string[];
  authorId: string;
  authorEmail: string;
  status: 'draft' | 'in_review' | 'published';
  metadata?: {
    movieTitle?: string;
    reviewStage?: ReviewStage;
    layerScores?: Record<string, number>;
    comparisonItems?: string[];
  };
}

class ContentPublishingService {
  
  // Auto-publish film analysis as draft report
  async publishFilmAnalysis(
    movieTitle: string,
    reviewStage: ReviewStage,
    layerAnalyses: LayerAnalysisData[],
    summaryReport: any,
    currentUser: GreybrainerUser
  ): Promise<string> {
    
    // Calculate overall score
    const scoredLayers = layerAnalyses.filter(l => typeof l.userScore === 'number');
    const overallScore = scoredLayers.length > 0 
      ? scoredLayers.reduce((sum, l) => sum + (l.userScore as number), 0) / scoredLayers.length 
      : undefined;

    // Generate comprehensive content
    const content = this.generateFilmAnalysisContent(movieTitle, reviewStage, layerAnalyses, summaryReport);
    
    // Extract summary (first 200 chars of report)
    const summary = summaryReport.reportText.substring(0, 200) + '...';
    
    // Generate tags
    const tags = this.generateTagsFromAnalysis(movieTitle, layerAnalyses);
    
    // Determine category
    const category = this.categorizeFilmAnalysis(movieTitle, reviewStage);

    const reportData: PublishableReport = {
      title: `${movieTitle} - ${reviewStage} Analysis`,
      type: 'film_review',
      content: content,
      summary: summary,
      greybrainerScore: overallScore,
      category: category,
      tags: tags,
      authorId: currentUser.uid,
      authorEmail: currentUser.email,
      status: 'in_review', // Requires editorial approval
      metadata: {
        movieTitle: movieTitle,
        reviewStage: reviewStage,
        layerScores: this.extractLayerScores(layerAnalyses)
      }
    };

    const reportId = await contentService.createReport(reportData);
    return reportId;
  }

  // Auto-publish comparison analysis
  async publishComparisonAnalysis(
    item1: string,
    item2: string,
    comparisonText: string,
    currentUser: GreybrainerUser
  ): Promise<string> {
    
    const title = `Comparative Analysis: ${item1} vs ${item2}`;
    const summary = comparisonText.substring(0, 200) + '...';
    const tags = [
      ...this.extractKeywords(item1),
      ...this.extractKeywords(item2),
      'comparison',
      'analysis'
    ];

    const reportData: PublishableReport = {
      title: title,
      type: 'comparison',
      content: comparisonText,
      summary: summary,
      category: 'comparative-analysis',
      tags: tags,
      authorId: currentUser.uid,
      authorEmail: currentUser.email,
      status: 'in_review',
      metadata: {
        comparisonItems: [item1, item2]
      }
    };

    const reportId = await contentService.createReport(reportData);
    return reportId;
  }

  // Auto-publish research insights
  async publishResearchInsight(
    insightText: string,
    detailedReport: string,
    currentUser: GreybrainerUser
  ): Promise<string> {
    
    const title = this.extractTitleFromInsight(insightText);
    const summary = detailedReport.substring(0, 200) + '...';
    const category = this.categorizeResearchContent(insightText + ' ' + detailedReport);
    const tags = this.generateResearchTags(insightText + ' ' + detailedReport);

    const reportData: PublishableReport = {
      title: title,
      type: 'research',
      content: detailedReport,
      summary: summary,
      category: category,
      tags: tags,
      authorId: currentUser.uid,
      authorEmail: currentUser.email,
      status: 'in_review'
    };

    const reportId = await contentService.createReport(reportData);
    return reportId;
  }

  // Generate comprehensive film analysis content
  private generateFilmAnalysisContent(
    movieTitle: string,
    reviewStage: ReviewStage,
    layerAnalyses: LayerAnalysisData[],
    summaryReport: any
  ): string {
    let content = `# ${movieTitle} - ${reviewStage} Analysis\n\n`;
    
    // Add summary report
    content += `## Executive Summary\n\n${summaryReport.reportText}\n\n`;
    
    // Add layer analyses
    content += `## Detailed Analysis\n\n`;
    
    layerAnalyses.forEach(layer => {
      if (layer.editedText) {
        content += `### ${layer.title}\n`;
        content += `**Score: ${layer.userScore || layer.aiSuggestedScore || 'N/A'}/10**\n\n`;
        content += `${layer.editedText}\n\n`;
        
        if (layer.improvementSuggestions) {
          content += `**Improvement Suggestions:**\n`;
          if (Array.isArray(layer.improvementSuggestions)) {
            layer.improvementSuggestions.forEach(suggestion => {
              content += `- ${suggestion}\n`;
            });
          } else {
            content += `${layer.improvementSuggestions}\n`;
          }
          content += `\n`;
        }
      }
    });

    // Add social snippets if available
    if (summaryReport.socialSnippets) {
      content += `## Social Media Snippets\n\n`;
      if (summaryReport.socialSnippets.twitter) {
        content += `**Twitter:**\n${summaryReport.socialSnippets.twitter}\n\n`;
      }
      if (summaryReport.socialSnippets.linkedin) {
        content += `**LinkedIn:**\n${summaryReport.socialSnippets.linkedin}\n\n`;
      }
    }

    return content;
  }

  // Extract layer scores for metadata
  private extractLayerScores(layerAnalyses: LayerAnalysisData[]): Record<string, number> {
    const scores: Record<string, number> = {};
    layerAnalyses.forEach(layer => {
      const score = layer.userScore || layer.aiSuggestedScore;
      if (typeof score === 'number') {
        scores[layer.id] = score;
      }
    });
    return scores;
  }

  // Generate tags from film analysis
  private generateTagsFromAnalysis(movieTitle: string, layerAnalyses: LayerAnalysisData[]): string[] {
    const tags = new Set<string>();
    
    // Add movie title as tag
    tags.add(movieTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    
    // Extract keywords from analysis text
    layerAnalyses.forEach(layer => {
      if (layer.editedText) {
        const keywords = this.extractKeywords(layer.editedText);
        keywords.forEach(keyword => tags.add(keyword));
      }
    });
    
    // Add generic tags
    tags.add('film-analysis');
    tags.add('greybrainer-review');
    
    return Array.from(tags).slice(0, 10); // Limit to 10 tags
  }

  // Categorize film analysis
  private categorizeFilmAnalysis(movieTitle: string, reviewStage: ReviewStage): string {
    // Simple categorization logic - can be enhanced
    const title = movieTitle.toLowerCase();
    
    if (title.includes('bollywood') || title.includes('hindi')) return 'bollywood';
    if (title.includes('hollywood')) return 'hollywood';
    if (title.includes('regional')) return 'regional-cinema';
    
    // Default based on review stage
    switch (reviewStage) {
      case ReviewStage.IDEA_ANNOUNCEMENT: return 'upcoming-releases';
      case ReviewStage.TRAILER: return 'trailer-analysis';
      case ReviewStage.MOVIE_RELEASED: return 'film-reviews';
      default: return 'film-analysis';
    }
  }

  // Extract title from insight text
  private extractTitleFromInsight(insight: string): string {
    const firstSentence = insight.split('.')[0];
    if (firstSentence.length > 10 && firstSentence.length < 80) {
      return firstSentence.trim();
    }
    return insight.substring(0, 60).trim() + (insight.length > 60 ? '...' : '');
  }

  // Categorize research content
  private categorizeResearchContent(content: string): string {
    const lowercaseContent = content.toLowerCase();
    
    if (lowercaseContent.includes('streaming') || lowercaseContent.includes('ott')) {
      return 'streaming-trends';
    }
    if (lowercaseContent.includes('ai') || lowercaseContent.includes('technology')) {
      return 'technology-innovation';
    }
    if (lowercaseContent.includes('audience') || lowercaseContent.includes('behavior')) {
      return 'audience-insights';
    }
    if (lowercaseContent.includes('regional') || lowercaseContent.includes('indian')) {
      return 'regional-cinema';
    }
    
    return 'industry-analysis';
  }

  // Generate research tags
  private generateResearchTags(content: string): string[] {
    const keywords = [
      'streaming', 'ott', 'netflix', 'amazon-prime', 'disney-hotstar',
      'ai', 'technology', 'innovation', 'virtual-production',
      'audience', 'behavior', 'trends', 'consumption',
      'bollywood', 'hollywood', 'regional-cinema', 'indian-cinema',
      'box-office', 'revenue', 'market-analysis'
    ];

    const lowercaseContent = content.toLowerCase();
    const foundTags = keywords.filter(keyword => 
      lowercaseContent.includes(keyword.replace('-', ' '))
    );

    return [...foundTags, 'research', 'industry-insights'].slice(0, 8);
  }

  // Extract keywords from text
  private extractKeywords(text: string): string[] {
    const commonWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'this', 'that', 'these', 'those', 'a', 'an'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 5);
  }
}

export const contentPublishingService = new ContentPublishingService();