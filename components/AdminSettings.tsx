import React, { useState } from 'react';
import { GeminiModelSelector } from './GeminiModelSelector';
import GeminiDebugTest from './GeminiDebugTest';
import { FirebaseAdminDashboard } from './FirebaseAdminDashboard';
import { getSelectedGeminiModel, checkForNewerModels, getModelInfo } from '../utils/geminiModelStorage';
import { getGeminiApiKeyString, hasGeminiApiKey } from '../utils/geminiKeyStorage';
import { LoadingSpinner } from './LoadingSpinner';

interface AdminSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'models' | 'admin' | 'debug' | 'health'>('models');
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const checkSystemHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const apiKey = getGeminiApiKeyString();
      const currentModel = getSelectedGeminiModel();
      const modelInfo = getModelInfo(currentModel);
      
      const health = {
        timestamp: new Date().toISOString(),
        apiKeyConfigured: hasGeminiApiKey(),
        currentModel: currentModel,
        modelInfo: modelInfo,
        systemStatus: 'operational'
      };

      if (apiKey) {
        try {
          const { hasNewer, newModels } = await checkForNewerModels(apiKey);
          health.newerModelsAvailable = hasNewer;
          health.availableUpdates = newModels;
        } catch (error) {
          health.modelCheckError = error.message;
        }
      }

      setSystemHealth(health);
    } catch (error) {
      setSystemHealth({
        timestamp: new Date().toISOString(),
        error: error.message,
        systemStatus: 'error'
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Admin Settings</h2>
            <p className="text-sm text-slate-400">System configuration and health monitoring</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('models')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'models'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎬 AI Models
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'admin'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👑 Admin Dashboard
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'health'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🏥 System Health
          </button>
          <button
            onClick={() => setActiveTab('debug')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'debug'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔧 Debug Tools
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'models' && (
            <div>
              <h3 className="text-lg font-medium text-slate-100 mb-4">AI Model Configuration</h3>
              <GeminiModelSelector onModelChange={() => {
                // Optional: Show success message or refresh
                console.log('Model changed in admin settings');
              }} />
            </div>
          )}

          {activeTab === 'admin' && currentUser?.role === 'admin' && (
            <div>
              <h3 className="text-lg font-medium text-slate-100 mb-4">Firebase Admin Dashboard</h3>
              <div className="bg-slate-800 rounded-lg p-1">
                <FirebaseAdminDashboard currentUser={currentUser} />
              </div>
            </div>
          )}

          {activeTab === 'admin' && currentUser?.role !== 'admin' && (
            <div className="text-center py-8">
              <p className="text-slate-400">Admin privileges required to access this section.</p>
            </div>
          )}

          {activeTab === 'health' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-100">System Health Monitor</h3>
                <button
                  onClick={checkSystemHealth}
                  disabled={isCheckingHealth}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm rounded transition-colors flex items-center gap-2"
                >
                  {isCheckingHealth ? <LoadingSpinner size="sm" /> : '🔍'}
                  {isCheckingHealth ? 'Checking...' : 'Check Health'}
                </button>
              </div>

              {systemHealth && (
                <div className="space-y-4">
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="font-medium text-slate-200 mb-3">System Status</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Status:</span>
                        <span className={`ml-2 font-medium ${
                          systemHealth.systemStatus === 'operational' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {systemHealth.systemStatus === 'operational' ? '✅ Operational' : '❌ Error'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Last Check:</span>
                        <span className="ml-2 text-slate-200">
                          {new Date(systemHealth.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">API Key:</span>
                        <span className={`ml-2 font-medium ${
                          systemHealth.apiKeyConfigured ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {systemHealth.apiKeyConfigured ? '✅ Configured' : '⚠️ Not Set'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Current Model:</span>
                        <span className="ml-2 text-slate-200">{systemHealth.currentModel}</span>
                      </div>
                    </div>
                  </div>

                  {systemHealth.modelInfo && (
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <h4 className="font-medium text-slate-200 mb-3">Model Information</h4>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-slate-400">Name:</span>
                          <span className="ml-2 text-slate-200">{systemHealth.modelInfo.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Description:</span>
                          <span className="ml-2 text-slate-200">{systemHealth.modelInfo.description}</span>
                        </div>
                        {systemHealth.modelInfo.isRecommended && (
                          <div className="text-green-400 text-xs">⭐ Recommended for film analysis</div>
                        )}
                        {systemHealth.modelInfo.isDeprecated && (
                          <div className="text-yellow-400 text-xs">⚠️ Deprecated - consider upgrading</div>
                        )}
                      </div>
                    </div>
                  )}

                  {systemHealth.newerModelsAvailable && (
                    <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-green-200 mb-2">🆕 Updates Available</h4>
                      <p className="text-sm text-green-300 mb-2">
                        Newer AI models are available that may improve film analysis quality.
                      </p>
                      <div className="text-xs text-green-400">
                        Available: {systemHealth.availableUpdates?.slice(0, 3).join(', ')}
                        {systemHealth.availableUpdates?.length > 3 && ` and ${systemHealth.availableUpdates.length - 3} more`}
                      </div>
                    </div>
                  )}

                  {systemHealth.error && (
                    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-red-200 mb-2">❌ System Error</h4>
                      <p className="text-sm text-red-300">{systemHealth.error}</p>
                    </div>
                  )}
                </div>
              )}

              {!systemHealth && (
                <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
                  <p className="text-slate-400 mb-4">Click "Check Health" to run system diagnostics</p>
                  <p className="text-xs text-slate-500">
                    This will test API connectivity, model availability, and system configuration
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'debug' && (
            <div>
              <h3 className="text-lg font-medium text-slate-100 mb-4">Debug Tools</h3>
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-200">
                  <strong>⚠️ Admin Only:</strong> These tools are for troubleshooting and should only be used by technical administrators.
                </p>
              </div>
              <GeminiDebugTest />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};