// Trend Intelligence Service
// Analyzes film industry news, competitor blogs, and box office data to identify strategic opportunities
import { firecrawlService } from './firecrawlService';
import { runGeminiWithFallback, extractJsonPayloadFromModelText } from './geminiService';

export interface TrendReport {
  id: string;
  timestamp: string;
  primaryTrends: Array<{
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    confidence: number;
    sourceUrls: string[];
  }>;
  competitorInsights: Array<{
    competitor: string;
    latestStrategy: string;
    opportunity: string;
  }>;
  suggestedHooks: string[];
  optimizedHashtags: string[];
  rawAnalysis: string;
}

const DEFAULT_FILM_COMPETITORS = [
  'https://www.hollywoodreporter.com/c/movies/',
  'https://variety.com/v/film/',
  'https://deadline.com/v/film/',
  'https://www.filmcompanion.in/',
  'https://www.pinkvilla.com/entertainment/bollywood'
];

class TrendIntelligenceService {
  private readonly STORAGE_KEY = 'greybrainer_trend_intelligence';

  /**
   * Run a competitive intelligence analysis cycle
   */
  async runAnalysisCycle(targetUrls: string[] = DEFAULT_FILM_COMPETITORS): Promise<TrendReport> {
    const scrapedData: string[] = [];

    // 1. Scrape the target URLs for the latest headlines and content
    for (const url of targetUrls) {
      try {
        const result = await firecrawlService.scrapeUrl({ url, onlyMainContent: true });
        if (result.success && result.data.markdown) {
          scrapedData.push(`SOURCE: ${url}\n\nCONTENT:\n${result.data.markdown.substring(0, 3000)}`);
        }
      } catch (err) {
        console.warn(`Failed to scrape ${url}:`, err);
      }
    }

    if (scrapedData.length === 0) {
      throw new Error('Could not scrape any target URLs for trend analysis.');
    }

    // 2. Feed the aggregated data to Gemini for trend extraction
    const combinedContext = scrapedData.join('\n\n---\n\n');
    const prompt = `**ROLE**
You are a Senior Strategic Analyst for GreyBrainer AI, specializing in the global and Indian film industry.

**OBJECTIVE**
Analyze the provided competitive data to identify trending topics, strategic shifts, and "content gaps" that GreyBrainer can exploit for social media engagement.

**COMPETITIVE DATA:**
${combinedContext}

**OUTPUT REQUIREMENTS:**
1. Identify the top 3-5 primary trends in the industry right now.
2. Analyze competitor strategies (what are they focusing on? what are they missing?).
3. Suggest 5 viral "hooks" for social media posts based on these trends.
4. Provide a list of 10 optimized hashtags for current maximum reach.

**OUTPUT JSON SHAPE (Strict valid JSON only):**
{
  "primaryTrends": [
    { "title": "string", "description": "string", "impact": "low|medium|high", "confidence": 0.85, "sourceUrls": ["string"] }
  ],
  "competitorInsights": [
    { "competitor": "string", "latestStrategy": "string", "opportunity": "string" }
  ],
  "suggestedHooks": ["string"],
  "optimizedHashtags": ["#tag1", "#tag2"],
  "rawAnalysis": "A brief overall strategic summary"
}`;

    return runGeminiWithFallback(
      `Trend Intelligence Analysis`,
      prompt,
      { temperature: 0.3, maxOutputTokens: 2000 },
      (responseText: string) => {
        const jsonStr = extractJsonPayloadFromModelText(responseText);
        const parsed = JSON.parse(jsonStr);
        
        const report: TrendReport = {
          id: `trend-${Date.now()}`,
          timestamp: new Date().toISOString(),
          primaryTrends: parsed.primaryTrends || [],
          competitorInsights: parsed.competitorInsights || [],
          suggestedHooks: parsed.suggestedHooks || [],
          optimizedHashtags: parsed.optimizedHashtags || [],
          rawAnalysis: parsed.rawAnalysis || ''
        };

        // Save to local storage
        this.saveReport(report);
        return report;
      }
    );
  }

  /**
   * Get the latest trend report
   */
  getLatestReport(): TrendReport | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;
    try {
      const reports = JSON.parse(stored);
      return Array.isArray(reports) && reports.length > 0 ? reports[0] : null;
    } catch (err) {
      console.error('Error loading trend report:', err);
      return null;
    }
  }

  private saveReport(report: TrendReport) {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const reports = stored ? JSON.parse(stored) : [];
      reports.unshift(report);
      // Keep only the last 10 reports
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reports.slice(0, 10)));
    } catch (err) {
      console.error('Error saving trend report:', err);
    }
  }
}

export const trendIntelligenceService = new TrendIntelligenceService();
