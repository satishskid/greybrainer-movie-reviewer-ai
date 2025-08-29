// Simple hardcoded authentication service
import testUsersData from '../../testUsers.json';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  department: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

class AuthService {
  private currentUser: User | null = null;
  private listeners: ((authState: AuthState) => void)[] = [];

  constructor() {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('greybrainer_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('greybrainer_user');
      }
    }
  }

  // Subscribe to auth state changes
  onAuthStateChanged(callback: (authState: AuthState) => void) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.getAuthState());
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get current auth state
  getAuthState(): AuthState {
    return {
      isAuthenticated: this.currentUser !== null,
      user: this.currentUser
    };
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        const user = testUsersData.testUsers.find(
          u => u.email === email && u.password === password
        );

        if (user) {
          const authUser: User = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department
          };
          
          this.currentUser = authUser;
          localStorage.setItem('greybrainer_user', JSON.stringify(authUser));
          this.notifyListeners();
          resolve(authUser);
        } else {
          reject(new Error('Invalid email or password'));
        }
      }, 500); // 500ms delay to simulate network request
    });
  }

  // Sign out
  async signOut(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = null;
        localStorage.removeItem('greybrainer_user');
        this.notifyListeners();
        resolve();
      }, 200);
    });
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // Notify all listeners of auth state change
  private notifyListeners() {
    const authState = this.getAuthState();
    this.listeners.forEach(listener => listener(authState));
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;