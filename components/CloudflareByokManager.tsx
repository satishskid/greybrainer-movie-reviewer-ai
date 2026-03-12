import React, { useEffect, useState } from 'react';
import {
  getCloudflareSystemStatus,
  listAiKeys,
  saveAiKey,
  type AiKeyRecord,
  type CloudflareSystemStatus,
} from '../services/omnichannelDraftService';
import { LoadingSpinner } from './LoadingSpinner';

interface CloudflareByokManagerProps {
  ownerEmail?: string | null;
}

export const CloudflareByokManager: React.FC<CloudflareByokManagerProps> = ({ ownerEmail }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('gemini-2.5-flash');
  const [keys, setKeys] = useState<AiKeyRecord[]>([]);
  const [systemStatus, setSystemStatus] = useState<CloudflareSystemStatus | null>(null);

  const loadSystemStatus = async () => {
    const status = await getCloudflareSystemStatus();
    setSystemStatus(status);
  };

  const loadKeys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [records] = await Promise.all([
        listAiKeys('gemini'),
        loadSystemStatus(),
      ]);
      setKeys(records);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load Cloudflare BYOK settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadKeys();
  }, []);

  const handleSave = async () => {
    if (!apiKeyInput.trim()) {
      setError('Enter a Gemini API key first.');
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const record = await saveAiKey({
        provider: 'gemini',
        ownerEmail: ownerEmail ?? null,
        rawKey: apiKeyInput.trim(),
        model: modelInput.trim() || null,
        isDefault: true,
      });
      setKeys((current) => [record, ...current]);
      setApiKeyInput('');
      setSuccess('Stored the default Gemini key for daily briefs.');
      await loadSystemStatus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to store BYOK key.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-red-600/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-600/50 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200">{success}</div>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Worker API</div>
          <div className="mt-2 text-sm font-medium text-slate-100">{systemStatus?.ok ? 'Connected' : 'Unavailable'}</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Daily Schedule</div>
          <div className="mt-2 text-sm font-medium text-slate-100">
            {systemStatus?.dailyBrief.scheduleEnabled ? `Enabled • ${systemStatus.dailyBrief.timezone}` : 'Disabled'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">AI Gateway</div>
          <div className="mt-2 text-sm font-medium text-slate-100">
            {systemStatus?.gateway.enabled ? `Enabled • ${systemStatus.gateway.gatewayName}` : 'Not configured'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Fallback Model</div>
          <div className="mt-2 text-sm font-medium text-slate-100">
            {systemStatus?.dailyBrief.fallbackModel ?? modelInput}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm text-slate-300">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Gemini Model</div>
          <input
            value={modelInput}
            onChange={(event) => setModelInput(event.target.value)}
            placeholder="gemini-2.5-flash"
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="mt-2 text-[11px] text-slate-500">
            Recommended: <span className="text-slate-300">gemini-2.5-flash</span>. You can also enter a newer preview model if your key supports it.
          </div>
        </label>
        <label className="text-sm text-slate-300">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Daily Brief Gemini BYOK</div>
          <input
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
            placeholder="Paste Gemini API key for Cloudflare daily briefs"
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-indigo-900"
          >
            {isSaving ? 'Saving…' : 'Save Default BYOK'}
          </button>
          <button
            onClick={() => void loadKeys()}
            disabled={isLoading}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
        <div className="mb-3 text-sm font-medium text-slate-200">Stored Keys</div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <LoadingSpinner size="sm" /> Loading keys...
          </div>
        ) : keys.length === 0 ? (
          <div className="text-xs text-slate-500">No stored keys yet.</div>
        ) : (
          <div className="space-y-2 text-xs text-slate-300">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2">
                <div>
                  <div className="font-medium">{key.provider}</div>
                  <div className="text-[11px] text-slate-500">
                    {key.ownerEmail ?? 'unknown owner'} {key.model ? `• ${key.model}` : ''}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">
                  {key.isDefault ? 'default' : 'secondary'} • hint {key.keyHint ?? 'hidden'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-sky-600/30 bg-sky-950/20 p-4 text-xs text-sky-100">
        <div className="font-semibold uppercase tracking-wide text-sky-300">How this works now</div>
        <div className="mt-2 space-y-1 text-sky-100/90">
          <div>Deep Research uses the browser-side Gemini key.</div>
          <div>Daily Brief uses the Cloudflare Worker key vault.</div>
          <div>If AI Gateway is configured, the Worker routes Gemini through Cloudflare while still honoring editor BYOK.</div>
        </div>
      </div>
    </div>
  );
};
