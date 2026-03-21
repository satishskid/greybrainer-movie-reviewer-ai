import { collection, query, orderBy, limit, getDocs, setDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { DistributionPack, MovieSuggestion } from '../types';

export interface NewsletterEntry {
  id: string; // e.g. "YYYY-MM-DD"
  createdAt: Timestamp;
  title: string;
  themes: string;
  content: string;
  suggestedReviews?: MovieSuggestion[];
  suggestedResearchTopics?: string[];
  distributionPack?: DistributionPack;
}

const NEWSLETTER_COLLECTION = 'daily_newsletters';

/**
 * Save a generated daily newsletter to Firestore.
 */
export const saveDailyNewsletter = async (
  dateStr: string,
  title: string,
  themes: string,
  content: string,
  suggestedReviews?: MovieSuggestion[],
  suggestedResearchTopics?: string[],
  distributionPack?: DistributionPack
): Promise<void> => {
  try {
    const docRef = doc(db, NEWSLETTER_COLLECTION, dateStr);
    await setDoc(docRef, {
      id: dateStr,
      title,
      themes,
      content,
      suggestedReviews: suggestedReviews || [],
      suggestedResearchTopics: suggestedResearchTopics || [],
      ...(distributionPack ? { distributionPack } : {}),
      createdAt: Timestamp.now()
    });
    console.log(`Saved newsletter for ${dateStr}`);
  } catch (error) {
    console.error('Error saving newsletter:', error);
    throw new Error('Failed to save the daily newsletter.');
  }
};

/**
 * Fetch the past N newsletters to use as RAG context.
 */
export const fetchPastNewslettersContext = async (days: number = 7): Promise<string> => {
  try {
    const q = query(
      collection(db, NEWSLETTER_COLLECTION),
      orderBy('id', 'desc'),
      limit(days)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return "No past newsletters found in the database yet.";
    }

    const pastNewsletters: string[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as NewsletterEntry;
      pastNewsletters.push(`- [${data.id}] ${data.title} (Themes: ${data.themes})`);
    });

    return pastNewsletters.join('\n');
  } catch (error) {
    console.error('Error fetching past newsletters:', error);
    return "Error retrieving past content. Assume no past context is available.";
  }
};

/**
 * Check if today's newsletter already exists
 */
export const getNewsletterByDate = async (dateStr: string): Promise<NewsletterEntry | null> => {
  try {
    const docRef = doc(db, NEWSLETTER_COLLECTION, dateStr);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as NewsletterEntry;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const saveNewsletterDistributionPack = async (
  dateStr: string,
  distributionPack: DistributionPack
): Promise<void> => {
  try {
    const docRef = doc(db, NEWSLETTER_COLLECTION, dateStr);
    await setDoc(docRef, { distributionPack }, { merge: true });
  } catch (error) {
    console.error('Error saving newsletter distribution pack:', error);
    throw new Error('Failed to save the distribution pack.');
  }
};

export const fetchRecentNewsletterSuggestions = async (
  days: number = 14
): Promise<{ movies: MovieSuggestion[]; topics: string[] }> => {
  try {
    const runQuery = async (orderField: 'id' | 'createdAt') => {
      const q = query(
        collection(db, NEWSLETTER_COLLECTION),
        orderBy(orderField, 'desc'),
        limit(days)
      );
      return getDocs(q);
    };

    let querySnapshot;
    try {
      querySnapshot = await runQuery('id');
    } catch (e) {
      querySnapshot = await runQuery('createdAt');
    }
    if (querySnapshot.empty) {
      return { movies: [], topics: [] };
    }

    const movieMap = new Map<string, MovieSuggestion>();
    const topicSet = new Set<string>();

    querySnapshot.forEach((d) => {
      const data = d.data() as NewsletterEntry;

      const rawMovies =
        Array.isArray((data as any).suggestedReviews) ? (data as any).suggestedReviews :
        Array.isArray((data as any).suggestedMovies) ? (data as any).suggestedMovies :
        Array.isArray((data as any).suggestedMovieReviews) ? (data as any).suggestedMovieReviews :
        [];

      const rawTopics =
        Array.isArray((data as any).suggestedResearchTopics) ? (data as any).suggestedResearchTopics :
        Array.isArray((data as any).suggestedTopics) ? (data as any).suggestedTopics :
        Array.isArray((data as any).suggestedResearch) ? (data as any).suggestedResearch :
        [];

      const movies: MovieSuggestion[] = (rawMovies as any[])
        .map((m) => {
          if (typeof m === 'string') return { title: m.trim() };
          if (!m || typeof m !== 'object') return null;
          const title = typeof (m as any).title === 'string' ? (m as any).title.trim() : '';
          if (!title) return null;
          const yearRaw = (m as any).year;
          const year = typeof yearRaw === 'string' ? yearRaw.trim() : (typeof yearRaw === 'number' ? String(yearRaw) : undefined);
          const director = typeof (m as any).director === 'string' ? (m as any).director.trim() : undefined;
          const type = (m as any).type === 'Movie' || (m as any).type === 'Series' ? (m as any).type : undefined;
          const description = typeof (m as any).description === 'string' ? (m as any).description.trim() : undefined;
          return { title, year, director, type, description } as MovieSuggestion;
        })
        .filter((m): m is MovieSuggestion => !!m && typeof m.title === 'string' && m.title.length > 0);

      const topics: string[] = (rawTopics as any[])
        .filter((t) => typeof t === 'string' && t.trim().length > 0)
        .map((t) => (t as string).trim());

      movies.forEach((m) => {
        if (!m || typeof m.title !== 'string') return;
        const key = m.title.trim().toLowerCase();
        if (!key) return;
        if (!movieMap.has(key)) {
          movieMap.set(key, { ...m, title: m.title.trim() });
        }
      });

      topics.forEach((t) => {
        if (typeof t !== 'string') return;
        const cleaned = t.trim();
        if (cleaned) topicSet.add(cleaned);
      });
    });

    return { movies: Array.from(movieMap.values()), topics: Array.from(topicSet.values()) };
  } catch (error) {
    console.error('Error fetching newsletter suggestions:', error);
    return { movies: [], topics: [] };
  }
};
