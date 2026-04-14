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
import { enrichRecentFirestoreNewslettersWithSuggestions, importBaasNewslettersToFirestore, runNewsletterPipelineAudit, NewsletterPipelineAudit } from '../services/newsletterService';

type AdminSettingsTab = 'newsletter' | 'keys' | 'help' | 'admin' | 'omnichannel' | 'health' | 'diagnostics' | 'scoreboard';

interface AdminSettingsProps {
  isOpen: boolean;
  initialTab?: AdminSettingsTab;
  onClose: () => void;
  currentUser?: any;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ isOpen, initialTab = 'newsletter', onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>(initialTab);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [newsletterAudit, setNewsletterAudit] = useState<NewsletterPipelineAudit | null>(null);
  const [isRunningNewsletterAudit, setIsRunningNewsletterAudit] = useState(false);
  const [newsletterAction, setNewsletterAction] = useState<{ type: string; message: string } | null>(null);
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
      setActiveTab('newsletter');
    }
  }, [activeTab, isOpen, showAdvanced]);

  if (!isOpen) return null;

  const handleRunNewsletterAudit = async () => {
    setIsRunningNewsletterAudit(true);
    setNewsletterAction(null);
    try {
      const audit = await runNewsletterPipelineAudit(30);
      setNewsletterAudit(audit);
    } catch (e) {
      setNewsletterAction({ type: 'error', message: e instanceof Error ? e.message : 'Failed to run audit' });
    } finally {
      setIsRunningNewsletterAudit(false);
    }
  };

  const handleRefreshHomepageChips = () => {
    window.dispatchEvent(new Event('newsletterSuggestions:refresh'));
  };

  const handleImportFromBaas = async () => {
    setIsRunningNewsletterAudit(true);
    setNewsletterAction(null);
    try {
      const result = await importBaasNewslettersToFirestore(60);
      setNewsletterAction({ type: 'success', message: `Imported ${result.imported}, skipped ${result.skippedExisting}, failed ${result.failed}` });
      const audit = await runNewsletterPipelineAudit(30);
      setNewsletterAudit(audit);
      window.dispatchEvent(new Event('newsletterSuggestions:refresh'));
    } catch (e) {
      setNewsletterAction({ type: 'error', message: e instanceof Error ? e.message : 'Import failed' });
    } finally {
      setIsRunningNewsletterAudit(false);
    }
  };

  const handleEnrichSuggestions = async () => {
    setIsRunningNewsletterAudit(true);
    setNewsletterAction(null);
    try {
      const result = await enrichRecentFirestoreNewslettersWithSuggestions(14);
      setNewsletterAction({ type: 'success', message: `Enriched ${result.enriched}, skipped ${result.skipped}, failed ${result.failed}` });
      const audit = await runNewsletterPipelineAudit(30);
      setNewsletterAudit(audit);
      window.dispatchEvent(new Event('newsletterSuggestions:refresh'));
    } catch (e) {
      setNewsletterAction({ type: 'error', message: e instanceof Error ? e.message : 'Enrichment failed' });
    } finally {
      setIsRunningNewsletterAudit(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Settings</h2>
            <p className="text-sm text-slate-400">Newsletter workflow and required keys</p>
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
            onClick={() => setActiveTab('newsletter')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'newsletter'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📰 Newsletter
          </button>
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
          {activeTab === 'newsletter' && (
            <div>
              <h3 className="text-lg font-medium text-slate-100 mb-4">Newsletter Pipeline</h3>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-4">
                <div className="text-sm text-slate-300">
                  This is the back-office for the chips shown on the main screen (Newsletter Picks / Research Chips).
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshHomepageChips}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors"
                  >
                    Refresh chips on homepage
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-sm rounded transition-colors"
                  >
                    Back to writing
                  </button>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-md font-medium text-slate-200">Status & Actions</h4>
                    <p className="text-xs text-slate-400">Ingest → Store → Fetch → Chips</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRunNewsletterAudit}
                      disabled={isRunningNewsletterAudit}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white text-sm rounded transition-colors flex items-center gap-2"
                    >
                      {isRunningNewsletterAudit ? <LoadingSpinner size="sm" /> : '🔎'}
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={handleImportFromBaas}
                      disabled={isRunningNewsletterAudit || !isAdmin}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 text-sm rounded transition-colors"
                    >
                      Import
                    </button>
                    <button
                      type="button"
                      onClick={handleEnrichSuggestions}
                      disabled={isRunningNewsletterAudit || !isAdmin}
                      className="px-3 py-2 bg-emerald-700/70 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-emerald-100 text-sm rounded transition-colors"
                    >
                      Enrich Chips
                    </button>
                  </div>
                </div>

                {newsletterAction && (
                  <div className={`mb-3 px-3 py-2 rounded border text-sm ${
                    newsletterAction.type === 'success'
                      ? 'bg-emerald-900/20 border-emerald-700/50 text-emerald-200'
                      : 'bg-red-900/20 border-red-700/50 text-red-200'
                  }`}>
                    {newsletterAction.message}
                  </div>
                )}

                {newsletterAudit ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-900/40 rounded-lg border border-slate-700 p-3">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Firestore</div>
                      <div className="space-y-1 text-slate-200">
                        <div><span className="text-slate-400">Fetched:</span> {newsletterAudit.firestore.fetched}</div>
                        <div><span className="text-slate-400">Latest:</span> {newsletterAudit.firestore.latestId || '—'}</div>
                        <div><span className="text-slate-400">With Content:</span> {newsletterAudit.firestore.withContent}</div>
                        <div><span className="text-slate-400">With Movie Chips:</span> {newsletterAudit.firestore.withSuggestedReviews}</div>
                        <div><span className="text-slate-400">With Research Chips:</span> {newsletterAudit.firestore.withSuggestedTopics}</div>
                        {!newsletterAudit.firestore.ok && (
                          <div className="text-red-300">{newsletterAudit.firestore.error}</div>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-900/40 rounded-lg border border-slate-700 p-3">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">BaaS (D1)</div>
                      <div className="space-y-1 text-slate-200">
                        <div><span className="text-slate-400">Latest Date:</span> {newsletterAudit.baas.latestDate || '—'}</div>
                        <div><span className="text-slate-400">Latest Title:</span> {newsletterAudit.baas.latestTitle || '—'}</div>
                        <div><span className="text-slate-400">Recent Fetched:</span> {newsletterAudit.baas.recentFetched ?? '—'}</div>
                        {!newsletterAudit.baas.ok && (
                          <div className="text-red-300">{newsletterAudit.baas.error}</div>
                        )}
                      </div>
                    </div>
                    {!isAdmin && (
                      <div className="md:col-span-2 text-xs text-slate-400">
                        Import/Enrich actions require an admin account.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">
                    Click Refresh to check what’s in Firestore and whether chips are present.
                  </div>
                )}
              </div>
            </div>
          )}

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
                  <h4 className="text-md font-medium text-slate-200 mb-3">☁️ Cloudflare Daily Brief & AI Gateway</h4>
                  <p className="text-sm text-slate-400 mb-4">Worker-side key vault, daily brief generation, and Cloudflare AI Gateway routing status.</p>
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
                    <div>1) Pick a movie from Newsletter Picks (chips) or type a title.</div>
                    <div>2) Click Analyze Movie Magic.</div>
                    <div>3) Use the output (layer analysis + final report).</div>
                  </div>

                  <div>
                    <div className="text-slate-100 font-medium mb-1">If Newsletter Picks show 0</div>
                    <div>1) Click Refresh on the main screen (next to Newsletter Picks).</div>
                    <div>2) If still 0, open Settings → Newsletter and run Enrich Chips (admin), then Refresh on homepage.</div>
                  </div>

                  <div>
                    <div className="text-slate-100 font-medium mb-1">What Settings does</div>
                    <div><span className="text-slate-200">Newsletter:</span> fixes chips by importing/enriching newsletters.</div>
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
