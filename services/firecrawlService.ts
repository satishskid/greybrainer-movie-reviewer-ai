// Firecrawl Service for scraping and crawling web content
import { getFirecrawlApiKey } from '../utils/firecrawlKeyStorage';

export interface FirecrawlScrapeOptions {
  url: string;
  formats?: ('markdown' | 'html' | 'text' | 'screenshot' | 'links')[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  waitFor?: number;
}

export interface FirecrawlCrawlOptions {
  url: string;
  limit?: number;
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface FirecrawlScrapeResponse {
  success: boolean;
  data: {
    markdown?: string;
    html?: string;
    text?: string;
    links?: string[];
    metadata?: Record<string, any>;
  };
  error?: string;
}

class FirecrawlService {
  private readonly baseUrl = 'https://api.firecrawl.dev/v1';

  private getApiKey(): string {
    const apiKey = getFirecrawlApiKey();
    if (!apiKey) {
      throw new Error('Firecrawl API key not found. Please configure your API key in settings.');
    }
    return apiKey;
  }

  /**
   * Scrape a single URL using Firecrawl
   */
  async scrapeUrl(options: FirecrawlScrapeOptions): Promise<FirecrawlScrapeResponse> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: options.url,
          formats: options.formats || ['markdown'],
          onlyMainContent: options.onlyMainContent !== undefined ? options.onlyMainContent : true,
          includeTags: options.includeTags,
          excludeTags: options.excludeTags,
          waitFor: options.waitFor,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Scrape failed with status ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('Firecrawl Scrape Error:', error);
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown scraping error',
      };
    }
  }

  /**
   * Crawl a domain (async process)
   */
  async startCrawl(options: FirecrawlCrawlOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(`${this.baseUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: options.url,
          limit: options.limit || 10,
          maxDepth: options.maxDepth || 2,
          includePatterns: options.includePatterns,
          excludePatterns: options.excludePatterns,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Crawl failed with status ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        id: result.id,
      };
    } catch (error) {
      console.error('Firecrawl Crawl Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown crawling error',
      };
    }
  }

  /**
   * Check status of a crawl job
   */
  async getCrawlStatus(id: string): Promise<{ success: boolean; status: string; data?: any[]; error?: string }> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(`${this.baseUrl}/crawl/${id}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Status check failed with status ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        status: result.status,
        data: result.data,
      };
    } catch (error) {
      console.error('Firecrawl Status Check Error:', error);
      return {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown status check error',
      };
    }
  }
}

export const firecrawlService = new FirecrawlService();
