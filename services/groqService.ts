import { ReviewLayer, ReviewStage, LayerAnalysisData, GroundingChunkWeb, PersonnelData, SummaryReportData, CreativeSparkResult, VonnegutShapeData, PlotPoint, ScriptIdeaInput, MagicQuotientAnalysis, MorphokineticsAnalysis, FinancialAnalysisData, SocialSnippets, CharacterIdea, SceneIdea } from '../types';
import { MAX_SCORE, MAGIC_QUOTIENT_DISCLAIMER } from '../constants';

// Groq API Configuration
const GROQ_API_KEY = (import.meta as any).env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama3-8b-8192";

if (!GROQ_API_KEY) {
  throw new Error("VITE_GROQ_API_KEY environment variable is not set. Please ensure it's configured in your .env file.");
}

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

// Generic Groq API call function
async function callGroqAPI(
  messages: Array<{role: string, content: string}>,
  operation: string,
  logTokenUsage?: LogTokenUsageFn,
  maxTokens: number = 1000
): Promise<string> {
  const requestBody = {
    messages,
    model: GROQ_MODEL,
    temperature: 0.7,
    max_tokens: maxTokens,
  };

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Groq API error (${response.status}): ${errorData.error?.message || errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "Analysis could not be generated.";
    
    const inputLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    logTokenUsage?.(operation, inputLength, content.length);

    return content;
  } catch (error) {
    console.error(`Groq API call failed for ${operation}:`, error);
    throw error;
  }
}

// Parsing functions
const parseDirector = (text: string): string | undefined => {
  const match = text.match(/Director:\s*([^\n]+)/i);
  return match ? match[1].trim() : undefined;
};

const parseMainCast = (text: string): string[] | undefined => {
  const match = text.match(/Main Cast:\s*([^\n]+)/i);
  if (match) {
    return match[1].split(',').map(actor => actor.trim()).filter(actor => actor.length > 0);
  }
  return undefined;
};

const parseAISuggestedScore = (text: string): number | undefined => {
  const match = text.match(new RegExp(`Suggested Score:\s*(\\d*\\.?\\d+)\\s*/\\s*${MAX_SCORE}`, "i"));
  if (match) {
    const score = parseFloat(match[1]);
    return isNaN(score) ? undefined : Math.min(Math.max(score, 0), MAX_SCORE);
  }
  return undefined;
};

const parseImprovementSuggestions = (text: string): string | string[] | undefined => {
  const match = text.match(/Potential Enhancements:\s*([\s\S]*?)(?:\n\n|$)/i);
  if (match) {
    const suggestions = match[1].trim();
    const bulletPoints = suggestions.split(/\n\s*[-*•]\s*/).filter(s => s.trim().length > 0);
    return bulletPoints.length > 1 ? bulletPoints.map(s => s.trim()) : suggestions;
  }
  return undefined;
};

const parseVonnegutShapeData = (text: string): VonnegutShapeData | undefined => {
  const vonnegutMatch = text.match(/---VONNEGUT STORY SHAPE START---([\s\S]*?)---VONNEGUT STORY SHAPE END---/i);
  if (!vonnegutMatch) return undefined;

  const vonnegutContent = vonnegutMatch[1];
  const shapeMatch = vonnegutContent.match(/Shape:\s*([^\n]+)/i);
  const justificationMatch = vonnegutContent.match(/Justification:\s*([^\n]+(?:\n[^\n]+)*?)(?=\nPlot Points:|$)/i);
  
  const plotPointsSection = vonnegutContent.match(/Plot Points:\s*([\s\S]*)/i);
  let plotPoints: PlotPoint[] = [];
  
  if (plotPointsSection) {
    const lines = plotPointsSection[1].split('\n').filter(line => line.trim());
    plotPoints = lines.map(line => {
      const match = line.match(/Time:\s*(\d*\.?\d+),\s*Fortune:\s*(-?\d*\.?\d+),\s*Description:\s*(.+)/i);
      if (match) {
        return {
          time: parseFloat(match[1]),
          fortune: parseFloat(match[2]),
          description: match[3].trim()
        };
      }
      return null;
    }).filter((point): point is PlotPoint => point !== null);
  }

  if (shapeMatch && justificationMatch && plotPoints.length > 0) {
    return {
      name: shapeMatch[1].trim(),
      justification: justificationMatch[1].trim(),
      plotPoints
    };
  }
  return undefined;
};

// Generate prompts for different layers
const generatePromptForLayer = (
  movieTitle: string,
  reviewStage: ReviewStage,
  layer: ReviewLayer,
  layerTitle: string,
  layerDescription: string,
): string => {
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
    searchInstructions = `Try to identify the director of "${movieTitle}". If found, state it clearly in your response, for example: "Director: [Name found]".`;
    castingAnalysisInstructions = `
    Within your analysis of "Magic of Conceptualization," pay specific attention to the casting choices.
    Evaluate whether the casting appears to be:
    - Character-centric, Star-centric, Predictable, or Inspired ("Magic in Casting").
    Please include your assessment of the casting approach clearly within your main analysis text for this layer.
    `;
  } else if (layer === ReviewLayer.PERFORMANCE) {
    searchInstructions = `Try to identify up to 3-4 key main cast members of "${movieTitle}". If found, list them clearly: "Main Cast: [Actor 1, Actor 2, Actor 3]".`;
  }

  if (layer === ReviewLayer.STORY) {
    specificInstructions = `
    When analyzing the "Magic of Story/Script", provide a comprehensive analysis (250-350 words) covering:
    1. Plot Structure & Pacing.
    2. Character Development (arcs, relatability).
    3. Dialogue (quality, naturalness, contribution).
    4. Thematic Depth.
    5. Originality & Genre Conventions (usage, subversion, similarity to existing works - approx 50 words on this).
    6. World-Building (if relevant).
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
    Shape: [Shape Name]
    Justification: [Your justification]
    Plot Points:
    Time: [0.0-1.0], Fortune: [-1.0 to 1.0], Description: [Brief description]
    [Repeat for each plot point]
    ---VONNEGUT STORY SHAPE END---`;
  }

  return `
${context}

You are an expert film and television critic with deep knowledge of cinema history, storytelling techniques, and industry trends. Your task is to analyze the "${layerTitle}" layer of this movie/series.

${layerDescription}

${specificInstructions}

${searchInstructions}

${castingAnalysisInstructions}

Provide a detailed, insightful analysis (200-350 words) that:
- Evaluates the originality and potential impact of this layer
- Considers unique elements, innovations, and overall effectiveness
- Uses an analytical, academic, yet engaging tone
- Highlights standout or derivative aspects
- Provides specific examples where possible

${scoreSuggestionInstruction}

${enhancementInstruction}

${vonnegutAnalysisInstruction}

Begin your analysis:
  `.trim();
};

// Main layer analysis function
export const analyzeLayerWithGroq = async (
  movieTitle: string,
  reviewStage: ReviewStage,
  layer: ReviewLayer,
  layerTitle: string,
  layerDescription: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<ParsedLayerAnalysis> => {
  const prompt = generatePromptForLayer(movieTitle, reviewStage, layer, layerTitle, layerDescription);
  
  const messages = [
    { role: "system", content: "You are an expert film and television critic with deep knowledge of cinema history, storytelling techniques, and industry trends." },
    { role: "user", content: prompt }
  ];

  try {
    const rawAnalysisText = await callGroqAPI(messages, `Layer Analysis: ${layerTitle}`, logTokenUsage, 1500);
    
    // Parse the response
    let director = parseDirector(rawAnalysisText);
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

    if (director) cleanedAnalysisText = cleanedAnalysisText.replace(/Director:\s*(.*)/i, '').trim();
    if (mainCast && mainCast.length > 0) cleanedAnalysisText = cleanedAnalysisText.replace(/Main Cast:\s*([\w\s,]+)/i, '').trim();
    
    const scoreRegex = new RegExp(`Suggested Score:\\s*(\\d*\\.?\\d+)\\s*/\\s*${MAX_SCORE}[\\s\\S]*?(Potential Enhancements:|$)`, "i");
    cleanedAnalysisText = cleanedAnalysisText.replace(scoreRegex, '$1').trim();
    
    cleanedAnalysisText = cleanedAnalysisText.replace(/Potential Enhancements:[\s\S]*/i, '').trim();
    cleanedAnalysisText = cleanedAnalysisText.replace(/\n\s*\n/g, '\n').trim();

    return {
      analysisText: cleanedAnalysisText,
      director,
      mainCast,
      groundingSources: [], // Groq doesn't provide grounding sources like Gemini
      aiSuggestedScore,
      improvementSuggestions,
      vonnegutShape,
      isFallbackResult: false,
    };

  } catch (error) {
    console.error(`Groq API error for layer ${layer}:`, error);
    if (error instanceof Error && error.message.includes('API key')) {
      throw new Error('Invalid Groq API Key. Please check your VITE_GROQ_API_KEY environment variable.');
    }
    throw new Error(`Failed to get analysis for ${layerTitle} from Groq API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Export the main function with the original name for compatibility
export const analyzeLayerWithGemini = analyzeLayerWithGroq;

// Generate final report
const generatePromptForFinalReport = (
  movieTitle: string,
  reviewStage: ReviewStage,
  analyses: LayerAnalysisData[],
  personnelData?: PersonnelData,
  financialData?: FinancialAnalysisData | null,
): string => {
  const storyAnalysis = analyses.find(a => a.id === ReviewLayer.STORY);
  const conceptAnalysis = analyses.find(a => a.id === ReviewLayer.CONCEPTUALIZATION);
  const performanceAnalysis = analyses.find(a => a.id === ReviewLayer.PERFORMANCE);

  let analysisContext = `Based on the detailed analysis of "${movieTitle}" (${reviewStage}), here are the key findings:\n\n`;
  
  if (storyAnalysis) {
    analysisContext += `**Story/Script Analysis (Score: ${storyAnalysis.userScore || storyAnalysis.aiSuggestedScore || 'N/A'}/${MAX_SCORE}):**\n${storyAnalysis.editedText || storyAnalysis.aiGeneratedText}\n\n`;
  }
  
  if (conceptAnalysis) {
    analysisContext += `**Conceptualization Analysis (Score: ${conceptAnalysis.userScore || conceptAnalysis.aiSuggestedScore || 'N/A'}/${MAX_SCORE}):**\n${conceptAnalysis.editedText || conceptAnalysis.aiGeneratedText}\n\n`;
  }
  
  if (performanceAnalysis) {
    analysisContext += `**Performance Analysis (Score: ${performanceAnalysis.userScore || performanceAnalysis.aiSuggestedScore || 'N/A'}/${MAX_SCORE}):**\n${performanceAnalysis.editedText || performanceAnalysis.aiGeneratedText}\n\n`;
  }

  if (personnelData?.director) {
    analysisContext += `**Director:** ${personnelData.director}\n`;
  }
  if (personnelData?.mainCast && personnelData.mainCast.length > 0) {
    analysisContext += `**Main Cast:** ${personnelData.mainCast.join(', ')}\n`;
  }

  return `
You are a film industry expert creating a comprehensive summary report for "${movieTitle}".

${analysisContext}

Create a well-structured final report (300-500 words) that:
1. Synthesizes the key insights from all three analysis layers
2. Provides an overall assessment of the film's creative merit and potential impact
3. Highlights the most significant strengths and areas for improvement
4. Offers a balanced perspective on the film's place within its genre and the broader cinematic landscape

Additionally, create social media snippets:
- Twitter: A compelling 280-character summary highlighting the most intriguing aspect
- LinkedIn: A professional 150-word analysis suitable for industry professionals

Format your response as:
**FINAL REPORT:**
[Your comprehensive report]

**SOCIAL SNIPPETS:**
Twitter: [280-character snippet]
LinkedIn: [150-word professional snippet]

Begin your analysis:
  `.trim();
};

const parseFinalReportAndMore = (fullResponse: string, existingFinancialData?: FinancialAnalysisData | null): SummaryReportData => {
  const reportMatch = fullResponse.match(/\*\*FINAL REPORT:\*\*\s*([\s\S]*?)(?=\*\*SOCIAL SNIPPETS:\*\*|$)/i);
  const socialMatch = fullResponse.match(/\*\*SOCIAL SNIPPETS:\*\*\s*([\s\S]*)/i);
  
  let reportText = reportMatch ? reportMatch[1].trim() : fullResponse;
  let socialSnippets: SocialSnippets = {};
  
  if (socialMatch) {
    const socialContent = socialMatch[1];
    const twitterMatch = socialContent.match(/Twitter:\s*([^\n]+)/i);
    const linkedinMatch = socialContent.match(/LinkedIn:\s*([\s\S]*?)(?=Twitter:|$)/i);
    
    if (twitterMatch) socialSnippets.twitter = twitterMatch[1].trim();
    if (linkedinMatch) socialSnippets.linkedin = linkedinMatch[1].trim();
  }
  
  return {
    reportText,
    socialSnippets,
    financialAnalysis: existingFinancialData || undefined,
    isFallbackResult: false
  };
};

export const generateFinalReportWithGemini = async (
  movieTitle: string,
  reviewStage: ReviewStage,
  analyses: LayerAnalysisData[],
  personnelData: PersonnelData | undefined,
  financialData: FinancialAnalysisData | null,
  logTokenUsage?: LogTokenUsageFn,
): Promise<SummaryReportData> => {
  const prompt = generatePromptForFinalReport(movieTitle, reviewStage, analyses, personnelData, financialData);
  
  const messages = [
    { role: "system", content: "You are a film industry expert and critic with extensive knowledge of cinema history and current trends." },
    { role: "user", content: prompt }
  ];

  try {
    const response = await callGroqAPI(messages, "Final Report Generation", logTokenUsage, 2000);
    return parseFinalReportAndMore(response, financialData);
  } catch (error) {
    console.error('Error generating final report:', error);
    throw new Error(`Failed to generate final report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Personnel analysis
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

  const messages = [
    { role: "system", content: "You are a film industry expert with deep knowledge of directors, actors, and their contributions to cinema." },
    { role: "user", content: prompt }
  ];

  try {
    const analysisText = await callGroqAPI(messages, `Personnel Analysis: ${name}`, logTokenUsage, 1000);
    return {
      analysisText,
      groundingSources: [],
      isFallbackResult: false
    };
  } catch (error) {
    console.error(`Error analyzing ${type} ${name}:`, error);
    throw new Error(`Failed to analyze ${type} ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Creative Spark Generation
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
  const inspirationText = inspiration ? `Drawing inspiration from: ${inspiration}` : "";
  
  const prompt = `
Generate 3 unique and creative story ideas for the ${genre} genre. ${inspirationText}

For each idea, provide:
1. **Logline**: A compelling one-sentence summary (25-35 words)
2. **Synopsis**: A detailed 3-4 sentence expansion (75-100 words)
3. **Character Ideas**: 2-3 main characters with brief descriptions
4. **Scene Ideas**: 2-3 key scenes that would be memorable
5. **Mind Map**: ${MIND_MAP_PROMPT_STRUCTURE}

Make each idea distinctive, original, and engaging. Focus on unique twists, compelling characters, and strong dramatic potential.

Format each idea as:
**IDEA [NUMBER]:**
Logline: [logline]
Synopsis: [synopsis]
Characters:
- [Character 1]: [description]
- [Character 2]: [description]
Key Scenes:
- [Scene 1]: [description]
- [Scene 2]: [description]
Mind Map:
[mind map markdown]

Begin generating ideas:
  `.trim();

  const messages = [
    { role: "system", content: "You are a creative screenwriter and story developer with expertise in generating original, compelling story concepts." },
    { role: "user", content: prompt }
  ];

  try {
    const response = await callGroqAPI(messages, "Creative Spark Generation", logTokenUsage, 3000);
    
    // Parse the response into individual ideas
    const ideas: CreativeSparkResult[] = [];
    const ideaMatches = response.match(/\*\*IDEA \d+:\*\*[\s\S]*?(?=\*\*IDEA \d+:\*\*|$)/g);
    
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
    console.error('Error generating creative spark:', error);
    throw new Error(`Failed to generate creative ideas: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const enhanceCreativeSpark = async (
  baseIdea: Omit<CreativeSparkResult, 'id' | 'mindMapMarkdown'>,
  enhancementPrompt: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<CreativeSparkResult> => {
  const prompt = `
Enhance this story idea based on the following request:

**Current Idea:**
Logline: ${baseIdea.logline}
Synopsis: ${baseIdea.synopsis}
Characters: ${baseIdea.characterIdeas.map(c => `${c.name}: ${c.description}`).join(', ')}
Scenes: ${baseIdea.sceneIdeas.map(s => `${s.title}: ${s.description}`).join(', ')}

**Enhancement Request:** ${enhancementPrompt}

Provide an enhanced version with:
1. **Enhanced Logline**: Improved one-sentence summary
2. **Enhanced Synopsis**: Expanded 4-5 sentence description
3. **Enhanced Characters**: Improved character descriptions
4. **Enhanced Scenes**: Improved scene descriptions
5. **Mind Map**: ${MIND_MAP_PROMPT_STRUCTURE}

Format as:
Logline: [enhanced logline]
Synopsis: [enhanced synopsis]
Characters:
- [Character 1]: [enhanced description]
- [Character 2]: [enhanced description]
Key Scenes:
- [Scene 1]: [enhanced description]
- [Scene 2]: [enhanced description]
Mind Map:
[mind map markdown]

Begin enhancement:
  `.trim();

  const messages = [
    { role: "system", content: "You are a creative screenwriter and story developer specializing in enhancing and refining story concepts." },
    { role: "user", content: prompt }
  ];

  try {
    const response = await callGroqAPI(messages, "Creative Spark Enhancement", logTokenUsage, 2000);
    
    // Parse the enhanced response
    const loglineMatch = response.match(/Logline:\s*([^\n]+)/i);
    const synopsisMatch = response.match(/Synopsis:\s*([^\n]+(?:\n[^\n]+)*?)(?=Characters:|$)/i);
    const charactersMatch = response.match(/Characters:\s*([\s\S]*?)(?=Key Scenes:|$)/i);
    const scenesMatch = response.match(/Key Scenes:\s*([\s\S]*?)(?=Mind Map:|$)/i);
    const mindMapMatch = response.match(/Mind Map:\s*([\s\S]*?)$/i);
    
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
    
    return {
      id: `enhanced-${Date.now()}`,
      logline: loglineMatch ? loglineMatch[1].trim() : baseIdea.logline,
      synopsis: synopsisMatch ? synopsisMatch[1].trim() : baseIdea.synopsis,
      characterIdeas: characterIdeas.length > 0 ? characterIdeas : baseIdea.characterIdeas,
      sceneIdeas: sceneIdeas.length > 0 ? sceneIdeas : baseIdea.sceneIdeas,
      mindMapMarkdown: mindMapMatch ? mindMapMatch[1].trim() : undefined,
      isFallbackResult: false
    };
    
  } catch (error) {
    console.error('Error enhancing creative spark:', error);
    throw new Error(`Failed to enhance creative idea: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Magic Quotient Analysis
export const analyzeIdeaMagicQuotient = async (
  ideaInput: ScriptIdeaInput,
  logTokenUsage?: LogTokenUsageFn,
): Promise<MagicQuotientAnalysis> => {
  const prompt = `
Analyze the "Magic Quotient" of this script idea:

**Title:** ${ideaInput.title || 'Untitled'}
**Genre:** ${ideaInput.genre || 'Not specified'}
**Logline:** ${ideaInput.logline}
**Synopsis:** ${ideaInput.synopsis}

Provide a comprehensive analysis covering:

1. **Overall Assessment** (150-200 words): Evaluate the concept's creative potential, market viability, and unique appeal.

2. **Strengths** (3-5 bullet points): Key elements that make this idea compelling.

3. **Areas for Development** (3-5 bullet points): Aspects that could be enhanced or refined.

4. **Actionable Suggestions** (3-5 bullet points): Specific recommendations for improvement.

5. **Subjective Scores** (1-10 scale):
   - Originality: How unique and fresh is the concept?
   - Audience Appeal: How likely is it to engage viewers?
   - Critical Reception: How might critics respond?

Format your response as:
**OVERALL ASSESSMENT:**
[Your assessment]

**STRENGTHS:**
- [Strength 1]
- [Strength 2]
- [Strength 3]

**AREAS FOR DEVELOPMENT:**
- [Area 1]
- [Area 2]
- [Area 3]

**ACTIONABLE SUGGESTIONS:**
- [Suggestion 1]
- [Suggestion 2]
- [Suggestion 3]

**SUBJECTIVE SCORES:**
Originality: [1-10]
Audience Appeal: [1-10]
Critical Reception: [1-10]

Begin your analysis:
  `.trim();

  const messages = [
    { role: "system", content: "You are a film industry expert and script analyst with extensive experience in evaluating creative concepts for their commercial and artistic potential." },
    { role: "user", content: prompt }
  ];

  try {
    const response = await callGroqAPI(messages, "Magic Quotient Analysis", logTokenUsage, 2000);
    
    // Parse the response
    const overallMatch = response.match(/\*\*OVERALL ASSESSMENT:\*\*\s*([\s\S]*?)(?=\*\*STRENGTHS:\*\*|$)/i);
    const strengthsMatch = response.match(/\*\*STRENGTHS:\*\*\s*([\s\S]*?)(?=\*\*AREAS FOR DEVELOPMENT:\*\*|$)/i);
    const areasMatch = response.match(/\*\*AREAS FOR DEVELOPMENT:\*\*\s*([\s\S]*?)(?=\*\*ACTIONABLE SUGGESTIONS:\*\*|$)/i);
    const suggestionsMatch = response.match(/\*\*ACTIONABLE SUGGESTIONS:\*\*\s*([\s\S]*?)(?=\*\*SUBJECTIVE SCORES:\*\*|$)/i);
    const scoresMatch = response.match(/\*\*SUBJECTIVE SCORES:\*\*\s*([\s\S]*?)$/i);
    
    const parseListItems = (text: string): string[] => {
      return text.split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(item => item.length > 0);
    };
    
    const parseScores = (text: string) => {
      const originalityMatch = text.match(/Originality:\s*(\d+)/i);
      const audienceMatch = text.match(/Audience Appeal:\s*(\d+)/i);
      const criticalMatch = text.match(/Critical Reception:\s*(\d+)/i);
      
      return {
        originality: originalityMatch ? parseInt(originalityMatch[1]) : undefined,
        audienceAppeal: audienceMatch ? parseInt(audienceMatch[1]) : undefined,
        criticalReception: criticalMatch ? parseInt(criticalMatch[1]) : undefined,
      };
    };
    
    return {
      overallAssessment: overallMatch ? overallMatch[1].trim() : 'Analysis could not be parsed properly.',
      strengths: strengthsMatch ? parseListItems(strengthsMatch[1]) : [],
      areasForDevelopment: areasMatch ? parseListItems(areasMatch[1]) : [],
      actionableSuggestions: suggestionsMatch ? parseListItems(suggestionsMatch[1]) : [],
      subjectiveScores: scoresMatch ? parseScores(scoresMatch[1]) : {},
      generatedDisclaimer: MAGIC_QUOTIENT_DISCLAIMER,
      isFallbackResult: false
    };
    
  } catch (error) {
    console.error('Error analyzing magic quotient:', error);
    throw new Error(`Failed to analyze magic quotient: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Morphokinetics Analysis
export const analyzeMovieMorphokinetics = async (
  movieTitle: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<MorphokineticsAnalysis> => {
  const prompt = `
Analyze the "Morphokinetics" (dynamic flow and emotional journey) of the movie "${movieTitle}".

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

  const messages = [
    { role: "system", content: "You are a film analyst specializing in narrative structure, pacing, and emotional dynamics in cinema." },
    { role: "user", content: prompt }
  ];

  try {
    const response = await callGroqAPI(messages, "Morphokinetics Analysis", logTokenUsage, 2500);
    
    // Parse the response
    const summaryMatch = response.match(/\*\*OVERALL SUMMARY:\*\*\s*([\s\S]*?)(?=\*\*TIMELINE STRUCTURE:\*\*|$)/i);
    const timelineMatch = response.match(/\*\*TIMELINE STRUCTURE:\*\*\s*([\s\S]*?)(?=\*\*KEY MOMENTS:\*\*|$)/i);
    const momentsMatch = response.match(/\*\*KEY MOMENTS:\*\*\s*([\s\S]*?)$/i);
    
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
    
  } catch (error) {
    console.error('Error analyzing morphokinetics:', error);
    throw new Error(`Failed to analyze morphokinetics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Movie Title Suggestions
export const getMovieTitleSuggestions = async (
  logline: string,
  genre?: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<string[]> => {
  const genreText = genre ? ` in the ${genre} genre` : '';
  
  const prompt = `
Generate 10 creative and compelling movie titles for this concept${genreText}:

**Logline:** ${logline}

Provide titles that are:
- Memorable and catchy
- Appropriate for the genre and tone
- Marketable and audience-friendly
- Varied in style (some literal, some metaphorical, some intriguing)

Format as a simple numbered list:
1. [Title 1]
2. [Title 2]
3. [Title 3]
[Continue for all 10]

Begin generating titles:
  `.trim();

  const messages = [
    { role: "system", content: "You are a creative marketing expert specializing in movie titles that capture audience attention and convey the essence of the story." },
    { role: "user", content: prompt }
  ];

  try {
    const response = await callGroqAPI(messages, "Title Suggestions", logTokenUsage, 800);
    
    // Parse the numbered list
    const titles: string[] = [];
    const lines = response.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match) {
        titles.push(match[1].trim());
      }
    });
    
    return titles.length > 0 ? titles : ['Title Generation Failed'];
    
  } catch (error) {
    console.error('Error generating title suggestions:', error);
    throw new Error(`Failed to generate title suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Financial Analysis
export const fetchMovieFinancialsWithGemini = async (
  movieTitle: string,
  logTokenUsage?: LogTokenUsageFn,
): Promise<{ budget?: number; budgetCurrency?: string; duration?: string; sources?: GroundingChunkWeb[]; isFallbackResult?: boolean }> => {
  const prompt = `
Find the production budget and filming duration for the movie "${movieTitle}".

Provide:
1. **Production Budget**: The total production cost (specify currency)
2. **Filming Duration**: How long the movie took to film/produce
3. **Sources**: Any notable sources or context for this information

Format your response as:
**BUDGET:** [amount] [currency]
**DURATION:** [time period]
**SOURCES:** [brief source information]

If exact information is not available, provide the best estimates with appropriate disclaimers.

Begin your research:
  `.trim();

  const messages = [
    { role: "system", content: "You are a film industry researcher with access to production data and financial information about movies." },
    { role: "user", content: prompt }
  ];

  try {
    const response = await callGroqAPI(messages, "Financial Research", logTokenUsage, 1000);
    
    // Parse the response
    const budgetMatch = response.match(/\*\*BUDGET:\*\*\s*([^\n]+)/i);
    const durationMatch = response.match(/\*\*DURATION:\*\*\s*([^\n]+)/i);
    const sourcesMatch = response.match(/\*\*SOURCES:\*\*\s*([^\n]+)/i);
    
    let budget: number | undefined;
    let budgetCurrency = 'USD';
    
    if (budgetMatch) {
      const budgetText = budgetMatch[1].trim();
      const budgetNumMatch = budgetText.match(/([\d,]+(?:\.\d+)?)\s*(million|billion)?\s*(USD|usd|\$|dollars?)?/i);
      
      if (budgetNumMatch) {
        let amount = parseFloat(budgetNumMatch[1].replace(/,/g, ''));
        const unit = budgetNumMatch[2]?.toLowerCase();
        
        if (unit === 'million') amount *= 1000000;
        if (unit === 'billion') amount *= 1000000000;
        
        budget = amount;
      }
    }
    
    return {
      budget,
      budgetCurrency,
      duration: durationMatch ? durationMatch[1].trim() : undefined,
      sources: sourcesMatch ? [{ uri: '', title: sourcesMatch[1].trim() }] : [],
      isFallbackResult: false
    };
    
  } catch (error) {
    console.error('Error fetching movie financials:', error);
    throw new Error(`Failed to fetch movie financials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const generateQualitativeROIAnalysisWithGemini = async (
  movieTitle: string,
  reviewStage: ReviewStage,
  analyses: LayerAnalysisData[],
  financialData: FinancialAnalysisData,
  logTokenUsage?: LogTokenUsageFn,
): Promise<{ analysis: string; isFallbackResult?: boolean }> => {
  const budgetInfo = financialData.fetchedBudget || financialData.userProvidedBudget;
  const budgetText = budgetInfo ? `$${budgetInfo.toLocaleString()}` : 'Budget information not available';
  
  const analysisContext = analyses.map(analysis => 
    `${analysis.title}: Score ${analysis.userScore || analysis.aiSuggestedScore || 'N/A'}/${MAX_SCORE}`
  ).join(', ');
  
  const prompt = `
Provide a qualitative ROI (Return on Investment) analysis for "${movieTitle}" (${reviewStage}).

**Production Budget:** ${budgetText}
**Analysis Scores:** ${analysisContext}

Analyze the potential financial performance considering:
1. **Creative Quality**: Based on the analysis scores, how strong is the creative foundation?
2. **Market Potential**: What audience segments might this appeal to?
3. **Risk Assessment**: What factors could impact financial success?
4. **Revenue Streams**: Potential income sources (theatrical, streaming, international, etc.)
5. **Investment Outlook**: Overall assessment of financial viability

Provide a comprehensive analysis (300-400 words) that balances creative merit with commercial potential.

Begin your ROI analysis:
  `.trim();

  const messages = [
    { role: "system", content: "You are a film industry financial analyst with expertise in evaluating the commercial potential of creative projects." },
    { role: "user", content: prompt }
  ];

  try {
    const analysis = await callGroqAPI(messages, "ROI Analysis", logTokenUsage, 1500);
    
    return {
      analysis,
      isFallbackResult: false
    };
    
  } catch (error) {
    console.error('Error generating ROI analysis:', error);
    throw new Error(`Failed to generate ROI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Greybrainer Insight Generation
export const generateGreybrainerInsightWithGemini = async (
  movieTitle: string,
  reviewStage: ReviewStage,
  analyses: LayerAnalysisData[],
  logTokenUsage?: LogTokenUsageFn,
): Promise<{ insight: string; isFallbackResult?: boolean }> => {
  const analysisContext = analyses.map(analysis => {
    const score = analysis.userScore || analysis.aiSuggestedScore || 'N/A';
    const text = analysis.editedText || analysis.aiGeneratedText;
    return `**${analysis.title} (${score}/${MAX_SCORE}):** ${text.substring(0, 200)}...`;
  }).join('\n\n');
  
  const prompt = `
Generate a unique "Greybrainer Insight" for "${movieTitle}" (${reviewStage}).

Based on this analysis:
${analysisContext}

Provide a distinctive, thought-provoking insight (150-200 words) that:
1. Offers a fresh perspective on the film's creative elements
2. Connects themes or techniques to broader cinematic trends
3. Provides actionable wisdom for filmmakers or audiences
4. Demonstrates deep understanding of storytelling craft

Make this insight memorable, quotable, and uniquely valuable - something that could only come from deep analysis.

Begin your insight:
  `.trim();

  const messages = [
    { role: "system", content: "You are a visionary film critic and industry thought leader known for profound insights that illuminate the deeper meanings and craft of cinema." },
    { role: "user", content: prompt }
  ];

  try {
    const insight = await callGroqAPI(messages, "Greybrainer Insight", logTokenUsage, 800);
    
    return {
      insight,
      isFallbackResult: false
    };
    
  } catch (error) {
    console.error('Error generating Greybrainer insight:', error);
    throw new Error(`Failed to generate Greybrainer insight: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const generateDetailedReportFromInsightWithGemini = async (
  movieTitle: string,
  reviewStage: ReviewStage,
  insight: string,
  analyses: LayerAnalysisData[],
  logTokenUsage?: LogTokenUsageFn,
): Promise<{ detailedReport: string; isFallbackResult?: boolean }> => {
  const analysisScores = analyses.map(a => 
    `${a.shortTitle}: ${a.userScore || a.aiSuggestedScore || 'N/A'}/${MAX_SCORE}`
  ).join(' | ');
  
  const prompt = `
Expand this Greybrainer Insight into a comprehensive detailed report for "${movieTitle}" (${reviewStage}).

**Core Insight:** ${insight}

**Analysis Scores:** ${analysisScores}

Create a detailed report (400-500 words) that:
1. **Expands the Insight**: Develop the core insight with specific examples and deeper analysis
2. **Contextualizes**: Place the film within broader cinematic, cultural, or industry contexts
3. **Provides Evidence**: Support observations with specific elements from the analysis
4. **Offers Implications**: Discuss what this means for audiences, filmmakers, or the industry
5. **Concludes Meaningfully**: End with a memorable takeaway or call to action

Maintain the insightful, authoritative tone while making it accessible and engaging.

Begin your detailed report:
  `.trim();

  const messages = [
    { role: "system", content: "You are an expert film analyst creating comprehensive reports that blend deep insight with accessible commentary for industry professionals and film enthusiasts." },
    { role: "user", content: prompt }
  ];

  try {
    const detailedReport = await callGroqAPI(messages, "Detailed Report from Insight", logTokenUsage, 1500);
    
    return {
      detailedReport,
      isFallbackResult: false
    };
    
  } catch (error) {
    console.error('Error generating detailed report from insight:', error);
    throw new Error(`Failed to generate detailed report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};