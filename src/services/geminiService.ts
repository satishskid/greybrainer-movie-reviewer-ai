/// <reference types="vite/client" />

import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters } from "@google/genai";
import { ReviewLayer, ReviewStage, LayerAnalysisData, GroundingChunkWeb, GroundingMetadata, PersonnelData, SummaryReportData, CreativeSparkResult, VonnegutShapeData, PlotPoint, ScriptIdeaInput, MagicQuotientAnalysis, MorphokineticsAnalysis, FinancialAnalysisData, SocialSnippets } from '../../types';
import { GEMINI_MODEL_TEXT, MAX_SCORE, MAGIC_QUOTIENT_DISCLAIMER } from '../../constants';

// --- IP PROTECTION & COMMERCIAL SERVICE NOTE ---
// For a commercial application requiring IP protection and robust user management/metering:
// 1. This entire file (and its sensitive content like prompts and API keys) should NOT be in the client-side bundle.
// 2. It should reside on a backend server (e.g., as a Node.js module, Python service, or Firebase Cloud Functions).
// 3. The client application would make authenticated API calls to YOUR backend.
// 4. Your backend would then call the Gemini API using the API key stored securely on the server.
// 5. This protects your prompts, parsing logic, and API keys.
// The current setup with VITE_API_KEY in import.meta.env is for simplicity in this dev environment.
// ---------------------------------------------

if (!import.meta.env.VITE_API_KEY) {
  throw new Error("VITE_API_KEY environment variable is not set. Please ensure it's configured in your .env file.");
}
const GEMINI_API_KEY = import.meta.env.VITE_API_KEY;




const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });


export type LogTokenUsageFn = (operation: string, inputChars: number, outputChars: number) => void;


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



const generatePromptForLayer = (
  movieTitle: string, 
  reviewStage: ReviewStage, 
  layer: ReviewLayer, 
  layerTitle: string, 
  layerDescription: string,
): string => {
  // This prompt engineering is a core part of the IP.
  // In a production system, this function would be on the backend.
  let context = "";
  switch (reviewStage) {
    case ReviewStage.IDEA_ANNOUNCEMENT:
      context = `The movie/series "${movieTitle}" has just been announced.`;
      break;
    case ReviewStage.TRAILER:
      context = `A trailer for the movie/series "${movieTitle}" has been released.`;
      break;
    case ReviewStage.MOVIE_RELEASED:
      context = `The movie/series "${movieTitle}" has been released.`;
      break;
  }

  let specificInstructions = "";
  let searchInstructions = "";
  let castingAnalysisInstructions = "";
  let vonnegutAnalysisInstruction = "";
  let scoreSuggestionInstruction = `Based on your qualitative analysis, conclude with a suggested score for this layer out of ${MAX_SCORE} (e.g., "Suggested Score: 7.5/${MAX_SCORE}"). This score should reflect the strengths and weaknesses identified.`;
  let enhancementInstruction = `After the main analysis and score suggestion, add a section titled "Potential Enhancements:" followed by 1-3 concise bullet points (50-100 words total) suggesting how this specific layer could have been improved or areas for future consideration. Use standard bullet points (e.g., - item, * item, or • item).`;


  if (layer === ReviewLayer.CONCEPTUALIZATION) {
    searchInstructions = `Using your search capabilities, please try to identify the director of "${movieTitle}". If found, state it clearly in your response, for example: "Director: [Name found]".`;
    castingAnalysisInstructions = `
    Within your analysis of "Magic of Conceptualization," pay specific attention to the casting choices. 
    Evaluate whether the casting appears to be:
    - Character-centric, Star-centric, Predictable, or Inspired ("Magic in Casting").
    Please include your assessment of the casting approach clearly within your main analysis text for this layer.
    `;
  } else if (layer === ReviewLayer.PERFORMANCE) {
    searchInstructions = `Using your search capabilities, please try to identify up to 3-4 key main cast members of "${movieTitle}". If found, list them clearly: "Main Cast: [Actor 1, Actor 2, Actor 3]".`;
  }

  if (layer === ReviewLayer.STORY) {
    specificInstructions = `
    When analyzing the "Magic of Story/Script", provide a comprehensive analysis (250-350 words) covering:
    1.  Plot Structure & Pacing.
    2.  Character Development (arcs, relatability).
    3.  Dialogue (quality, naturalness, contribution).
    4.  Thematic Depth.
    5.  Originality & Genre Conventions (usage, subversion, similarity to existing works - approx 50 words on this).
    6.  World-Building (if relevant).
    This detailed assessment should be integrated into your overall analysis of the story's uniqueness and creative merit.`;

    vonnegutAnalysisInstruction = `
    Additionally, analyze the story's narrative structure using Kurt Vonnegut's story shapes theory.
    1. Identify which of Vonnegut's common story shapes it most closely resembles (e.g., Man in Hole, Boy Meets Girl, Cinderella, From Bad to Worse, Which Way is Up?).
    2. Provide a brief (2-3 sentences) justification for why this shape is appropriate for "${movieTitle}".
    3. Provide 3-5 key plot points that map this trajectory. For each point, give:
       - Time: A normalized value from 0.0 (beginning) to 1.0 (end).
       - Fortune: A normalized value from -1.0 (ill fortune) to 1.0 (good fortune).
       - Description: A brief (5-15 words) description of the plot event at this point.
    Format this information clearly, after the main analysis, score, and enhancements, as:
    ---VONNEGUT STORY SHAPE START---
    Vonnegut Shape: [Shape Name]
    Shape Justification: [Your justification text here.]
    Plot Points: [(time1, fortune1, 'description1'), (time2, fortune2, 'description2'), ...]
    ---VONNEGUT STORY SHAPE END---
    Example:
    ---VONNEGUT STORY SHAPE START---
    Vonnegut Shape: Man in Hole
    Shape Justification: The protagonist starts in a decent position, faces a significant downturn, but eventually climbs out to an even better state. This mirrors the classic "Man in Hole" arc.
    Plot Points: [(0.0, 0.2, 'Starts content'), (0.3, -0.8, 'Major crisis hits'), (0.7, -0.1, 'Begins recovery'), (1.0, 0.6, 'Ends in better state')]
    ---VONNEGUT STORY SHAPE END---
    `;
  }


  return `
    You are an expert film and television critic using the "Greybrainer" methodology.
    Analyze "${movieTitle}" (${reviewStage}) focusing on "${layerTitle}" (${layerDescription}).
    ${context}
    ${searchInstructions} 
    ${castingAnalysisInstructions}

    Provide a concise (150-250 words total for most layers, see Story for specific length) insightful analysis of the **originality and potential impact** of this layer.
    ${specificInstructions}
    Consider unique elements, innovations, and overall effectiveness.
    Your tone: analytical, academic, engaging. Highlight standout or derivative aspects.
    If director/cast info found, present clearly.
    
    ${scoreSuggestionInstruction}

    ${enhancementInstruction}

    ${vonnegutAnalysisInstruction}
  `;
};

const parseDirector = (text: string): string | undefined => {
  const match = text.match(/Director:\s*(.*)/i);
  return match?.[1]?.trim().split('\n')[0]; 
};

const parseMainCast = (text: string): string[] | undefined => {
  const match = text.match(/Main Cast:\s*([\w\s,]+)/i);
  if (match?.[1]) {
    return match[1].split(',').map(actor => actor.trim()).filter(Boolean);
  }
  return undefined;
};

const parseAISuggestedScore = (text: string): number | undefined => {
  const scoreRegex = new RegExp(`Suggested Score:\\s*(\\d*\\.?\\d+)\\s*/\\s*${MAX_SCORE}`, "i");
  const match = text.match(scoreRegex);
  if (match && match[1]) {
    const score = parseFloat(match[1]);
    return isNaN(score) ? undefined : Math.max(0, Math.min(score, MAX_SCORE));
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


const extractGroundingSources = (response: GenerateContentResponse): GroundingChunkWeb[] => {
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
    let sources: GroundingChunkWeb[] = [];
    if (groundingMetadata?.groundingAttribution?.web) {
        sources = groundingMetadata.groundingAttribution.web.map((chunk: any) => ({
            uri: chunk.uri,
            title: chunk.title || chunk.uri 
        }));
    }
     // Also check the old groundingChunks if new one is empty (for backward compatibility or variations in response)
    if (sources.length === 0 && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        sources = (response.candidates[0].groundingMetadata.groundingChunks as any[])
            .filter(chunk => chunk.web && chunk.web.uri)
            .map(chunk => ({
                uri: chunk.web.uri,
                title: chunk.web.title || chunk.web.uri,
            }));
    }
    return sources;
};

export const analyzeLayerWithGemini = async (
  movieTitle: string,
  reviewStage: ReviewStage,
  layer: ReviewLayer,
  layerTitle: string,
  layerDescription: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<ParsedLayerAnalysis> => {
  // In a backend model, this function receives params from your API endpoint.
  const prompt = generatePromptForLayer(movieTitle, reviewStage, layer, layerTitle, layerDescription);
  
  const generateContentParams: GenerateContentParameters = {
    model: GEMINI_MODEL_TEXT,
    contents: prompt,
    config: {
      temperature: 0.7, 
      topP: 0.9,
      topK: 40,
    }
  };

  if (layer === ReviewLayer.CONCEPTUALIZATION || layer === ReviewLayer.PERFORMANCE) {
    if (generateContentParams.config) { 
        generateContentParams.config.tools = [{googleSearch: {}}];
    }
  }

  try {
    // This ai.models.generateContent call happens on your backend.
    const response: GenerateContentResponse = await ai.models.generateContent(generateContentParams);
    const rawAnalysisText = response.text?.trim() || '';
    
    logTokenUsage?.(`Layer Analysis (Gemini): ${layerTitle}`, prompt.length, rawAnalysisText.length);
    
    // Parsing logic also on the backend.
    let director = parseDirector(rawAnalysisText);
    let mainCast = parseMainCast(rawAnalysisText);
    let aiSuggestedScore = parseAISuggestedScore(rawAnalysisText);
    let improvementSuggestions = parseImprovementSuggestions(rawAnalysisText);
    let vonnegutShape: VonnegutShapeData | undefined;

    if (layer === ReviewLayer.STORY) {
      vonnegutShape = parseVonnegutShapeData(rawAnalysisText);
    }
    
    let cleanedAnalysisText = rawAnalysisText;
    const vonnegutBlockRegex = /---VONNEGUT STORY SHAPE START---[\s\S]*?---VONNEGUT STORY SHAPE END---/i;
    cleanedAnalysisText = cleanedAnalysisText.replace(vonnegutBlockRegex, '').trim();

    if (director) cleanedAnalysisText = cleanedAnalysisText.replace(/Director:\s*(.*)/i, '').trim();
    if (mainCast && mainCast.length > 0) cleanedAnalysisText = cleanedAnalysisText.replace(/Main Cast:\s*([\w\s,]+)/i, '').trim();
    
    const scoreRegex = new RegExp(`Suggested Score:\\s*(\\d*\\.?\\d+)\\s*/\\s*${MAX_SCORE}[\\s\\S]*?(Potential Enhancements:|$)`, "i");
    cleanedAnalysisText = cleanedAnalysisText.replace(scoreRegex, '$1').trim(); 
        
    cleanedAnalysisText = cleanedAnalysisText.replace(/Potential Enhancements:[\s\S]*/i, '').trim();
    
    cleanedAnalysisText = cleanedAnalysisText.replace(/\n\s*\n/g, '\n').trim();

    const groundingSources = extractGroundingSources(response);

    // The backend returns this structured object to the client.
    return {
      analysisText: cleanedAnalysisText,
      director,
      mainCast,
      groundingSources,
      aiSuggestedScore,
      improvementSuggestions,
      vonnegutShape,
      isFallbackResult: false,
    };

  } catch (error) {
    console.error(`Gemini API error for layer ${layer}:`, error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    
    throw new Error(`Failed to get analysis for ${layerTitle} from Gemini AI.`);
  }
};

const generatePromptForFinalReport = (
  movieTitle: string, 
  reviewStage: ReviewStage, 
  analyses: LayerAnalysisData[], 
  personnelData?: PersonnelData,
  financialData?: FinancialAnalysisData | null,
): string => {
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


  return `
    You are an expert film critic generating a "Greybrainer" summary report for "${movieTitle}" (${reviewStage}).
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
  `;
};

const parseFinalReportAndMore = (fullResponse: string, existingFinancialData?: FinancialAnalysisData | null): SummaryReportData => {
  const overallImprovementsMarker = "Overall Improvement Opportunities:";

  // New parsers for social media posts
  const twitterMatch = fullResponse.match(/---TWITTER POST START---([\s\S]*?)---TWITTER POST END---/im);
  const twitter = twitterMatch ? twitterMatch[1].trim() : undefined;

  const linkedinMatch = fullResponse.match(/---LINKEDIN POST START---([\s\S]*?)---LINKEDIN POST END---/im);
  const linkedin = linkedinMatch ? linkedinMatch[1].trim() : undefined;

  const socialSnippets: SocialSnippets = { twitter, linkedin };

  let reportText = fullResponse;
  // Strip social media blocks from the main text
  if (twitterMatch) reportText = reportText.replace(twitterMatch[0], '');
  if (linkedinMatch) reportText = reportText.replace(linkedinMatch[0], '');

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
    financialAnalysis: existingFinancialData || undefined
  };
};


export const generateFinalReportWithGemini = async (
  movieTitle: string,
  reviewStage: ReviewStage,
  analyses: LayerAnalysisData[],
  personnelData: PersonnelData | undefined,
  financialData: FinancialAnalysisData | null, // Pass full financial data
  logTokenUsage?: LogTokenUsageFn,
): Promise<SummaryReportData> => {
  const prompt = generatePromptForFinalReport(movieTitle, reviewStage, analyses, personnelData, financialData);
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        temperature: 0.75, 
        topP: 0.9,
        topK: 50,
      }
    });
    const responseText = response.text?.trim() || '';
    logTokenUsage?.('Final Report Generation (Gemini)', prompt.length, responseText.length);
    
    // Pass financialData to parser so it's included in the returned SummaryReportData
    const parsedReport = parseFinalReportAndMore(responseText, financialData);
    return { ...parsedReport, isFallbackResult: false };
  } catch (error) {
    console.error('Gemini API error for final report:', error);
     if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    throw new Error('Failed to generate final report from AI. Primary API (Gemini) failed and fallback is not configured or also failed.');
  }
};

export const analyzeStakeholderMagicFactor = async (
  name: string,
  type: 'Director' | 'Actor',
  logTokenUsage?: LogTokenUsageFn,
): Promise<{ analysisText: string; groundingSources?: GroundingChunkWeb[]; isFallbackResult?: boolean }> => {
  // In a backend model, this function receives params from your API endpoint.
  const prompt = `
    You are a film historian and expert critic. Analyze ${type} ${name}.
    Describe their "magic factor": unique signature style, recurring themes, notable techniques, qualities in performances/direction defining their contribution, and what makes their work recognizable/impactful.
    Use Google Search for info on filmography, reception, artistic approaches. Provide specific examples.
    Analysis: concise, engaging, ~150-200 words.
    Conclude with web sources under "Sources:" if available.
  `;

  try {
    // This ai.models.generateContent call happens on your backend.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        temperature: 0.6,
        topP: 0.9,
        topK: 30,
      }
    });
    
    let analysisText = response.text?.trim() || '';
    logTokenUsage?.(`Magic Factor (Gemini): ${name}`, prompt.length, analysisText.length);
    const groundingSources = extractGroundingSources(response);
    
    const sourcesMarker = "Sources:";
    const sourcesIndex = analysisText.lastIndexOf(sourcesMarker);
    if (sourcesIndex !== -1) {
        analysisText = analysisText.substring(0, sourcesIndex).trim();
    }
    // The backend returns this structured object to the client.
    return {
      analysisText,
      groundingSources,
      isFallbackResult: false,
    };
  } catch (error) {
    console.error(`Gemini API error analyzing magic factor for ${name}:`, error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    throw new Error(`Failed to analyze magic factor for ${name}. Primary API (Gemini) failed and fallback is not configured or also failed.`);
  }
};

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

export const generateCreativeSpark = async (
  genre: string,
  inspiration: string | undefined,
  logTokenUsage?: LogTokenUsageFn,
): Promise<CreativeSparkResult[]> => {
  // In a backend model, this function receives params from your API endpoint.
  const prompt = `
    You are a creative screenwriter and story generator.
    Generate 3 distinct new movie/series concepts.
    For each concept:
    Genre: ${genre}
    ${inspiration ? `User Inspiration/Keywords for all concepts: "${inspiration}"` : ""}

    Provide the output as a JSON array, where each element is an object with the following structure:
    {
      "logline": "A compelling one-sentence logline.",
      "synopsis": "A brief synopsis of the story (around 150-200 words).",
      "characterIdeas": [
        { "name": "Character Name 1", "description": "Brief description of Character 1, their motivations, and core conflict." },
        { "name": "Character Name 2", "description": "Brief description of Character 2, their motivations, and core conflict." }
      ],
      "sceneIdeas": [
        { "title": "Key Scene Idea 1 Title", "description": "A brief description of a pivotal or interesting scene." },
        { "title": "Key Scene Idea 2 Title", "description": "Another brief description of a pivotal or interesting scene." }
      ],
      "mindMapMarkdown": "${MIND_MAP_PROMPT_STRUCTURE.replace(/\n/g, "\\n").replace(/"/g, '\\"')}" 
    }
    Ensure the JSON is valid. Each concept in the array must be unique.
    Focus on creativity and distinctness for each of the 3 ideas.
  `;

  try {
    // This ai.models.generateContent call happens on your backend.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.85, 
        topP: 0.9,
        topK: 50,
      }
    });

    const responseText = response.text?.trim() || '';
    logTokenUsage?.('Creative Spark Generation (Gemini)', prompt.length, responseText.length);

    let jsonStr = responseText;
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    try {
      let parsedData = JSON.parse(jsonStr) as CreativeSparkResult[];
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        const singleAttempt = JSON.parse(jsonStr) as CreativeSparkResult;
        if (singleAttempt.logline) {
             parsedData = [singleAttempt];
        } else {
            throw new Error("Generated JSON is not an array of Creative Spark results and not a single valid result.");
        }
      }
      // The backend returns this structured object to the client.
      return parsedData.map((item, index) => ({
        ...item,
        id: item.id || `${Date.now()}-${index}`, 
        characterIdeas: item.characterIdeas || [],
        sceneIdeas: item.sceneIdeas || [],
        isFallbackResult: false 
      }));
    } catch (e) {
      console.error("Failed to parse JSON response for Creative Spark (Multiple):", e, "\nRaw response:", responseText);
      throw new Error("AI returned an invalid format for the story ideas. Please try again.");
    }
  } catch (error) {
    console.error('Gemini API error for creative spark (Multiple):', error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    throw new Error('Failed to generate creative sparks from AI. Primary API (Gemini) failed and fallback is not configured or also failed.');
  }
};

export const enhanceCreativeSpark = async (
  baseIdea: Omit<CreativeSparkResult, 'id' | 'mindMapMarkdown'>, 
  enhancementPrompt: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<CreativeSparkResult> => {
  // In a backend model, this function receives params from your API endpoint.
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

  try {
    // This ai.models.generateContent call happens on your backend.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.75,
        topP: 0.9,
        topK: 50,
      }
    });
    
    const responseText = response.text?.trim() || '';
    logTokenUsage?.('Creative Spark Enhancement (Gemini)', prompt.length, responseText.length);

    let jsonStr = responseText;
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
      // The backend returns this structured object to the client.
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

  } catch (error) {
    console.error('Gemini API error for spark enhancement:', error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    throw new Error('Failed to enhance creative spark from AI. Primary API (Gemini) failed and fallback is not configured or also failed.');
  }
};


export const analyzeIdeaMagicQuotient = async (
  idea: ScriptIdeaInput,
  logTokenUsage?: LogTokenUsageFn,
): Promise<MagicQuotientAnalysis & { isFallbackResult?: boolean }> => {
  // In a backend model, this function receives params from your API endpoint.
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

  try {
    // This ai.models.generateContent call happens on your backend.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7, 
        topP: 0.9,
        topK: 40,
      }
    });

    const responseText = response.text?.trim() || '';
    logTokenUsage?.('Magic Quotient Analysis (Gemini)', prompt.length, responseText.length);

    let jsonStr = responseText;
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

      // The backend returns this structured object to the client.
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

  } catch (error) {
    console.error('Gemini API error for magic quotient analysis:', error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    throw new Error('Failed to get magic quotient analysis from AI. Primary API (Gemini) failed and fallback is not configured or also failed.');
  }
};

export const analyzeMovieMorphokinetics = async (
  movieTitle: string,
  reviewStage: ReviewStage,
  existingAnalysesSummary?: string, // Optional summary of prior analyses for context
  logTokenUsage?: LogTokenUsageFn,
): Promise<MorphokineticsAnalysis> => {
  // In a backend model, this function receives params from your API endpoint.
  const prompt = `
    You are an expert film analyst specializing in narrative dynamics, pacing, and emotional arcs ("Morphokinetics").
    Analyze the movie/series "${movieTitle}" (${reviewStage}).
    ${existingAnalysesSummary ? `Consider this existing context if helpful: ${existingAnalysesSummary.substring(0,500)}...` : ""}

    Provide your analysis as a single JSON object with the following structure:
    {
      "overallSummary": "A concise (150-250 words) textual summary of the movie's overall dynamic flow. Discuss its pacing strategy (e.g., slow burn, relentless, varied), how it builds and releases tension, and the overall emotional journey it takes the audience on.",
      "timelineStructureNotes": "Briefly describe the film's timeline structure (e.g., linear, non-linear with frequent flashbacks, chronological with a framing device, etc.) and comment on its effectiveness or any notable aspects (50-100 words).",
      "keyMoments": [ 
        { 
          "time": 0.1, // Normalized time (0.0 to 1.0)
          "intensityScore": 3, // 0 (low intensity/calm) to 10 (max intensity/action/emotion)
          "emotionalValence": 1, // -1 (negative emotion), 0 (neutral), 1 (positive emotion)
          "dominantEmotion": "Hopeful Introduction", 
          "eventDescription": "Protagonist introduced with their initial situation and goals.",
          "isTwist": false,
          "isPacingShift": false 
        } 
        // ... (Provide ~10-15 such key moments, chronologically, that define the film's morphokinetics)
      ]
    }

    Instructions for "keyMoments":
    - Identify around 10-15 pivotal moments that best represent the film's dynamic and emotional trajectory.
    - "time": Estimate the normalized time (0.0 for beginning, 1.0 for end).
    - "intensityScore": Rate the scene's energy/intensity from 0 (very calm) to 10 (peak action/emotion/tension).
    - "emotionalValence": Rate the dominant emotion as -1 (negative, e.g., sad, fear, anger), 0 (neutral, e.g., expositional, calm), or 1 (positive, e.g., joy, hope, relief).
    - "dominantEmotion": A short (1-3 words) descriptor of the primary emotion conveyed (e.g., "Tense Suspense", "Heartwarming Joy", "Deep Sorrow", "Exciting Action", "Anxious Anticipation").
    - "eventDescription": A brief (10-20 words) description of what is happening or what this moment signifies in the narrative.
    - "isTwist": Set to true if this moment involves a significant plot twist or major surprise.
    - "isPacingShift": Set to true if this moment marks a notable acceleration or deceleration in narrative pacing.

    Ensure the JSON is valid. Focus on delivering insightful analysis of the film's "motion".
  `;

  try {
    // This ai.models.generateContent call happens on your backend.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      }
    });

    const responseText = response.text?.trim() || '';
    logTokenUsage?.(`Morphokinetics Analysis (Gemini): ${movieTitle}`, prompt.length, responseText.length);

    let jsonStr = responseText;
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    try {
      const parsedData = JSON.parse(jsonStr) as MorphokineticsAnalysis;
      if (!parsedData.overallSummary || !parsedData.timelineStructureNotes || !Array.isArray(parsedData.keyMoments) || parsedData.keyMoments.length === 0) {
        console.error("Generated JSON for morphokinetics is missing required fields or keyMoments is empty:", parsedData);
        throw new Error("Generated JSON for morphokinetics is missing required fields or keyMoments is empty.");
      }
      // Validate/sanitize keyMoments
      parsedData.keyMoments = parsedData.keyMoments.map((moment: any) => ({
        ...moment,
        time: Number(moment.time) || 0,
        intensityScore: Number(moment.intensityScore) || 0,
        emotionalValence: Number(moment.emotionalValence) || 0,
        isTwist: Boolean(moment.isTwist),
        isPacingShift: Boolean(moment.isPacingShift),
      }));
      // The backend returns this structured object to the client.
      return { ...parsedData, isFallbackResult: false };
    } catch (e) {
      console.error("Failed to parse JSON response for Morphokinetics:", e, "\nRaw response:", responseText);
      throw new Error("AI returned an invalid format for the morphokinetics analysis. Please try again.");
    }
  } catch (error) {
    console.error(`Gemini API error for morphokinetics analysis of ${movieTitle}:`, error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    // Conceptual: Add fallback for morphokinetics if desired, similar to layer analysis.
    // For now, it will just throw if Gemini fails.
    throw new Error(`Failed to get morphokinetics analysis for ${movieTitle}. Primary API (Gemini) failed.`);
  }
};

export const getMovieTitleSuggestions = async (
  currentTitle: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string[]> => {
  const prompt = `
    You are an assistant that helps find correct or similar movie/series titles.
    Based on the user input "${currentTitle}", suggest 3-5 alternative, correctly spelled, or closely related existing movie or series titles.
    Return your suggestions as a JSON array of strings. For example: ["Suggested Title 1", "Suggested Title 2"].
    If the input seems very accurate and you have no better suggestions, you can return an empty array or an array with just the original title if you can confirm its existence.
    Only include titles that are actual existing movies or series. Do not invent titles.
    If the input is gibberish or too vague, return an empty array.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3, // Lower temperature for more factual/less creative suggestions
        topK: 20,
      }
    });

    const responseText = response.text?.trim() || '';
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
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
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
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2, // More factual
      }
    });
    const responseText = response.text?.trim() || '';
    logTokenUsage?.(`Fetch Movie Financials (Gemini): ${movieTitle}`, prompt.length, responseText.length);

    let jsonStr = responseText;
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    const budgetValue = parsed.budget ? Number(parsed.budget) : undefined;

    return {
      budget: budgetValue !== undefined && !isNaN(budgetValue) ? budgetValue : undefined,
      currency: parsed.currency || (budgetValue ? "USD" : undefined), // Default to USD if budget found but no currency
      duration: parsed.duration,
      sources: extractGroundingSources(response) || parsed.sources || [],
      isFallbackResult: false,
    };
  } catch (error) {
    console.error(`Gemini API error fetching financials for ${movieTitle}:`, error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    // Add Groq fallback here if desired, for now just throw
    throw new Error(`Failed to fetch financial data for ${movieTitle}.`);
  }
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
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        temperature: 0.6, // More analytical, less overly creative
      }
    });
    const analysisText = response.text?.trim() || '';
    logTokenUsage?.(`Qualitative ROI Analysis (Gemini): ${movieTitle}`, prompt.length, analysisText.length);
    return { analysisText, isFallbackResult: false };
  } catch (error) {
    console.error(`Gemini API error generating ROI analysis for ${movieTitle}:`, error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    // Add Groq fallback here if desired
    throw new Error(`Failed to generate qualitative ROI analysis for ${movieTitle}.`);
  }
};

export const generateGreybrainerInsightWithGemini = async (
  logTokenUsage?: LogTokenUsageFn,
): Promise<string> => {
  const prompt = `
    You are a film industry analyst for Greybrainer AI.
    Generate a single, concise, and insightful observation (around 40-70 words) about a current trend in filmmaking, movie consumption, narrative techniques, or film technology.
    This insight should be suitable for a 'Research & Insights' section of an AI film analysis platform.
    If relevant to current events or very recent trends, use your search capabilities to inform your response.
    The insight should sound professional and data-informed, even if specific percentages or data points are illustrative or conceptual.
    Avoid overly generic statements. Aim for something thought-provoking or noteworthy.
    Provide only the insight text. Do not include any preamble like "Here's an insight:".

    Example of good insight: "The rise of interactive narratives on streaming platforms is pushing filmmakers to reconsider story branching and audience agency, potentially reshaping episodic content structure for deeper engagement."
    Another example: "AI-driven virtual production techniques are increasingly democratizing high-concept visuals, allowing independent filmmakers to explore genres previously limited by budget, which could lead to more diverse sci-fi and fantasy offerings."
  `;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.75, // Allow for some creativity in formulating the insight
        topP: 0.9,
        topK: 50,
      }
    });
    const insightText = response.text?.trim() || '';
    logTokenUsage?.('Greybrainer Insight Generation (Gemini)', prompt.length, insightText.length);
    return insightText;
  } catch (error) {
    console.error('Gemini API error generating Greybrainer insight:', error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    throw new Error('Failed to generate Greybrainer insight from AI.');
  }
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
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7, 
        topP: 0.85,
        topK: 60,
      }
    });
    const reportText = response.text?.trim() || '';
    logTokenUsage?.('Detailed Insight Report Generation (Gemini)', prompt.length, reportText.length);
    return reportText;
  } catch (error) {
    console.error('Gemini API error generating detailed insight report:', error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
         throw new Error('Invalid Gemini API Key. Please check your VITE_API_KEY environment variable.');
    }
    throw new Error('Failed to generate detailed insight report from AI.');
  }
};