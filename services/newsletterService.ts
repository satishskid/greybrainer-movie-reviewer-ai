import { collection, query, orderBy, limit, getDocs, setDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { DistributionPack, MovieSuggestion } from '../types';
import { extractNewsletterSuggestionsFromContent } from './geminiService';

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
const DEFAULT_BAAS_API_BASE = 'https://greybrainer-api.satish-9f4.workers.dev';

const getBaasApiBase = () => {
  const envBase = (import.meta as any)?.env?.VITE_GB_BAAS_API_BASE;
  return (typeof envBase === 'string' && envBase.trim().length > 0) ? envBase.trim().replace(/\/+$/, '') : DEFAULT_BAAS_API_BASE;
};

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
    
    // Clean up undefined values before saving to Firestore
    const cleanSuggestedReviews = (suggestedReviews || []).map(review => {
      const cleanReview = { ...review };
      Object.keys(cleanReview).forEach(key => {
        if (cleanReview[key as keyof MovieSuggestion] === undefined) {
          delete cleanReview[key as keyof MovieSuggestion];
        }
      });
      return cleanReview;
    });
    
    const newsletterData: any = {
      id: dateStr,
      title: title || '',
      themes: themes || '',
      content: content || '',
      suggestedReviews: cleanSuggestedReviews,
      suggestedResearchTopics: suggestedResearchTopics || [],
      createdAt: Timestamp.now()
    };
    
    if (distributionPack) {
      // Clean distribution pack of undefined values
      const cleanPack = JSON.parse(JSON.stringify(distributionPack));
      newsletterData.distributionPack = cleanPack;
    }
    
    await setDoc(docRef, newsletterData);
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
    } catch {
      querySnapshot = await runQuery('createdAt');
    }
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

export interface NewsletterPipelineAudit {
  firestore: {
    ok: boolean;
    collection: string;
    fetched: number;
    latestId: string | null;
    withContent: number;
    withSuggestedReviews: number;
    withSuggestedTopics: number;
    withDistributionPack: number;
    movieFieldVariants: string[];
    topicFieldVariants: string[];
    error?: string;
  };
  baas: {
    ok: boolean;
    baseUrl: string;
    latestDate: string | null;
    latestTitle: string | null;
    recentFetched: number | null;
    error?: string;
  };
}

export const runNewsletterPipelineAudit = async (days: number = 30): Promise<NewsletterPipelineAudit> => {
  const firestoreAudit: NewsletterPipelineAudit['firestore'] = {
    ok: false,
    collection: NEWSLETTER_COLLECTION,
    fetched: 0,
    latestId: null,
    withContent: 0,
    withSuggestedReviews: 0,
    withSuggestedTopics: 0,
    withDistributionPack: 0,
    movieFieldVariants: [],
    topicFieldVariants: [],
  };

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
    } catch {
      querySnapshot = await runQuery('createdAt');
    }

    firestoreAudit.fetched = querySnapshot.size;
    const movieFieldSet = new Set<string>();
    const topicFieldSet = new Set<string>();

    querySnapshot.forEach((d) => {
      const data = d.data() as any;
      const id = (typeof data?.id === 'string' && data.id.trim().length > 0) ? data.id.trim() : d.id;
      if (!firestoreAudit.latestId) firestoreAudit.latestId = id;

      if (typeof data?.content === 'string' && data.content.trim().length > 0) firestoreAudit.withContent += 1;
      if (data?.distributionPack && typeof data.distributionPack === 'object') firestoreAudit.withDistributionPack += 1;

      const movieFieldsToCheck = ['suggestedReviews', 'suggestedMovies', 'suggestedMovieReviews'];
      const topicFieldsToCheck = ['suggestedResearchTopics', 'suggestedTopics', 'suggestedResearch'];

      movieFieldsToCheck.forEach((k) => {
        if (Array.isArray(data?.[k]) && data[k].length > 0) movieFieldSet.add(k);
      });
      topicFieldsToCheck.forEach((k) => {
        if (Array.isArray(data?.[k]) && data[k].length > 0) topicFieldSet.add(k);
      });

      const hasMovies =
        (Array.isArray(data?.suggestedReviews) && data.suggestedReviews.length > 0) ||
        (Array.isArray(data?.suggestedMovies) && data.suggestedMovies.length > 0) ||
        (Array.isArray(data?.suggestedMovieReviews) && data.suggestedMovieReviews.length > 0);
      const hasTopics =
        (Array.isArray(data?.suggestedResearchTopics) && data.suggestedResearchTopics.length > 0) ||
        (Array.isArray(data?.suggestedTopics) && data.suggestedTopics.length > 0) ||
        (Array.isArray(data?.suggestedResearch) && data.suggestedResearch.length > 0);

      if (hasMovies) firestoreAudit.withSuggestedReviews += 1;
      if (hasTopics) firestoreAudit.withSuggestedTopics += 1;
    });

    firestoreAudit.movieFieldVariants = Array.from(movieFieldSet.values());
    firestoreAudit.topicFieldVariants = Array.from(topicFieldSet.values());
    firestoreAudit.ok = true;
  } catch (e) {
    firestoreAudit.ok = false;
    firestoreAudit.error = e instanceof Error ? e.message : 'Unknown Firestore error';
  }

  const baasAudit: NewsletterPipelineAudit['baas'] = {
    ok: false,
    baseUrl: getBaasApiBase(),
    latestDate: null,
    latestTitle: null,
    recentFetched: null,
  };

  try {
    const latestRes = await fetch(`${baasAudit.baseUrl}/newsletter/latest`);
    if (!latestRes.ok) {
      throw new Error(`BaaS /newsletter/latest failed (${latestRes.status})`);
    }
    const latest = await latestRes.json() as any;
    baasAudit.latestDate = typeof latest?.date === 'string' ? latest.date : null;
    baasAudit.latestTitle = typeof latest?.title === 'string' ? latest.title : null;

    try {
      const recentRes = await fetch(`${baasAudit.baseUrl}/newsletter/recent?days=${encodeURIComponent(String(days))}`);
      if (recentRes.ok) {
        const recent = await recentRes.json() as any;
        if (Array.isArray(recent)) {
          baasAudit.recentFetched = recent.length;
          if (!baasAudit.latestDate && recent[0]?.date) baasAudit.latestDate = recent[0].date;
          if (!baasAudit.latestTitle && recent[0]?.title) baasAudit.latestTitle = recent[0].title;
        } else if (Array.isArray(recent?.results)) {
          baasAudit.recentFetched = recent.results.length;
        }
      }
    } catch {
    }

    baasAudit.ok = true;
  } catch (e) {
    baasAudit.ok = false;
    baasAudit.error = e instanceof Error ? e.message : 'Unknown BaaS error';
  }

  return { firestore: firestoreAudit, baas: baasAudit };
};

export interface BaasNewsletterRow {
  date: string;
  title: string;
  themes: string;
  content: string;
  is_published?: number;
}

export const fetchBaasRecentNewsletters = async (days: number = 30): Promise<BaasNewsletterRow[]> => {
  const baseUrl = getBaasApiBase();
  const res = await fetch(`${baseUrl}/newsletter/recent?days=${encodeURIComponent(String(days))}`);
  if (!res.ok) {
    throw new Error(`BaaS recent newsletters not available (${res.status})`);
  }
  const payload = await res.json() as any;
  if (Array.isArray(payload)) return payload as BaasNewsletterRow[];
  if (Array.isArray(payload?.results)) return payload.results as BaasNewsletterRow[];
  return [];
};

export const importBaasNewslettersToFirestore = async (days: number = 30): Promise<{ imported: number; skippedExisting: number; failed: number }> => {
  const rows = await fetchBaasRecentNewsletters(days);
  let imported = 0;
  let skippedExisting = 0;
  let failed = 0;

  for (const row of rows) {
    const dateStr = typeof row?.date === 'string' ? row.date.trim() : '';
    if (!dateStr) continue;
    try {
      const existing = await getNewsletterByDate(dateStr);
      if (existing) {
        skippedExisting += 1;
        continue;
      }

      const createdAt = Timestamp.fromDate(new Date(`${dateStr}T00:00:00Z`));
      const docRef = doc(db, NEWSLETTER_COLLECTION, dateStr);
      await setDoc(docRef, {
        id: dateStr,
        title: typeof row?.title === 'string' ? row.title : `Greybrainer Daily - ${dateStr}`,
        themes: typeof row?.themes === 'string' ? row.themes : '',
        content: typeof row?.content === 'string' ? row.content : '',
        suggestedReviews: [],
        suggestedResearchTopics: [],
        createdAt,
      } as any, { merge: true });
      imported += 1;
    } catch {
      failed += 1;
    }
  }

  return { imported, skippedExisting, failed };
};

export const enrichRecentFirestoreNewslettersWithSuggestions = async (
  days: number = 14
): Promise<{ enriched: number; skipped: number; failed: number }> => {
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
  } catch {
    querySnapshot = await runQuery('createdAt');
  }

  let enriched = 0;
  let skipped = 0;
  let failed = 0;

  for (const d of querySnapshot.docs) {
    const data = d.data() as any;
    const id = (typeof data?.id === 'string' && data.id.trim().length > 0) ? data.id.trim() : d.id;
    const hasMovies = Array.isArray(data?.suggestedReviews) && data.suggestedReviews.length > 0;
    const hasTopics = Array.isArray(data?.suggestedResearchTopics) && data.suggestedResearchTopics.length > 0;
    if (hasMovies && hasTopics) {
      skipped += 1;
      continue;
    }

    const title = typeof data?.title === 'string' ? data.title : '';
    const themes = typeof data?.themes === 'string' ? data.themes : '';
    const content = typeof data?.content === 'string' ? data.content : '';
    if (!content.trim()) {
      skipped += 1;
      continue;
    }

    try {
      const extracted = await extractNewsletterSuggestionsFromContent({ title, themes, content });
      const docRef = doc(db, NEWSLETTER_COLLECTION, id);
      await setDoc(docRef, {
        suggestedReviews: extracted.suggestedReviews,
        suggestedResearchTopics: extracted.suggestedResearchTopics,
      } as any, { merge: true });
      enriched += 1;
    } catch {
      failed += 1;
    }
  }

  return { enriched, skipped, failed };
};
