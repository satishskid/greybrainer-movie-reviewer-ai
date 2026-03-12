import React, { useEffect, useMemo, useState } from 'react';
import { AuthWrapper } from '../components/AuthWrapper';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  getDraft,
  listSocialAccounts,
  publishDraftToSocialAccounts,
  publishDraftToWebsite,
  saveDraftVersion,
  type DraftRecord,
  type SocialAccountRecord,
  updateDraftRecord,
} from '../services/omnichannelDraftService';

type ViewMode = 'edit' | 'preview';

function getDraftIdFromPath() {
  const match = window.location.pathname.match(/^\/studio\/drafts\/([^/]+)/);
  return match?.[1] ?? null;
}

function renderMarkdownLike(markdown: string) {
  return markdown.split('\n').map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={`${index}-spacer`} className="h-4" />;
    }
    if (trimmed.startsWith('# ')) {
      return <h1 key={index} className="mt-6 text-4xl font-semibold text-slate-50">{trimmed.replace(/^# /, '')}</h1>;
    }
    if (trimmed.startsWith('## ')) {
      return <h2 key={index} className="mt-6 text-2xl font-semibold text-slate-100">{trimmed.replace(/^## /, '')}</h2>;
    }
    if (trimmed.startsWith('> ')) {
      return <blockquote key={index} className="my-4 border-l-2 border-amber-400 pl-4 text-amber-100/90">{trimmed.replace(/^> /, '')}</blockquote>;
    }
    return <p key={index} className="text-base leading-8 text-slate-300">{line}</p>;
  });
}

export const DraftReviewApp: React.FC = () => {
  const draftId = getDraftIdFromPath();

  return (
    <AuthWrapper>
      {(user) => <DraftReviewWorkspace draftId={draftId} currentUserEmail={user?.email ?? null} />}
    </AuthWrapper>
  );
};

const DraftReviewWorkspace: React.FC<{ currentUserEmail?: string | null; draftId: string | null }> = ({ currentUserEmail, draftId }) => {
  const [draft, setDraft] = useState<DraftRecord | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [subjectTitle, setSubjectTitle] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [status, setStatus] = useState('editing');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [mediumUrl, setMediumUrl] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountRecord[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishingWebsite, setIsPublishingWebsite] = useState(false);
  const [isPublishingSocial, setIsPublishingSocial] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentVersion = draft?.currentVersion ?? null;

  useEffect(() => {
    if (!draftId) {
      setError('Draft id is missing from the URL.');
      setIsLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [loadedDraft, accounts] = await Promise.all([
          getDraft(draftId),
          listSocialAccounts(),
        ]);

        if (!active) return;

        setDraft(loadedDraft);
        setMarkdown(loadedDraft.currentVersion?.blogMarkdown ?? '');
        setSubjectTitle(loadedDraft.subjectTitle);
        setSeoTitle(loadedDraft.seoTitle ?? '');
        setSeoDescription(loadedDraft.seoDescription ?? '');
        setStatus(loadedDraft.status);
        setWebsiteUrl(loadedDraft.websiteUrl ?? '');
        setMediumUrl(loadedDraft.mediumUrl ?? '');
        setSocialAccounts(accounts);
        setSelectedAccountIds(accounts.filter((account) => account.connectionStatus === 'connected').map((account) => account.id));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load draft review workspace.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [draftId]);

  const socialReadyAccounts = useMemo(
    () => socialAccounts.filter((account) => account.connectionStatus === 'connected'),
    [socialAccounts],
  );

  const refreshDraft = async () => {
    if (!draftId) return;
    const loadedDraft = await getDraft(draftId);
    setDraft(loadedDraft);
    setMarkdown(loadedDraft.currentVersion?.blogMarkdown ?? '');
    setSubjectTitle(loadedDraft.subjectTitle);
    setSeoTitle(loadedDraft.seoTitle ?? '');
    setSeoDescription(loadedDraft.seoDescription ?? '');
    setStatus(loadedDraft.status);
    setWebsiteUrl(loadedDraft.websiteUrl ?? '');
    setMediumUrl(loadedDraft.mediumUrl ?? '');
  };

  const handleSaveMetadata = async (nextStatus = status) => {
    if (!draft) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateDraftRecord(draft.id, {
        mediumUrl: mediumUrl || null,
        seoDescription: seoDescription || null,
        seoTitle: seoTitle || null,
        status: nextStatus as DraftRecord['status'],
        subjectTitle: subjectTitle || draft.subjectTitle,
        websiteUrl: websiteUrl || null,
      });
      setDraft(updated);
      setStatus(updated.status);
      setMessage(nextStatus === 'approved' ? 'Draft approved and metadata saved.' : 'Draft metadata saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save draft metadata.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!draft || !currentVersion) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await saveDraftVersion(draft.id, {
        analysis: currentVersion.analysis,
        blogMarkdown: markdown,
        createdBy: currentUserEmail ?? null,
        editorNotes: currentVersion.editorNotes ?? null,
        reviewStage: draft.reviewStage ?? null,
        seoDescription: seoDescription || null,
        seoTitle: seoTitle || null,
        socials: currentVersion.socials ?? null,
        sourcePayload: currentVersion.sourcePayload ?? {},
        subjectTitle: subjectTitle || draft.subjectTitle,
      });
      setDraft(updated);
      setMessage('Saved a new review version.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save draft version.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishWebsite = async () => {
    if (!draft) return;
    setIsPublishingWebsite(true);
    setError(null);
    setMessage(null);
    try {
      const result = await publishDraftToWebsite(draft.id, {
        requestedBy: currentUserEmail ?? null,
        versionId: draft.currentVersionId,
        websiteUrl: websiteUrl || null,
      });
      setWebsiteUrl(result.canonicalUrl);
      await refreshDraft();
      setMessage(`Website publish complete: ${result.canonicalUrl}`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Failed to publish to website.');
    } finally {
      setIsPublishingWebsite(false);
    }
  };

  const handlePublishSocial = async () => {
    if (!draft || selectedAccountIds.length === 0) return;
    setIsPublishingSocial(true);
    setError(null);
    setMessage(null);
    try {
      const result = await publishDraftToSocialAccounts(draft.id, selectedAccountIds);
      const successCount = result.results.filter((item) => item.status === 'published').length;
      await refreshDraft();
      setMessage(`Social publish finished. ${successCount} channel(s) reported published.`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Failed to publish to social channels.');
    } finally {
      setIsPublishingSocial(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08111d] text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <LoadingSpinner size="sm" />
          Loading full-page review workspace...
        </div>
      </div>
    );
  }

  if (!draft || !currentVersion) {
    return (
      <div className="min-h-screen bg-[#08111d] text-slate-100 p-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/30 bg-red-950/20 p-6">
          <h1 className="text-2xl font-semibold">Draft review unavailable</h1>
          <p className="mt-3 text-sm text-slate-300">{error ?? 'The draft could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08111d] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#08111d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">Editor Review Surface</div>
            <h1 className="mt-1 text-2xl font-semibold">{subjectTitle}</h1>
            <div className="mt-1 text-sm text-slate-400">Status: {status} • Version {draft.latestVersionNo}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => window.location.assign('/')} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">
              Back to App
            </button>
            <button onClick={() => void handleSaveMetadata()} disabled={isSaving} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">
              {isSaving ? 'Saving…' : 'Save Metadata'}
            </button>
            <button onClick={() => void handleSaveVersion()} disabled={isSaving} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950">
              Save New Version
            </button>
            <button onClick={() => void handleSaveMetadata('approved')} disabled={isSaving} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">
              Approve
            </button>
            <button onClick={() => void handlePublishWebsite()} disabled={isPublishingWebsite} className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950">
              {isPublishingWebsite ? 'Publishing…' : 'Publish Website'}
            </button>
            <button
              onClick={() => void handlePublishSocial()}
              disabled={isPublishingSocial || selectedAccountIds.length === 0}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {isPublishingSocial ? 'Publishing…' : 'Publish Social'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[28px] border border-slate-800 bg-slate-950/60 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="text-sm font-medium text-slate-200">Draft Body</div>
            <div className="flex gap-2 rounded-full border border-slate-800 bg-slate-900 p-1">
              <button
                onClick={() => setViewMode('edit')}
                className={`rounded-full px-3 py-1.5 text-xs ${viewMode === 'edit' ? 'bg-slate-100 text-slate-950' : 'text-slate-400'}`}
              >
                Edit
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`rounded-full px-3 py-1.5 text-xs ${viewMode === 'preview' ? 'bg-slate-100 text-slate-950' : 'text-slate-400'}`}
              >
                Preview
              </button>
            </div>
          </div>

          {viewMode === 'edit' ? (
            <textarea
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              className="min-h-[calc(100vh-14rem)] w-full resize-none bg-transparent px-6 py-6 font-mono text-sm leading-7 text-slate-200 outline-none"
            />
          ) : (
            <div className="min-h-[calc(100vh-14rem)] px-8 py-8">
              <div className="mx-auto max-w-4xl space-y-3">{renderMarkdownLike(markdown)}</div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {error && <div className="rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}
          {message && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{message}</div>}

          <div className="rounded-[24px] border border-slate-800 bg-slate-950/60 p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Metadata</div>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <div className="mb-2 text-slate-400">Title</div>
                <input value={subjectTitle} onChange={(e) => setSubjectTitle(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
              </label>
              <label className="block text-sm">
                <div className="mb-2 text-slate-400">SEO Title</div>
                <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
              </label>
              <label className="block text-sm">
                <div className="mb-2 text-slate-400">SEO Description</div>
                <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 min-h-[110px]" />
              </label>
              <label className="block text-sm">
                <div className="mb-2 text-slate-400">Status</div>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
                  {['generated', 'editing', 'approved', 'scheduled', 'published', 'failed'].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-800 bg-slate-950/60 p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Publishing</div>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <div className="mb-2 text-slate-400">Website URL</div>
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
              </label>
              <label className="block text-sm">
                <div className="mb-2 text-slate-400">Medium URL</div>
                <input value={mediumUrl} onChange={(e) => setMediumUrl(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-800 bg-slate-950/60 p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Social Targets</div>
            <div className="mt-4 space-y-3">
              {socialReadyAccounts.length === 0 ? (
                <div className="text-sm text-slate-500">No connected social accounts yet.</div>
              ) : socialReadyAccounts.map((account) => (
                <label key={account.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.includes(account.id)}
                    onChange={(event) => {
                      setSelectedAccountIds((current) => (
                        event.target.checked ? [...current, account.id] : current.filter((id) => id !== account.id)
                      ));
                    }}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{account.displayName ?? account.handle ?? account.platform}</div>
                    <div className="text-xs text-slate-500">{account.platform} • {account.profileUrl}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
