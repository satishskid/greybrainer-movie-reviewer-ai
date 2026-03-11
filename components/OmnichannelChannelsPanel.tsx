import React, { useEffect, useState } from 'react';
import {
  connectSocialAccountRecord,
  createSocialAccount,
  discoverSocialAccount,
  listSocialAccounts,
  type SocialAccountDiscovery,
  type SocialAccountRecord,
  testSocialAccountRecord,
  updateSocialAccountRecord,
} from '../services/omnichannelDraftService';
import { LoadingSpinner } from './LoadingSpinner';

interface OmnichannelChannelsPanelProps {
  currentUserEmail?: string | null;
}

const EXAMPLE_URLS = [
  'https://www.linkedin.com/company/greybrainer/',
  'https://medium.com/@GreyBrainer',
  'https://x.com/greybrainai',
];

const SUPPORTED_CHANNELS = [
  { platform: 'linkedin', connectorKey: 'native-linkedin', state: 'planned-now' },
  { platform: 'medium', connectorKey: 'native-medium', state: 'planned-now' },
  { platform: 'x', connectorKey: 'native-x', state: 'planned-next' },
  { platform: 'instagram', connectorKey: 'native-instagram', state: 'planned-next' },
  { platform: 'youtube', connectorKey: 'native-youtube', state: 'planned-next' },
  { platform: 'facebook', connectorKey: 'native-facebook', state: 'planned-later' },
  { platform: 'threads', connectorKey: 'native-threads', state: 'planned-later' },
  { platform: 'tiktok', connectorKey: 'native-tiktok', state: 'planned-later' },
  { platform: 'pinterest', connectorKey: 'native-pinterest', state: 'planned-later' },
] as const;

function getConnectorForPlatform(platform: SocialAccountDiscovery['platform']) {
  switch (platform) {
    case 'linkedin':
      return 'native-linkedin';
    case 'medium':
      return 'native-medium';
    case 'x':
      return 'native-x';
    case 'instagram':
      return 'native-instagram';
    case 'youtube':
      return 'native-youtube';
    case 'facebook':
      return 'native-facebook';
    case 'threads':
      return 'native-threads';
    case 'tiktok':
      return 'native-tiktok';
    case 'pinterest':
      return 'native-pinterest';
    default:
      return 'native-generic';
  }
}

export const OmnichannelChannelsPanel: React.FC<OmnichannelChannelsPanelProps> = ({ currentUserEmail }) => {
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountRecord[]>([]);
  const [profileUrl, setProfileUrl] = useState('');
  const [discovery, setDiscovery] = useState<SocialAccountDiscovery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [testMessages, setTestMessages] = useState<Record<string, string>>({});

  const loadSocialAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await listSocialAccounts();
      setSocialAccounts(records);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load social accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSocialAccounts();
  }, []);

  const handleDiscover = async () => {
    setIsDiscovering(true);
    setDiscovery(null);
    setError(null);
    try {
      const result = await discoverSocialAccount(profileUrl);
      setDiscovery(result);
    } catch (discoverError) {
      setError(discoverError instanceof Error ? discoverError.message : 'Failed to detect this profile URL.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSave = async () => {
    if (!discovery) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const saved = await createSocialAccount({
        ...discovery,
        createdBy: currentUserEmail ?? null,
        connectorKey: getConnectorForPlatform(discovery.platform),
      });
      setSocialAccounts((current) => {
        const existing = current.find((account) => account.id === saved.id);
        if (existing) {
          return current.map((account) => (account.id === saved.id ? saved : account));
        }
        return [saved, ...current];
      });
      setDiscovery(null);
      setProfileUrl('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save social account.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDefault = async (account: SocialAccountRecord) => {
    setActiveAccountId(account.id);
    setError(null);
    try {
      const updated = await updateSocialAccountRecord(account.id, {
        isDefaultPublishTarget: !account.isDefaultPublishTarget,
      });
      setSocialAccounts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update social account.');
    } finally {
      setActiveAccountId(null);
    }
  };

  const handleTest = async (account: SocialAccountRecord) => {
    setActiveAccountId(account.id);
    setError(null);
    try {
      const result = await testSocialAccountRecord(account.id);
      setSocialAccounts((current) => current.map((item) => (item.id === result.socialAccount.id ? result.socialAccount : item)));
      setTestMessages((current) => ({ ...current, [account.id]: result.test.details }));
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Failed to test social account.');
    } finally {
      setActiveAccountId(null);
    }
  };

  const handleConnect = async (account: SocialAccountRecord) => {
    setActiveAccountId(account.id);
    setError(null);
    try {
      const result = await connectSocialAccountRecord(account.id);
      window.open(result.connectUrl, '_blank', 'noopener,noreferrer');
      setTestMessages((current) => ({ ...current, [account.id]: result.instructions }));
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Failed to start native connection.');
    } finally {
      setActiveAccountId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-slate-100">Channels</h3>
            <p className="text-sm text-slate-400">
              Paste a channel URL. Greybrainer detects the platform and saves it as a publishing target.
            </p>
          </div>
          <button
            onClick={() => void loadSocialAccounts()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Refresh Channels
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
            <div className="mb-3 text-sm font-medium text-slate-200">Paste a profile URL</div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={profileUrl}
                onChange={(event) => setProfileUrl(event.target.value)}
                placeholder="https://www.linkedin.com/company/greybrainer/"
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <button
                onClick={() => void handleDiscover()}
                disabled={isDiscovering || profileUrl.trim().length === 0}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:bg-emerald-800"
              >
                {isDiscovering ? 'Detecting...' : 'Detect Channel'}
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Examples: {EXAMPLE_URLS.join(' • ')}
            </div>

            {discovery && (
              <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-emerald-200">{discovery.displayName ?? discovery.handle ?? discovery.normalizedUrl}</div>
                    <div className="mt-1 text-xs text-emerald-300/90">
                      {discovery.platform} • {discovery.handle ?? 'no handle extracted'}
                    </div>
                  </div>
                  <button
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:bg-emerald-800"
                  >
                    {isSaving ? 'Saving...' : 'Save Channel'}
                  </button>
                </div>
                <div className="mt-3 text-xs text-emerald-200/90">
                  Saved channels will be ready for provider connection in the next step.
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
            <div className="mb-3 text-sm font-medium text-slate-200">How this works</div>
            <div className="space-y-3 text-sm text-slate-300">
              <p>1. Paste the public profile URL for any supported channel.</p>
              <p>2. Greybrainer detects the platform and stores the native Cloudflare-managed connector key.</p>
              <p>3. `Test` checks whether the channel is actually ready for one-button publish.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
        <div className="mb-4 text-sm font-medium text-slate-200">Native Channel Coverage</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {SUPPORTED_CHANNELS.map((channel) => (
            <div key={channel.platform} className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-3">
              <div className="text-sm font-medium capitalize text-slate-100">{channel.platform}</div>
              <div className="mt-1 text-xs text-slate-500">{channel.connectorKey}</div>
              <div className="mt-2 text-[10px] uppercase tracking-wide text-emerald-300">{channel.state}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-600/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/70">
        <div className="border-b border-slate-700 px-4 py-3">
          <div className="text-sm font-medium text-slate-200">Saved Channels</div>
          <div className="text-xs text-slate-500">These become selectable publish targets inside Greybrainer.</div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : socialAccounts.length === 0 ? (
            <div className="px-4 py-10 text-sm text-slate-500">No social channels have been registered yet.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-700 text-sm">
              <thead className="bg-slate-900/40 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Handle</th>
                  <th className="px-4 py-3">Connector</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Connect</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Default</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-slate-200">
                {socialAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-3 capitalize">{account.platform}</td>
                    <td className="px-4 py-3">{account.handle ?? account.displayName ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{account.connectorKey ?? 'native-generic'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300">
                        {account.connectionStatus}
                      </span>
                      {account.lastVerifiedAt && (
                        <div className="mt-1 text-[11px] text-slate-500">
                          tested {new Date(account.lastVerifiedAt).toLocaleString()}
                        </div>
                      )}
                      {account.lastTestMessage && (
                        <div className="mt-1 max-w-[180px] text-[11px] text-slate-500">
                          {account.lastTestMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={account.normalizedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-[320px] truncate text-sky-400 hover:text-sky-300"
                      >
                        {account.normalizedUrl}
                      </a>
                      {testMessages[account.id] && (
                        <div className="mt-1 max-w-[320px] text-[11px] text-slate-500">
                          {testMessages[account.id]}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleConnect(account)}
                        disabled={activeAccountId === account.id}
                        className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:bg-slate-800"
                      >
                        {activeAccountId === account.id ? 'Opening...' : account.connectionStatus === 'connected' ? 'Reconnect' : 'Connect'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleTest(account)}
                        disabled={activeAccountId === account.id}
                        className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-600 disabled:bg-slate-800"
                      >
                        {activeAccountId === account.id ? 'Testing...' : 'Test'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleToggleDefault(account)}
                        disabled={activeAccountId === account.id}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          account.isDefaultPublishTarget
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        } disabled:bg-slate-800`}
                      >
                        {activeAccountId === account.id ? 'Saving...' : account.isDefaultPublishTarget ? 'Default' : 'Set Default'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
