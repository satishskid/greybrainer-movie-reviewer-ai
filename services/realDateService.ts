/**
 * Service to get real current date from external APIs
 * Handles cases where system date might be incorrect or LLM training data is outdated
 */

export interface RealDateInfo {
  year: number;
  month: string;
  monthIndex: number; // 0-11
  day: number;
  timestamp: string;
  source: 'worldtimeapi' | 'google_search' | 'system_fallback';
}

export class RealDateService {
  private static cachedDate: RealDateInfo | null = null;
  private static cacheExpiry: number = 0;
  private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  private static readonly MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  /**
   * Get current real date with caching
   */
  static async getCurrentDate(): Promise<RealDateInfo> {
    // Return cached date if still valid
    if (this.cachedDate && Date.now() < this.cacheExpiry) {
      return this.cachedDate;
    }

    try {
      // Try WorldTimeAPI first (free, reliable)
      const worldTimeDate = await this.getDateFromWorldTimeAPI();
      if (worldTimeDate) {
        this.cacheDate(worldTimeDate);
        return worldTimeDate;
      }
    } catch (error) {
      console.warn('WorldTimeAPI failed:', error);
    }

    try {
      // Try Google Search API as backup
      const googleDate = await this.getDateFromGoogleSearch();
      if (googleDate) {
        this.cacheDate(googleDate);
        return googleDate;
      }
    } catch (error) {
      console.warn('Google Search API failed:', error);
    }

    // Fallback to system date
    const systemDate = this.getSystemDate();
    this.cacheDate(systemDate);
    return systemDate;
  }

  /**
   * Get date from WorldTimeAPI (free, no auth required)
   */
  private static async getDateFromWorldTimeAPI(): Promise<RealDateInfo | null> {
    try {
      const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata');
      if (!response.ok) throw new Error('WorldTimeAPI request failed');
      
      const data = await response.json();
      const date = new Date(data.datetime);
      
      return {
        year: date.getFullYear(),
        month: this.MONTH_NAMES[date.getMonth()],
        monthIndex: date.getMonth(),
        day: date.getDate(),
        timestamp: data.datetime,
        source: 'worldtimeapi'
      };
    } catch (error) {
      console.error('WorldTimeAPI error:', error);
      return null;
    }
  }

  /**
   * Get date from Google Search (using Gemini to search for current date)
   */
  private static async getDateFromGoogleSearch(): Promise<RealDateInfo | null> {
    try {
      // This would use the existing Google Search service if available
      // For now, we'll use Gemini to get current date info
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const { getGeminiApiKeyString } = await import('../utils/geminiKeyStorage');
      const { getSelectedGeminiModel } = await import('../utils/geminiModelStorage');
      
      const apiKey = getGeminiApiKeyString();
      if (!apiKey) throw new Error('No Gemini API key available');
      
      const geminiAI = new GoogleGenerativeAI(apiKey);
      const model = geminiAI.getGenerativeModel({ model: getSelectedGeminiModel() });
      
      const prompt = `
        What is the current date today? Please provide:
        1. Current year
        2. Current month name
        3. Current day
        
        Format your response as JSON:
        {
          "year": 2025,
          "month": "November",
          "day": 4
        }
        
        Use your search capabilities to get the most accurate current date information.
      `;
      
      const response = await model.generateContent(prompt);
      const responseText = response.response.text().trim();
      
      // Parse JSON response
      let jsonStr = responseText;
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      
      const parsedDate = JSON.parse(jsonStr);
      const monthIndex = this.MONTH_NAMES.indexOf(parsedDate.month);
      
      if (monthIndex === -1) throw new Error('Invalid month name from Google Search');
      
      return {
        year: parsedDate.year,
        month: parsedDate.month,
        monthIndex,
        day: parsedDate.day,
        timestamp: new Date().toISOString(),
        source: 'google_search'
      };
      
    } catch (error) {
      console.error('Google Search date error:', error);
      return null;
    }
  }

  /**
   * Fallback to system date
   */
  private static getSystemDate(): RealDateInfo {
    const date = new Date();
    return {
      year: date.getFullYear(),
      month: this.MONTH_NAMES[date.getMonth()],
      monthIndex: date.getMonth(),
      day: date.getDate(),
      timestamp: date.toISOString(),
      source: 'system_fallback'
    };
  }

  /**
   * Cache the date result
   */
  private static cacheDate(dateInfo: RealDateInfo): void {
    this.cachedDate = dateInfo;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    this.cachedDate = null;
    this.cacheExpiry = 0;
  }

  /**
   * Get previous month info
   */
  static getPreviousMonth(dateInfo: RealDateInfo): { year: number; month: string; monthIndex: number } {
    const prevMonthIndex = dateInfo.monthIndex === 0 ? 11 : dateInfo.monthIndex - 1;
    const prevYear = dateInfo.monthIndex === 0 ? dateInfo.year - 1 : dateInfo.year;
    
    return {
      year: prevYear,
      month: this.MONTH_NAMES[prevMonthIndex],
      monthIndex: prevMonthIndex
    };
  }
}