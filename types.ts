export interface SocialSnippets {
  twitter?: string;
  linkedin?: string;
}

export interface MovieSuggestion {
  title: string;
  year?: string;
  director?: string;
  type?: 'Movie' | 'Series';
  description?: string;
}

export enum ReviewLayer {
  STORY = 'STORY',
  CONCEPTUALIZATION = 'CONCEPTUALIZATION',
  PERFORMANCE = 'PERFORMANCE',
}

export enum ReviewStage {
  IDEA_ANNOUNCEMENT = 'Idea Announcement',
  TRAILER = 'Trailer Analysis',
  MOVIE_RELEASED = 'Full Movie/Series Review',
}

export interface PlotPoint {
  time: number;       // Normalized 0.0 (beginning) to 1.0 (end)
  fortune: number;    // Normalized -1.0 (ill fortune) to 1.0 (good fortune)
  description: string; // Brief description of the plot event
}

export interface VonnegutShapeData {
  name: string;
  justification: string;
  plotPoints: PlotPoint[];
}

export interface LayerAnalysisData {
  id: ReviewLayer;
  title: string;
  shortTitle: string; 
  description: string; 
  icon: (props: { className?: string }) => React.ReactNode;
  aiGeneratedText: string;
  editedText: string;
  isLoading: boolean;
  error: string | null;
  aiSuggestedScore?: number; 
  userScore?: number; 
  groundingSources?: GroundingChunkWeb[]; 
  improvementSuggestions?: string | string[];
  vonnegutShape?: VonnegutShapeData;
  isFallbackResult?: boolean; // Added
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
}

export interface GroundingMetadata {
  groundingAttribution?: { 
    web?: GroundingChunkWeb[];
    searchQueries?: string[];
  };
}

export interface PersonnelData {
  director?: string;
  mainCast?: string[];
  sources?: GroundingChunkWeb[]; 
  fetched?: boolean; 
}

export interface ActualPerformanceData {
  rtCriticsScore?: number; // 0-100
  rtAudienceScore?: number; // 0-100
  metacriticScore?: number; // 0-100
  boxOfficePerformanceNotes?: string;
}

export interface FinancialAnalysisData {
  userProvidedBudget?: number; // From MovieAnalysisInput
  fetchedBudget?: number;
  fetchedBudgetCurrency?: string; // e.g., "USD"
  fetchedBudgetSources?: GroundingChunkWeb[];
  fetchedDuration?: string; // e.g., "18 months", "Approx. 2 years"
  fetchedDurationSources?: GroundingChunkWeb[];
  qualitativeROIAnalysis?: string;
  isLoadingBudget?: boolean;
  isLoadingROI?: boolean;
  errorBudget?: string | null;
  errorROI?: string | null;
  isFallbackBudgetResult?: boolean;
  isFallbackROIResult?: boolean;
}

export interface SummaryReportData {
  reportText: string;
  socialSnippets?: SocialSnippets;
  overallImprovementSuggestions?: string | string[];
  actualPerformance?: ActualPerformanceData; 
  financialAnalysis?: FinancialAnalysisData; // Added
  pixarStyleScenes?: string[]; // Added for visual descriptions
  isFallbackResult?: boolean; 
}

export interface MagicFactorAnalysis {
  stakeholderName: string;
  stakeholderType: 'Director' | 'Actor';
  analysisText: string;
  isLoading: boolean;
  error: string | null;
  groundingSources?: GroundingChunkWeb[];
  isFallbackResult?: boolean; // Added
}

export interface CharacterIdea {
  name: string;
  description: string;
}

export interface SceneIdea {
  title: string;
  description: string;
}

export interface CreativeSparkResult {
  id: string; 
  logline: string;
  synopsis: string;
  characterIdeas: CharacterIdea[];
  sceneIdeas: SceneIdea[];
  mindMapMarkdown?: string;
  isFallbackResult?: boolean; // Added
}

export interface TokenUsageEntry {
  id: string;
  timestamp: number;
  operation: string;
  estimatedInputChars: number;
  estimatedOutputChars: number;
  estimatedTokens: number;
}

export interface TokenBudgetConfig {
  isEnabled: boolean;
  freeTierQueriesPerDay?: number;
  freeTierQueriesPerMinute?: number;
  lastDailyResetTimestamp: number;
}

// For Script Magic Quotient Analyzer
export interface ScriptIdeaInput {
  title?: string;
  logline: string;
  synopsis: string;
  genre?: string;
}

export interface SubjectiveScores {
  originality?: number; // 1-10
  audienceAppeal?: number; // 1-10
  criticalReception?: number; // 1-10
}

export interface MagicQuotientAnalysis {
  overallAssessment: string;
  strengths: string[];
  areasForDevelopment: string[];
  actionableSuggestions: string[];
  subjectiveScores: SubjectiveScores;
  generatedDisclaimer: string;
  isFallbackResult?: boolean; // Added
}

// For main movie analysis input
export interface MovieAnalysisInput {
    movieTitle: string;
    reviewStage: ReviewStage;
    productionBudget?: number; // User-provided budget
    enableROIAnalysis?: boolean; // Opt-in for ROI/financial analysis
    year?: string;
    director?: string;
}

// For AI Morphokinetics Analysis
export interface MorphokineticMoment {
  time: number;             // Normalized 0.0 (beginning) to 1.0 (end)
  intensityScore: number;   // 0 (low intensity/calm) to 10 (max intensity/action/emotion)
  emotionalValence: number; // -1 (negative emotion), 0 (neutral), 1 (positive emotion)
  dominantEmotion: string;  // e.g., "Suspense", "Joy", "Anger", "Sadness", "Hopeful"
  eventDescription: string; // Brief description of what's happening or what this moment signifies
  isTwist: boolean;         // True if this moment is a significant plot twist or surprise
  isPacingShift: boolean;   // True if this moment marks a notable change in narrative pacing
}

export interface MorphokineticsAnalysis {
  overallSummary: string;         // AI's textual summary of the movie's dynamic flow, pacing, and emotional journey
  timelineStructureNotes: string; // AI's observations on the film's timeline (linear, non-linear, flashbacks, etc.)
  keyMoments: MorphokineticMoment[]; // Array of ~10-15 key moments defining the film's morphokinetics
  isFallbackResult?: boolean;
}

// For Monthly Magic Scoreboard
export interface MonthlyScoreboardItem {
  id: string;
  title: string;
  type: 'Movie' | 'Web Series';
  platform: string; // e.g., "Netflix", "Amazon Prime", "Theatrical"
  releaseMonth: string; // e.g., "July 2024"
  greybrainerScore: number; // The "Magic Score" from 0-10
  ranking?: number; // Will be calculated
  posterUrl?: string; // Optional URL for a poster image
  summary?: string; // Optional short summary or blurb
  country?: string; // e.g., "USA", "India"
  region?: string; // e.g., "California" (USA), "Tamil Nadu" (India)
  language?: string; // e.g., "English", "Hindi", "Tamil"
}
