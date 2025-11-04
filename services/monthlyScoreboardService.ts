import { collection, doc, setDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { MonthlyScoreboardItem } from '../types';
import { analyzeLayerWithGemini, LogTokenUsageFn } from './geminiService';
import { ReviewStage, ReviewLayer } from '../types';
import { getGeminiApiKeyString } from '../utils/geminiKeyStorage';
import { getSelectedGeminiModel } from '../utils/geminiModelStorage';
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface MonthlyScoreboardCache {
  id: string;
  month: string; // "November 2024"
  year: number;
  monthIndex: number; // 0-11
  items: EnhancedMonthlyScoreboardItem[];
  generatedAt: Date;
  generatedBy: string; // Admin user ID
  totalItems: number;
}

export interface EnhancedMonthlyScoreboardItem extends MonthlyScoreboardItem {
  hasFullAnalysis?: boolean; // True if this movie has been analyzed in our app
  analysisId?: string; // Reference to our analysis if available
  dataSource: 'web_search' | 'user_analysis' | 'mixed'; // How the score was generated
  confidence: number; // 0-1, confidence in the score based on available data
  publicRating?: number; // IMDb/RT rating for reference
  boxOfficeData?: {
    budget?: number;
    collection?: number;
    currency?: string;
  };
}

export class MonthlyScoreboardService {
  private static readonly COLLECTION_NAME = 'monthlyScoreboards';
  
  /**
   * Generate monthly scoreboard data using AI
   * This should be called by admin users once per month
   */
  static async generateMonthlyScoreboard(
    year: number,
    month: string,
    adminUserId: string,
    logTokenUsage?: LogTokenUsageFn
  ): Promise<MonthlyScoreboardCache> {
    const monthIndex = this.getMonthIndex(month);
    const cacheId = `${year}-${monthIndex.toString().padStart(2, '0')}`;
    
    try {
      // Step 1: Fetch recent releases for the month using AI
      const releases = await this.fetchMonthlyReleases(year, month, logTokenUsage);
      
      // Step 2: Generate Greybrainer scores for each release
      const scoredItems: MonthlyScoreboardItem[] = [];
      
      for (let i = 0; i < releases.length; i++) {
        const release = releases[i];
        try {
          const score = await this.generateGreybrainerScore(release, logTokenUsage);
          scoredItems.push({
            ...release,
            greybrainerScore: score,
            ranking: i + 1 // Will be re-ranked after sorting
          });
        } catch (error) {
          console.warn(`Failed to score ${release.title}:`, error);
          // Include with fallback score
          scoredItems.push({
            ...release,
            greybrainerScore: 7.0, // Fallback score
            ranking: i + 1
          });
        }
      }
      
      // Step 3: Sort by score and assign final rankings
      const rankedItems = scoredItems
        .sort((a, b) => b.greybrainerScore - a.greybrainerScore)
        .map((item, index) => ({ ...item, ranking: index + 1 }));
      
      // Step 4: Create cache object
      const cacheData: MonthlyScoreboardCache = {
        id: cacheId,
        month: `${month} ${year}`,
        year,
        monthIndex,
        items: rankedItems,
        generatedAt: new Date(),
        generatedBy: adminUserId,
        totalItems: rankedItems.length
      };
      
      // Step 5: Save to Firestore
      await this.saveToDB(cacheData);
      
      return cacheData;
      
    } catch (error) {
      console.error('Failed to generate monthly scoreboard:', error);
      throw new Error(`Failed to generate scoreboard for ${month} ${year}: ${error}`);
    }
  }
  
  /**
   * Fetch cached monthly scoreboard from database
   */
  static async getCachedScoreboard(year: number, monthIndex: number): Promise<MonthlyScoreboardCache | null> {
    const cacheId = `${year}-${monthIndex.toString().padStart(2, '0')}`;
    
    try {
      const docRef = doc(db, this.COLLECTION_NAME, cacheId);
      const docSnap = await getDocs(query(collection(db, this.COLLECTION_NAME), where('id', '==', cacheId)));
      
      if (!docSnap.empty) {
        const data = docSnap.docs[0].data() as MonthlyScoreboardCache;
        return {
          ...data,
          generatedAt: data.generatedAt instanceof Date ? data.generatedAt : new Date(data.generatedAt)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch cached scoreboard:', error);
      return null;
    }
  }
  
  /**
   * Get available cached months
   */
  static async getAvailableMonths(): Promise<{ year: number; month: string; monthIndex: number }[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('year', 'desc'),
        orderBy('monthIndex', 'desc'),
        limit(24) // Last 2 years
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as MonthlyScoreboardCache;
        return {
          year: data.year,
          month: data.month.split(' ')[0], // Extract month name
          monthIndex: data.monthIndex
        };
      });
    } catch (error) {
      console.error('Failed to fetch available months:', error);
      return [];
    }
  }
  
  /**
   * Private: Fetch monthly releases using AI search
   */
  private static async fetchMonthlyReleases(
    year: number,
    month: string,
    logTokenUsage?: LogTokenUsageFn
  ): Promise<Omit<MonthlyScoreboardItem, 'greybrainerScore' | 'ranking'>[]> {
    try {
      const geminiAI = new GoogleGenerativeAI(getGeminiApiKeyString());
      const model = geminiAI.getGenerativeModel({ model: getSelectedGeminiModel() });
      
      const prompt = `
        IMPORTANT: You must respond with ONLY a valid JSON array. Do not include any explanatory text, apologies, or comments.
        
        Find movie and web series releases in India for ${month} ${year}. If you cannot find specific releases for this exact month, create a realistic JSON array with plausible titles that could have been released in ${month} ${year}.
        
        Return exactly this JSON format:
        [
          {
            "title": "Movie/Series Name",
            "type": "Movie",
            "platform": "Theatrical",
            "language": "Hindi",
            "region": "Maharashtra", 
            "summary": "Brief description"
          }
        ]
        
        Include 5-10 entries. Mix of:
        - Bollywood movies (Theatrical)
        - South Indian movies (Theatrical) 
        - OTT series (Netflix, Amazon Prime Video, Disney+ Hotstar)
        - Regional content (Tamil, Telugu, Malayalam)
        
        RESPOND WITH ONLY THE JSON ARRAY - NO OTHER TEXT.
      `;
      
      const response = await model.generateContent(prompt);
      const responseText = response.response.text().trim();
      logTokenUsage?.(`Monthly Releases Search (${month} ${year})`, prompt.length, responseText.length);
      
      // Parse JSON response
      let jsonStr = responseText;
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      
      const parsedReleases = JSON.parse(jsonStr);
      
      // Validate that it's an array
      if (!Array.isArray(parsedReleases)) {
        throw new Error('AI response is not a valid array');
      }
      
      // Convert to our format
      const releases: Omit<MonthlyScoreboardItem, 'greybrainerScore' | 'ranking'>[] = parsedReleases.map((release: any, index: number) => ({
        id: `${year}-${month.toLowerCase()}-${index + 1}`,
        title: release.title,
        type: release.type === 'Web Series' ? 'Web Series' : 'Movie',
        platform: release.platform,
        releaseMonth: `${month} ${year}`,
        posterUrl: `https://via.placeholder.com/150x220/4A90E2/FFFFFF?text=${encodeURIComponent(release.title.substring(0, 20))}`,
        summary: release.summary,
        country: 'India',
        region: release.region || 'India',
        language: release.language
      }));
      
      return releases.slice(0, 15); // Limit to top 15
      
    } catch (error) {
      console.error(`Failed to fetch releases for ${month} ${year}:`, error);
      
      // Fallback to mock data if search fails
      return [
        {
          id: `fallback-${Date.now()}`,
          title: `Popular Release - ${month} ${year}`,
          type: 'Movie',
          platform: 'Theatrical',
          releaseMonth: `${month} ${year}`,
          posterUrl: 'https://via.placeholder.com/150x220/FF6B6B/FFFFFF?text=Fallback',
          summary: 'Fallback entry when search fails',
          country: 'India',
          region: 'Maharashtra',
          language: 'Hindi'
        }
      ];
    }
  }
  
  /**
   * Private: Generate Greybrainer score for a release using FULL 3-layer analysis
   */
  private static async generateGreybrainerScore(
    release: Omit<MonthlyScoreboardItem, 'greybrainerScore' | 'ranking'>,
    logTokenUsage?: LogTokenUsageFn
  ): Promise<number> {
    try {
      // Perform full 3-layer Greybrainer analysis for accurate scoring
      const layers = [
        { layer: ReviewLayer.STORY, title: 'Magic of Story/Script', description: 'Core idea, narrative, themes, character arcs, originality.' },
        { layer: ReviewLayer.CONCEPTUALIZATION, title: 'Magic of Conceptualization', description: 'Director\'s vision, editing, casting, overall presentation.' },
        { layer: ReviewLayer.PERFORMANCE, title: 'Magic of Performance/Execution', description: 'Acting, music, cinematography, effects, choreography.' }
      ];
      
      const scores: number[] = [];
      
      // Analyze each layer
      for (const layerDef of layers) {
        try {
          const analysis = await analyzeLayerWithGemini(
            release.title,
            ReviewStage.MOVIE_RELEASED,
            layerDef.layer,
            layerDef.title,
            layerDef.description,
            logTokenUsage
          );
          
          if (analysis.aiSuggestedScore !== undefined) {
            scores.push(analysis.aiSuggestedScore);
          }
        } catch (layerError) {
          console.warn(`Failed to analyze ${layerDef.title} for ${release.title}:`, layerError);
          // Continue with other layers
        }
      }
      
      // Calculate composite Greybrainer score
      if (scores.length > 0) {
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return Math.round(averageScore * 10) / 10; // Round to 1 decimal place
      }
      
      // Fallback: Single layer analysis if 3-layer fails
      const fallbackAnalysis = await analyzeLayerWithGemini(
        release.title,
        ReviewStage.MOVIE_RELEASED,
        ReviewLayer.CONCEPTUALIZATION,
        'Overall Greybrainer Assessment',
        'Generate a comprehensive Greybrainer score based on available public information',
        logTokenUsage
      );
      
      return fallbackAnalysis.aiSuggestedScore || 7.5;
      
    } catch (error) {
      console.warn(`Failed to generate Greybrainer score for ${release.title}:`, error);
      return 7.0; // Final fallback score
    }
  }
  
  /**
   * Private: Save to database
   */
  private static async saveToDB(cacheData: MonthlyScoreboardCache): Promise<void> {
    const docRef = doc(db, this.COLLECTION_NAME, cacheData.id);
    await setDoc(docRef, {
      ...cacheData,
      generatedAt: new Date() // Ensure proper timestamp
    });
  }
  
  /**
   * Private: Get month index from name
   */
  private static getMonthIndex(monthName: string): number {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(monthName);
  }
}