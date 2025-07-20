


import { ReviewLayer, LayerAnalysisData, ReviewStage, TokenBudgetConfig, MonthlyScoreboardItem } from './types';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { CameraIcon } from './components/icons/CameraIcon';
import { UsersIcon } from './components/icons/UsersIcon';

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash';
export const MAX_SCORE = 10; // Define a maximum score for layers

export const LAYER_DEFINITIONS: Omit<LayerAnalysisData, 'aiGeneratedText' | 'editedText' | 'isLoading' | 'error' | 'userScore' | 'groundingSources' | 'aiSuggestedScore' | 'improvementSuggestions' | 'vonnegutShape'>[] = [
  {
    id: ReviewLayer.STORY,
    title: 'Magic of Story/Script',
    shortTitle: 'Story',
    description: 'Core idea, narrative, themes, character arcs, originality.',
    icon: BookOpenIcon,
  },
  {
    id: ReviewLayer.CONCEPTUALIZATION,
    title: 'Magic of Conceptualization',
    shortTitle: 'Concept',
    description: "Director's vision, editing, casting, overall presentation.",
    icon: CameraIcon,
  },
  {
    id: ReviewLayer.PERFORMANCE,
    title: 'Magic of Performance/Execution',
    shortTitle: 'Performance',
    description: 'Acting, music, cinematography, effects, choreography.',
    icon: UsersIcon,
  },
];

export const initialLayerAnalyses = (): LayerAnalysisData[] =>
  LAYER_DEFINITIONS.map(def => ({
    ...def,
    aiGeneratedText: '',
    editedText: '',
    isLoading: false,
    error: null,
    aiSuggestedScore: undefined, 
    userScore: undefined, 
    groundingSources: [], 
    improvementSuggestions: undefined,
    vonnegutShape: undefined, 
  }));

export const REVIEW_STAGES_OPTIONS: { value: ReviewStage; label: string }[] = [
  { value: ReviewStage.IDEA_ANNOUNCEMENT, label: 'Idea Announcement' },
  { value: ReviewStage.TRAILER, label: 'Trailer Analysis' },
  { value: ReviewStage.MOVIE_RELEASED, label: 'Full Movie/Series Review' },
];

export const LAYER_SHORT_NAMES: Record<ReviewLayer, string> = {
  [ReviewLayer.STORY]: 'Story',
  [ReviewLayer.CONCEPTUALIZATION]: 'Concept',
  [ReviewLayer.PERFORMANCE]: 'Performance',
};

export const COMMON_GENRES: string[] = [
  'Action',
  'Adventure',
  'Animation',
  'Biography',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'Film Noir',
  'Historical',
  'Horror',
  'Musical',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Sport',
  'Superhero',
  'Thriller',
  'War',
  'Western',
];

export const INITIAL_TOKEN_BUDGET_CONFIG: TokenBudgetConfig = {
  isEnabled: false,
  freeTierQueriesPerDay: undefined, 
  freeTierQueriesPerMinute: undefined, 
  lastDailyResetTimestamp: Date.now(),
};

export const CHARS_PER_TOKEN_ESTIMATE = 4;
export const MAX_TOKEN_LOG_ENTRIES = 50; 

export const MAGIC_QUOTIENT_DISCLAIMER = "This analysis is AI-generated and highly subjective. It aims to provide creative feedback and identify potential areas of strength or development based on common storytelling principles. It is not a predictor of actual market success or failure, as real-world outcomes are influenced by countless factors including execution, marketing, and audience reception. Use these insights as a tool for further thought and refinement.";

export const MOCK_MONTHLY_SCOREBOARD_DATA: MonthlyScoreboardItem[] = [
  { 
    id: 'msi001', 
    title: 'Cosmic Drifters: Season 2', 
    type: 'Web Series', 
    platform: 'Netflix', 
    releaseMonth: 'July 2024', 
    greybrainerScore: 9.3, 
    posterUrl: 'https://via.placeholder.com/150x220/1a1a2e/FFFFFF?text=Cosmic+Drifters+S2', 
    summary: 'The acclaimed sci-fi saga returns, delving deeper into the mysteries of the void and the resilience of its diverse crew.',
    country: 'USA',
    language: 'English',
  },
  { 
    id: 'msi002', 
    title: 'The Clockwork Heart', 
    type: 'Movie', 
    platform: 'Theatrical', 
    releaseMonth: 'July 2024', 
    greybrainerScore: 8.8, 
    posterUrl: 'https://via.placeholder.com/150x220/2e1a1a/FFFFFF?text=Clockwork+Heart', 
    summary: 'A visually stunning steampunk fantasy about an inventor who creates a mechanical heart to save his dying daughter.',
    country: 'USA',
    language: 'English', 
  },
  { 
    id: 'msi003', 
    title: 'Echoes of the Past', 
    type: 'Web Series', 
    platform: 'Amazon Prime Video', 
    releaseMonth: 'July 2024', 
    greybrainerScore: 8.5, 
    posterUrl: 'https://via.placeholder.com/150x220/1a2e1a/FFFFFF?text=Echoes+Past', 
    summary: 'A gripping historical drama series uncovering long-buried secrets that resonate with present-day implications.',
    country: 'UK',
    language: 'English',
  },
  { 
    id: 'msi004', 
    title: 'ByteSize Laughs', 
    type: 'Web Series', 
    platform: 'YouTube Originals', 
    releaseMonth: 'July 2024', 
    greybrainerScore: 7.9, 
    posterUrl: 'https://via.placeholder.com/150x220/2e2e1a/FFFFFF?text=ByteSize+Laughs', 
    summary: 'An animated comedy anthology delivering witty shorts perfect for a quick entertainment fix.',
    country: 'Canada',
    language: 'English',
  },
   { 
    id: 'msi005', 
    title: 'Midnight Sun Murders', 
    type: 'Movie', 
    platform: 'Hulu', 
    releaseMonth: 'July 2024', 
    greybrainerScore: 9.0, 
    posterUrl: 'https://via.placeholder.com/150x220/1a2e2e/FFFFFF?text=Midnight+Sun', 
    summary: 'A chilling Nordic noir thriller where a detective races against time under the perpetual summer daylight.',
    country: 'Sweden',
    language: 'Swedish',
  },
  {
    id: 'msi006',
    title: 'Kalki 2898 AD',
    type: 'Movie',
    platform: 'Theatrical',
    releaseMonth: 'June 2024',
    greybrainerScore: 9.5,
    posterUrl: 'https://via.placeholder.com/150x220/3d2e3d/FFFFFF?text=Kalki+2898+AD',
    summary: 'A futuristic sci-fi epic blending mythology with high-octane action, set in a dystopian world.',
    country: 'India',
    region: 'Andhra Pradesh', 
    language: 'Telugu',
  },
  {
    id: 'msi007',
    title: 'Mirzapur: Season 3',
    type: 'Web Series',
    platform: 'Amazon Prime Video',
    releaseMonth: 'July 2024',
    greybrainerScore: 9.2,
    posterUrl: 'https://via.placeholder.com/150x220/2c3e50/FFFFFF?text=Mirzapur+S3',
    summary: 'The saga of power, crime, and ambition continues in the lawless city of Mirzapur.',
    country: 'India',
    region: 'Uttar Pradesh', 
    language: 'Hindi',
  },
  {
    id: 'msi008',
    title: 'Maharaja',
    type: 'Movie',
    platform: 'Theatrical',
    releaseMonth: 'June 2024',
    greybrainerScore: 8.7,
    posterUrl: 'https://via.placeholder.com/150x220/8e44ad/FFFFFF?text=Maharaja',
    summary: 'An action-packed drama centered around a common man rising against injustice.',
    country: 'India',
    region: 'Tamil Nadu',
    language: 'Tamil',
  },
  {
    id: 'msi009',
    title: 'Berlin',
    type: 'Web Series',
    platform: 'Netflix',
    releaseMonth: 'December 2023', 
    greybrainerScore: 8.9,
    posterUrl: 'https://via.placeholder.com/150x220/c0392b/FFFFFF?text=Berlin',
    summary: 'A prequel to "Money Heist," focusing on the character Berlin and his earlier heists.',
    country: 'Spain',
    language: 'Spanish',
  },
  {
    id: 'msi010',
    title: 'Manjummel Boys',
    type: 'Movie',
    platform: 'Disney+ Hotstar', 
    releaseMonth: 'February 2024',
    greybrainerScore: 9.4,
    posterUrl: 'https://via.placeholder.com/150x220/16a085/FFFFFF?text=Manjummel+Boys',
    summary: 'A survival thriller based on a true story of a group of friends trapped in Guna Caves.',
    country: 'India',
    region: 'Kerala',
    language: 'Malayalam',
  },
   {
    id: 'msi011',
    title: 'La Maison',
    type: 'Web Series',
    platform: 'Apple TV+',
    releaseMonth: 'August 2024',
    greybrainerScore: 8.6,
    posterUrl: 'https://via.placeholder.com/150x220/e67e22/FFFFFF?text=La+Maison',
    summary: 'A dramatic look inside a legendary French fashion house navigating modern challenges.',
    country: 'France',
    language: 'French',
  },
  {
    id: 'msi012',
    title: 'Kung Fu Panda 4',
    type: 'Movie',
    platform: 'Theatrical',
    releaseMonth: 'March 2024',
    greybrainerScore: 7.8,
    posterUrl: 'https://via.placeholder.com/150x220/f1c40f/000000?text=KFP4',
    summary: 'Po trains a new Dragon Warrior while facing a formidable new villain, the Chameleon.',
    country: 'USA',
    language: 'English',
  },
];
