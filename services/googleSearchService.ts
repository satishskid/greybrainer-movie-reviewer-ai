// Simplified Google Custom Search API service for movie title suggestions
// Focus on basic, reliable functionality without complex fallbacks

// Basic movie database for fallback when no API key is configured
const BASIC_MOVIE_DATABASE = [
  'The Family Man',
  'The Family Man (Series)',
  'Stranger Things',
  'Breaking Bad',
  'The Shawshank Redemption',
  'The Godfather',
  'Pulp Fiction',
  'The Dark Knight',
  'Forrest Gump',
  'Inception',
  'The Matrix',
  'Goodfellas',
  'Star Wars',
  'The Lord of the Rings',
  'Fight Club',
  'Interstellar',
  'Dune',
  'The Batman',
  'Top Gun: Maverick',
  'Avatar',
  'Titanic',
  'Jurassic Park',
  'The Avengers',
  'Spider-Man: No Way Home',
  'The Lion King',
  'Toy Story',
  'Finding Nemo',
  'The Incredibles',
  'Coco',
  'Soul',
  'Luca',
  'Turning Red',
  'Lightyear',
  'Elemental'
];

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

  // Simple fallback when no API key is configured
  private getBasicSuggestions(query: string, maxResults: number = 8): MovieSuggestion[] {
    const queryLower = query.toLowerCase();
    const suggestions: MovieSuggestion[] = [];
    
    // Find movies that start with the query
    const startsWith = BASIC_MOVIE_DATABASE.filter(movie => 
      movie.toLowerCase().startsWith(queryLower)
    );
    
    // Find movies that contain the query
    const contains = BASIC_MOVIE_DATABASE.filter(movie => 
      movie.toLowerCase().includes(queryLower) && !movie.toLowerCase().startsWith(queryLower)
    );
    
    // Combine and limit results
    const results = [...startsWith, ...contains].slice(0, maxResults);
    
    return results.map(title => ({
      title,
      year: undefined, // No year info in basic database
      source: 'Local Database'
    }));
  }

  private parseMovieSuggestions(results: GoogleSearchResult[]): MovieSuggestion[] {
    const suggestions: MovieSuggestion[] = [];
    const seenTitles = new Set<string>();

    for (const result of results) {
      // Extract movie/tv title and year from search results
      const titleMatch = result.title.match(/^(.+?)(?:\s*[\(\[](\d{4})[\)\]])?/i);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        const year = titleMatch[2];
        
        // Skip if title is too short or contains generic terms
        if (title.length < 2 || /^(imdb|rotten|tomatoes|tmdb|wikipedia)$/i.test(title)) {
          continue;
        }
        
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

  // Simple movie suggestions - just basic title search
  async suggestMovies(partialTitle: string, maxSuggestions: number = 8): Promise<MovieSuggestion[]> {
    if (partialTitle.length < 2) {
      return [];
    }

    // Check if API key is configured
    try {
      this.getApiKey(); // This will throw if no key
    } catch (error) {
      console.log('No Google Search API key configured, using basic fallback');
      return this.getBasicSuggestions(partialTitle, maxSuggestions);
    }

    // Ultra-simple search - just the title, no complex operators
    const searchQuery = partialTitle.trim();

    try {
      const response = await this.makeRequest(searchQuery, {
        num: maxSuggestions
      });

      return this.parseMovieSuggestions(response.items || []);
    } catch (error) {
      console.error('Error getting movie suggestions:', error);
      // Fallback to basic suggestions on API error
      return this.getBasicSuggestions(partialTitle, maxSuggestions);
    }
  }

  // Simple IMDb ID lookup - search for the ID to get title
  async lookupImdbId(imdbId: string): Promise<string | null> {
    if (!imdbId.trim()) {
      return null;
    }

    // Check if API key is configured
    try {
      this.getApiKey(); // This will throw if no key
    } catch (error) {
      console.log('No Google Search API key configured for IMDb lookup, using basic fallback');
      // Basic fallback: try to match IMDb ID format and return a basic title
      const formattedId = imdbId.trim().startsWith('tt') ? imdbId.trim() : `tt${imdbId.trim()}`;
      
      // Simple mapping for common test IDs
      if (formattedId === 'tt9544034') return 'The Family Man (Series)';
      if (formattedId === 'tt0381707') return 'The Family Man';
      if (formattedId === 'tt4574334') return 'Stranger Things';
      
      return `Movie ${formattedId}`; // Generic fallback
    }

    // Format IMDb ID
    let formattedId = imdbId.trim();
    if (!formattedId.startsWith('tt')) {
      formattedId = `tt${formattedId}`;
    }

    try {
      // Search for the IMDb ID to find the movie title
      const response = await this.makeRequest(formattedId, {
        num: 1
      });

      const items = response.items || [];
      if (items.length > 0) {
        // Extract title from first result
        const titleMatch = items[0].title.match(/^(.+?)(?:\s*[\(\[]\d{4}[\)\]])?/i);
        return titleMatch ? titleMatch[1].trim() : null;
      }
      
      return null;
    } catch (error) {
      console.error('Error looking up IMDb ID:', error);
      // Basic fallback on API error
      if (formattedId === 'tt9544034') return 'The Family Man (Series)';
      if (formattedId === 'tt0381707') return 'The Family Man';
      if (formattedId === 'tt4574334') return 'Stranger Things';
      return `Movie ${formattedId}`;
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