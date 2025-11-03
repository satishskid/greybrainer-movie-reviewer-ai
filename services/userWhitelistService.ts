// User Whitelist Management Service
// This service manages the whitelist of users who can access the platform

interface WhitelistUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'pending' | 'suspended';
  addedBy: string;
  addedDate: string;
  lastLogin?: string;
}

interface AddUserRequest {
  email: string;
  name: string;
  role: string;
  department: string;
  addedBy: string;
  status: 'active' | 'pending';
}

class UserWhitelistService {
  private readonly STORAGE_KEY = 'greybrainer_whitelist';

  // Get all whitelisted users
  async getAllUsers(): Promise<WhitelistUser[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        // Initialize with default admin user if no whitelist exists
        const defaultUsers = this.getDefaultUsers();
        await this.saveUsers(defaultUsers);
        return defaultUsers;
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading whitelist:', error);
      return this.getDefaultUsers();
    }
  }

  // Add a new user to whitelist
  async addUser(userRequest: AddUserRequest): Promise<WhitelistUser> {
    const users = await this.getAllUsers();
    
    // Check if user already exists
    const existingUser = users.find(u => u.email.toLowerCase() === userRequest.email.toLowerCase());
    if (existingUser) {
      throw new Error('User with this email already exists in whitelist');
    }

    const newUser: WhitelistUser = {
      id: this.generateId(),
      email: userRequest.email,
      name: userRequest.name,
      role: userRequest.role,
      department: userRequest.department,
      status: userRequest.status,
      addedBy: userRequest.addedBy,
      addedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    };

    users.push(newUser);
    await this.saveUsers(users);
    return newUser;
  }

  // Update user status
  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex].status = status;
    await this.saveUsers(users);
  }

  // Remove user from whitelist
  async removeUser(userId: string): Promise<void> {
    const users = await this.getAllUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    
    if (filteredUsers.length === users.length) {
      throw new Error('User not found');
    }

    await this.saveUsers(filteredUsers);
  }

  // Check if user is whitelisted and active
  async isUserWhitelisted(email: string): Promise<boolean> {
    const users = await this.getAllUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return user ? user.status === 'active' : false;
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<WhitelistUser | null> {
    const users = await this.getAllUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  // Update last login time
  async updateLastLogin(email: string): Promise<void> {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date().toISOString().split('T')[0];
      await this.saveUsers(users);
    }
  }

  // Get whitelist statistics
  async getStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    suspended: number;
  }> {
    const users = await this.getAllUsers();
    return {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      pending: users.filter(u => u.status === 'pending').length,
      suspended: users.filter(u => u.status === 'suspended').length,
    };
  }

  // Private helper methods
  private async saveUsers(users: WhitelistUser[]): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving whitelist:', error);
      throw new Error('Failed to save user whitelist');
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getDefaultUsers(): WhitelistUser[] {
    return [
      {
        id: 'admin-default',
        email: 'test6@greybrainer.ai',
        name: 'Frank Miller',
        role: 'admin',
        department: 'Administration',
        status: 'active',
        addedBy: 'system',
        addedDate: new Date().toISOString().split('T')[0],
      },
      {
        id: 'tester-1',
        email: 'test1@greybrainer.ai',
        name: 'Alice Johnson',
        role: 'tester',
        department: 'Product Testing',
        status: 'active',
        addedBy: 'system',
        addedDate: new Date().toISOString().split('T')[0],
      },
      {
        id: 'tester-2',
        email: 'test2@greybrainer.ai',
        name: 'Bob Smith',
        role: 'tester',
        department: 'QA Engineering',
        status: 'active',
        addedBy: 'system',
        addedDate: new Date().toISOString().split('T')[0],
      }
    ];
  }

  // Export whitelist (for backup/migration)
  async exportWhitelist(): Promise<string> {
    const users = await this.getAllUsers();
    return JSON.stringify(users, null, 2);
  }

  // Import whitelist (for backup/migration)
  async importWhitelist(jsonData: string): Promise<void> {
    try {
      const users = JSON.parse(jsonData) as WhitelistUser[];
      // Validate structure
      if (!Array.isArray(users) || !users.every(this.isValidUser)) {
        throw new Error('Invalid whitelist format');
      }
      await this.saveUsers(users);
    } catch (error) {
      throw new Error('Failed to import whitelist: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private isValidUser(user: any): user is WhitelistUser {
    return (
      typeof user === 'object' &&
      typeof user.id === 'string' &&
      typeof user.email === 'string' &&
      typeof user.name === 'string' &&
      typeof user.role === 'string' &&
      typeof user.department === 'string' &&
      ['active', 'pending', 'suspended'].includes(user.status) &&
      typeof user.addedBy === 'string' &&
      typeof user.addedDate === 'string'
    );
  }
}

// Export singleton instance
export const userWhitelistService = new UserWhitelistService();
export default userWhitelistService;