import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface UserRole {
  role: 'admin' | 'editor' | 'analyst' | 'viewer';
  permissions: string[];
  department?: string;
}

export class AdminService {
  /**
   * Check if user is admin based on Firebase user data
   */
  static async isUserAdmin(user: User | null): Promise<boolean> {
    if (!user?.email) return false;
    
    try {
      // First check the hardcoded admin emails for immediate response
      const ADMIN_EMAILS = [
        'satish@skids.health',
        'satish.rath@gmail.com'
      ];
      
      if (ADMIN_EMAILS.includes(user.email)) {
        return true;
      }
      
      // Then check Firebase database for role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.role === 'admin';
      }
      
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
  
  /**
   * Get user role from Firebase
   */
  static async getUserRole(user: User | null): Promise<UserRole | null> {
    if (!user?.email) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          role: userData.role || 'viewer',
          permissions: userData.permissions || ['read'],
          department: userData.department
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }
  
  /**
   * Check if user has specific permission
   */
  static async hasPermission(user: User | null, permission: string): Promise<boolean> {
    const userRole = await this.getUserRole(user);
    return userRole?.permissions.includes(permission) || false;
  }
  
  /**
   * Synchronous admin check for immediate UI updates (uses email-based check)
   */
  static isAdminSync(user: User | null): boolean {
    if (!user?.email) return false;
    
    const ADMIN_EMAILS = [
      'satish@skids.health',
      'satish.rath@gmail.com'
    ];
    
    return ADMIN_EMAILS.includes(user.email);
  }
  
  /**
   * Synchronous editor check for immediate UI updates (uses email-based check)
   */
  static isEditorSync(user: User | null): boolean {
    if (!user?.email) return false;
    
    const EDITOR_EMAILS = [
      'drpratichi@skids.health',
      'saminamisra@gmail.com'
    ];
    
    return EDITOR_EMAILS.includes(user.email) || this.isAdminSync(user);
  }
}