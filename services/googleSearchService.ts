// Google Custom Search API service for movie title suggestions
// Provides Google-like autocomplete functionality for movie titles

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
}

export interface GoogleCustomSearchResponse {
  items?: GoogleSearchResult[];
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
}

export interface MovieSuggestion {
  title: string;
  year?: string;
  source: string;
}

export class GoogleSearchService {
  private readonly baseUrl = 'https://www.googleapis.com/customsearch/v1';
  private readonly searchEngineId = '017576662512468239146:omuauf_lfve'; // Example CSE ID for movies

  private getApiKey(): string {
    const apiKey = localStorage.getItem('google_search_api_key');
    if (!apiKey) {
      throw new Error('Google Search API key not found. Please configure your API key.');
    }
    return apiKey;
  }

  private async makeRequest(query: string, options: {
    num?: number;
    start?: number;
  } = {}): Promise<GoogleCustomSearchResponse> {
    const { num = 10, start = 1 } = options;
    const apiKey = this.getApiKey();
    
    const params = new URLSearchParams({
      key: apiKey,
      cx: this.searchEngineId,
      q: query,
      num: num.toString(),
      start: start.toString(),
      safe: 'active'
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Google Search API quota exceeded or invalid API key');
      }
      throw new Error(`Google Search API error: ${response.status}`);
    }

    return response.json();
  }

  private parseMovieSuggestions(results: GoogleSearchResult[]): MovieSuggestion[] {
    const suggestions: MovieSuggestion[] = [];
    const seenTitles = new Set<string>();

    for (const result of results) {
      // Extract movie title and year from search results
      const titleMatch = result.title.match(/^(.+?)(?:\s*\((\d{4})\))?/i);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        const year = titleMatch[2];
        
        // Avoid duplicates
        const key = `${title.toLowerCase()}_${year || 'unknown'}`;
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          suggestions.push({
            title,
            year,
            source: result.displayLink || 'Google Search'
          });
        }
      }
    }

    return suggestions;
  }

  async suggestMovies(partialTitle: string, maxSuggestions: number = 8): Promise<MovieSuggestion[]> {
    if (partialTitle.length < 2) {
      return [];
    }

    // Create search query optimized for movie suggestions
    const searchQuery = `"${partialTitle}" movie site:imdb.com OR site:rottentomatoes.com OR site:themoviedb.org`;

    try {
      const response = await this.makeRequest(searchQuery, {
        num: maxSuggestions * 2 // Get more results to filter better
      });

      const suggestions = this.parseMovieSuggestions(response.items || []);
      return suggestions.slice(0, maxSuggestions);
    } catch (error) {
      console.error('Error getting movie suggestions from Google:', error);
      return [];
    }
  }

  async searchMovies(movieTitle: string, options: {
    includeYear?: boolean;
    maxResults?: number;
  } = {}): Promise<MovieSuggestion[]> {
    const { includeYear = true, maxResults = 10 } = options;
    
    // Construct search query for comprehensive movie search
    const searchQuery = includeYear 
      ? `"${movieTitle}" movie imdb rating cast director`
      : `"${movieTitle}" movie`;

    try {
      const response = await this.makeRequest(searchQuery, {
        num: maxResults
      });

      return this.parseMovieSuggestions(response.items || []);
    } catch (error) {
      console.error('Error searching movies with Google:', error);
      throw error;
    }
  }

  // Test API key functionality
  async testApiKey(): Promise<boolean> {
    try {
      await this.makeRequest('test movie', { num: 1 });
      return true;
    } catch (error) {
      console.error('Google Search API key test failed:', error);
      return false;
    }
  }

  // Utility methods for API key management
  static setApiKey(apiKey: string): void {
    localStorage.setItem('google_search_api_key', apiKey);
  }

  static getStoredApiKey(): string | null {
    return localStorage.getItem('google_search_api_key');
  }

  static removeApiKey(): void {
    localStorage.removeItem('google_search_api_key');
  }

  static hasApiKey(): boolean {
    return !!localStorage.getItem('google_search_api_key');
  }
}

export const googleSearchService = new GoogleSearchService();
export default googleSearchService;