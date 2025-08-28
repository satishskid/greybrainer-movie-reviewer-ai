// Brave Search API service for movie search and suggestions
// This service handles movie discovery and search functionality
// Analysis features remain with Gemini API

export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  published?: string;
  thumbnail?: {
    src: string;
    width?: number;
    height?: number;
  };
}

export interface MovieSearchResult {
  title: string;
  year?: string;
  description: string;
  imdbUrl?: string;
  rating?: string;
  genre?: string;
  director?: string;
  cast?: string[];
  thumbnail?: string;
}

export interface BraveSearchResponse {
  web?: {
    results: BraveSearchResult[];
  };
  news?: {
    results: BraveSearchResult[];
  };
  videos?: {
    results: BraveSearchResult[];
  };
}

class BraveSearchService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.search.brave.com/res/v1/web/search';

  constructor() {
    // Get API key from localStorage
    this.apiKey = localStorage.getItem('brave_api_key') || null;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    localStorage.setItem('brave_api_key', apiKey);
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  private async makeRequest(query: string, options: {
    count?: number;
    offset?: number;
    country?: string;
    search_lang?: string;
    ui_lang?: string;
    result_filter?: string;
  } = {}): Promise<BraveSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Brave Search API key is required. Please set your API key.');
    }

    const params = new URLSearchParams({
      q: query,
      count: (options.count || 10).toString(),
      offset: (options.offset || 0).toString(),
      country: options.country || 'US',
      search_lang: options.search_lang || 'en',
      ui_lang: options.ui_lang || 'en',
      ...(options.result_filter && { result_filter: options.result_filter })
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brave Search API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async searchMovies(movieTitle: string, options: {
    includeYear?: boolean;
    maxResults?: number;
  } = {}): Promise<MovieSearchResult[]> {
    const { includeYear = true, maxResults = 10 } = options;
    
    // Construct search query for movies
    const searchQuery = includeYear 
      ? `"${movieTitle}" movie imdb site:imdb.com OR site:rottentomatoes.com OR site:metacritic.com`
      : `"${movieTitle}" movie`;

    try {
      const response = await this.makeRequest(searchQuery, {
        count: maxResults,
        result_filter: 'web'
      });

      return this.parseMovieResults(response.web?.results || []);
    } catch (error) {
      console.error('Error searching movies:', error);
      throw error;
    }
  }

  async suggestMovies(partialTitle: string, maxSuggestions: number = 5): Promise<MovieSearchResult[]> {
    if (partialTitle.length < 2) {
      return [];
    }

    const searchQuery = `"${partialTitle}" movie suggestions site:imdb.com`;

    try {
      const response = await this.makeRequest(searchQuery, {
        count: maxSuggestions * 2, // Get more results to filter better
        result_filter: 'web'
      });

      const suggestions = this.parseMovieResults(response.web?.results || []);
      return suggestions.slice(0, maxSuggestions);
    } catch (error) {
      console.error('Error getting movie suggestions:', error);
      return [];
    }
  }

  private parseMovieResults(results: BraveSearchResult[]): MovieSearchResult[] {
    return results
      .filter(result => this.isMovieResult(result))
      .map(result => this.extractMovieInfo(result))
      .filter(movie => movie.title.length > 0);
  }

  private isMovieResult(result: BraveSearchResult): boolean {
    const title = result.title.toLowerCase();
    const description = result.description.toLowerCase();
    const url = result.url.toLowerCase();

    // Check if it's likely a movie result
    const movieKeywords = ['movie', 'film', 'imdb', 'rotten tomatoes', 'metacritic'];
    const hasMovieKeyword = movieKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword) || url.includes(keyword)
    );

    // Exclude non-movie results
    const excludeKeywords = ['trailer', 'soundtrack', 'behind the scenes', 'making of', 'interview'];
    const hasExcludeKeyword = excludeKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );

    return hasMovieKeyword && !hasExcludeKeyword;
  }

  private extractMovieInfo(result: BraveSearchResult): MovieSearchResult {
    const title = this.extractMovieTitle(result.title);
    const year = this.extractYear(result.title + ' ' + result.description);
    const rating = this.extractRating(result.description);
    const genre = this.extractGenre(result.description);
    const director = this.extractDirector(result.description);
    const cast = this.extractCast(result.description);

    return {
      title,
      year,
      description: result.description,
      imdbUrl: result.url.includes('imdb.com') ? result.url : undefined,
      rating,
      genre,
      director,
      cast,
      thumbnail: result.thumbnail?.src
    };
  }

  private extractMovieTitle(title: string): string {
    // Remove common suffixes and clean up title
    const cleanTitle = title
      .replace(/\s*-\s*(IMDb|Rotten Tomatoes|Metacritic).*$/i, '')
      .replace(/\s*\(\d{4}\)\s*/, '')
      .replace(/\s*movie\s*/i, '')
      .trim();
    
    return cleanTitle || title;
  }

  private extractYear(text: string): string | undefined {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : undefined;
  }

  private extractRating(text: string): string | undefined {
    // Look for ratings like "8.5/10", "85%", "4.5 stars"
    const ratingPatterns = [
      /\b\d+\.\d+\/10\b/,
      /\b\d+%\b/,
      /\b\d+\.\d+\s*stars?\b/i,
      /\b\d+\.\d+\/5\b/
    ];

    for (const pattern of ratingPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    return undefined;
  }

  private extractGenre(text: string): string | undefined {
    const genres = [
      'action', 'adventure', 'animation', 'biography', 'comedy', 'crime', 'documentary',
      'drama', 'family', 'fantasy', 'history', 'horror', 'music', 'mystery', 'romance',
      'sci-fi', 'science fiction', 'sport', 'thriller', 'war', 'western'
    ];

    const lowerText = text.toLowerCase();
    const foundGenre = genres.find(genre => lowerText.includes(genre));
    return foundGenre ? foundGenre.charAt(0).toUpperCase() + foundGenre.slice(1) : undefined;
  }

  private extractDirector(text: string): string | undefined {
    const directorMatch = text.match(/directed by ([^,\.]+)/i);
    return directorMatch ? directorMatch[1].trim() : undefined;
  }

  private extractCast(text: string): string[] | undefined {
    const castMatch = text.match(/starring ([^,\.]+(?:,\s*[^,\.]+)*)/i);
    if (castMatch) {
      return castMatch[1].split(',').map(actor => actor.trim()).slice(0, 5); // Limit to 5 actors
    }
    return undefined;
  }

  // Health check method
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('test query', { count: 1 });
      return true;
    } catch (error) {
      console.error('Brave Search API connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const braveSearchService = new BraveSearchService();
export default braveSearchService;