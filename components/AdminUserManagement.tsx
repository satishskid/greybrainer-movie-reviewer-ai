import React, { useState, useEffect } from 'react';
import { User } from '../src/services/authService';
import { userWhitelistService } from '../services/userWhitelistService';
import { UsersIcon } from './icons/UsersIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { LoadingSpinner } from './LoadingSpinner';

interface AdminUserManagementProps {
  currentUser: User;
}

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

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<WhitelistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'tester',
    department: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const whitelistUsers = await userWhitelistService.getAllUsers();
      setUsers(whitelistUsers);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.name || !newUser.department) {
      setError('Please fill in all required fields');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      await userWhitelistService.addUser({
        ...newUser,
        addedBy: currentUser.email,
        status: 'pending' as const
      });
      
      setNewUser({ email: '', name: '', role: 'tester', department: '' });
      setShowAddForm(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: 'active' | 'suspended') => {
    try {
      await userWhitelistService.updateUserStatus(userId, status);
      await loadUsers();
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the whitelist?')) {
      return;
    }

    try {
      await userWhitelistService.removeUser(userId);
      await loadUsers();
    } catch (err) {
      setError('Failed to remove user');
    }
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg">
        <p className="text-red-300">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <UsersIcon className="w-8 h-8 text-indigo-400 mr-3" />
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">User Whitelist Management</h2>
            <p className="text-slate-400">Manage platform access for users</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Add User Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="tester">Tester</option>
                  <option value="analyst">Analyst</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Film Analysis"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center"
                >
                  {isAdding ? <LoadingSpinner size="sm" /> : 'Add User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-slate-800/70 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
            <p className="text-slate-400 mt-2">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Added</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-100">{user.name}</div>
                        <div className="text-sm text-slate-400">{user.email}</div>
                        <div className="text-xs text-slate-500">{user.department}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-900/50 text-indigo-300">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' ? 'bg-green-900/50 text-green-300' :
                        user.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-red-900/50 text-red-300'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      <div>{user.addedDate}</div>
                      <div className="text-xs">by {user.addedBy}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {user.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateUserStatus(user.id, 'active')}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            title="Approve user"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                        )}
                        {user.status === 'active' && (
                          <button
                            onClick={() => handleUpdateUserStatus(user.id, 'suspended')}
                            className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors"
                            title="Suspend user"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        )}
                        {user.status === 'suspended' && (
                          <button
                            onClick={() => handleUpdateUserStatus(user.id, 'active')}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            title="Reactivate user"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Remove user"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                No users in whitelist. Add some users to get started.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-sm text-slate-500">
        <p>Total users: {users.length}</p>
        <p>Active: {users.filter(u => u.status === 'active').length}</p>
        <p>Pending: {users.filter(u => u.status === 'pending').length}</p>
      </div>
    </div>
  );
};