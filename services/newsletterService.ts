import { collection, query, orderBy, limit, getDocs, setDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface NewsletterEntry {
  id: string; // e.g. "YYYY-MM-DD"
  createdAt: Timestamp;
  title: string;
  themes: string;
  content: string;
}

const NEWSLETTER_COLLECTION = 'daily_newsletters';

/**
 * Save a generated daily newsletter to Firestore.
 */
export const saveDailyNewsletter = async (
  dateStr: string,
  title: string,
  themes: string,
  content: string
): Promise<void> => {
  try {
    const docRef = doc(db, NEWSLETTER_COLLECTION, dateStr);
    await setDoc(docRef, {
      id: dateStr,
      title,
      themes,
      content,
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
