import { GoogleGenerativeAI, GenerateContentResult } from "@google/generative-ai";
import { ReviewLayer, ReviewStage, LayerAnalysisData, GroundingChunkWeb, GroundingMetadata, PersonnelData, SummaryReportData, CreativeSparkResult, VonnegutShapeData, PlotPoint, ScriptIdeaInput, MagicQuotientAnalysis, MorphokineticsAnalysis, FinancialAnalysisData, SocialSnippets, MovieSuggestion, DistributionPack } from '../types';
import { MAX_SCORE, MAGIC_QUOTIENT_DISCLAIMER } from '../constants';
import { getGeminiApiKeyString } from '../utils/geminiKeyStorage';
import { getSelectedGeminiModel } from '../utils/geminiModelStorage';
import { modelConfigService } from './modelConfigService';

// --- IP PROTECTION & COMMERCIAL SERVICE NOTE ---
// For a commercial application requiring IP protection and robust user management/metering:
// 1. This entire file (and its sensitive content like prompts and API keys) should NOT be in the client-side bundle.
// 2. It should reside on a backend server (e.g., as a Node.js module, Python service, or Firebase Cloud Functions).
// 3. The client application would make authenticated API calls to YOUR backend.
// 4. Your backend would then call the Gemini API using the API key stored securely on the server.
// 5. This protects your prompts, parsing logic, and API keys.
// The current setup with API_KEY in process.env (replaced at build time for client) is for simplicity in this dev environment.
// ---------------------------------------------

// Function to get Gemini AI instance with user-provided API key
const getGeminiAI = (): GoogleGenerativeAI => {
  const apiKey = getGeminiApiKeyString();
  if (!apiKey) {
    throw new Error("Gemini API key not found. Please provide your API key to continue.");
  }
  return new GoogleGenerativeAI(apiKey);
};

export type LogTokenUsageFn = (operation: string, inputChars: number, outputChars: number) => void;

async function runGeminiWithFallback<T>(
  operationName: string,
  prompt: string,
  generationConfig: any,
  parser: (responseText: string, fullResponse: GenerateContentResult) => T,
  logTokenUsage?: LogTokenUsageFn,
  tools?: any[]
): Promise<T> {
  const modelsToTry = [
    modelConfigService.getSelectedModel(),
    modelConfigService.getFallbackModel(),
    modelConfigService.getLegacyModel()
  ];

  let lastError: any;

  for (const modelName of modelsToTry) {
    if (!modelName) continue;
    
    try {
      console.log(`🤖 [${operationName}] Attempting with model: ${modelName}`);
      
      const genAI = getGeminiAI();
      const modelInfo = modelConfigService.getModelInfo(modelName);
      
      // Use v1beta for tools like googleSearch, or if explicitly requested
      const apiVersion = (tools && tools.length > 0) || modelInfo?.apiVersion === 'v1beta' ? 'v1beta' : 'v1';
      
      const model = genAI.getGenerativeModel(
        { 
          model: modelName,
          generationConfig,
          tools
        },
        { apiVersion }
      );

      // Add timeout for better reliability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await model.generateContent(prompt);
        clearTimeout(timeoutId);
        
        const responseText = response.response.text();
        logTokenUsage?.(operationName, prompt.length, responseText.length);
        
        return parser(responseText, response);
      } catch (innerError) {
        clearTimeout(timeoutId);
        throw innerError;
      }
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || '';
      const isModelError = errorMsg.includes('404') || 
                         error.status === 404 || 
                         errorMsg.includes('not found') ||
                         errorMsg.includes('unsupported model') ||
                         errorMsg.includes('not available');
                         
      const isToolError = errorMsg.includes('tool') || errorMsg.includes('search');
                   
      if (isModelError || (isToolError && tools && tools.length > 0)) {
        console.warn(`⚠️ [${operationName}] Model ${modelName} error (${isToolError ? 'tool issue' : 'not found'}), trying next fallback...`);
        lastError = error;
        continue;
      }
      
      // Rethrow other errors (auth, quota, etc.)
      console.error(`❌ [${operationName}] Permanent error with model ${modelName}:`, error);
      throw error;
    }
  }

  throw new Error(`[${operationName}] All configured Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Simple movie title suggestions using Gemini API
export const suggestMovieTitles = async (
  partialTitle: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string[]> => {
  if (!partialTitle || partialTitle.trim().length < 2) {
    return [];
  }

  const prompt = `
You are a movie database assistant. The user is typing: "${partialTitle}"

List 8 movie or TV series titles that match or contain this text. Include:
- Exact matches first
- Popular titles containing these letters
- Recent releases when relevant
- Both movies and series

Format: Just the titles, one per line, no explanations.

Examples:
Input: "fam"
Output:
The Family Man
The Family Man (Series)
Famous
Fame
Family Plot

Input: "stranger"
Output:
Stranger Things
Stranger Than Fiction
The Stranger

Now suggest titles for: "${partialTitle}"
  `.trim();

  try {
    const model = getGeminiAI().getGenerativeModel({ 
      model: getSelectedGeminiModel(),
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200
      }
    });
    
    // Add timeout for better reliability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await model.generateContent(prompt);
    clearTimeout(timeoutId);
    
    const responseText = response.response.text().trim();
    logTokenUsage?.('Movie Title Suggestions (Gemini)', prompt.length, responseText.length);
    
    // Parse response - one title per line
    const suggestions = responseText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length < 100)
      .slice(0, 8); // Limit to 8 suggestions
    
    return suggestions;
  } catch (error) {
    console.error('Gemini API error getting movie suggestions:', error);
    handleGeminiError(error as Error, 'Movie Title Suggestions');
    return []; // Return empty array on error - user can type manually
  }
}; 

// Lookup movie title by IMDb ID using Gemini API
export const lookupMovieByImdbId = async (
  imdbId: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string | null> => {
  if (!imdbId || !imdbId.trim()) {
    return null;
  }

  // Validate IMDb ID format (tt1234567 or tt12345678)
  const imdbIdPattern = /^tt\d{7,8}$/;
  if (!imdbIdPattern.test(imdbId.trim())) {
    throw new Error('Invalid IMDb ID format. Must be "tt" followed by 7-8 digits (e.g., tt1234567)');
  }

  const prompt = `
You are a movie database assistant. Look up the movie or TV series with IMDb ID: ${imdbId}

Return only the exact title of the movie or series. If it's a series, include "(Series)" at the end.

Examples:
Input: tt1234567
Output: The Family Man (Series)

Input: tt7658407
Output: The Family Man

If the ID is not found or invalid, return "NOT_FOUND".

Look up: ${imdbId}
  `.trim();

  try {
    const model = getGeminiAI().getGenerativeModel({ 
      model: getSelectedGeminiModel(),
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100
      }
    });
    
    // Add timeout for better reliability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await model.generateContent(prompt);
    clearTimeout(timeoutId);
    
    const responseText = response.response.text().trim();
    logTokenUsage?.('IMDb ID Lookup (Gemini)', prompt.length, responseText.length);
    
    if (responseText.toUpperCase().includes('NOT_FOUND')) {
      return null;
    }
    
    return responseText;
  } catch (error) {
    console.error('Gemini API error looking up IMDb ID:', error);
    handleGeminiError(error as Error, 'IMDb ID Lookup');
  }
  
  return null; // Fallback return
};

// Simple error handling without quota monitoring
const handleGeminiError = (error: Error, operation: string): never => {
  const errorMessage = error.message.toLowerCase();
  
  // Handle quota/rate limit errors with simple informative message
  if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
    throw new Error('Gemini API has daily usage limits. Please try again later.');
  }
  
  // Handle other API errors
  if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
    throw new Error('Invalid Gemini API Key. Please check your API key configuration.');
  }
  
  throw new Error(`Gemini API error in ${operation}: ${error.message}`);
};

// Add missing type definitions
interface CharacterIdea {
  name: string;
  description: string;
}

interface SceneIdea {
  title: string;
  description: string;
}

// Add missing generateAnalysisPrompt function
const generateAnalysisPrompt = (movieTitle: string, reviewStage: ReviewStage, layer: ReviewLayer, layerTitle: string, layerDescription: string, year?: string, director?: string): string => {
  const contextInfo = [
    year ? `Year: ${year}` : '',
    director ? `Director: ${director}` : ''
  ].filter(Boolean).join(', ');

  const titleWithContext = contextInfo ? `"${movieTitle}" (${contextInfo})` : `"${movieTitle}"`;

  return `
    You are an expert film critic analyzing ${titleWithContext} (${reviewStage}).
    Focus on the ${layerTitle}: ${layerDescription}
    
    IMPORTANT: Ensure you are analyzing the correct movie.
    ${year ? `Release Year: ${year}` : ''}
    ${director ? `Director: ${director}` : ''}
    If the movie is a very recent release, use Google Search to find the latest details.

    Provide a comprehensive analysis including:
    1. Detailed critique of this specific aspect
    2. Strengths and weaknesses
    3. How it contributes to the overall film
    4. Suggested improvements
    
    Include the following structured data:
    Director: [Director Name]
    Main Cast: [Cast Names]
    Suggested Score: [Score]/${MAX_SCORE}
    Potential Enhancements: [List of suggestions]
    
    ${layer === ReviewLayer.STORY ? `
    Also include Vonnegut Story Shape analysis:
    ---VONNEGUT STORY SHAPE START---
    [Analysis of story shape and emotional arc]
    ---VONNEGUT STORY SHAPE END---
    ` : ''}
    
    Provide your analysis:
  `;
};


export interface ParsedLayerAnalysis {
  analysisText: string;
  director?: string;
  mainCast?: string[];
  groundingSources?: GroundingChunkWeb[];
  aiSuggestedScore?: number;
  improvementSuggestions?: string | string[];
  vonnegutShape?: VonnegutShapeData;
  isFallbackResult?: boolean; 
}

export interface ParsedFinancials {
    budget?: number;
    currency?: string;
    duration?: string;
    sources?: GroundingChunkWeb[];
    isFallbackResult?: boolean;
    error?: string;
}

export interface ParsedROIAnalysis {
    analysisText: string;
    isFallbackResult?: boolean;
    error?: string;
}



const parseDirector = (text: string): string | undefined => {
  const match = text.match(/Director:\s*(.*)/i);
  return match?.[1]?.trim().split('\n')[0]; 
};

// Dynamic date range helper function
const getDynamicDateRange = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const previousYear = currentYear - 1;
  const twoYearsAgo = currentYear - 2;
  
  return {
    currentYear,
    previousYear,
    twoYearsAgo,
    currentDate: currentDate.toISOString().split('T')[0] // YYYY-MM-DD format
  };
};



const parseMainCast = (text: string): string[] | undefined => {
  const match = text.match(/Main Cast:\s*([\w\s,]+)/i);
  if (match?.[1]) {
    return match[1].split(',').map(actor => actor.trim()).filter(Boolean);
  }
  return undefined;
};

const parseAISuggestedScore = (text: string): number | undefined => {
  // Try multiple patterns to catch different AI score formats
  const patterns = [
    new RegExp(`Suggested Score:\\s*\\*?\\*?\\s*(\\d*\\.?\\d+)\\s*/\\s*${MAX_SCORE}`, "i"),
    new RegExp(`\\*\\*Suggested Score:\\*\\*\\s*(\\d*\\.?\\d+)\\s*/\\s*${MAX_SCORE}`, "i"),
    new RegExp(`Score:\\s*(\\d*\\.?\\d+)\\s*/\\s*${MAX_SCORE}`, "i"),
    new RegExp(`(\\d*\\.?\\d+)\\s*/\\s*${MAX_SCORE}`, "g") // Last resort - any number/10 pattern
  ];
  
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const score = parseFloat(match[1]);
      if (!isNaN(score) && score >= 0 && score <= MAX_SCORE) {
        return Math.max(0, Math.min(score, MAX_SCORE));
      }
    }
  }
  return undefined;
};

const parseImprovementSuggestionsFromString = (suggestionsText: string | undefined): string | string[] | undefined => {
  if (!suggestionsText) return undefined;

  const bulletRegex = /^\s*[-•*+]\s+/; 
  const numberedListRegex = /^\s*\d+\.\s+/; 
  
  const lines = suggestionsText.split('\n').map(line => line.trim()).filter(Boolean);

  if (lines.length > 0) {
    const areAllBullets = lines.every(line => bulletRegex.test(line));
    const areAllNumbered = lines.every(line => numberedListRegex.test(line));

    if (areAllBullets) {
      return lines.map(line => line.replace(bulletRegex, ''));
    }
    if (areAllNumbered) {
      return lines.map(line => line.replace(numberedListRegex, ''));
    }
  }
  return suggestionsText;
};


const parseImprovementSuggestions = (text: string): string | string[] | undefined => {
  const suggestionsRegex = /Potential Enhancements:([\s\S]*?)(---VONNEGUT STORY SHAPE START---|$)/i;
  const match = text.match(suggestionsRegex);
  const suggestionsText = match?.[1]?.trim();
  return parseImprovementSuggestionsFromString(suggestionsText);
};


const parseVonnegutShapeData = (text: string): VonnegutShapeData | undefined => {
  const vonnegutBlockMatch = text.match(/---VONNEGUT STORY SHAPE START---([\s\S]*?)---VONNEGUT STORY SHAPE END---/i);
  if (!vonnegutBlockMatch || !vonnegutBlockMatch[1]) return undefined;

  const blockContent = vonnegutBlockMatch[1].trim();

  const nameMatch = blockContent.match(/Vonnegut Shape:\s*([^\n]+)/i);
  const justificationMatch = blockContent.match(/Shape Justification:\s*([^\n]+(?:\n[^\n]+)*)/i); 
  const plotPointsMatch = blockContent.match(/Plot Points:\s*\[([^\]]+)\]/i);

  if (!nameMatch || !justificationMatch || !plotPointsMatch) return undefined;

  const name = nameMatch[1].trim();
  const justification = justificationMatch[1].trim();
  const plotPointsString = plotPointsMatch[1];

  const points: PlotPoint[] = [];
  const pointRegex = /\(\s*(\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*'([^']+)'\s*\)/g;
  let match;
  while ((match = pointRegex.exec(plotPointsString)) !== null) {
    const time = parseFloat(match[1]);
    const fortune = parseFloat(match[2]);
    const description = match[3].trim();
    if (!isNaN(time) && !isNaN(fortune)) {
      points.push({ time, fortune, description });
    }
  }

  if (points.length === 0 && plotPointsString.trim() !== '') { 
      console.warn("Could not parse plot points from:", plotPointsString);
      return undefined;
  }


  return { name, justification, plotPoints: points };
};


const extractGroundingSources = (response: GenerateContentResult): GroundingChunkWeb[] => {
    const groundingMetadata = response.response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
    let sources: GroundingChunkWeb[] = [];
    if (groundingMetadata?.groundingAttribution?.web) {
        sources = groundingMetadata.groundingAttribution.web.map(chunk => ({
            uri: chunk.uri,
            title: chunk.title || chunk.uri
        }));
    }
     // Also check the old groundingChunks if new one is empty (for backward compatibility or variations in response)
    if (sources.length === 0 && response.response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        sources = (response.response.candidates[0].groundingMetadata.groundingChunks as any[])
            .filter(chunk => chunk.web && chunk.web.uri)
            .map(chunk => ({
                uri: chunk.web.uri,
                title: chunk.web.title || chunk.web.uri,
            }));
    }

    // Filter out unnecessary/irrelevant URLs
    return filterRelevantSources(sources);
};

const filterRelevantSources = (sources: GroundingChunkWeb[]): GroundingChunkWeb[] => {
    const irrelevantPatterns = [
        // Generic/unhelpful domains
        /^https?:\/\/(www\.)?google\./,
        /^https?:\/\/(www\.)?bing\./,
        /^https?:\/\/(www\.)?yahoo\./,
        /^https?:\/\/(www\.)?search\./,
        /^https?:\/\/(www\.)?wikipedia\.org\/wiki\/List_of/,

        // Ad/tracking/social media noise
        /facebook\.com\/.*\/posts\//,
        /twitter\.com\/.*\/status\//,
        /instagram\.com\/p\//,
        /tiktok\.com\/@/,
        /pinterest\.com\/pin\//,
        /reddit\.com\/r\/.*\/comments\//,

        // Generic movie database pages (keep specific ones)
        /\/movies\/\d+\/?$/,
        /\/title\/tt\d+\/?$/,

        // Shopping/commercial sites
        /amazon\.com\/.*\/dp\//,
        /ebay\.com\/itm\//,
        /walmart\.com\/ip\//,

        // Generic news aggregators
        /news\.google\.com/,
        /news\.yahoo\.com/,

        // Unhelpful generic pages
        /\/search\?/,
        /\/results\?/,
        /\/category\//,
        /\/tag\//,
        /\/archive\//,
    ];

    const relevantKeywords = [
        'imdb', 'rottentomatoes', 'metacritic', 'boxofficemojo', 'variety', 'hollywood',
        'entertainment', 'film', 'movie', 'cinema', 'review', 'critic', 'analysis',
        'interview', 'behind', 'scenes', 'production', 'director', 'actor', 'actress',
        'cast', 'crew', 'budget', 'box office', 'awards', 'festival', 'premiere'
    ];

    return sources.filter(source => {
        const url = source.uri.toLowerCase();
        const title = (source.title || '').toLowerCase();

        // Remove if matches irrelevant patterns
        if (irrelevantPatterns.some(pattern => pattern.test(url))) {
            return false;
        }

        // Keep if contains relevant keywords in URL or title
        const hasRelevantKeyword = relevantKeywords.some(keyword =>
            url.includes(keyword) || title.includes(keyword)
        );

        // Keep well-known movie/entertainment sites
        const isRelevantDomain = /\b(imdb|rottentomatoes|metacritic|variety|hollywood|entertainment|film|movie|cinema)\b/.test(url);

        return hasRelevantKeyword || isRelevantDomain;
    }).slice(0, 5); // Limit to top 5 most relevant sources
};

const parseFinalReportAndMore = (fullResponse: string, existingFinancialData?: FinancialAnalysisData | null): SummaryReportData => {
  const overallImprovementsMarker = "Overall Improvement Opportunities:";

  // New parsers for social media posts
  const twitterMatch = fullResponse.match(/---TWITTER POST START---([\s\S]*?)---TWITTER POST END---/im);
  const twitter = twitterMatch ? twitterMatch[1].trim() : undefined;

  const linkedinMatch = fullResponse.match(/---LINKEDIN POST START---([\s\S]*?)---LINKEDIN POST END---/im);
  const linkedin = linkedinMatch ? linkedinMatch[1].trim() : undefined;

  const pixarScenesMatch = fullResponse.match(/---PIXAR STYLE SCENES START---([\s\S]*?)---PIXAR STYLE SCENES END---/im);
  const pixarStyleScenes = pixarScenesMatch 
    ? pixarScenesMatch[1].trim().split('\n').filter(line => line.trim().length > 0) 
    : undefined;

  const socialSnippets: SocialSnippets = { twitter, linkedin };

  let reportText = fullResponse;
  // Strip social media blocks from the main text
  if (twitterMatch) reportText = reportText.replace(twitterMatch[0], '');
  if (linkedinMatch) reportText = reportText.replace(linkedinMatch[0], '');
  if (pixarScenesMatch) reportText = reportText.replace(pixarScenesMatch[0], '');

  // Parse overall improvements
  let overallImprovementSuggestionsRaw: string | undefined = undefined;
  const overallImprovementsIndex = reportText.lastIndexOf(overallImprovementsMarker);
  if (overallImprovementsIndex !== -1) {
    overallImprovementSuggestionsRaw = reportText.substring(overallImprovementsIndex + overallImprovementsMarker.length).trim();
    reportText = reportText.substring(0, overallImprovementsIndex).trim();
  }
  
  reportText = reportText.replace(/---$/, '').trim(); 

  const overallImprovementSuggestions = parseImprovementSuggestionsFromString(overallImprovementSuggestionsRaw);

  return { 
    reportText, 
    socialSnippets,
    overallImprovementSuggestions,
    financialAnalysis: existingFinancialData || undefined,
    pixarStyleScenes // Added
  };
};


// Duplicate function removed - using the one at the end of the file

// Duplicate analyzeStakeholderMagicFactor function removed - using the implementation at the end of the file

const MIND_MAP_PROMPT_STRUCTURE = `
Provide a mindMapMarkdown string using Markdown for a hierarchical mind map.
Structure:
# [Generated Title/Logline]
## Core Idea: [Brief expansion of logline]
## Themes
- [Theme 1]
- [Theme 2]
## Plot Flow
- **Act I / Setup / Inciting Incident**: [Details]
- **Act II / Rising Action / Key Conflicts**:
  - [Conflict Point 1]
  - [Conflict Point 2]
- **Act III / Climax**: [Details]
- **Resolution**: [Details]
## Key Characters
- **[Character A Name]**: [Brief description, motivations, key relationship to B or main conflict]
  - *Initial State*: [e.g., Lost, cynical]
  - *Arc/Transformation*: [e.g., Finds purpose, learns to trust]
- **[Character B Name]**: [Brief description, motivations, how they impact A or the plot]
## Unique Twist / Magical Element (if any)
- [Description of the core unique element if applicable]
`;

// Duplicate generateCreativeSpark function removed - using the one at line 1384

export const enhanceCreativeSpark = async (
  baseIdea: Omit<CreativeSparkResult, 'id' | 'mindMapMarkdown'>, 
  enhancementPrompt: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<CreativeSparkResult> => {
  const prompt = `
    You are a creative screenwriter and story editor.
    You are enhancing an existing story concept.
    Base Concept:
    Logline: ${baseIdea.logline}
    Synopsis: ${baseIdea.synopsis}
    Character Ideas: ${JSON.stringify(baseIdea.characterIdeas)}
    Scene Ideas: ${JSON.stringify(baseIdea.sceneIdeas)}

    User's Enhancement Request: "${enhancementPrompt}"

    Based on the user's request, refine and expand the base concept.
    Provide the output as a SINGLE JSON object with the following structure:
    {
      "logline": "An updated and compelling one-sentence logline.",
      "synopsis": "An updated and brief synopsis of the story (around 150-250 words).",
      "characterIdeas": [
        { "name": "Character Name 1", "description": "Updated brief description of Character 1." },
        { "name": "Character Name 2", "description": "Updated brief description of Character 2." }
      ],
      "sceneIdeas": [
        { "title": "Updated Key Scene Idea 1 Title", "description": "An updated brief description of a pivotal scene." },
        { "title": "Updated Key Scene Idea 2 Title", "description": "Another updated brief description of a pivotal scene." }
      ],
      "mindMapMarkdown": "${MIND_MAP_PROMPT_STRUCTURE.replace(/\n/g, "\\n").replace(/"/g, '\\"')}" 
    }
    Ensure the JSON is valid. The mindMapMarkdown should reflect the *enhanced* story.
  `;

  return runGeminiWithFallback(
    'Creative Spark Enhancement',
    prompt,
    { temperature: 0.8 },
    (responseText) => {
      let jsonStr = responseText.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }

      try {
        const parsedData = JSON.parse(jsonStr) as CreativeSparkResult;
        if (!parsedData.logline || !parsedData.synopsis || !Array.isArray(parsedData.characterIdeas) || !Array.isArray(parsedData.sceneIdeas)) {
          throw new Error("Generated JSON for enhancement is missing required fields.");
        }
        return {
          ...parsedData,
          id: `${Date.now()}-enhanced`, 
          characterIdeas: parsedData.characterIdeas || [],
          sceneIdeas: parsedData.sceneIdeas || [],
          isFallbackResult: false
        };
      } catch (e) {
        console.error("Failed to parse JSON response for Spark Enhancement:", e, "\nRaw response:", responseText);
        throw new Error("AI returned an invalid format for the enhanced story idea. Please try again.");
      }
    },
    logTokenUsage
  );
};


export const analyzeIdeaMagicQuotient = async (
  idea: ScriptIdeaInput,
  logTokenUsage?: LogTokenUsageFn,
): Promise<MagicQuotientAnalysis & { isFallbackResult?: boolean }> => {
  const prompt = `
    You are an experienced film development executive and script doctor. Analyze the following movie/series idea.
    Idea Title: "${idea.title || 'Untitled Project'}"
    Genre: "${idea.genre || 'Not Specified'}"
    Logline: "${idea.logline}"
    Synopsis/Details: "${idea.synopsis}"

    Provide your analysis in a JSON object with the following structure:
    {
      "overallAssessment": "Your qualitative assessment of the idea's potential, uniqueness, and core appeal (2-4 insightful sentences).",
      "strengths": ["List 2-4 key strengths of the idea, being specific.", "e.g., The protagonist's internal conflict is compelling and relatable.", "e.g., The high-concept premise offers strong marketing potential."],
      "areasForDevelopment": ["List 2-4 areas that could be further developed or potential weaknesses. Be constructive.", "e.g., The second act may sag if the stakes are not continuously raised.", "e.g., The antagonist's motivations could be more clearly defined to create a richer conflict."],
      "actionableSuggestions": ["Provide 2-3 concrete, actionable suggestions for improving or refining the idea. Focus on what the writer can DO.", "e.g., Consider adding a ticking clock element to increase tension in the third act.", "e.g., Explore alternative endings that might offer a more surprising or thematically resonant conclusion."],
      "subjectiveScores": {
        "originality": "A score from 1 to 10 (integer) for originality, considering genre conventions and innovation.",
        "audienceAppeal": "A score from 1 to 10 (integer) for potential broad audience appeal, considering the concept and genre.",
        "criticalReception": "A score from 1 to 10 (integer) for potential critical reception, considering thematic depth and execution potential."
      },
      "generatedDisclaimer": "This analysis is AI-generated, subjective, and not a guarantee of success or failure. Real-world outcomes depend on many factors beyond the initial concept. Use as a creative brainstorming tool."
    }
    Focus on providing insightful, constructive feedback. Ensure all scores are integers between 1 and 10. The entire output must be a single, valid JSON object.
  `;

  return runGeminiWithFallback(
    'Magic Quotient Analysis',
    prompt,
    { temperature: 0.7 },
    (responseText) => {
      let jsonStr = responseText.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }

      try {
        const parsedData = JSON.parse(jsonStr) as MagicQuotientAnalysis;
        if (!parsedData.overallAssessment || !Array.isArray(parsedData.strengths) || !parsedData.subjectiveScores) {
          throw new Error("Generated JSON for magic quotient is missing required fields.");
        }
        const scores = parsedData.subjectiveScores;
        scores.originality = Number(scores.originality) || 0;
        scores.audienceAppeal = Number(scores.audienceAppeal) || 0;
        scores.criticalReception = Number(scores.criticalReception) || 0;

        return {
          ...parsedData,
          subjectiveScores: scores,
          strengths: Array.isArray(parsedData.strengths) ? parsedData.strengths : [],
          areasForDevelopment: Array.isArray(parsedData.areasForDevelopment) ? parsedData.areasForDevelopment : [],
          actionableSuggestions: Array.isArray(parsedData.actionableSuggestions) ? parsedData.actionableSuggestions : [],
          generatedDisclaimer: parsedData.generatedDisclaimer || MAGIC_QUOTIENT_DISCLAIMER,
          isFallbackResult: false,
        };
      } catch (e) {
        console.error("Failed to parse JSON response for Magic Quotient:", e, "\nRaw response:", responseText);
        throw new Error("AI returned an invalid format for the magic quotient analysis. Please try again.");
      }
    },
    logTokenUsage
  );
};

// Duplicate analyzeMovieMorphokinetics function removed - using the one at line 1445

export const getMovieTitleSuggestions = async (
  currentTitle: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string[]> => {
  const prompt = `
    You are an assistant that helps find correct or similar movie/series titles.
    Based on the user input "${currentTitle}", suggest 3-5 alternative, correctly spelled, or closely related existing movie or series titles.

    IMPORTANT: Order your suggestions by relevance/similarity to the input, with the CLOSEST MATCH FIRST.

    Return your suggestions as a JSON array of strings. For example: ["Closest Match", "Second Best Match", "Third Match"].
    If the input seems very accurate and you have no better suggestions, you can return an empty array or an array with just the original title if you can confirm its existence.
    Only include titles that are actual existing movies or series. Do not invent titles.
    If the input is gibberish or too vague, return an empty array.

    Consider these factors for ordering:
    1. Exact spelling corrections (highest priority)
    2. Same title with different years
    3. Very similar titles (sequels, prequels, remakes)
    4. Related titles in same franchise
    5. Thematically similar titles (lowest priority)
  `;

  try {
    const model = getGeminiAI().getGenerativeModel({ 
      model: getSelectedGeminiModel(),
      generationConfig: {
        temperature: 0.3,
        topK: 20,
      }
    });
    const response: GenerateContentResult = await model.generateContent(prompt);
    const responseText = response.response.text().trim();
    logTokenUsage?.(`Movie Title Suggestions (Gemini): ${currentTitle}`, prompt.length, responseText.length);

    let jsonStr = responseText;
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    try {
      const parsedData = JSON.parse(jsonStr) as string[];
      if (!Array.isArray(parsedData)) {
        console.warn("Parsed movie title suggestions is not an array:", parsedData, "\nRaw response:", responseText);
        return [];
      }
      return parsedData.filter(title => typeof title === 'string' && title.trim() !== '');
    } catch (e) {
      console.error("Failed to parse JSON response for Movie Title Suggestions:", e, "\nRaw response:", responseText);
      return [];
    }
  } catch (error) {
    console.error(`Gemini API error for movie title suggestions (Input: "${currentTitle}"):`, error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your API_KEY environment variable.');
    }
    return []; // Return empty array on error
  }
};

export const fetchMovieFinancialsWithGemini = async (
  movieTitle: string,
  logTokenUsage?: LogTokenUsageFn
): Promise<ParsedFinancials> => {
  const prompt = `
    For the movie titled "${movieTitle}", search the web for its estimated production budget and approximate production duration.
    Format the response as a JSON object:
    {
      "budget": <number | null>, 
      "currency": "<USD, INR, EUR, etc.>",
      "duration": "<string | null e.g., '18 months', 'Approx. 2 years', 'Around 90 shooting days'>",
      "sources": [{"uri": "source_url", "title": "Source Title (optional)"}, ...]
    }
    If a budget range is found (e.g., "$10-15 million"), use the average or represent the range in the currency field (e.g. "10-15 million USD").
    If no specific numerical budget is found, set budget to null. Prioritize USD if multiple currencies are mentioned or if a common currency for international films is expected.
  `;

  return runGeminiWithFallback(
    `Fetch Movie Financials: ${movieTitle}`,
    prompt,
    { temperature: 0.2 },
    (responseText, response) => {
      let jsonStr = responseText.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      
      try {
        const parsed = JSON.parse(jsonStr);
        const budgetValue = parsed.budget ? Number(parsed.budget) : undefined;

        return {
          budget: budgetValue !== undefined && !isNaN(budgetValue) ? budgetValue : undefined,
          currency: parsed.currency || (budgetValue ? "USD" : undefined),
          duration: parsed.duration,
          sources: extractGroundingSources(response) || parsed.sources || [],
          isFallbackResult: false,
        };
      } catch (e) {
        console.error("Failed to parse JSON response for Financials:", e, "\nRaw response:", responseText);
        throw new Error("AI returned an invalid format for financial data. Please try again.");
      }
    },
    logTokenUsage,
    [{ googleSearch: {} }] // Enable Google Search for financials
  );
};

export const generateQualitativeROIAnalysisWithGemini = async (
  movieTitle: string,
  budget: number,
  duration: string | undefined,
  isBudgetAIEstimated: boolean,
  layerAnalyses: LayerAnalysisData[],
  logTokenUsage?: LogTokenUsageFn
): Promise<ParsedROIAnalysis> => {
  const storyAnalysis = layerAnalyses.find(a => a.id === ReviewLayer.STORY)?.editedText || "Not analyzed.";
  const conceptAnalysis = layerAnalyses.find(a => a.id === ReviewLayer.CONCEPTUALIZATION)?.editedText || "Not analyzed.";
  const perfAnalysis = layerAnalyses.find(a => a.id === ReviewLayer.PERFORMANCE)?.editedText || "Not analyzed.";

  const disclaimer = isBudgetAIEstimated
    ? `Disclaimer: The following ROI potential analysis is speculative and based on an AI-estimated budget of approximately ${budget} USD ${duration ? `and an estimated production duration of ${duration}` : ''}. This financial data is approximate and sourced from public web information. Actual figures may vary.`
    : `Disclaimer: The following ROI potential analysis is speculative and based on the user-provided budget of ${budget} USD. This analysis considers creative factors against this budget and does not predict market performance.`;

  const prompt = `
    You are a film finance and production analyst.
    Movie Title: "${movieTitle}"
    Budget: ${budget} USD (This budget was ${isBudgetAIEstimated ? 'AI-estimated from web sources' : 'provided by the user'})${isBudgetAIEstimated && duration ? `\nEstimated Production Duration: ${duration}` : ''}.
    
    Summary of Creative Layer Analyses:
    - Story/Script: ${storyAnalysis.substring(0, 200)}...
    - Conceptualization: ${conceptAnalysis.substring(0, 200)}...
    - Performance/Execution: ${perfAnalysis.substring(0, 200)}...

    Task: Provide a *qualitative* assessment (150-250 words) of this movie's potential Return on Investment (ROI) based *only* on the provided creative summaries and the stated budget. Do NOT predict actual box office figures or financial success.

    Consider these aspects qualitatively:
    1. Budget Appropriateness: Does the budget seem fitting for the creative ambition hinted at by the layer summaries? (e.g., high-concept needing VFX vs. intimate drama).
    2. Creative Strengths vs. Budget: Are the highlighted creative strengths (e.g., unique story, compelling concept) likely to generate audience interest proportionate to this budget level?
    3. Potential Creative Risks: Could any creative weaknesses implied by the summaries hinder its ability to connect with an audience and thus impact its potential to recoup costs from a purely creative-to-budget standpoint?
    4. Genre Considerations (Implicit): Briefly touch upon whether this type of film (implied by creative summaries and budget scale) typically faces high/low financial risk from a production value perspective.

    Output Format:
    Start with the following EXACT disclaimer:
    "${disclaimer}"

    Then, provide your qualitative ROI analysis.
    Conclude with a general statement about the speculative nature of pre-release ROI thoughts based purely on creative factors and estimated/provided budgets.
    The entire response should be plain text.
  `;
  return runGeminiWithFallback(
    `Qualitative ROI Analysis: ${movieTitle}`,
    prompt,
    { temperature: 0.6 },
    (responseText) => {
      return { analysisText: responseText.trim(), isFallbackResult: false };
    },
    logTokenUsage
  );
};

export const generateGreybrainerInsightWithGemini = async (
  logTokenUsage?: LogTokenUsageFn,
): Promise<string> => {
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });
  
  const prompt = `
You are a distinguished film scholar analyzing cinema and OTT content consumed in India.

CURRENT DATE: ${currentDate}
CURRENT YEAR: ${currentYear}
CURRENT MONTH: ${currentMonth} ${currentYear}

Generate an insight (100-150 words) about patterns/evolution in Indian cinema and streaming content.

TEMPORAL APPROACH - CRITICAL RULES:
- The current year is ${currentYear}, NOT 2024 or any other year
- When referencing "this year", you MUST mean ${currentYear}
- When referencing "this month", you MUST mean ${currentMonth} ${currentYear}
- Analyze evolution over the past 2-3 years (${currentYear - 3} to ${currentYear})
- Use RELATIVE time phrases like:
  * "Recent releases in ${currentMonth} ${currentYear}..."
  * "Compared to ${currentYear - 2}-${currentYear - 3}..."
  * "Over the past two years (${currentYear - 2}-${currentYear})..."
  * "${currentYear}'s biggest hits..."
  * "Films from ${currentMonth} ${currentYear} alongside content from ${currentYear - 1}-${currentYear - 2}..."

NEVER EVER use 2024 or any hardcoded year - always reference ${currentYear} as the current year.

Analyze across these dimensions:
1. STORY LAYER: Character archetypes (hero, heroine, protagonist, anti-hero), genre evolution (comedy, tragedy, dramedy)
2. ORCHESTRATION LAYER: Visual language, directorial trends, casting strategies
3. PERFORMANCE LAYER: Acting styles, authenticity, star system evolution
4. MORPHOKINETICS: Visual aesthetic (look, color grading, cinematography) and pacing (editing speed, rhythm, tempo)

Content scope:
- Indian theatrical: Bollywood, Tollywood, regional cinema
- Indian OTT: Original web series and films
- International content popular in India: Korean, Hollywood, Spanish
- Platform differences: Theatrical vs OTT pacing and aesthetics

Cite 2-3 specific examples from ${currentMonth} ${currentYear} or recent months, comparing to ${currentYear - 2}-${currentYear - 3}.
Reveal what the PATTERN means for Indian filmmaking and audience consumption.

Start with: [STORY LAYER], [ORCHESTRATION], [PERFORMANCE], or [MORPHOKINETICS]

Generate insight:
  `.trim();
  
  return runGeminiWithFallback(
    'Greybrainer Insight Generation',
    prompt,
    {
      temperature: 0.75,
      topP: 0.9,
      topK: 50,
    },
    (responseText) => responseText.trim(),
    logTokenUsage,
    [{ googleSearch: {} }] as any[] // Using as any[] to bypass Tool type definition limitations
  );
};

// NEW: Expanded Publication-Ready Insight (Medium Post / Opinion Piece)
export const generateExpandedPublicationInsight = async (
  originalInsight: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string> => {
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const currentYear = now.getFullYear();
  
  const prompt = `
You are a distinguished film critic and cultural commentator writing a publication-ready opinion piece for Medium, film industry journals, or major newspapers.

CURRENT DATE: ${currentDate}
CURRENT YEAR: ${currentYear}

ORIGINAL GREYBRAINER INSIGHT:
${originalInsight}

YOUR TASK:
Transform this insight into a compelling, detailed opinion piece (800-1200 words) that will make movie-goers, critics, and publishers rush to publish it.

CRITICAL - HIGHLIGHT GREYBRAINER'S UNIQUE METHODOLOGY:
You MUST emphasize that this analysis uses the proprietary **Greybrainer Framework**, a revolutionary three-layer concentric analytical system that NO other film criticism methodology employs:

**THE GREYBRAINER THREE-LAYER FRAMEWORK:**
1. **STORY LAYER (Core/Inner Ring):** The narrative foundation - character archetypes, genre evolution, thematic depth
2. **ORCHESTRATION LAYER (Middle Ring):** Directorial vision, visual language, casting strategy, production design
3. **PERFORMANCE LAYER (Outer Ring):** Acting authenticity, star system evolution, performance techniques

**PLUS THE MORPHOKINETICS DIMENSION:**
A groundbreaking scientific approach analyzing:
- **Visual Aesthetic:** Color grading, cinematographic style, look design
- **Pacing Dynamics:** Editing speed, rhythm, temporal flow, shot duration

This is the ONLY analytical framework that treats cinema as a layered, interconnected system - like analyzing an organism's anatomy from core to surface.

STRUCTURE YOUR ARTICLE:

**HEADLINE (Compelling, Clickable):**
Create a provocative headline that captures the insight's essence

**OPENING HOOK (150 words):**
Start with a vivid scene or recent cultural moment that embodies the trend. Make readers feel they're discovering something urgent.

**THESIS STATEMENT (50 words):**
Clearly state the evolution/pattern you're analyzing. Mention this is revealed through Greybrainer's proprietary three-layer + morphokinetics analysis.

**SECTION 1: THE STORY LAYER EVOLUTION (250-300 words)**
- Deep dive into character archetype shifts
- Genre evolution and audience psychology
- Specific film/series examples from ${currentYear} vs ${currentYear - 2}-${currentYear - 3}
- Why this matters for storytelling
- Quote hypothetical filmmaker or critic reactions

**SECTION 2: THE ORCHESTRATION LAYER TRANSFORMATION (250-300 words)**
- Directorial vision and visual language changes
- How casting strategies evolved
- Production design trends
- Platform differences (theatrical vs OTT)
- Industry implications for producers/directors

**SECTION 3: THE PERFORMANCE LAYER & MORPHOKINETICS (250-300 words)**
- Acting style evolution (theatrical to naturalistic)
- Star system changes
- **MORPHOKINETICS ANALYSIS:** How visual aesthetics and pacing changed
  * Color grading trends (saturated Bollywood vs muted OTT)
  * Editing rhythm differences (theatrical spectacle vs streaming subtlety)
  * Shot duration evolution
- Scientific approach to these measurable elements

**SECTION 4: THE CONVERGENCE - What This Means (150-200 words)**
- How all three layers + morphokinetics interact
- Cultural/societal drivers behind this shift
- Audience maturation and demand evolution
- Future predictions for Indian cinema

**CLOSING STATEMENT (100 words):**
Powerful conclusion that ties back to opening hook. Leave readers thinking about their next theater/streaming choice differently.

**SIDEBAR/CALLOUT BOX:**
"The Greybrainer Methodology: Why Three Layers Matter"
Brief explainer of how this framework reveals patterns other critics miss.

WRITING STYLE REQUIREMENTS:
- Authoritative yet accessible (New Yorker meets Variety)
- Data-driven but emotionally resonant
- Use specific examples (actual films/shows from ${currentYear} and past 2-3 years)
- Include industry insider perspective
- Quotable pull-quotes throughout
- Make the Greybrainer framework sound indispensable
- Emphasize originality - this analysis exists nowhere else

TONE:
- Confident cultural commentary
- Thought leadership
- Not academic jargon, but intellectually rigorous
- Celebrates Indian cinema's maturation

SEO/VIRAL ELEMENTS:
- Subheadings that could be tweets
- Pull-quotes that could go viral
- Contrarian takes that spark debate
- Data points that surprise

Generate the full publication-ready article now:
  `.trim();
  
  return runGeminiWithFallback(
    'Expanded Publication Insight',
    prompt,
    {
      temperature: 0.8,
      topP: 0.95,
      topK: 60,
      maxOutputTokens: 4096,
    },
    (responseText) => responseText.trim(),
    logTokenUsage,
    [{ googleSearch: {} }] as any[] // Using as any[] to bypass Tool type definition limitations
  );
};

// NEW: Movie-Anchored Insight Generation
export const generateMovieAnchoredInsightWithGemini = async (
  movieTitle: string,
  selectedLayer: 'story' | 'orchestration' | 'performance' | 'morphokinetics' | 'random',
  logTokenUsage?: LogTokenUsageFn,
): Promise<string> => {
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });
  
  const layerInstruction = selectedLayer === 'random' 
    ? 'Choose the most relevant layer (Story, Orchestration, Performance, or Morphokinetics) for this movie' 
    : `Focus specifically on ${selectedLayer.toUpperCase()} LAYER`;
  
  const prompt = `
You are a distinguished film scholar analyzing cinema and OTT content consumed in India.

CURRENT DATE: ${currentDate}
CURRENT YEAR: ${currentYear}
CURRENT MONTH: ${currentMonth} ${currentYear}

MOVIE ANCHOR: "${movieTitle}"

Generate an insight (100-150 words) using this movie as the hook/anchor point, then trace the pattern backward.

${layerInstruction}

TEMPORAL RULES - CRITICAL:
- The current year is ${currentYear}, NOT 2024 or any other year
- When referencing "this year", you MUST mean ${currentYear}
- Trace evolution over past 2-3 years (${currentYear - 3} to ${currentYear})
- NEVER use 2024 or any hardcoded year except ${currentYear}

STRUCTURE:
1. START with the anchored movie "${movieTitle}" and identify a specific element
2. THEN trace how this element evolved from ${currentYear - 3} to ${currentYear}
3. REVEAL what this pattern means for Indian cinema/OTT

LAYERS EXPLANATION:
- STORY LAYER: Character archetypes (hero, heroine, protagonist, anti-hero), genre treatment (comedy, tragedy, dramedy), narrative structure
- ORCHESTRATION LAYER: Visual language, casting strategy, directorial vision, cinematography, production design
- PERFORMANCE LAYER: Acting style, authenticity, star system, performance techniques
- MORPHOKINETICS: Visual aesthetic (look, color grading), pacing (editing speed, rhythm, shot length)

Content scope: Indian theatrical + OTT + international content popular in India

Start with: [STORY LAYER], [ORCHESTRATION], [PERFORMANCE], or [MORPHOKINETICS]

Example structure:
"[LAYER] *${movieTitle}* demonstrates [specific element]. Compared to releases from ${currentYear - 2}-${currentYear - 3} like [examples], this reveals [evolution pattern and meaning]."

Generate insight:
  `.trim();

  return runGeminiWithFallback(
    'Movie-Anchored Insight Generation',
    prompt,
    {
      temperature: 0.75,
      topP: 0.9,
      topK: 50,
    },
    (responseText) => responseText.trim(),
    logTokenUsage,
    [{ googleSearch: {} }] as any[] // Using as any[] to bypass Tool type definition limitations
  );
};

// Layer Analysis Function
export const analyzeLayerWithGemini = async (
  movieTitle: string,
  reviewStage: ReviewStage,
  layer: ReviewLayer,
  layerTitle: string,
  layerDescription: string,
  logTokenUsage?: LogTokenUsageFn,
  year?: string,
  director?: string,
): Promise<ParsedLayerAnalysis> => {
  const prompt = generateAnalysisPrompt(movieTitle, reviewStage, layer, layerTitle, layerDescription, year, director);
  
  return runGeminiWithFallback(
    `Layer Analysis: ${layerTitle}`,
    prompt,
    { temperature: 0.7 },
    (responseText, fullResponse) => {
      const rawAnalysisText = responseText.trim();
      
      // Parse the response
      let directorName = parseDirector(rawAnalysisText);
      let mainCast = parseMainCast(rawAnalysisText);
      let aiSuggestedScore = parseAISuggestedScore(rawAnalysisText);
      let improvementSuggestions = parseImprovementSuggestions(rawAnalysisText);
      let vonnegutShape: VonnegutShapeData | undefined;

      if (layer === ReviewLayer.STORY) {
        vonnegutShape = parseVonnegutShapeData(rawAnalysisText);
      }
      
      // Clean the analysis text by removing parsed sections
      let cleanedAnalysisText = rawAnalysisText;
      const vonnegutBlockRegex = /---VONNEGUT STORY SHAPE START---[\s\S]*?---VONNEGUT STORY SHAPE END---/i;
      cleanedAnalysisText = cleanedAnalysisText.replace(vonnegutBlockRegex, '').trim();

      if (directorName) cleanedAnalysisText = cleanedAnalysisText.replace(/Director:\s*(.*)/i, '').trim();
      if (mainCast && mainCast.length > 0) cleanedAnalysisText = cleanedAnalysisText.replace(/Main Cast:\s*([\w\s,]+)/i, '').trim();
      
      const scoreRegex = new RegExp(`Suggested Score:\\s*\\d*\\.?\\d+\\s*/\\s*${MAX_SCORE}`, "i");
      cleanedAnalysisText = cleanedAnalysisText.replace(scoreRegex, '').trim();
      
      // More precise removal of Potential Enhancements section
      cleanedAnalysisText = cleanedAnalysisText.replace(/Potential Enhancements:[\s\S]*?(?=\n\n|\n---|\n\*\*|$)/i, '').trim();
      cleanedAnalysisText = cleanedAnalysisText.replace(/\n\s*\n/g, '\n').trim();

      return {
        analysisText: cleanedAnalysisText,
        director: directorName,
        mainCast,
        groundingSources: extractGroundingSources(fullResponse) || [],
        aiSuggestedScore,
        improvementSuggestions,
        vonnegutShape,
        isFallbackResult: false,
      };
    },
    logTokenUsage,
    [{ googleSearch: {} }] // Enable Google Search for layer analysis
  );
};

// Final Report Generation
export const generateFinalReportWithGemini = async (
  movieTitle: string,
  reviewStage: ReviewStage,
  analyses: LayerAnalysisData[],
  personnelData: PersonnelData | undefined,
  financialData: FinancialAnalysisData | null,
  logTokenUsage?: LogTokenUsageFn,
  year?: string,
  director?: string,
): Promise<SummaryReportData> => {
  const storyAnalysis = analyses.find(a => a.id === ReviewLayer.STORY);
  const conceptualizationAnalysis = analyses.find(a => a.id === ReviewLayer.CONCEPTUALIZATION);
  const performanceAnalysis = analyses.find(a => a.id === ReviewLayer.PERFORMANCE);

  let personnelContext = "";
  if (personnelData && (personnelData.director || (personnelData.mainCast && personnelData.mainCast.length > 0))) {
    personnelContext = "Key personnel considered: ";
    if (personnelData.director) personnelContext += `Director - ${personnelData.director}. `;
    if (personnelData.mainCast && personnelData.mainCast.length > 0) personnelContext += `Main Cast - ${personnelData.mainCast.join(', ')}. `;
    personnelContext += "\n";
  }

  // Add explicit context for disambiguation
  const explicitContext = [
    year ? `Year: ${year}` : '',
    director ? `Director: ${director}` : ''
  ].filter(Boolean).join(', ');
  
  const titleWithContext = explicitContext ? `"${movieTitle}" (${explicitContext})` : `"${movieTitle}"`;

  const scoredLayers = analyses.filter(l => typeof l.userScore === 'number');
  const overallScore = scoredLayers.length > 0 ? (scoredLayers.reduce((sum, l) => sum + (l.userScore as number), 0) / scoredLayers.length) : null;
  const overallScoreString = overallScore ? `${overallScore.toFixed(1)}/${MAX_SCORE}` : 'Not Scored';
  const safeMovieTitle = movieTitle.replace(/[^a-zA-Z0-9]/g, '');

  let scoreContext = scoredLayers.length > 0 ? `Editor-assigned scores complement this qualitative summary. The overall score is ${overallScoreString}.` : "";

  const formatSuggestions = (suggestions: string | string[] | undefined): string => {
    if (!suggestions) return "N/A";
    if (Array.isArray(suggestions)) return suggestions.map(s => `- ${s}`).join('\n');
    return suggestions;
  };

  const improvementSuggestionsContext = `
    Individual layer analyses also suggested potential enhancements:
    Story: ${formatSuggestions(storyAnalysis?.improvementSuggestions)}
    Conceptualization: ${formatSuggestions(conceptualizationAnalysis?.improvementSuggestions)}
    Performance: ${formatSuggestions(performanceAnalysis?.improvementSuggestions)}
  `;

  let financialContext = "";
  if (financialData) {
    if (financialData.userProvidedBudget) {
        financialContext += `The user provided an estimated budget of ${financialData.userProvidedBudget} USD.\n`;
    } else if (financialData.fetchedBudget) {
        financialContext += `An AI-estimated budget of approximately ${financialData.fetchedBudget} ${financialData.fetchedBudgetCurrency || 'USD'} was found. `;
        if (financialData.fetchedDuration) {
            financialContext += `The estimated production duration was ${financialData.fetchedDuration}. `;
        }
        financialContext += `This financial data is approximate.\n`;
    }
    if (financialData.qualitativeROIAnalysis) {
        financialContext += `A qualitative ROI analysis was also generated, considering this budget against creative factors.\n`;
    }
  }


  const prompt = `
    You are an expert film critic generating a "Greybrainer" summary report for ${titleWithContext} (${reviewStage}).
    
    IMPORTANT: Ensure you are analyzing the correct movie.
    ${year ? `Release Year: ${year}` : ''}
    ${director ? `Director: ${director}` : ''}

    Synthesize insights from Story/Script, Conceptualization, and Performance/Execution layers.
    The Conceptualization analysis includes casting assessment. Story analysis details plot, characters, themes, originality.
    Output: A cohesive, engaging summary (250-350 words) for blog/social media. Tone: exciting, academic, critical.
    ${personnelContext}
    ${scoreContext}
    ${financialContext}

    Layer Analyses:
    1. Story/Script: "${storyAnalysis?.editedText || "No analysis."}"
    2. Conceptualization: "${conceptualizationAnalysis?.editedText || "No analysis."}"
    3. Performance/Execution: "${performanceAnalysis?.editedText || "No analysis."}"

    ${improvementSuggestionsContext}

    Craft a compelling "Greybrainer Summary Report". Focus on interplay, overall originality (weaving in story similarity/casting notes if significant), and potential impact.
    
    After the main report, provide "Overall Improvement Opportunities:" - a short section (2-3 bullet points, 100-150 words total, using standard bullet points like - item).
    
    After the main report and improvement opportunities, generate two distinct social media posts formatted as follows. Do not use markdown like "###" or "**" inside these social media blocks.

    ---PIXAR STYLE SCENES START---
    Generate 3 distinct, vivid descriptions of representative scenes from the movie, imagined in a "Pixar Animation Style".
    Focus on:
    - Vibrant colors and lighting.
    - Expressive character emotions.
    - Whimsical or dramatic composition.
    - "Nano Banana" aesthetic (playful, detailed, slightly stylized).
    Format: Just the 3 descriptions, separated by newlines. No numbering or bullet points.
    ---PIXAR STYLE SCENES END---

    ---TWITTER POST START---
    Generate a compelling Twitter (X) post (under 280 characters).
    - Start with a strong hook to grab attention.
    - Mention the movie title "${movieTitle}".
    - Include the Overall Greybrainer Score if available: ${overallScoreString}.
    - Use 3-4 relevant hashtags (e.g., #${safeMovieTitle}, #FilmAnalysis, #MovieReview, #GreybrainerAI).
    - End with a call to action and the placeholder "[LINK_TO_FULL_REPORT_HERE]".
    ---TWITTER POST END---

    ---LINKEDIN POST START---
    Generate a professional LinkedIn post (approx. 2-3 short paragraphs).
    - Target audience: Filmmakers, producers, analysts, and film students.
    - Start with an analytical or thought-provoking question about "${movieTitle}".
    - Summarize the key findings from the Greybrainer analysis (e.g., "Our analysis reveals exceptional story architecture but identifies potential gaps in conceptualization...").
    - Mention the core layers (Story, Conceptualization, Performance) and the overall score if available: ${overallScoreString}.
    - Conclude with an invitation for professional discussion and the placeholder "[LINK_TO_FULL_REPORT_HERE]".
    - Include relevant professional hashtags (e.g., #FilmIndustry, #Screenwriting, #FilmProduction, #CreativeAnalysis, #Greybrainer).
    ---LINKEDIN POST END---
  `.trim();

  return runGeminiWithFallback(
    'Final Report Generation',
    prompt,
    { temperature: 0.7 },
    (responseText) => parseFinalReportAndMore(responseText.trim(), financialData),
    logTokenUsage,
    [{ googleSearch: {} }] as any[]
  );
};

export const generateDirectorModeBlogPost = async (
  movieTitle: string,
  summaryReport: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string> => {
  const prompt = `
You are a hybrid Film Director and Content Strategy Consultant for my blog. Your job is to:

Turn my topic into a cinematic narrative with visual moments, and

Turn that same narrative into a strategic content system (blog posts, social posts, and email ideas) designed to grow my audience and revenue.​

The topic is a review and analysis of the movie: "${movieTitle}".
Here is the summary of the analysis:
"${summaryReport}"

When I give you a topic, follow this exact workflow:

A. Film‑style story for the blog
Protagonist & audience fit

Define a detailed protagonist profile that represents my ideal reader: demographics, backstory, current frustrations, desires, and transformation they want.

Explain in 2–3 bullet points why this character is the perfect stand‑in for my audience.​

Mini‑film narrative for the article

Outline an 8‑minute “mini‑film” story that can be told as a long‑form blog post:

Act 1: Hook scene (where they are stuck).

Act 2: Turning point (discovery of my idea/process).

Act 3: Transformation (what life looks like after applying it).

For each act, give:

A scene summary written in plain language I can turn into paragraphs.

Emotions to highlight.

2–3 concrete visual details I can describe (environment, objects, specific actions).​

Storyboards as section structure

Create 6 “storyboard frames” that double as blog sections. For each frame:

Section title (H2).

1–2 sentences describing the scene.

3–5 bullet points for what I should cover in that section (advice, examples, or steps).​

B. Content strategy consultant for my niche
Assume the Dan Koe‑style framework: strong hooks, relatable problems, unique solutions, big promised benefit, confident stance, and a novel perspective.​​

Hook & angle bank

Generate 15 potential article titles/hooks for this topic using that framework.

For each, break down:

Hook line.

Relatable problem.

Big benefit.

Polarizing or contrarian angle.​​
  `.trim();

  return runGeminiWithFallback(
    'Director Mode Blog Generation',
    prompt,
    { temperature: 0.8 },
    (responseText) => responseText.trim(),
    logTokenUsage
  );
};

/**
 * Generate a Grey Editor-style blog post from pure analysis
 * Transforms technical analysis into compelling, opinionated essay
 */
export const generateGreyEditorBlogPost = async (
  movieTitle: string,
  pureAnalysis: string,
  score: number,
  maxScore: number,
  morphokineticsInsight?: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string> => {
  const prompt = `**ROLE**
You are the Editor-in-Chief of "GreyBrainer." Your writer has just handed you a deep, data-heavy "Pure Analysis" of the film "${movieTitle}". Your job is to **distill** this dense analysis into a compelling, opinionated, and highly readable essay for a public audience (Medium/LinkedIn).

**YOUR VOICE (The "Grey" Persona)**
* **Nuanced:** You reject binary "Good vs. Bad" takes. You look for the *intent* vs. the *execution*.
* **Authoritative:** You don't guess; you declare. Use strong verbs.
* **Vulnerable:** You are not a robot. If a scene made you cringe or cry, say so.
* **Scannable:** You hate walls of text. You love short paragraphs, bold hooks, and clear hierarchy.

**THE TASK**
1.  **Read** the provided "Pure Analysis" (Story, Conceptualization, Performance layers).
2.  **Synthesize** the key insights into a narrative flow. Do not just copy-paste the data.
3.  **Format** the output into the structure below.

**STRICT FORMATTING GUIDELINES**
* **The "Verdict" Box:** Always start with a summary block so the reader gets value in 5 seconds.
* **Headlines:** Must be "Click-Worthy" but intellectual. (e.g., instead of "Review of Movie X", use "Why Movie X Failed Despite a ₹500Cr Budget").
* **Text Density:** Max 3 sentences per paragraph.
* **The "Grey" Angle:** Every section must answer "Why does this matter?" not just "What happened?"

**PURE ANALYSIS DATA:**
${pureAnalysis}

**SCORE:** ${score} / ${maxScore}

${morphokineticsInsight ? `**MORPHOKINETIC INSIGHT:**
${morphokineticsInsight}` : ''}

**OUTPUT TEMPLATE**

# [Generate a Provocative Headline Based on the Core Insight]
## [Subtitle: A 1-sentence hook that summarizes the emotional core of the review]

---

### 🏁 The Grey Verdict
**Score:** ${score} / ${maxScore}
**The TL;DR:** [Summarize the entire review in 3 punchy sentences. Is it a masterpiece, a mess, or a misunderstood gem?]

---

### 1. The Core: Story & Script
*[Take the 'Magic of Story' data and turn it into a narrative. Discuss the themes and character arcs. Use bolding for key phrases.]*
> **"Quote Idea":** *[Pull a standout quote or dialogue mentioned in the analysis, or synthesize a 'pull-quote' that captures the script's essence.]*

### 2. The Vision: Conceptualization
*[Distill the 'Magic of Conceptualization' data. Focus on the Director's intent. Did the editing work? Was the world immersive?]*

### 3. The Execution: Performance & Craft
*[Distill the 'Magic of Performance' data. Don't list actors; describe their impact. Mention music/cinematography only if it changed the viewing experience.]*

---

### 🧠 The Grey Insight (The "So What?")
*[Look at the 'Morphokinetic Insight' from the input. Explain where this film fits in the history of cinema. Is it a trendsetter or a relic? Connect it to a social topic if relevant.]*

**Engagement Hook:** [Ask a specific, debate-sparking question related to the film's central conflict.]

---

### 📊 Digital Biomarker & Publishing Guidelines

**Biomarker ID:** GB-[YYYYMMDD]-[XXX]  
*(Example: GB-20260112-001)*

**Published:** [Date & Time]  
**Topic:** [Film Title] - [Key Theme/Angle]  
**Keywords:** #[MainKeyword] #[GenreTag] #[PlatformTag] #[TrendingTag]  
**Biomarker Tag:** #GreybrainerPulse[YYYYMMDD]  
**Medium URL:** [Paste after publishing]  

---

**📋 For Publishing Team:**

When publishing this post to Medium (@GreyBrainer), please:

1. **URL Slug Format:** Use greybrainer-pulse-YYYYMMDD-[topic-keyword]  
   Example: greybrainer-pulse-20260112-akhanda-divine-action

2. **Biomarker Hashtag:** Add the unique daily tag at the end (e.g., #GreybrainerPulse20260112)

3. **Track Performance (24h after publish):**
   - Views count
   - Claps received
   - Comments (note the top reaction/theme)
   - Traffic sources (organic search vs social shares)

4. **Update Biomarker Section:** After 24h, paste stats back into this section for research tracking

5. **For Next Day's Research:** Use this biomarker + stats in the "Past Content Context" field to help AI identify what resonated and build narrative continuity

**Why This Matters:** This biomarker system allows Greybrainer AI to analyze audience engagement patterns, suggest follow-up topics based on proven interest, and create a continuous narrative thread across all @GreyBrainer posts. Each post becomes a data point in understanding your audience's evolving preferences.

---

*Follow @GreyBrainer for continuous cinema narrative analysis.*

---

**Generate the Grey Editor essay now, following the template exactly.**`;

  return runGeminiWithFallback(
    'Grey Editor Blog Generation',
    prompt,
    {
      temperature: 0.9,
      maxOutputTokens: 2048
    },
    (responseText) => responseText.trim(),
    logTokenUsage
  );
};

/**
 * Generate Greybrainer Research & Trending Engine report
 * Analyzes trending topics, understands Medium audience, and creates continuous narrative
 */
export const generateGreybrainerResearch = async (
  trendingTopics: string,
  pastContentContext?: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string> => {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  const prompt = `**ROLE**
You are the "Greybrainer Intelligence Unit" for @GreyBrainer on Medium (https://medium.com/@GreyBrainer/greybrainer).

Your mission is NOT to write isolated reviews. You are building a **continuous live narrative** of Indian cinema's evolution. Each post is a chapter in an ongoing story that your audience follows religiously.

**WHO IS YOUR AUDIENCE?**
* Medium readers who value **vulnerability over objectivity**
* Cinephiles seeking the "grey area" between 1-star flops and 5-star masterpieces
* Professionals aged 25-45 who want **skimmable analysis** with personal depth
* Followers of Film Camp, The Cinema Scale (target publications for guest posting)
* Mobile readers (70%) who need visual hooks and chunked headers

**THE STRATEGIC GOAL**
Position @GreyBrainer as the go-to source for:
1. **Mass Spectacle Analysis** (Pan-Indian blockbusters, OTT trends)
2. **Polarized Film Discourse** (critically divided big-budget releases)
3. **Socially Charged Cinema** (historical dramas, #MeToo narratives, political films)

**THE PROCESS (Scan → Segment → Synthesize → Link)**

**STEP 1: SCAN THE LANDSCAPE**
Identify what's dominating the cultural conversation RIGHT NOW (${today}).

**STEP 2: SEGMENT INTO THREE BUCKETS**
* **The Popular:** Mass hype, high box office, #1 trending on Netflix/Prime/Disney+
* **The Critiqued:** Critical darlings, polarizing misfires, "hate-watching" phenomena
* **The Social:** Twitter debates, political angles, #MeToo narratives, historical accuracy wars

**STEP 3: SYNTHESIZE THE "WHY"**
For each trending item:
* What is the UNDERLYING audience need? (Escapism? Validation? Outrage?)
* What NARRATIVE PATTERN is repeating? (Divine Action? Spy Thrillers? Anti-War Stories?)
* How does this fit into the **larger story** of Indian cinema's evolution?

**STEP 4: LINK TO CONTINUOUS NARRATIVE**
* Connect current trends to @GreyBrainer's past analyses
* Show how this week's trends are CHAPTERS in an ongoing story arc
* Use phrases like: "Building on our analysis of...", "This continues the pattern we identified in...", "Remember when we called..."

**TRENDING TOPICS/NEWS (${today}):**
${trendingTopics}

${pastContentContext ? `**YOUR PAST CONTENT ECOSYSTEM (For Thematic Bridges):**
${pastContentContext}

Use these past posts to create narrative continuity. Show evolution, not repetition.` : ''}

**OUTPUT FORMAT**

# 🎬 The Greybrainer Pulse: ${today}

*[Write a 2-sentence hook that positions this report as the latest chapter in your ongoing cinema narrative. Example: "For your second week of March 2026, the Indian audience is torn between divine action spectacles and polarizing big-budget misfires. Here's how this week's trends reveal deeper shifts in what we're willing to forgive—and what we're ready to abandon."]*

---

## 1. 📈 The Popular (Mass Hype & High Engagement)

**[Title] ([Platform] - [Release Date])**
* **The Hook:** [Why is everyone watching this? Star power? Genre novelty? Cultural moment?]
* **The Numbers:** [Box office figures, trending position, social media buzz]
* **Grey Analysis:** [What does this success reveal about audience needs? What narrative itch is it scratching?]
* **🔗 Narrative Bridge:** [Connect to past analysis from the provided Ecosystem context. Example: "This builds on the 'Divine Action' genre we analyzed in [Past Post Title]. Notice how the mythology is now global, not just regional."]

*[Repeat for 2-3 Popular items]*

---

## 2. 🎭 The Critiqued (Critical Discourse & Polarization)

**[Title] ([Platform])**
* **The Split:** [Critics say X, audiences say Y. What's the disconnect?]
* **The Nuance:** [Is the criticism fair? What's the grey area? What's being overlooked?]
* **Grey Verdict:** *"[Insert a bold, quotable take that captures your perspective. Example: 'The Raja Saab isn't a misfire—it's Prabhas betting his career on the wrong horse.']"*
* **🔗 Evolution Tracker:** [How does this fit into the PATTERN? Example: "This is the third Prabhas vehicle in 18 months that critics have savaged. Our analysis of [Past Film] predicted this exact trap."]

*[Repeat for 2-3 Critiqued items]*

---

## 3. 💬 The Social (Debates, Controversies, Cultural Flashpoints)

**[Topic/Film]**
* **The Trigger:** [What sparked the debate? Historical accuracy? Representation? #MeToo angle?]
* **The Stakes:** [Why does this matter beyond the film? What does it reveal about Indian society in 2026?]
* **The Grey Stance:** [Take a clear position. Your audience expects vulnerability, not fence-sitting.]
* **🔗 Thematic Thread:** [Connect to broader social cinema analysis from the provided Ecosystem context. Example: "This refugee crisis debate echoes our Freedom at Midnight essay, where we explored how historical trauma shapes current politics."]

*[Repeat for 2-3 Social items]*

---

## 🔮 Morphokinetic Trend Forecast (What's Next)

*[Based on this week's data, predict the NEXT wave. Be specific and bold.]*

**Example Format:**
* **Next Week:** Expect a surge in [Genre/Theme] following [Current Success].
* **Next Month:** Watch for backlash against [Current Trend] as audiences crave [Opposite Trend].
* **The Pattern:** Indian cinema is shifting from [Old Paradigm] to [New Paradigm]. @GreyBrainer called this in [Past Analysis Date].

---

## ✍️ Medium Strategy for @GreyBrainer

### Immediate Action Plan:
1. **This Week's Must-Write:** [Identify the ONE film/topic with the highest engagement potential]
   * **Suggested Title:** *"[Provocative Personal Hook]: Why [Film] Made Me Question [Universal Theme]"*
   * **Key Angle:** [The vulnerable perspective, not just the critical analysis]
   * **Visual Hook:** [Describe the specific film still/poster to use as opening image]

2. **Guest Post Opportunity:** [Which topic is perfect for submitting to The Cinema Scale or Film Camp?]
   * **Pitch Angle:** [How to position it for their audience]

3. **Skimmability Upgrade:** [Suggest 3-5 H2/H3 headers for your next post to maximize mobile readability]

4. **The Continuity Thread:** [How does this week's analysis connect to NEXT week's likely trends? Plant narrative seeds.]

---

## 📹 Social Video Prompt Hook

*[Generate a 15-second Reel/Short script that captures the MOST provocative story from this report. Include the hook, the tension, and the cliffhanger.]*

**Example Format:**
> "Everyone's obsessed with [Film], but here's what they're missing: [Provocative Insight]. The real story isn't [Obvious Thing]—it's [Hidden Pattern]. And if you look at @GreyBrainer's analysis from [Past Date], we saw this coming. Swipe for the full breakdown. 👆"

---

**CRITICAL REMINDERS:**
* Use actual film/show titles, not placeholders
* Reference real @GreyBrainer past posts when creating bridges (even if hypothetical, make them feel real)
* Every insight must serve the CONTINUOUS NARRATIVE, not standalone analysis
* Medium readers reward vulnerability—add personal stakes whenever possible
* Include specific numbers (box office, trending rank, social media mentions)
* End with a FORWARD-LOOKING hook that makes readers want to come back next week

**Generate the Research Summation report now, following the format exactly.**`;

  return runGeminiWithFallback(
    'Greybrainer Research Engine',
    prompt,
    {
      temperature: 0.85,
      maxOutputTokens: 3072
    },
    (responseText) => responseText.trim(),
    logTokenUsage
  );
};

/**
 * Generate Grey Verdict Editorial - Cultural editorial that transforms film analysis into trend narratives
 * Based on the GreyBrainer Editorial Engine system
 * Supports multiple movies (comma-separated) and newsletter context parsing
 */
export const generateGreyVerdictEditorial = async (
  movieTitles: string, // Now supports comma-separated list: "Angammal, The Raja Saab, Haq"
  trendAngle: string,
  pastEcosystemContext?: string, // Can be newsletter with trending topics + suggestions
  logTokenUsage?: LogTokenUsageFn,
): Promise<string> => {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  // Parse multiple movies
  const movieList = movieTitles.split(',').map(m => m.trim()).filter(m => m.length > 0);
  const movieCount = movieList.length;
  const movieDisplay = movieCount > 1 
    ? `${movieList.slice(0, -1).join(', ')} and ${movieList[movieList.length - 1]}`
    : movieList[0];
  
  const prompt = `**ROLE**
You are the **Editor-in-Chief of GreyBrainer**, the premier "Morphokinetic" film analysis platform. Your goal is to transcend simple movie reviews. You write **Cultural Editorials** that connect specific films to broader industry trends, societal shifts, and business insights.

**YOUR MEDIUM BLOG REFERENCE**
The GreyBrainer Medium blog (https://medium.com/@GreyBrainer) contains your past cultural analyses, trend narratives, and editorial insights. When the user provides newsletter context or past ecosystem data, look for:
- Trending topics mentioned
- Suggestions on how to approach the Grey Verdict
- References to past films/analyses you should connect to
- Cultural patterns you've previously identified

**INPUT DATA**
* **Subject Film(s):** ${movieDisplay} ${movieCount > 1 ? `(${movieCount} films analyzed together)` : ''}
* **The Trend/Angle:** ${trendAngle}
${pastEcosystemContext ? `* **Newsletter Context / Past Ecosystem:**
${pastEcosystemContext}

**INSTRUCTION:** Parse the above context carefully. If it contains:
- A newsletter with trending topics → Extract the key themes
- Suggestions on Grey Verdict approach → Follow those guidelines
- References to past GreyBrainer analyses → Create explicit thematic bridges
- Cultural patterns → Weave them into your trend analysis` : ''}

**YOUR MISSION**
Draft a "Grey Area" Editorial that uses the subject film(s) as ${movieCount > 1 ? 'case studies' : 'a case study'} to prove the Trend. This is NOT a review - it's a cultural analysis that positions ${movieDisplay} within the larger narrative of ${trendAngle}.

${movieCount > 1 ? `**MULTIPLE FILMS ANALYSIS:**
You are analyzing ${movieCount} films together: ${movieList.map((m, i) => `${i + 1}. ${m}`).join(', ')}.

Approach:
- Find the COMMON THREAD connecting all ${movieCount} films to ${trendAngle}
- Use each film to illustrate different facets of the trend
- Create a cohesive narrative showing how these films collectively prove your thesis
- Don't treat them as separate reviews - weave them into one cultural argument` : ''}

**TONE & VOICE (The "Grey" Persona)**
* **Nuanced:** Reject binary "Hit/Flop" thinking. Look for the *intent* vs. *execution*.
* **Authoritative but Vulnerable:** Use data/box office numbers where relevant, but also admit how the film made you *feel*.
* **Forward-Looking:** Always answer: "What does this mean for the future of Indian cinema?"
* **Professional:** Suitable for LinkedIn/Medium thought leadership, not casual reviews.
* **Scannable:** Use bold text, pull quotes, and clear section headers for mobile readers.

**STRUCTURAL GUIDELINES (Strict Adherence)**

1. **The Hook (Headline):** Must be an intellectual teaser that connects film(s) + trend.
   * Bad: "${movieList[0]} Review"
   * Good: "[Provocative Statement]: Why ${movieCount > 1 ? `'${movieList[0]}', '${movieList[1]}'${movieList.length > 2 ? ', and Others' : ''}` : `'${movieList[0]}'`} Signal${movieCount === 1 ? 's' : ''} the [Trend Name] Revolution"

2. **The Grey Verdict (Top Block):** A 3-sentence summary ${movieCount === 1 ? '+ Score' : '+ Collective insight'}.
   * Format: ${movieCount === 1 ? '"GreyBrainer Score: [X]/10. [The Verdict text in 3 punchy sentences]."' : '"Collective Insight: [3 punchy sentences about what these films reveal together]."'}

3. **The Narrative Body (3 Core Sections):**
   * **Section 1: The Case Study** - Analyze ${movieDisplay} as proof of the trend. What specific elements (story/performance/direction) demonstrate this shift? ${movieCount > 1 ? 'Use each film to highlight different aspects.' : ''}
   * **Section 2: The Trend Analysis** - Zoom out. Explain why ${trendAngle} is happening NOW in Indian cinema. Market forces? Societal shifts? Audience fatigue?
   * **Section 3: The Morphokinetic Insight** - Connect the ${movieCount > 1 ? 'films\' craft' : 'film\'s craft'} (editing/pacing/cinematography) to audience psychology. How does the visual language support this trend?

4. **The Ecosystem Cross-Linking (Crucial):**
   * You **MUST** insert at least 2 "Thematic Bridges" to past GreyBrainer content.
   * Format: "This mirrors the [Theme] we analyzed in **[Past Movie Title]**, where we saw..."
   * If no past context provided, create hypothetical bridges that feel real (e.g., "Much like our analysis of courtroom dramas in 2025...")

5. **The Forecast:** End with a prediction. What happens if this trend continues? What backlash might emerge?

6. **The Lens Tag (For Website Integration):**
   * End with a structured metadata block for automation:
   \`\`\`
   [[LENS_NARRATIVE:
   🎬 **GreyBrain Lens: ${today}**
   1. The Feature: [Movie Name] leads the charge for [Trend Name]
   2. The Insight: Why [Trend Name] is reshaping Indian cinema
   3. The Link: [Suggest related topic for deeper dive]
   ]]
   \`\`\`

**OUTPUT TEMPLATE (Use this structure exactly):**

# [Headline: Provocative Statement + Movie + Trend]

## [Subtitle: A 1-sentence hook summarizing the cultural shift]

---

### 🏁 The Grey Verdict

**Score:** [X]/10 (only if analyzing specific film quality; omit if pure trend piece)
**The Takeaway:** [3 sentences. Is this a masterpiece of the genre, a cautionary tale, or a missed opportunity? Focus on the "Why" behind the trend.]

---

### 1. The Catalyst: ${movieDisplay}

*[Use specific story/performance elements from ${movieDisplay}. Don't recap the plot. Discuss what makes ${movieCount > 1 ? 'these films' : 'this film'} PROOF of ${trendAngle}. ${movieCount > 1 ? `Weave examples from each film: "${movieList[0]} shows X, while ${movieList[1]} demonstrates Y..."` : `Example: "When [Character] refuses to [Action], it's not just drama - it's a generational statement about [Societal Shift]..."`}]*

**Key Element:** [Identify the ONE scene/performance/choice ${movieCount > 1 ? 'across these films' : ''} that encapsulates the trend]

> **"Pull Quote":** *[Extract or synthesize a powerful quote from the film${movieCount > 1 ? 's' : ''} or about the film${movieCount > 1 ? 's' : ''} that captures ${movieCount > 1 ? 'their' : 'its'} essence]*

---

### 2. The Bigger Picture: ${trendAngle}

*[Zoom out from ${movieDisplay}. Explain the market/cultural shift happening in Indian cinema. Why is ${trendAngle} emerging NOW? What audience need is it fulfilling? What old paradigm is dying?]*

**Market Context:**
- What box office/OTT data supports this trend?
- Which demographic is driving this shift?
- How does this compare to Hollywood/global cinema trends?

**Societal Context:**
- What's happening in Indian society that makes this trend resonate?
- Is this a reaction to previous cinema trends? (e.g., backlash against jingoism → rise of anti-war films)

---

### 3. Thematic Bridges (GreyBrainer Ecosystem)

${pastEcosystemContext ? 
`*[Using the provided context, create at least 2 explicit connections. Do not use generic Medium/@GreyBrainer references if context is provided:]*

**Contrast Bridge:** "Unlike the [Approach] we saw in **[Past Analysis]**, ${movieDisplay} choose${movieCount === 1 ? 's' : ''} [Different Approach]. This shift signals..."

**Parallel Bridge:** "This echoes the [Theme] we first identified in **[Past Film/Article Title]**, where [Similar Pattern]..."

**Ecosystem Integration:** [If trending topics or suggestions were provided in the context, acknowledge them: "As noted in our recent database analysis about [Topic], ${movieDisplay} exemplif${movieCount === 1 ? 'ies' : 'y'} this exact pattern..."]` 
: 
`*[Create thematic bridges to hypothetical past analyses that feel authentic, focusing on the Greybrainer Insights database:]*

**Example Contrast:** "Unlike the loud spectacles we've analyzed recently in the Greybrainer database, ${movieDisplay} choose${movieCount === 1 ? 's' : ''} restraint - a bold bet in today's market."

**Example Parallel:** "This continues the pattern we identified in regional cinema's rise - authenticity over scale."`}

**The Pattern:** [Summarize the THROUGHLINE connecting ${movieDisplay} to past GreyBrainer analyses and the broader trend]

---

### 4. The Morphokinetic Forecast

*[Predict the future based on ${movieDisplay}'s success/failure and the ${trendAngle} trajectory. Be specific and bold.]*

**If This Trend Wins:**
- Expect [Genre/Theme] to dominate [Platform] by [Timeframe]
- Studios will greenlight [Type of Projects]
- Audiences will reject [Opposite Trend]

**The Backlash Watch:**
- [What counter-trend might emerge? Audience fatigue risks?]

**GreyBrainer's Call:** [Your editorial stance - are you betting on this trend or predicting its collapse?]

---

### 📹 Social Media Hook

*[Generate a 15-20 second Reel/Short script based on this editorial]*

> "${movieDisplay} ${movieCount === 1 ? 'isn\'t just a film' : 'aren\'t just films'} - ${movieCount === 1 ? 'it\'s' : 'they\'re'} proof that [Trend Angle] is the new power move in Indian cinema. [Provocative statement]. We called this shift in [Reference past analysis if available]. The future looks like [Prediction]. Are you ready? 🎬 #GreyBrainerVerdict"

---

**[[LENS_NARRATIVE:**
🎬 **GreyBrain Lens: ${today}**

**1. The Feature:** ${movieDisplay} lead${movieCount === 1 ? 's' : ''} the charge for ${trendAngle}
**2. The Insight:** Why ${trendAngle} is reshaping how Indian cinema tells stories
**3. The Link:** [Suggest a related topic/film for readers to explore next - could be from past ecosystem or hypothetical]
**]]**

---

**CRITICAL REMINDERS:**
* This is NOT a review - it's a cultural editorial using ${movieDisplay} as evidence
* Every claim must connect back to ${trendAngle}
* ${movieCount > 1 ? `Treat the ${movieCount} films as a cohesive argument, not separate reviews` : ''}
* Use actual industry examples, box office data, OTT trends where possible
* The "Grey" voice admits ambiguity - avoid absolute statements
* End with forward-looking insights, not just analysis of what was
* If newsletter context provided, extract trending topics and suggestions - use them as guidance
* Reference Medium blog https://medium.com/@GreyBrainer for ecosystem continuity

**Generate the Grey Verdict Editorial now, following the template exactly.**`;

  return runGeminiWithFallback(
    'Grey Verdict Editorial',
    prompt,
    {
      temperature: 0.88,
      maxOutputTokens: 3072
    },
    (responseText) => responseText.trim(),
    logTokenUsage
  );
};

// Personnel Analysis
export const analyzeStakeholderMagicFactor = async (
  name: string,
  type: 'Director' | 'Actor',
  logTokenUsage?: LogTokenUsageFn,
): Promise<{ analysisText: string; groundingSources?: GroundingChunkWeb[]; isFallbackResult?: boolean }> => {
  const prompt = `
Analyze the unique "Magic Factor" of ${type.toLowerCase()} ${name}.

Provide a comprehensive analysis (200-300 words) covering:
1. Signature style and distinctive approach
2. Notable works and career highlights
3. Unique contributions to cinema
4. What makes them stand out in the industry
5. Their impact on storytelling and filmmaking

Focus on what makes ${name} distinctive and valuable in the film industry.

Begin your analysis:
  `.trim();

  return runGeminiWithFallback(
    `Personnel Analysis: ${name}`,
    prompt,
    { temperature: 0.7 },
    (responseText, response) => {
      return {
        analysisText: responseText.trim(),
        groundingSources: extractGroundingSources(response) || [],
        isFallbackResult: false
      };
    },
    logTokenUsage,
    [{ googleSearch: {} }] // Enable Google Search for personnel analysis
  );
};

// Creative Spark Generation
export const generateCreativeSpark = async (
  genre: string,
  inspiration: string | undefined,
  logTokenUsage?: LogTokenUsageFn,
): Promise<CreativeSparkResult[]> => {
  const inspirationText = inspiration ? `Drawing inspiration from: ${inspiration}` : "";
  
  const prompt = `
You are a seasoned Hollywood story developer and screenwriter with expertise in creating commercially viable, critically acclaimed concepts. Your task is to generate 3 exceptional story ideas for the ${genre} genre. ${inspirationText}

**Quality Standards:**
- Each concept should feel like it could be pitched to major studios or streaming platforms
- Demonstrate deep understanding of genre conventions while offering fresh perspectives
- Create concepts that balance commercial appeal with artistic merit
- Ensure each idea has clear dramatic stakes and emotional resonance
- Avoid clichéd or overdone concepts unless you're subverting them cleverly

**Research Context:**
Consider successful ${genre} films/shows from the past decade. What made them work? How can you innovate within established frameworks? Think about current cultural zeitgeist and audience interests.

For each idea, provide:

1. **Logline**: A compelling, marketable one-sentence summary (25-40 words) that immediately hooks the reader
2. **Synopsis**: A detailed expansion (100-150 words) that reveals the story's unique angle and emotional core
3. **Character Ideas**: 2-3 main characters with specific, memorable traits and clear motivations
4. **Scene Ideas**: 2-3 key scenes that would be visually striking and emotionally powerful
5. **Mind Map**: Provide a mindMapMarkdown string using Markdown for a hierarchical mind map.

**Execution Guidelines:**
- Make each idea distinctly different from the others
- Focus on specific, concrete details rather than generic descriptions
- Ensure strong protagonist agency and clear character arcs
- Include elements that would translate well to visual media
- Consider both domestic and international market appeal

Format each idea as:
**IDEA [NUMBER]:**
Logline: [compelling, specific logline]
Synopsis: [detailed, engaging synopsis]
Characters:
- [Character 1]: [specific name and detailed description with motivation]
- [Character 2]: [specific name and detailed description with motivation]
Key Scenes:
- [Scene 1]: [specific, visual scene description]
- [Scene 2]: [specific, visual scene description]
Mind Map:
[comprehensive mind map markdown]

Begin generating professional-quality story concepts:
  `.trim();

  try {
    const model = getGeminiAI().getGenerativeModel({ 
      model: getSelectedGeminiModel(),
      generationConfig: {
        temperature: 0.8
      }
    });
    const response = await model.generateContent(prompt);
    const responseText = response.response.text().trim();
    logTokenUsage?.('Creative Spark Generation (Gemini)', prompt.length, responseText.length);
    
    // Parse the response into individual ideas
    const ideas: CreativeSparkResult[] = [];
    const ideaMatches = responseText.match(/\*\*IDEA \d+:\*\*[\s\S]*?(?=\*\*IDEA \d+:\*\*|$)/g);
    
    if (ideaMatches) {
      ideaMatches.forEach((ideaText, index) => {
        const loglineMatch = ideaText.match(/Logline:\s*([^\n]+)/i);
        const synopsisMatch = ideaText.match(/Synopsis:\s*([^\n]+(?:\n[^\n]+)*?)(?=Characters:|$)/i);
        const charactersMatch = ideaText.match(/Characters:\s*([\s\S]*?)(?=Key Scenes:|$)/i);
        const scenesMatch = ideaText.match(/Key Scenes:\s*([\s\S]*?)(?=Mind Map:|$)/i);
        const mindMapMatch = ideaText.match(/Mind Map:\s*([\s\S]*?)(?=\*\*IDEA|$)/i);
        
        if (loglineMatch && synopsisMatch) {
          const characterIdeas: CharacterIdea[] = [];
          const sceneIdeas: SceneIdea[] = [];
          
          if (charactersMatch) {
            const charLines = charactersMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
            charLines.forEach(line => {
              const charMatch = line.match(/-\s*([^:]+):\s*(.+)/);
              if (charMatch) {
                characterIdeas.push({
                  name: charMatch[1].trim(),
                  description: charMatch[2].trim()
                });
              }
            });
          }
          
          if (scenesMatch) {
            const sceneLines = scenesMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
            sceneLines.forEach(line => {
              const sceneMatch = line.match(/-\s*([^:]+):\s*(.+)/);
              if (sceneMatch) {
                sceneIdeas.push({
                  title: sceneMatch[1].trim(),
                  description: sceneMatch[2].trim()
                });
              }
            });
          }
          
          ideas.push({
            id: `idea-${Date.now()}-${index}`,
            logline: loglineMatch[1].trim(),
            synopsis: synopsisMatch[1].trim(),
            characterIdeas,
            sceneIdeas,
            mindMapMarkdown: mindMapMatch ? mindMapMatch[1].trim() : undefined,
            isFallbackResult: false
          });
        }
      });
    }
    
    return ideas.length > 0 ? ideas : [{
      id: `fallback-${Date.now()}`,
      logline: "Creative spark generation encountered an issue",
      synopsis: "Unable to parse generated ideas properly",
      characterIdeas: [],
      sceneIdeas: [],
      isFallbackResult: true
    }];
    
  } catch (error) {
    console.error('Gemini API error generating creative spark:', error);
    handleGeminiError(error as Error, 'Creative Spark Generation');
    throw new Error('Unexpected error in creative spark generation');
  }
};

// Movie Morphokinetics Analysis
export const analyzeMovieMorphokinetics = async (
  movieTitle: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<MorphokineticsAnalysis> => {
  // Get current date for release validation
  const { currentYear } = getDynamicDateRange();
  
  const prompt = `
Analyze the "Morphokinetics" (dynamic flow and emotional journey) of the movie "${movieTitle}".

Current year: ${currentYear}

IMPORTANT: When analyzing this movie, consider its actual release status:
- Content from ${currentYear} and earlier should be considered released/available
- Only mark content as "unreleased" or "upcoming" if you have specific knowledge of a future release date
- Do not assume all recent content is unreleased
- Use the current year (${currentYear}) as the reference point for determining release status

Provide:

1. **Overall Summary** (200-250 words): Describe the film's pacing, emotional rhythm, and how tension/energy builds and releases throughout.

2. **Timeline Structure Notes** (100-150 words): Analyze the narrative structure - is it linear, non-linear, uses flashbacks, multiple timelines, etc.?

3. **Key Moments** (10-15 moments): Identify pivotal moments that define the film's emotional and narrative flow. For each moment, provide:
   - Time position (0.0 = beginning, 1.0 = end)
   - Intensity score (0-10)
   - Emotional valence (-1 to 1)
   - Dominant emotion
   - Event description
   - Whether it's a twist or pacing shift

Format your response as:
**OVERALL SUMMARY:**
[Your summary]

**TIMELINE STRUCTURE:**
[Your analysis]

**KEY MOMENTS:**
1. Time: [0.0-1.0] | Intensity: [0-10] | Valence: [-1 to 1] | Emotion: [emotion] | Twist: [yes/no] | Pacing: [yes/no] | Description: [description]
2. Time: [0.0-1.0] | Intensity: [0-10] | Valence: [-1 to 1] | Emotion: [emotion] | Twist: [yes/no] | Pacing: [yes/no] | Description: [description]
[Continue for all moments]

Begin your analysis:
  `.trim();

  return runGeminiWithFallback(
    'Morphokinetics Analysis',
    prompt,
    { temperature: 0.7 },
    (responseText) => {
      // Parse the response
      const summaryMatch = responseText.match(/\*\*OVERALL SUMMARY:\*\*\s*([\s\S]*?)(?=\*\*TIMELINE STRUCTURE:\*\*|$)/i);
      const timelineMatch = responseText.match(/\*\*TIMELINE STRUCTURE:\*\*\s*([\s\S]*?)(?=\*\*KEY MOMENTS:\*\*|$)/i);
      const momentsMatch = responseText.match(/\*\*KEY MOMENTS:\*\*\s*([\s\S]*?)$/i);
      
      const keyMoments: any[] = [];
      
      if (momentsMatch) {
        const momentLines = momentsMatch[1].split('\n').filter(line => line.trim().match(/^\d+\./));
        
        momentLines.forEach(line => {
          const match = line.match(/Time:\s*([\d.]+)\s*\|\s*Intensity:\s*(\d+)\s*\|\s*Valence:\s*([-\d.]+)\s*\|\s*Emotion:\s*([^|]+)\s*\|\s*Twist:\s*([^|]+)\s*\|\s*Pacing:\s*([^|]+)\s*\|\s*Description:\s*(.+)/i);
          
          if (match) {
            keyMoments.push({
              time: parseFloat(match[1]),
              intensityScore: parseInt(match[2]),
              emotionalValence: parseFloat(match[3]),
              dominantEmotion: match[4].trim(),
              isTwist: match[5].trim().toLowerCase() === 'yes',
              isPacingShift: match[6].trim().toLowerCase() === 'yes',
              eventDescription: match[7].trim()
            });
          }
        });
      }
      
      return {
        overallSummary: summaryMatch ? summaryMatch[1].trim() : 'Analysis could not be parsed properly.',
        timelineStructureNotes: timelineMatch ? timelineMatch[1].trim() : 'Timeline analysis not available.',
        keyMoments,
        isFallbackResult: false
      };
    },
    logTokenUsage
  );
};

// Movie Matching Functions
export const findMovieMatches = async (
  userInput: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string[]> => {
  const { currentYear, previousYear, twoYearsAgo } = getDynamicDateRange();
  
  const prompt = `
You are an expert film database consultant with comprehensive knowledge of:
- Latest Bollywood/Hindi cinema (${twoYearsAgo}-${currentYear}) and current releases
- Recent Regional Indian cinema (Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, etc.)
- Current Hollywood and international English-language films (${previousYear}-${currentYear})
- Latest popular TV series and web series (Netflix, Amazon Prime, Disney+, Hotstar, etc.)
- ${currentYear} new releases, trending movies, and current box office hits
- Film transliterations and alternate spellings

User input: "${userInput}"

Current Date: ${currentYear}

Find and suggest the most likely movie/series matches for this input. **PRIORITIZE ${currentYear} RELEASES AND CURRENT FILMS** but also include relevant classics if they match well.

**RELEASE STATUS GUIDANCE:** 
- Only mark content as "unreleased" or "upcoming" if you have specific knowledge of a future release date
- Assume content from ${currentYear} and earlier is available/released unless you know otherwise
- For ${currentYear} content, indicate if it's released or upcoming based on your knowledge
- Do NOT assume all recent content is unreleased

**Matching Strategies:**
- Exact title matches (prioritize recent releases)
- Phonetic similarities and common misspellings
- Transliteration variations (e.g., "Baahubali" vs "Bahubali")
- English translations of foreign titles
- Alternate release titles (regional vs international)
- Popular abbreviations or nicknames
- Series vs movie variations (e.g., "KGF" could be "KGF: Chapter 1" or "KGF: Chapter 2")
- Recent sequels, prequels, and franchise entries

**Regional Considerations:**
- Include both original language titles and English translations
- Consider year variations for remakes or sequels
- Account for different romanization systems
- Include popular streaming platform titles and OTT releases
- Focus on current trending and recently released content

**Output Format:**
Provide 8-12 most likely matches as a numbered list, ordered by relevance (recent films first):

1. [Most likely recent/current match]
2. [Close recent phonetic match]
3. [Recent alternate spelling/transliteration]
...

Focus on real, existing movies and series. **Strongly prioritize ${previousYear}-${currentYear} releases and current year films** and currently popular titles. Include release years when helpful for disambiguation.

Begin matching:
  `.trim();

  return runGeminiWithFallback(
    'Movie Name Matching',
    prompt,
    { temperature: 0.3 },
    (responseText) => {
      // Parse the numbered list with improved regex
      const matches: string[] = [];
      const lines = responseText.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        // More flexible parsing to handle various numbering formats
        const match = line.match(/^\s*\d+[.)\s]+(.+)$/) || line.match(/^\s*[-*•]\s*(.+)$/);
        if (match && match[1]) {
          const title = match[1].trim().replace(/["']/g, ''); // Remove quotes
          if (title.length > 0 && title.length < 100) { // Reasonable title length
            matches.push(title);
          }
        }
      });
      
      return matches.length > 0 ? matches.slice(0, 12) : [userInput];
    },
    logTokenUsage
  );
};


// Greybrainer Comparison Analysis
export const generateGreybrainerComparisonWithGemini = async (
  item1: { title: string; type: string; description?: string },
  item2: { title: string; type: string; description?: string },
  logTokenUsage?: LogTokenUsageFn,
): Promise<string> => {
  // Get current date for release validation
  const { currentYear, currentDate } = getDynamicDateRange();
  
  const prompt = `
    You are a film and media expert conducting a detailed comparative analysis using the "Greybrainer" methodology.
    
    Current Date: ${currentDate}
    
    Compare these two items:
    
    **Item 1:**
    - Type: ${item1.type}
    - Title/Name: "${item1.title}"
    ${item1.description ? `- Additional Context: ${item1.description}` : ''}
    
    **Item 2:**
    - Type: ${item2.type}
    - Title/Name: "${item2.title}"
    ${item2.description ? `- Additional Context: ${item2.description}` : ''}
    
    IMPORTANT: When analyzing these items, consider their actual release status relative to TODAY (${currentDate}):
    - Content released in ${currentYear} or earlier is RELEASED.
    - Do NOT label items as "unreleased" or "in production" if they would have been released by ${currentDate}.
    - If the user is asking to compare them, assume they are both available for analysis unless one is explicitly a future project (e.g., scheduled for ${currentYear + 1}).
    - Use your creative capabilities to analyze them as finished works if they are from the current year.
    
    Provide a comprehensive comparative analysis (400-600 words) structured as follows:
    
    **Overview & Context**
    Brief introduction to both items and the basis for comparison.
    
    **Key Similarities**
    - Identify 3-4 significant commonalities (themes, style, approach, impact, etc.)
    - Explain why these similarities matter
    
    **Notable Differences**
    - Highlight 3-4 major distinctions (creative choices, execution, audience, cultural impact, etc.)
    - Analyze how these differences affect their respective impacts
    
    **Creative Approaches**
    Compare their unique creative methodologies, storytelling techniques, or artistic vision.
    
    **Cultural & Industry Impact**
    Discuss their respective influences on audiences, industry trends, or cultural conversations.
    
    **Greybrainer Assessment**
    Which demonstrates more innovative storytelling or creative risk-taking? Provide reasoning.
    
    **Conclusion**
    Synthesize the comparison with insights about what each brings to the medium and their lasting significance.
    
    Use your search capabilities to gather accurate information about both items. Maintain an analytical, balanced tone while highlighting what makes each unique and valuable.
  `;

  return runGeminiWithFallback(
    'Greybrainer Comparison Analysis',
    prompt,
    {
      temperature: 0.7,
      topP: 0.85,
      topK: 60,
    },
    (responseText) => responseText.trim(),
    logTokenUsage
  );
};

export const generateDetailedReportFromInsightWithGemini = async (
  insightText: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string> => {
  const prompt = `
    You are a senior research analyst for Greybrainer AI, specializing in film and media trends.
    The following concise insight has been generated:
    "Insight: ${insightText}"

    Your task is to expand this concise insight into a detailed research report of approximately 400-600 words.
    The report should be well-structured, insightful, and suitable for industry professionals (filmmakers, producers, analysts).
    Use your search capabilities (Google Search) to gather relevant supporting information, examples, data points (if available and verifiable), or case studies to substantiate and elaborate on the insight.

    Structure your report with clear sections. Consider including:
    1.  **Introduction:** Briefly restate the core insight and its significance.
    2.  **Elaboration & Context:** Dive deeper into the trend mentioned in the insight. What are its driving factors? How has it evolved?
    3.  **Key Aspects & Manifestations:** Describe how this trend is currently manifesting in the industry. Provide specific examples of films, technologies, platforms, or audience behaviors if applicable.
    4.  **Implications & Impact:** Discuss the potential positive and negative implications of this trend for creators, the industry, and audiences.
    5.  **Challenges & Opportunities:** What challenges does this trend present? What new opportunities does it open up?
    6.  **Future Outlook / Questions for Further Research:** Briefly speculate on the future trajectory of this trend and identify any open questions or areas ripe for further investigation.
    7.  **Conclusion:** Summarize the main points and offer a final thought.

    Maintain a professional, analytical, and objective tone. While data can be illustrative, prioritize credible information.
    The output should be the full text of the report. Format with clear paragraph breaks. You can use simple headings for sections if it improves readability (e.g., "## Introduction"), but avoid complex markdown.
  `;
  return runGeminiWithFallback(
    'Detailed Insight Report Generation',
    prompt,
    {
      temperature: 0.7,
      topP: 0.85,
      topK: 60,
    },
    (responseText) => responseText.trim(),
    logTokenUsage
  );
};

// Simple movie title suggestions using Gemini API
export const searchMovies = async (
  query: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<MovieSuggestion[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const { currentDate, currentYear, previousYear } = getDynamicDateRange();

  const prompt = `
You are a movie database assistant. The user is searching for: "${query}"
Current Date: ${currentDate}

List up to 5 movies or TV series that match this query.
CONTEXT: The user is primarily interested in Indian cinema (Bollywood, Tollywood, etc.) and recent global releases. If the title is ambiguous, prioritize Indian movies or recent releases from late ${previousYear}/${currentYear}.

IMPORTANT: Use your Google Search tool to find the most up-to-date information, especially for movies released in the last few months.

For each match, provide:
- Title
- Year of release
- Director (or Creator for series)
- Type (Movie or Series)
- A very brief one-line description (max 10 words) to help identify it.

Format the output as a JSON array of objects.
Example JSON format:
[
  { "title": "Avatar", "year": "2009", "director": "James Cameron", "type": "Movie", "description": "Paraplegic Marine on alien planet Pandora." },
  { "title": "Avatar: The Last Airbender", "year": "2005", "director": "Michael Dante DiMartino", "type": "Series", "description": "Aang must master four elements." }
]

Ensure the JSON is valid. Do not include markdown formatting like \`\`\`json.
  `.trim();

  return runGeminiWithFallback(
    'Movie Search',
    prompt,
    { temperature: 0.3 },
    (responseText) => {
      // Extract JSON from response - model may wrap in markdown or return plain JSON
      let cleanJson = responseText.trim();
      
      // Try to extract JSON from markdown code blocks
      const jsonBlockMatch = cleanJson.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonBlockMatch) {
        cleanJson = jsonBlockMatch[1];
      } else {
        // Try to find raw JSON array
        const jsonArrayMatch = cleanJson.match(/\[[\s\S]*\]/);
        if (jsonArrayMatch) {
          cleanJson = jsonArrayMatch[0];
        }
      }
      
      try {
        const suggestions: MovieSuggestion[] = JSON.parse(cleanJson.trim());
        return suggestions;
      } catch (e) {
        console.error('Failed to parse search JSON:', e);
        throw e; // Let runGeminiWithFallback handle retry/fallback
      }
    },
    logTokenUsage,
    [{ googleSearch: {} }] as any[]
  ).catch(async () => {
    // Custom catch for searchMovies to provide its own fallback to suggestMovieTitles
    try {
      const simpleSuggestions = await suggestMovieTitles(query, logTokenUsage);
      return simpleSuggestions.map(s => ({ title: s }));
    } catch (e) {
      return [];
    }
  });
};

const extractFirstJsonValue = (text: string): string | null => {
  const input = text.trim();
  const starts: Array<'{' | '['> = ['{', '['];
  const startIndexes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const ch = input[i] as '{' | '[' | string;
    if (starts.includes(ch as any)) startIndexes.push(i);
  }

  for (const start of startIndexes) {
    const stack: string[] = [];
    let inString = false;
    let escape = false;
    const startCh = input[start];
    stack.push(startCh === '{' ? '}' : ']');

    for (let i = start + 1; i < input.length; i++) {
      const ch = input[i];

      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') {
        stack.push('}');
        continue;
      }
      if (ch === '[') {
        stack.push(']');
        continue;
      }

      const expectedClose = stack[stack.length - 1];
      if (expectedClose && ch === expectedClose) {
        stack.pop();
        if (stack.length === 0) {
          return input.slice(start, i + 1);
        }
      }
    }
  }

  return null;
};

const extractJsonPayloadFromModelText = (responseText: string): string => {
  let cleaned = responseText.trim();
  
  // Try to extract from markdown fences first
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    cleaned = fenced[1].trim();
  }
  
  // Ensure the string ends properly - sometimes the model cuts off the final closing brace/bracket
  const lastBraceIndex = cleaned.lastIndexOf('}');
  const lastBracketIndex = cleaned.lastIndexOf(']');
  
  if (lastBraceIndex > -1 || lastBracketIndex > -1) {
    const lastIndex = Math.max(lastBraceIndex, lastBracketIndex);
    cleaned = cleaned.substring(0, lastIndex + 1);
  }

  // Fallback to strict extractor if needed
  const extracted = extractFirstJsonValue(cleaned);
  return (extracted ?? cleaned).trim();
};

/**
 * Generate an SEO Optimized Daily Newsletter with Narrative Continuity
 * Uses Google Search Grounding for live trends and RAG context for memory.
 */
export const generateDailyNewsletter = async (
  pastContentContext: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<{ title: string, themes: string, content: string, suggestedReviews: MovieSuggestion[], suggestedResearchTopics: string[] }> => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  
  const prompt = `**ROLE**
You are the Editor-in-Chief for the @GreyBrainer Daily Newsletter. Your readers are cinephiles and industry professionals who value "Morphokinetic" analysis, vulnerability, and deep cultural insights into Indian and global cinema.

**OBJECTIVE**
Write today's edition of the daily newsletter (${today}). It must be SEO-optimized, highly engaging, and form a continuous narrative with our past dispatches. 

**LIVE GOOGLE SEARCH REQUIREMENT**
Search Google right now to find:
1. What are the top 3 trending stories in the Indian cinema ecosystem today?
2. What notable movies or web series are releasing this week or later this month?

**RAG CONTEXT (WHAT WE WROTE RECENTLY)**
Here is the context of what we've written over the past 7 days:
${pastContentContext}
*(Note: If the past context mentions a movie or trend, DO NOT repeat the same analysis. Instead, build upon it extending the narrative.)*

**OUTPUT STRUCTURE**
Your output MUST be a JSON object with this exact structure (no markdown code blocks, just raw JSON):
{
  "title": "[Catchy, SEO-Friendly Newsletter Title]",
  "themes": "[Comma-separated SEO keywords/themes covered in this issue]",
  "content": "[The full newsletter content in clean Markdown string]",
  "suggestedReviews": [
    {
      "title": "Movie or Series Title",
      "year": "YYYY (optional)",
      "type": "Movie|Series (optional)",
      "description": "1 sentence: why this is worth a deeper Greybrainer review this week"
    }
  ],
  "suggestedResearchTopics": [
    "Short research angle/topic phrased as a headline"
  ]
}

**THE NEWSLETTER CONTENT FORMAT (Markdown)**
# [The H1 Title Again]
*(Start with a vulnerable, personal, or punchy 2-sentence hook that acknowledges what day/week it is and sets the thematic tone)*

## 📰 The Ecosystem Pulse
*(Synthesize the top news you found via Google Search. Group it into a single cohesive narrative rather than just listing news. Explain the "Grey Area" or why this news matters to the industry's evolution.)*

## 🔗 The Narrative Thread
*(This is where you MUST interlink with our past content. Create a thematic bridge between today's news and what we wrote in the RAG Context.)*

## 🍿 On The Horizon
*(Highlight one upcoming release found via your search. Provide a brief "Grey Anticipation" - not just what it is, but what it represents for the genre or the lead actor's career trajectory.)*

## 🔮 The Grey Verdict & Question
*(End with a bold take on today's landscape and pose a thought-provoking question to the readers to drive engagement/comments.)*

**CRITICAL CONSTRAINTS:**
- **FACTUAL ACCURACY:** Do not hallucinate. Only report news, trends, and release dates that you have explicitly verified using the Google Search tool. If the search results are ambiguous, be honest about the uncertainty.
- **Zero Repetition:** Do not re-explain concepts we covered in the Past Context. 
- **SEO Optimization:** Naturally weave the keywords into the H2 headers and body text.
- **Skimmability:** Use bullet points, bold text for emphasis.
- **Strict JSON:** You must output ONLY valid JSON, parseable by JSON.parse().`;

  return runGeminiWithFallback(
    'Daily Newsletter Engine',
    prompt,
    {
      temperature: 0.7,
      maxOutputTokens: 4000
    },
    (responseText) => {
      try {
        const jsonStr = extractJsonPayloadFromModelText(responseText);
        const parsed = JSON.parse(jsonStr) as {
          title?: unknown;
          themes?: unknown;
          content?: unknown;
          suggestedReviews?: unknown;
          suggestedResearchTopics?: unknown;
        };
        if (typeof parsed?.title !== 'string' || typeof parsed?.themes !== 'string' || typeof parsed?.content !== 'string') {
          throw new Error('Newsletter JSON missing required string fields');
        }
        const suggestedReviews: MovieSuggestion[] = Array.isArray(parsed?.suggestedReviews)
          ? (parsed.suggestedReviews as any[])
              .filter((m) => m && typeof m === 'object')
              .map((m) => ({
                title: typeof (m as any).title === 'string' ? (m as any).title.trim() : '',
                year: typeof (m as any).year === 'string' ? (m as any).year.trim() : undefined,
                director: typeof (m as any).director === 'string' ? (m as any).director.trim() : undefined,
                type: (m as any).type === 'Movie' || (m as any).type === 'Series' ? (m as any).type : undefined,
                description: typeof (m as any).description === 'string' ? (m as any).description.trim() : undefined,
              }))
              .filter((m) => typeof m.title === 'string' && m.title.length > 0)
          : [];

        const suggestedResearchTopics: string[] = Array.isArray(parsed?.suggestedResearchTopics)
          ? (parsed.suggestedResearchTopics as any[])
              .filter((t) => typeof t === 'string' && t.trim().length > 0)
              .map((t) => (t as string).trim())
          : [];

        return {
          title: parsed.title,
          themes: parsed.themes,
          content: parsed.content,
          suggestedReviews,
          suggestedResearchTopics,
        };
      } catch (e) {
        console.error('Failed to parse Daily Newsletter JSON', e, responseText);
        throw new Error('Failed to generate proper newsletter format. Please try again.');
      }
    },
    logTokenUsage,
    [{ googleSearch: {} }] as any[]
  );
};

export const extractNewsletterSuggestionsFromContent = async (
  newsletter: { title?: string; themes?: string; content: string },
  logTokenUsage?: LogTokenUsageFn,
): Promise<{ suggestedReviews: MovieSuggestion[]; suggestedResearchTopics: string[] }> => {
  const prompt = `You are an editorial assistant for @GreyBrainer.

Given the newsletter content below, extract:
1) Suggested movies/series to review next (title + optional year/type + 1 sentence why).
2) Suggested research topics (headline-style).

OUTPUT MUST be valid JSON only (no markdown fences) with exactly:
{
  "suggestedReviews": [
    { "title": "string", "year": "YYYY (optional)", "type": "Movie|Series (optional)", "description": "string (optional)" }
  ],
  "suggestedResearchTopics": ["string"]
}

NEWSLETTER TITLE: ${newsletter.title || ''}
THEMES/SEO: ${newsletter.themes || ''}
CONTENT (markdown):
${newsletter.content.substring(0, 12000)}
`;

  return runGeminiWithFallback(
    'Newsletter Suggestions Extraction',
    prompt,
    { temperature: 0.2, maxOutputTokens: 2048 },
    (responseText) => {
      const jsonStr = extractJsonPayloadFromModelText(responseText);
      const parsed = JSON.parse(jsonStr) as {
        suggestedReviews?: unknown;
        suggestedResearchTopics?: unknown;
      };

      const suggestedReviews: MovieSuggestion[] = Array.isArray(parsed?.suggestedReviews)
        ? (parsed.suggestedReviews as any[])
            .filter((m) => m && typeof m === 'object')
            .map((m) => ({
              title: typeof (m as any).title === 'string' ? (m as any).title.trim() : '',
              year: typeof (m as any).year === 'string' ? (m as any).year.trim() : undefined,
              director: typeof (m as any).director === 'string' ? (m as any).director.trim() : undefined,
              type: (m as any).type === 'Movie' || (m as any).type === 'Series' ? (m as any).type : undefined,
              description: typeof (m as any).description === 'string' ? (m as any).description.trim() : undefined,
            }))
            .filter((m) => typeof m.title === 'string' && m.title.length > 0)
        : [];

      const suggestedResearchTopics: string[] = Array.isArray(parsed?.suggestedResearchTopics)
        ? (parsed.suggestedResearchTopics as any[])
            .filter((t) => typeof t === 'string' && t.trim().length > 0)
            .map((t) => (t as string).trim())
        : [];

      return { suggestedReviews, suggestedResearchTopics };
    },
    logTokenUsage
  );
};

export const generateDistributionPackForNewsletter = async (
  newsletter: { title: string; themes: string; content: string; suggestedReviews?: MovieSuggestion[]; suggestedResearchTopics?: string[] },
  logTokenUsage?: LogTokenUsageFn,
): Promise<DistributionPack> => {
  const prompt = `You are a distribution specialist for @GreyBrainer.

Your job: convert the content below into a complete SEO + social distribution pack that drives momentum.

INPUT:
- Title: ${newsletter.title}
- Themes/SEO keywords: ${newsletter.themes}
- Suggested Reviews: ${(newsletter.suggestedReviews || []).map(m => (m.year ? `${m.title} (${m.year})` : m.title)).join(', ')}
- Suggested Research Topics: ${(newsletter.suggestedResearchTopics || []).join(' | ')}
- Content (markdown excerpt): ${newsletter.content.substring(0, 3500)}

OUTPUT REQUIREMENTS:
- Output MUST be valid JSON only (no markdown fences).
- Keep everything actionable and short, optimized for shareability + search.
- Use IST time windows in bestTimeLocal (e.g. "09:00-11:00 IST").

OUTPUT JSON SHAPE:
{
  "primaryKeyword": "string",
  "secondaryKeywords": ["string"],
  "longTailQueries": ["string"],
  "slug": "string",
  "metaTitle": "string",
  "metaDescription": "string",
  "headlines": ["string"],
  "twitterThread": ["string"],
  "linkedinPost": "string",
  "instagramCaption": "string",
  "hashtags": ["#tag"],
  "quoteCards": ["string"],
  "internalLinksPlan": ["string"],
  "postingPlan": [
    { "platform": "Medium|LinkedIn|X|Instagram|YouTube|Newsletter|Other", "postType": "string", "copy": "string", "bestTimeLocal": "string", "goal": "string" }
  ]
}`;

  return runGeminiWithFallback(
    `Distribution Pack (Newsletter): ${newsletter.title}`,
    prompt,
    { temperature: 0.4, maxOutputTokens: 2048 },
    (responseText) => {
      const jsonStr = extractJsonPayloadFromModelText(responseText);
      const parsed = JSON.parse(jsonStr) as Partial<DistributionPack>;

      const toStringArray = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => (x as string).trim()).filter(Boolean) : [];

      const postingPlan = Array.isArray((parsed as any).postingPlan) ? (parsed as any).postingPlan : [];
      const normalizedPostingPlan = postingPlan
        .filter((p: any) => p && typeof p === 'object')
        .map((p: any) => ({
          platform: p.platform,
          postType: typeof p.postType === 'string' ? p.postType.trim() : '',
          copy: typeof p.copy === 'string' ? p.copy.trim() : '',
          bestTimeLocal: typeof p.bestTimeLocal === 'string' ? p.bestTimeLocal.trim() : '',
          goal: typeof p.goal === 'string' ? p.goal.trim() : '',
        }))
        .filter((p: any) => typeof p.platform === 'string' && p.platform && p.postType && p.copy);

      const pack: DistributionPack = {
        primaryKeyword: typeof parsed.primaryKeyword === 'string' ? parsed.primaryKeyword.trim() : '',
        secondaryKeywords: toStringArray(parsed.secondaryKeywords),
        longTailQueries: toStringArray(parsed.longTailQueries),
        slug: typeof parsed.slug === 'string' ? parsed.slug.trim() : '',
        metaTitle: typeof parsed.metaTitle === 'string' ? parsed.metaTitle.trim() : '',
        metaDescription: typeof parsed.metaDescription === 'string' ? parsed.metaDescription.trim() : '',
        headlines: toStringArray(parsed.headlines),
        twitterThread: toStringArray(parsed.twitterThread),
        linkedinPost: typeof parsed.linkedinPost === 'string' ? parsed.linkedinPost.trim() : '',
        instagramCaption: typeof parsed.instagramCaption === 'string' ? parsed.instagramCaption.trim() : '',
        hashtags: toStringArray(parsed.hashtags),
        quoteCards: toStringArray(parsed.quoteCards),
        internalLinksPlan: toStringArray(parsed.internalLinksPlan),
        postingPlan: normalizedPostingPlan as any,
      };

      if (!pack.primaryKeyword || !pack.slug || !pack.metaTitle || !pack.metaDescription) {
        console.warn('Distribution pack missing fields, falling back to defaults:', pack);
        // Fallback defaults so it doesn't crash the UI
        pack.primaryKeyword = pack.primaryKeyword || 'Greybrainer Analysis';
        pack.slug = pack.slug || 'greybrainer-analysis-' + Date.now();
        pack.metaTitle = pack.metaTitle || 'Greybrainer Strategic Insight';
        pack.metaDescription = pack.metaDescription || 'Strategic insights and analysis from Greybrainer AI.';
      }
      return pack;
    },
    logTokenUsage
  );
};

export const generateDistributionPackForResearch = async (
  trendInput: { trendingTopics: string; researchReport: string },
  logTokenUsage?: LogTokenUsageFn,
): Promise<DistributionPack> => {
  const prompt = `You are a distribution specialist for @GreyBrainer.

Turn the research report into an SEO + social distribution pack. The aim is momentum: one core post, then follow-ups and repurposed social content.

INPUT:
- Trending Topics: ${trendInput.trendingTopics.substring(0, 1800)}
- Research Report excerpt: ${trendInput.researchReport.substring(0, 4000)}

OUTPUT REQUIREMENTS:
- Output MUST be valid JSON only (no markdown fences).
- Use IST time windows in bestTimeLocal (e.g. "09:00-11:00 IST").

OUTPUT JSON SHAPE:
{
  "primaryKeyword": "string",
  "secondaryKeywords": ["string"],
  "longTailQueries": ["string"],
  "slug": "string",
  "metaTitle": "string",
  "metaDescription": "string",
  "headlines": ["string"],
  "twitterThread": ["string"],
  "linkedinPost": "string",
  "instagramCaption": "string",
  "hashtags": ["#tag"],
  "quoteCards": ["string"],
  "internalLinksPlan": ["string"],
  "postingPlan": [
    { "platform": "Medium|LinkedIn|X|Instagram|YouTube|Newsletter|Other", "postType": "string", "copy": "string", "bestTimeLocal": "string", "goal": "string" }
  ]
}`;

  return runGeminiWithFallback(
    `Distribution Pack (Research)`,
    prompt,
    { temperature: 0.4, maxOutputTokens: 2048 },
    (responseText) => {
      const jsonStr = extractJsonPayloadFromModelText(responseText);
      const parsed = JSON.parse(jsonStr) as Partial<DistributionPack>;

      const toStringArray = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => (x as string).trim()).filter(Boolean) : [];

      const postingPlan = Array.isArray((parsed as any).postingPlan) ? (parsed as any).postingPlan : [];
      const normalizedPostingPlan = postingPlan
        .filter((p: any) => p && typeof p === 'object')
        .map((p: any) => ({
          platform: p.platform,
          postType: typeof p.postType === 'string' ? p.postType.trim() : '',
          copy: typeof p.copy === 'string' ? p.copy.trim() : '',
          bestTimeLocal: typeof p.bestTimeLocal === 'string' ? p.bestTimeLocal.trim() : '',
          goal: typeof p.goal === 'string' ? p.goal.trim() : '',
        }))
        .filter((p: any) => typeof p.platform === 'string' && p.platform && p.postType && p.copy);

      const pack: DistributionPack = {
        primaryKeyword: typeof parsed.primaryKeyword === 'string' ? parsed.primaryKeyword.trim() : '',
        secondaryKeywords: toStringArray(parsed.secondaryKeywords),
        longTailQueries: toStringArray(parsed.longTailQueries),
        slug: typeof parsed.slug === 'string' ? parsed.slug.trim() : '',
        metaTitle: typeof parsed.metaTitle === 'string' ? parsed.metaTitle.trim() : '',
        metaDescription: typeof parsed.metaDescription === 'string' ? parsed.metaDescription.trim() : '',
        headlines: toStringArray(parsed.headlines),
        twitterThread: toStringArray(parsed.twitterThread),
        linkedinPost: typeof parsed.linkedinPost === 'string' ? parsed.linkedinPost.trim() : '',
        instagramCaption: typeof parsed.instagramCaption === 'string' ? parsed.instagramCaption.trim() : '',
        hashtags: toStringArray(parsed.hashtags),
        quoteCards: toStringArray(parsed.quoteCards),
        internalLinksPlan: toStringArray(parsed.internalLinksPlan),
        postingPlan: normalizedPostingPlan as any,
      };

      if (!pack.primaryKeyword || !pack.slug || !pack.metaTitle || !pack.metaDescription) {
        console.warn('Distribution pack missing fields, falling back to defaults:', pack);
        // Fallback defaults so it doesn't crash the UI
        pack.primaryKeyword = pack.primaryKeyword || 'Greybrainer Analysis';
        pack.slug = pack.slug || 'greybrainer-analysis-' + Date.now();
        pack.metaTitle = pack.metaTitle || 'Greybrainer Strategic Insight';
        pack.metaDescription = pack.metaDescription || 'Strategic insights and analysis from Greybrainer AI.';
      }
      return pack;
    },
    logTokenUsage
  );
};
