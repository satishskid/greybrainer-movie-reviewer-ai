// Firebase Configuration and Services
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, addDoc, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdWuwH2BAz9nSWVLXyC2uE8qoxl5QU3lY",
  authDomain: "greybrainer.firebaseapp.com",
  projectId: "greybrainer",
  storageBucket: "greybrainer.firebasestorage.app",
  messagingSenderId: "334602682761",
  appId: "1:334602682761:web:a8cc82bd81a753a3392158",
  measurementId: "G-BQ36BCQTTX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// User roles and permissions
export interface GreybrainerUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'editor' | 'analyst' | 'viewer';
  permissions: string[];
  department?: string;
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
}

// Admin emails (your accounts)
const ADMIN_EMAILS = [
  'satish@skids.health',
  'satish.rath@gmail.com',
  'dr.satish@greybrain.ai'
];

// Editor emails
const EDITOR_EMAILS = [
  'drpratichi@skids.health'
];

// Authentication Service
export class FirebaseAuthService {
  
  // Sign in with Google
  async signInWithGoogle(): Promise<GreybrainerUser | null> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user is whitelisted
      const isWhitelisted = await this.isUserWhitelisted(user.email!);
      if (!isWhitelisted) {
        await signOut(auth);
        throw new Error('Access denied. Please contact administrator for access.');
      }
      
      // Create or update user profile
      const greybrainerUser = await this.createOrUpdateUserProfile(user);
      return greybrainerUser;
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }
  
  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }
  
  // Check if user is whitelisted
  async isUserWhitelisted(email: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'whitelist', email));
      return userDoc.exists() && userDoc.data()?.isActive === true;
    } catch (error) {
      console.error('Whitelist check error:', error);
      return false;
    }
  }
  
  // Create or update user profile
  async createOrUpdateUserProfile(user: User): Promise<GreybrainerUser> {
    const email = user.email!;
    const role = this.determineUserRole(email);
    const permissions = this.getPermissionsForRole(role);
    
    const greybrainerUser: GreybrainerUser = {
      uid: user.uid,
      email: email,
      displayName: user.displayName || email.split('@')[0],
      role: role,
      permissions: permissions,
      department: this.getDepartmentForEmail(email),
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true
    };
    
    // Save to Firestore
    await setDoc(doc(db, 'users', user.uid), greybrainerUser, { merge: true });
    
    return greybrainerUser;
  }
  
  // Determine user role based on email
  private determineUserRole(email: string): 'admin' | 'editor' | 'analyst' | 'viewer' {
    if (ADMIN_EMAILS.includes(email)) return 'admin';
    if (EDITOR_EMAILS.includes(email)) return 'editor';
    return 'analyst'; // Default role
  }
  
  // Get permissions for role
  private getPermissionsForRole(role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: ['read', 'write', 'approve', 'manage_users', 'manage_content', 'publish'],
      editor: ['read', 'write', 'edit_content', 'submit_for_approval'],
      analyst: ['read', 'write', 'create_analysis'],
      viewer: ['read']
    };
    return permissions[role] || ['read'];
  }
  
  // Get department for email
  private getDepartmentForEmail(email: string): string {
    if (email.includes('skids.health')) return 'Healthcare Analytics';
    if (email.includes('greybrain.ai')) return 'AI Research';
    return 'Film Analysis';
  }
  
  // Get current user profile
  async getCurrentUserProfile(): Promise<GreybrainerUser | null> {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        return userDoc.data() as GreybrainerUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
  
  // Listen to auth state changes
  onAuthStateChanged(callback: (user: GreybrainerUser | null) => void) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await this.getCurrentUserProfile();
        callback(profile);
      } else {
        callback(null);
      }
    });
  }
}

// Whitelist Management Service
export class WhitelistService {
  
  // Add user to whitelist
  async addUserToWhitelist(email: string, addedBy: string, role: string = 'analyst'): Promise<void> {
    const whitelistEntry = {
      email: email,
      isActive: true,
      role: role,
      addedBy: addedBy,
      addedAt: new Date(),
      lastUpdated: new Date()
    };
    
    await setDoc(doc(db, 'whitelist', email), whitelistEntry);
  }
  
  // Remove user from whitelist
  async removeUserFromWhitelist(email: string): Promise<void> {
    await deleteDoc(doc(db, 'whitelist', email));
  }
  
  // Update user status
  async updateUserStatus(email: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(db, 'whitelist', email), {
      isActive: isActive,
      lastUpdated: new Date()
    });
  }
  
  // Get all whitelisted users
  async getAllWhitelistedUsers(): Promise<any[]> {
    const q = query(collection(db, 'whitelist'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

// Content Management Service
export class ContentService {
  
  // Create new report
  async createReport(reportData: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'reports'), {
      ...reportData,
      createdAt: new Date(),
      status: 'draft',
      viewCount: 0
    });
    return docRef.id;
  }
  
  // Update report
  async updateReport(reportId: string, updates: any): Promise<void> {
    await updateDoc(doc(db, 'reports', reportId), {
      ...updates,
      lastUpdated: new Date()
    });
  }
  
  // Get reports by status
  async getReportsByStatus(status: string): Promise<any[]> {
    const q = query(
      collection(db, 'reports'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  // Get published reports
  async getPublishedReports(limitCount: number = 10): Promise<any[]> {
    const q = query(
      collection(db, 'reports'),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  // Approve report for publication
  async approveReport(reportId: string, approvedBy: string): Promise<void> {
    await updateDoc(doc(db, 'reports', reportId), {
      status: 'published',
      approvedBy: approvedBy,
      publishedAt: new Date(),
      lastUpdated: new Date()
    });
  }
}

// Subscription Service
export class SubscriptionService {
  
  // Add subscriber
  async addSubscriber(email: string, preferences: string[] = ['reviews', 'research']): Promise<void> {
    const subscriberData = {
      email: email,
      subscribedAt: new Date(),
      preferences: preferences,
      isActive: true,
      emailVerified: false
    };
    
    await setDoc(doc(db, 'subscribers', email), subscriberData);
  }
  
  // Get subscriber count
  async getSubscriberCount(): Promise<number> {
    const q = query(collection(db, 'subscribers'), where('isActive', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }
  
  // Get all active subscribers
  async getActiveSubscribers(): Promise<any[]> {
    const q = query(collection(db, 'subscribers'), where('isActive', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

// Initialize services
export const authService = new FirebaseAuthService();
export const whitelistService = new WhitelistService();
export const contentService = new ContentService();
export const subscriptionService = new SubscriptionService();

// Export auth state listener
export { onAuthStateChanged } from 'firebase/auth';