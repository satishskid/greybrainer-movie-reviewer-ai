import { MovieSuggestion } from '../types';

const getCurrentEditorialCycle = () => {
  const currentYear = new Date().getFullYear();
  return { currentYear, previousYear: currentYear - 1 };
};

const { currentYear, previousYear } = getCurrentEditorialCycle();

export interface EditorialSignals {
  newReleases: MovieSuggestion[];
  trendingMovies: MovieSuggestion[];
  critiqueTopics: string[];
}

const editorialSignals: EditorialSignals = {
  newReleases: [
    { title: 'Toaster', year: String(currentYear), type: 'Movie', source: 'Editorial starter' },
    { title: 'Court: State vs A Nobody', year: String(currentYear), type: 'Movie', source: 'Editorial starter' },
    { title: 'Laapataa Ladies', year: String(previousYear), type: 'Movie', source: 'Editorial starter' },
    { title: 'Maharaja', year: String(previousYear), type: 'Movie', source: 'Editorial starter' },
    { title: 'Kill', year: String(previousYear), type: 'Movie', source: 'Editorial starter' },
    { title: 'Stree 2', year: String(previousYear), type: 'Movie', source: 'Editorial starter' },
    { title: 'Manjummel Boys', year: String(previousYear), type: 'Movie', source: 'Editorial starter' },
    { title: 'All We Imagine as Light', year: String(previousYear), type: 'Movie', source: 'Editorial starter' },
  ],
  trendingMovies: [
    { title: 'Pushpa 2: The Rule', year: String(previousYear), type: 'Movie', source: 'Editorial watchlist' },
    { title: 'The Family Man', type: 'Series', source: 'Editorial watchlist' },
    { title: 'Heeramandi', year: String(previousYear), type: 'Series', source: 'Editorial watchlist' },
    { title: 'Animal', year: String(currentYear - 2), type: 'Movie', source: 'Editorial watchlist' },
    { title: 'Court: State vs A Nobody', year: String(currentYear), type: 'Movie', source: 'Editorial watchlist' },
    { title: '12th Fail', year: String(currentYear - 2), type: 'Movie', source: 'Editorial watchlist' },
  ],
  critiqueTopics: [
    'The impact of interactive storytelling on audience retention and narrative complexity in OTT content',
    'Star-directors: a new paradigm for creative control and artistic agency in Indian cinema',
    'Global reception of regional Indian films beyond the festival circuit and niche audiences',
    'How audience trust shifts when marketing promises outrun the actual film experience',
    'Beyond box office: measuring the afterlife of a film on streaming and social media',
    'How awards, festivals, and streaming platforms reshape the indie discovery pipeline',
    'The economic impact of simultaneous theatrical and OTT releases on mid-budget Indian films',
    'How direct-to-digital premieres are reshaping star power and fan engagement in Indian cinema',
    'The morphokinetic impact of film festivals on regional cinema\'s global footprint',
    'How films sustain cultural discourse long after the opening weekend',
    'The evolving role of star power and social commentary in driving morphokinetic shifts within Indian genre cinema',
    'Sequel fatigue versus franchise loyalty in Indian theatrical culture',
    'Why women-led commercial cinema is becoming a stronger long-tail bet for studios',
  ],
};

const dedupeMovies = (movies: MovieSuggestion[]) => {
  const seen = new Set<string>();
  return movies.filter((movie) => {
    const key = `${movie.title}_${movie.year || ''}`.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const normalizeMovieSearchText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

const parseSuggestionYear = (value?: string): number => {
  const match = value?.match(/\d{4}/);
  return match ? Number.parseInt(match[0], 10) : 0;
};

const editorialMovieComparator = (left: MovieSuggestion, right: MovieSuggestion) => {
  const yearDifference = parseSuggestionYear(right.year) - parseSuggestionYear(left.year);
  if (yearDifference !== 0) {
    return yearDifference;
  }

  const leftTrending = left.source?.toLowerCase().includes('trending') ? 1 : 0;
  const rightTrending = right.source?.toLowerCase().includes('trending') ? 1 : 0;
  if (leftTrending !== rightTrending) {
    return rightTrending - leftTrending;
  }

  return left.title.localeCompare(right.title);
};

const dedupeTopics = (topics: string[]) => Array.from(new Set(topics.map((topic) => topic.trim()).filter(Boolean)));

export const getEditorialSignals = (): EditorialSignals => editorialSignals;

export const getEditorialMovieSuggestions = (query?: string, maxResults: number = 8): MovieSuggestion[] => {
  const normalizedQuery = normalizeMovieSearchText(query || '');
  const allMovies = dedupeMovies([...editorialSignals.newReleases, ...editorialSignals.trendingMovies]);

  const filteredMovies = normalizedQuery
    ? allMovies.filter((movie) => {
        const normalizedTitle = normalizeMovieSearchText(movie.title);
        return normalizedTitle.includes(normalizedQuery)
          || normalizedQuery.split(' ').some((token) => token && normalizedTitle.includes(token));
      })
    : allMovies;

  return [...filteredMovies].sort(editorialMovieComparator).slice(0, maxResults);
};

export const getEditorialSuggestionSummary = () => ({
  movies: getEditorialMovieSuggestions(undefined, 12),
  topics: dedupeTopics(editorialSignals.critiqueTopics),
});
