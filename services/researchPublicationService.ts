// Research Publication Service
// Manages the publication and display of research insights for public consumption

export interface PublishedResearch {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'industry-trends' | 'technology' | 'audience-behavior' | 'creative-analysis' | 'market-insights';
  tags: string[];
  author: string;
  publishedDate: string;
  views: number;
  isPublished: boolean;
  sourceInsight?: string; // Original insight that generated this research
  sourceType: 'insight' | 'analysis' | 'comparison' | 'manual';
}

interface CreateResearchRequest {
  title: string;
  summary: string;
  content: string;
  category: PublishedResearch['category'];
  tags: string[];
  author: string;
  sourceInsight?: string;
  sourceType: PublishedResearch['sourceType'];
}

class ResearchPublicationService {
  private readonly STORAGE_KEY = 'greybrainer_published_research';

  // Get all published research
  async getPublishedResearch(): Promise<PublishedResearch[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        // Initialize with sample research if none exists
        const sampleResearch = this.getSampleResearch();
        await this.saveResearch(sampleResearch);
        return sampleResearch;
      }
      const research = JSON.parse(stored);
      return research.filter((item: PublishedResearch) => item.isPublished);
    } catch (error) {
      console.error('Error loading published research:', error);
      return this.getSampleResearch();
    }
  }

  // Publish new research
  async publishResearch(request: CreateResearchRequest): Promise<PublishedResearch> {
    const research = await this.getAllResearch();
    
    const newResearch: PublishedResearch = {
      id: this.generateId(),
      title: request.title,
      summary: request.summary,
      content: request.content,
      category: request.category,
      tags: request.tags,
      author: request.author,
      publishedDate: new Date().toISOString(),
      views: 0,
      isPublished: true,
      sourceInsight: request.sourceInsight,
      sourceType: request.sourceType,
    };

    research.push(newResearch);
    await this.saveResearch(research);
    return newResearch;
  }

  // Auto-publish from Greybrainer insights
  async autoPublishFromInsight(
    insightText: string, 
    detailedReport: string, 
    author: string
  ): Promise<PublishedResearch> {
    // Extract title from insight (first sentence or first 60 chars)
    const title = this.extractTitleFromInsight(insightText);
    
    // Generate summary (first paragraph of detailed report or first 200 chars)
    const summary = this.extractSummaryFromReport(detailedReport);
    
    // Auto-categorize based on content
    const category = this.categorizeContent(insightText + ' ' + detailedReport);
    
    // Auto-generate tags
    const tags = this.generateTags(insightText + ' ' + detailedReport);

    return await this.publishResearch({
      title,
      summary,
      content: detailedReport,
      category,
      tags,
      author,
      sourceInsight: insightText,
      sourceType: 'insight'
    });
  }

  // Auto-publish from comparison analysis
  async autoPublishFromComparison(
    item1: string,
    item2: string,
    comparisonText: string,
    author: string
  ): Promise<PublishedResearch> {
    const title = `Comparative Analysis: ${item1} vs ${item2}`;
    const summary = this.extractSummaryFromReport(comparisonText);
    const tags = this.generateTags(comparisonText);

    return await this.publishResearch({
      title,
      summary,
      content: comparisonText,
      category: 'creative-analysis',
      tags: [...tags, item1.toLowerCase(), item2.toLowerCase(), 'comparison'],
      author,
      sourceType: 'comparison'
    });
  }

  // Increment view count
  async incrementViews(researchId: string): Promise<void> {
    const research = await this.getAllResearch();
    const index = research.findIndex(r => r.id === researchId);
    
    if (index !== -1) {
      research[index].views += 1;
      await this.saveResearch(research);
    }
  }

  // Unpublish research
  async unpublishResearch(researchId: string): Promise<void> {
    const research = await this.getAllResearch();
    const index = research.findIndex(r => r.id === researchId);
    
    if (index !== -1) {
      research[index].isPublished = false;
      await this.saveResearch(research);
    }
  }

  // Delete research
  async deleteResearch(researchId: string): Promise<void> {
    const research = await this.getAllResearch();
    const filtered = research.filter(r => r.id !== researchId);
    await this.saveResearch(filtered);
  }

  // Get research by category
  async getResearchByCategory(category: PublishedResearch['category']): Promise<PublishedResearch[]> {
    const research = await this.getPublishedResearch();
    return research.filter(r => r.category === category);
  }

  // Search research
  async searchResearch(query: string): Promise<PublishedResearch[]> {
    const research = await this.getPublishedResearch();
    const lowercaseQuery = query.toLowerCase();
    
    return research.filter(r => 
      r.title.toLowerCase().includes(lowercaseQuery) ||
      r.summary.toLowerCase().includes(lowercaseQuery) ||
      r.content.toLowerCase().includes(lowercaseQuery) ||
      r.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Get research statistics
  async getStats(): Promise<{
    totalPublished: number;
    totalViews: number;
    categoryCounts: Record<string, number>;
    recentPublications: number;
  }> {
    const research = await this.getPublishedResearch();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const categoryCounts: Record<string, number> = {};
    research.forEach(r => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });

    return {
      totalPublished: research.length,
      totalViews: research.reduce((sum, r) => sum + r.views, 0),
      categoryCounts,
      recentPublications: research.filter(r => 
        new Date(r.publishedDate) > oneWeekAgo
      ).length
    };
  }

  // Private helper methods
  private async getAllResearch(): Promise<PublishedResearch[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading all research:', error);
      return [];
    }
  }

  private async saveResearch(research: PublishedResearch[]): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(research));
    } catch (error) {
      console.error('Error saving research:', error);
      throw new Error('Failed to save research');
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private extractTitleFromInsight(insight: string): string {
    // Extract first sentence or first 60 characters
    const firstSentence = insight.split('.')[0];
    if (firstSentence.length > 10 && firstSentence.length < 80) {
      return firstSentence.trim();
    }
    return insight.substring(0, 60).trim() + (insight.length > 60 ? '...' : '');
  }

  private extractSummaryFromReport(report: string): string {
    // Extract first paragraph or first 200 characters
    const firstParagraph = report.split('\n\n')[0];
    if (firstParagraph.length > 50 && firstParagraph.length < 300) {
      return firstParagraph.trim();
    }
    return report.substring(0, 200).trim() + (report.length > 200 ? '...' : '');
  }

  private categorizeContent(content: string): PublishedResearch['category'] {
    const lowercaseContent = content.toLowerCase();
    
    if (lowercaseContent.includes('streaming') || lowercaseContent.includes('platform') || 
        lowercaseContent.includes('industry') || lowercaseContent.includes('market')) {
      return 'industry-trends';
    }
    if (lowercaseContent.includes('ai') || lowercaseContent.includes('technology') || 
        lowercaseContent.includes('virtual') || lowercaseContent.includes('digital')) {
      return 'technology';
    }
    if (lowercaseContent.includes('audience') || lowercaseContent.includes('viewer') || 
        lowercaseContent.includes('consumption') || lowercaseContent.includes('behavior')) {
      return 'audience-behavior';
    }
    if (lowercaseContent.includes('story') || lowercaseContent.includes('narrative') || 
        lowercaseContent.includes('character') || lowercaseContent.includes('creative')) {
      return 'creative-analysis';
    }
    
    return 'market-insights'; // Default category
  }

  private generateTags(content: string): string[] {
    const keywords = [
      'streaming', 'netflix', 'amazon', 'disney', 'bollywood', 'hollywood',
      'ai', 'technology', 'virtual production', 'vfx', 'animation',
      'audience', 'viewers', 'consumption', 'behavior', 'trends',
      'story', 'narrative', 'character', 'plot', 'screenplay',
      'box office', 'revenue', 'budget', 'roi', 'market',
      'indian cinema', 'regional', 'ott', 'theatrical'
    ];

    const lowercaseContent = content.toLowerCase();
    const foundTags = keywords.filter(keyword => 
      lowercaseContent.includes(keyword.toLowerCase())
    );

    // Add some generic tags
    const genericTags = ['film analysis', 'cinema', 'entertainment'];
    
    return [...new Set([...foundTags, ...genericTags])].slice(0, 8);
  }

  private getSampleResearch(): PublishedResearch[] {
    return [
      {
        id: 'sample-1',
        title: 'The Rise of Regional OTT Content in Indian Cinema',
        summary: 'Regional language content is experiencing unprecedented growth on OTT platforms, reshaping the Indian entertainment landscape.',
        content: `The Indian OTT landscape has witnessed a remarkable transformation with regional content taking center stage. Platforms like Netflix, Amazon Prime Video, and Disney+ Hotstar are investing heavily in Tamil, Telugu, Malayalam, and other regional productions.

This shift represents more than just content diversification—it's a fundamental change in how stories are told and consumed. Regional creators are bringing authentic narratives that resonate with local audiences while attracting global viewers through subtitles and dubbing.

Key factors driving this trend include:
- Increased smartphone penetration in tier-2 and tier-3 cities
- Growing comfort with digital payments
- Success stories like "Arya" (Tamil) and "The Family Man" (Hindi with regional elements)
- Cost-effectiveness of regional productions compared to big-budget Hindi films

The implications are significant for the industry. Traditional Bollywood dominance is being challenged, and new talent pools are emerging. This democratization of content creation is likely to continue, with regional stories finding national and international audiences.`,
        category: 'industry-trends',
        tags: ['regional cinema', 'ott platforms', 'indian cinema', 'streaming', 'content diversity'],
        author: 'Greybrainer AI',
        publishedDate: '2024-12-01',
        views: 245,
        isPublished: true,
        sourceType: 'insight'
      },
      {
        id: 'sample-2',
        title: 'AI-Driven Virtual Production: Democratizing High-Concept Visuals',
        summary: 'Artificial intelligence and virtual production techniques are making sophisticated visual effects accessible to independent filmmakers.',
        content: `The convergence of AI and virtual production is revolutionizing filmmaking, particularly for independent creators who previously couldn't afford high-end visual effects. Technologies like Unreal Engine's virtual sets, AI-powered motion capture, and automated compositing are breaking down traditional barriers.

Independent filmmakers can now create sci-fi and fantasy content that rivals studio productions at a fraction of the cost. This democratization is leading to more diverse storytelling, as creators from different backgrounds can now visualize their ambitious concepts.

Recent examples include:
- "The Mandalorian" popularizing LED volume stages
- AI tools like RunwayML enabling quick VFX iterations
- Real-time rendering reducing post-production timelines
- Cloud-based rendering making powerful computing accessible

The impact extends beyond just cost savings. These tools are enabling new forms of storytelling, where the line between live-action and animation blurs. We're seeing experimental narratives that wouldn't have been possible with traditional filmmaking methods.

This trend suggests a future where technical limitations no longer constrain creative vision, potentially leading to a renaissance of innovative, visually stunning independent cinema.`,
        category: 'technology',
        tags: ['ai', 'virtual production', 'independent film', 'vfx', 'technology', 'democratization'],
        author: 'Greybrainer AI',
        publishedDate: '2024-11-28',
        views: 189,
        isPublished: true,
        sourceType: 'insight'
      },
      {
        id: 'sample-3',
        title: 'Interactive Narratives: The Future of Audience Engagement',
        summary: 'Streaming platforms are experimenting with interactive storytelling, giving viewers agency in narrative outcomes.',
        content: `Interactive narratives represent a paradigm shift in how audiences consume content. Netflix's "Black Mirror: Bandersnatch" and "You vs. Wild" demonstrated the potential, but we're now seeing more sophisticated implementations across platforms.

This evolution reflects changing audience expectations. Modern viewers, particularly Gen Z and millennials, expect participation rather than passive consumption. They want to influence outcomes, explore alternative storylines, and feel agency in the narrative process.

Technical innovations enabling this trend:
- Branching narrative engines
- Real-time audience polling integration
- AI-driven personalized story paths
- Multi-device synchronization for group viewing

The implications for storytelling are profound. Writers must now think in terms of narrative trees rather than linear plots. This complexity requires new skills and tools, but also opens up unprecedented creative possibilities.

Early data suggests interactive content has higher engagement rates and longer viewing sessions. However, production costs are significantly higher, and not all stories benefit from interactivity.

As the technology matures, we expect to see hybrid approaches where traditional linear storytelling is enhanced with optional interactive elements, allowing viewers to choose their level of engagement.`,
        category: 'audience-behavior',
        tags: ['interactive media', 'audience engagement', 'streaming', 'narrative innovation', 'viewer agency'],
        author: 'Greybrainer AI',
        publishedDate: '2024-11-25',
        views: 156,
        isPublished: true,
        sourceType: 'analysis'
      }
    ];
  }
}

// Export singleton instance
export const researchPublicationService = new ResearchPublicationService();
export default researchPublicationService;