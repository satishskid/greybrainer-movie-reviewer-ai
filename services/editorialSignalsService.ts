import { MovieSuggestion } from '../types';

export interface EditorialSignals {
  newReleases: MovieSuggestion[];
  trendingMovies: MovieSuggestion[];
  critiqueTopics: string[];
}

const editorialSignals: EditorialSignals = {
  newReleases: [
    { title: 'Laapataa Ladies', year: '2024', type: 'Movie' },
    { title: 'Maharaja', year: '2024', type: 'Movie' },
    { title: 'Kill', year: '2024', type: 'Movie' },
    { title: 'Stree 2', year: '2024', type: 'Movie' },
    { title: 'Manjummel Boys', year: '2024', type: 'Movie' },
    { title: 'All We Imagine as Light', year: '2024', type: 'Movie' },
  ],
  trendingMovies: [
    { title: 'Pushpa 2: The Rule', year: '2024', type: 'Movie' },
    { title: 'The Family Man', type: 'Series' },
    { title: 'Heeramandi', type: 'Series' },
    { title: 'Animal', year: '2023', type: 'Movie' },
    { title: 'Court: State vs A Nobody', type: 'Movie' },
    { title: '12th Fail', year: '2023', type: 'Movie' },
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
    const key = `${movie.title}`.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const dedupeTopics = (topics: string[]) => Array.from(new Set(topics.map((topic) => topic.trim()).filter(Boolean)));

export const getEditorialSignals = (): EditorialSignals => editorialSignals;

export const getEditorialSuggestionSummary = () => ({
  movies: dedupeMovies([...editorialSignals.newReleases, ...editorialSignals.trendingMovies]),
  topics: dedupeTopics(editorialSignals.critiqueTopics),
});
