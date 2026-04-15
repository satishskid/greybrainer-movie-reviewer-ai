import React, { useEffect, useState } from 'react';
import GeminiDebugTest from './GeminiDebugTest';
import { FeatureVerificationTest } from './FeatureVerificationTest';
import { FirebaseAdminDashboard } from './FirebaseAdminDashboard';
import { CloudflareByokManager } from './CloudflareByokManager';
import { GeminiKeyManager } from './GeminiKeyManager';
import { GoogleSearchKeyManager } from './GoogleSearchKeyManager';
import { FirecrawlKeyManager } from './FirecrawlKeyManager';
import { getSelectedGeminiModel, getModelInfo } from '../utils/geminiModelStorage';
import { hasGeminiApiKey } from '../utils/geminiKeyStorage';
import { LoadingSpinner } from './LoadingSpinner';
import { MonthlyScoreboardAdmin } from './MonthlyScoreboardAdmin';
import { OmnichannelDraftsPanel } from './OmnichannelDraftsPanel';
import { AdminService } from '../services/adminService';

type AdminSettingsTab = 'keys' | 'help' | 'admin' | 'omnichannel' | 'health' | 'diagnostics' | 'scoreboard';

interface AdminSettingsProps {
  isOpen: boolean;
  initialTab?: AdminSettingsTab;
  onClose: () => void;
  currentUser?: any;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ isOpen, initialTab = 'keys', onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>(initialTab);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isAdmin = AdminService.isAdminSync(currentUser);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const checkSystemHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const currentModel = getSelectedGeminiModel();
      const modelInfo = getModelInfo(currentModel);
      
      const health = {
        timestamp: new Date().toISOString(),
        apiKeyConfigured: hasGeminiApiKey(),
        currentModel: currentModel,
        modelInfo: modelInfo,
        systemStatus: 'operational'
      };

      setSystemHealth(health);
    } catch (error) {
      setSystemHealth({
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        systemStatus: 'error'
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (showAdvanced) return;
    if (activeTab === 'admin' || activeTab === 'omnichannel' || activeTab === 'health' || activeTab === 'diagnostics' || activeTab === 'scoreboard') {
      setActiveTab('keys');
    }
  }, [activeTab, isOpen, showAdvanced]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Settings</h2>
            <p className="text-sm text-slate-400">Core engine configuration and required keys</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                {showAdvanced ? 'Hide admin' : 'Admin'}
              </button>
            )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'keys'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔑 Keys
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'help'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📘 Help
          </button>
          {showAdvanced && (
            <>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                👑 Admin
              </button>
              <button
                onClick={() => setActiveTab('omnichannel')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'omnichannel'
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🌐 Omnichannel
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'health'
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🏥 Health
              </button>
              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'diagnostics'
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔧 Diagnostics
              </button>
              <button
                onClick={() => setActiveTab('scoreboard')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'scoreboard'
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🏆 Scoreboard
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'keys' && (
            <div>
              <h3 className="text-lg font-medium text-slate-100 mb-6">API Key Configuration</h3>
              
              <div className="space-y-6">
                {/* Gemini API Key */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h4 className="text-md font-medium text-slate-200 mb-3">🤖 Deep Research Gemini BYOK</h4>
                  <p className="text-sm text-slate-400 mb-4">Used in the browser for human-initiated deep research and movie analysis.</p>
                  <GeminiKeyManager />
                </div>

                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h4 className="text-md font-medium text-slate-200 mb-3">☁️ Cloudflare Worker Flow & AI Gateway</h4>
                  <p className="text-sm text-slate-400 mb-4">Worker-side key vault, scheduled worker generation, and Cloudflare AI Gateway routing status.</p>
                  <CloudflareByokManager ownerEmail={currentUser?.email ?? null} />
                </div>

                {/* Google Search API Key */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h4 className="text-md font-medium text-slate-200 mb-3">🔍 Google Search API Key</h4>
                  <p className="text-sm text-slate-400 mb-4">Optional: Enables movie data search and suggestions</p>
                  <GoogleSearchKeyManager />
                </div>

                {/* Firecrawl API Key */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h4 className="text-md font-medium text-slate-200 mb-3">🕸️ Firecrawl API Key</h4>
                  <p className="text-sm text-slate-400 mb-4">Optional: Enables deep web scraping for competitive intelligence</p>
                  <FirecrawlKeyManager />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div>
              <h3 className="text-lg font-medium text-slate-100 mb-4">Quick Start</h3>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-sm text-slate-300 leading-6 space-y-4">
                  <div>
                    <div className="text-slate-100 font-medium mb-1">For content writers</div>
                    <div>1) Type a movie title or search for one directly in the main input.</div>
                    <div>2) Click Analyze Movie Magic.</div>
                    <div>3) Use the output (layer analysis + final report).</div>
                  </div>

                  <div>
                    <div className="text-slate-100 font-medium mb-1">How to keep the workflow simple</div>
                    <div>1) Start from a title, not from scheduled signals or worker-fed prompts.</div>
                    <div>2) Keep keys limited to the analysis features you actively use.</div>
                  </div>

                  <div>
                    <div className="text-slate-100 font-medium mb-1">What Settings does</div>
                    <div><span className="text-slate-200">Keys:</span> stores your personal Gemini/Google Search keys in this browser.</div>
                    <div><span className="text-slate-200">Admin/Health/Diagnostics:</span> troubleshooting (admins only).</div>
                  </div>
                </div>
              </div>
            </div>
          )}



          {activeTab === 'admin' && showAdvanced && (
            <div>
              {currentUser?.role === 'admin' ? (
                <div>
                  <h3 className="text-lg font-medium text-slate-100 mb-4">Firebase Admin Dashboard</h3>
                  <div className="bg-slate-800 rounded-lg p-1">
                    <FirebaseAdminDashboard currentUser={currentUser} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">Admin privileges required to access this section.</p>
                  <p className="text-xs text-slate-500 mt-2">Current role: {currentUser?.role || 'undefined'}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'omnichannel' && showAdvanced && (
            <OmnichannelDraftsPanel currentUserEmail={currentUser?.email} />
          )}

          {activeTab === 'health' && showAdvanced && (
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

          {activeTab === 'diagnostics' && showAdvanced && (
            <div>
              <h3 className="text-lg font-medium text-slate-100 mb-4">Diagnostics</h3>
              <GeminiDebugTest />
              <FeatureVerificationTest />
            </div>
          )}

          {activeTab === 'scoreboard' && showAdvanced && (
            <div>
              <h3 className="text-lg font-medium text-slate-100 mb-4">Monthly Scoreboard</h3>
              <MonthlyScoreboardAdmin currentUser={currentUser} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
