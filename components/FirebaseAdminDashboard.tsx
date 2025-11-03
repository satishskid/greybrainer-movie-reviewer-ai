import React, { useState, useEffect } from 'react';
import { whitelistService, contentService, subscriptionService, GreybrainerUser } from '../services/firebaseConfig';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { MailIcon } from './icons/MailIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { EyeIcon } from './icons/EyeIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { LoadingSpinner } from './LoadingSpinner';


interface DashboardStats {
  pendingApprovals: number;
  publishedThisMonth: number;
  totalSubscribers: number;
  totalViews: number;
}

interface PendingReport {
  id: string;
  title: string;
  type: string;
  editor: string;
  submittedAt: Date;
  status: string;
}

interface FirebaseAdminDashboardProps {
  currentUser: GreybrainerUser;
}

export const FirebaseAdminDashboard: React.FC<FirebaseAdminDashboardProps> = ({ currentUser }) => {
  const [stats, setStats] = useState<DashboardStats>({
    pendingApprovals: 0,
    publishedThisMonth: 0,
    totalSubscribers: 0,
    totalViews: 0
  });
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [whitelistedUsers, setWhitelistedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'editorial' | 'users' | 'subscribers'>('overview');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('analyst');
  const [isAddingUser, setIsAddingUser] = useState(false);


  useEffect(() => {
    if (currentUser.role === 'admin') {
      loadDashboardData();
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [
        pendingReportsData,
        subscriberCount,
        whitelistData
      ] = await Promise.all([
        contentService.getReportsByStatus('in_review'),
        subscriptionService.getSubscriberCount(),
        whitelistService.getAllWhitelistedUsers()
      ]);

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const publishedReports = await contentService.getReportsByStatus('published');
      const publishedThisMonth = publishedReports.filter(report => {
        const publishedDate = new Date(report.publishedAt);
        return publishedDate.getMonth() === currentMonth && publishedDate.getFullYear() === currentYear;
      }).length;

      const totalViews = publishedReports.reduce((sum, report) => sum + (report.viewCount || 0), 0);

      setStats({
        pendingApprovals: pendingReportsData.length,
        publishedThisMonth,
        totalSubscribers: subscriberCount,
        totalViews
      });

      setPendingReports(pendingReportsData);
      setWhitelistedUsers(whitelistData);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReport = async (reportId: string) => {
    try {
      await contentService.approveReport(reportId, currentUser.email);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error approving report:', error);
    }
  };

  const handleRejectReport = async (reportId: string) => {
    try {
      await contentService.updateReport(reportId, { status: 'rejected', rejectedBy: currentUser.email });
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting report:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    setIsAddingUser(true);
    try {
      await whitelistService.addUserToWhitelist(newUserEmail, currentUser.email, newUserRole);
      setNewUserEmail('');
      setNewUserRole('analyst');
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error adding user:', error);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleToggleUserStatus = async (email: string, currentStatus: boolean) => {
    try {
      await whitelistService.updateUserStatus(email, !currentStatus);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <LoadingSpinner />
        <p className="text-slate-300 mt-4">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>
          <p className="text-slate-300">Manage content, users, and platform settings</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAdminSettings(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            ⚙️ System Settings
          </button>
          <div className="text-sm text-slate-500">
            Welcome back, {currentUser.displayName}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Pending Approvals</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingApprovals}</p>
            </div>
            <DocumentTextIcon className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Published This Month</p>
              <p className="text-2xl font-bold text-green-600">{stats.publishedThisMonth}</p>
            </div>
            <CheckIcon className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Total Subscribers</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalSubscribers}</p>
            </div>
            <MailIcon className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Total Views</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalViews.toLocaleString()}</p>
            </div>
            <EyeIcon className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-600">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'editorial', label: 'Editorial Queue', icon: '📝' },
            { id: 'users', label: 'User Management', icon: '👥' },
            { id: 'subscribers', label: 'Subscribers', icon: '📧' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-slate-700 rounded-lg border border-slate-600 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {pendingReports.slice(0, 5).map((report) => (
                <div key={report.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-100">{report.title}</p>
                    <p className="text-sm text-slate-300">by {report.editor}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(report.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {pendingReports.length === 0 && (
                <p className="text-slate-500 text-center py-4">No pending reports</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-700 rounded-lg border border-slate-600 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setActiveTab('editorial')}
                className="w-full text-left p-3 rounded-lg border border-slate-600 hover:bg-slate-50 transition-colors"
              >
                <div className="font-medium text-slate-100">Review Pending Content</div>
                <div className="text-sm text-slate-300">{stats.pendingApprovals} items waiting for approval</div>
              </button>
              
              <button 
                onClick={() => setActiveTab('users')}
                className="w-full text-left p-3 rounded-lg border border-slate-600 hover:bg-slate-50 transition-colors"
              >
                <div className="font-medium text-slate-100">Manage Users</div>
                <div className="text-sm text-slate-300">{whitelistedUsers.length} users in whitelist</div>
              </button>
              
              <button 
                onClick={() => setActiveTab('subscribers')}
                className="w-full text-left p-3 rounded-lg border border-slate-600 hover:bg-slate-50 transition-colors"
              >
                <div className="font-medium text-slate-100">View Subscribers</div>
                <div className="text-sm text-slate-300">{stats.totalSubscribers} active subscribers</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'editorial' && (
        <div className="bg-slate-700 rounded-lg border border-slate-600">
          <div className="p-6 border-b border-slate-600">
            <h3 className="text-lg font-semibold text-slate-100">Editorial Queue</h3>
            <p className="text-slate-300">Review and approve content for publication</p>
          </div>
          
          <div className="divide-y divide-slate-200">
            {pendingReports.map((report) => (
              <div key={report.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-100 mb-1">{report.title}</h4>
                    <div className="flex items-center space-x-4 text-sm text-slate-300 mb-3">
                      <span>Type: {report.type}</span>
                      <span>Editor: {report.editor}</span>
                      <span className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        {new Date(report.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleApproveReport(report.id)}
                      className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                    >
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectReport(report.id)}
                      className="flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                    >
                      <XIcon className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {pendingReports.length === 0 && (
              <div className="p-12 text-center">
                <DocumentTextIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">No reports pending approval</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Add User Form */}
          <div className="bg-slate-700 rounded-lg border border-slate-600 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Add New User</h3>
            <form onSubmit={handleAddUser} className="flex gap-4">
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                required
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="analyst">Analyst</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={isAddingUser}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {isAddingUser ? 'Adding...' : 'Add User'}
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="bg-slate-700 rounded-lg border border-slate-600">
            <div className="p-6 border-b border-slate-600">
              <h3 className="text-lg font-semibold text-slate-100">Whitelisted Users</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Added By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {whitelistedUsers.map((user) => (
                    <tr key={user.email}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{user.addedBy}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleToggleUserStatus(user.email, user.isActive)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            user.isActive 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subscribers' && (
        <div className="bg-slate-700 rounded-lg border border-slate-600 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Subscriber Management</h3>
          <div className="text-center py-8">
            <MailIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-100 mb-2">{stats.totalSubscribers} Active Subscribers</p>
            <p className="text-slate-300">Subscriber management features coming soon</p>
          </div>
        </div>
      )}


    </div>
  );
};