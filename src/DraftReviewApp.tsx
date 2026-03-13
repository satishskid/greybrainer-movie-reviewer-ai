import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  uploadDraftAsset,
  updateDraftRecord,
} from '../services/omnichannelDraftService';
import { createContextEvent, listContextEvents, type ContextEventRecord } from './services/contextService';

type ViewMode = 'edit' | 'preview';
type ImageKind = 'hero' | 'poster' | 'thumbnail';

/* ── Collapsible sidebar section ── */
const SidebarSection: React.FC<{
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, badge, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[20px] border border-slate-800 bg-slate-950/60">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</span>
          {badge}
        </div>
        <svg
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-slate-800/60 px-5 py-4">{children}</div>}
    </div>
  );
};

/* ── Pipeline status steps ── */
const PIPELINE_STEPS = ['generated', 'editing', 'approved', 'published'] as const;
const STEP_LABELS: Record<string, string> = {
  generated: 'Draft',
  editing: 'Editing',
  approved: 'Approved',
  published: 'Published',
};

function PipelineProgress({ status }: { status: string }) {
  const activeIdx = PIPELINE_STEPS.indexOf(status as (typeof PIPELINE_STEPS)[number]);
  const resolvedIdx = activeIdx >= 0 ? activeIdx : 0;

  return (
    <div className="rounded-[20px] border border-slate-800 bg-slate-950/60 p-5">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Pipeline</div>
      <div className="flex items-center gap-1">
        {PIPELINE_STEPS.map((step, idx) => {
          const isComplete = idx < resolvedIdx;
          const isCurrent = idx === resolvedIdx;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isComplete
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrent
                        ? 'bg-sky-500 text-slate-950 ring-2 ring-sky-400/40'
                        : 'border border-slate-700 text-slate-500'
                  }`}
                >
                  {isComplete ? '✓' : idx + 1}
                </div>
                <span className={`text-[10px] font-medium ${isCurrent ? 'text-sky-300' : isComplete ? 'text-emerald-300' : 'text-slate-500'}`}>
                  {STEP_LABELS[step]}
                </span>
              </div>
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className={`mt-[-14px] h-0.5 flex-1 rounded ${idx < resolvedIdx ? 'bg-emerald-500' : 'bg-slate-800'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {status === 'failed' && (
        <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300">
          ⚠ This draft failed during publishing. Review and retry.
        </div>
      )}
      {status === 'scheduled' && (
        <div className="mt-3 rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300">
          ⏱ Scheduled for future publishing.
        </div>
      )}
    </div>
  );
}

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

function readSourcePayloadField(sourcePayload: unknown, key: string) {
  if (!sourcePayload || typeof sourcePayload !== 'object') {
    return '';
  }
  const record = sourcePayload as Record<string, unknown>;
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function resolveImageUrl(sourcePayload: unknown, key: ImageKind) {
  if (!sourcePayload || typeof sourcePayload !== 'object') {
    return '';
  }
  const record = sourcePayload as Record<string, unknown>;
  const image = typeof record.image === 'object' && record.image !== null ? (record.image as Record<string, unknown>) : null;
  if (key === 'hero') {
    return (
      readSourcePayloadField(sourcePayload, 'heroImageUrl') ||
      (image && typeof image.heroUrl === 'string' ? image.heroUrl : '') ||
      readSourcePayloadField(sourcePayload, 'imageUrl')
    );
  }
  if (key === 'poster') {
    return (
      readSourcePayloadField(sourcePayload, 'posterImageUrl') ||
      (image && typeof image.posterUrl === 'string' ? image.posterUrl : '') ||
      readSourcePayloadField(sourcePayload, 'imageUrl')
    );
  }
  return (
    readSourcePayloadField(sourcePayload, 'thumbnailImageUrl') ||
    (image && typeof image.thumbnailUrl === 'string' ? image.thumbnailUrl : '') ||
    readSourcePayloadField(sourcePayload, 'imageUrl')
  );
}

function cleanUrlInput(value: string) {
  return value.trim();
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
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [posterImageUrl, setPosterImageUrl] = useState('');
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountRecord[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [uploadKind, setUploadKind] = useState<ImageKind | null>(null);
  const [isPublishingWebsite, setIsPublishingWebsite] = useState(false);
  const [isPublishingSocial, setIsPublishingSocial] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contextEvents, setContextEvents] = useState<ContextEventRecord[]>([]);
  const [contextNote, setContextNote] = useState('');
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [isContextSaving, setIsContextSaving] = useState(false);

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
        setHeroImageUrl(resolveImageUrl(loadedDraft.currentVersion?.sourcePayload ?? {}, 'hero'));
        setPosterImageUrl(resolveImageUrl(loadedDraft.currentVersion?.sourcePayload ?? {}, 'poster'));
        setThumbnailImageUrl(resolveImageUrl(loadedDraft.currentVersion?.sourcePayload ?? {}, 'thumbnail'));
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

  useEffect(() => {
    if (!draftId) return;
    let active = true;
    const loadContext = async () => {
      setIsContextLoading(true);
      try {
        const events = await listContextEvents(draftId, 12);
        if (active) {
          setContextEvents(events);
        }
      } catch {
        if (active) {
          setContextEvents([]);
        }
      } finally {
        if (active) setIsContextLoading(false);
      }
    };
    void loadContext();
    return () => {
      active = false;
    };
  }, [draftId]);

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
    setHeroImageUrl(resolveImageUrl(loadedDraft.currentVersion?.sourcePayload ?? {}, 'hero'));
    setPosterImageUrl(resolveImageUrl(loadedDraft.currentVersion?.sourcePayload ?? {}, 'poster'));
    setThumbnailImageUrl(resolveImageUrl(loadedDraft.currentVersion?.sourcePayload ?? {}, 'thumbnail'));
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
      if (draftId) {
        await createContextEvent({
          sessionId: draftId,
          eventType: 'draft.metadata',
          actor: currentUserEmail ?? null,
          content: `Metadata updated (${nextStatus}).`,
          payload: {
            status: updated.status,
            subjectTitle: updated.subjectTitle,
          },
        });
        const events = await listContextEvents(draftId, 12);
        setContextEvents(events);
      }
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
      const basePayload =
        currentVersion.sourcePayload && typeof currentVersion.sourcePayload === 'object'
          ? { ...(currentVersion.sourcePayload as Record<string, unknown>) }
          : {};
      const imagePayload =
        basePayload.image && typeof basePayload.image === 'object'
          ? { ...(basePayload.image as Record<string, unknown>) }
          : {};
      const nextHero = cleanUrlInput(heroImageUrl);
      const nextPoster = cleanUrlInput(posterImageUrl);
      const nextThumb = cleanUrlInput(thumbnailImageUrl);
      basePayload.heroImageUrl = nextHero || null;
      basePayload.posterImageUrl = nextPoster || null;
      basePayload.thumbnailImageUrl = nextThumb || null;
      if (nextHero) imagePayload.heroUrl = nextHero;
      if (nextPoster) imagePayload.posterUrl = nextPoster;
      if (nextThumb) imagePayload.thumbnailUrl = nextThumb;
      if (Object.keys(imagePayload).length) {
        basePayload.image = imagePayload;
      }

      const updated = await saveDraftVersion(draft.id, {
        analysis: currentVersion.analysis,
        blogMarkdown: markdown,
        createdBy: currentUserEmail ?? null,
        editorNotes: currentVersion.editorNotes ?? null,
        reviewStage: draft.reviewStage ?? null,
        seoDescription: seoDescription || null,
        seoTitle: seoTitle || null,
        socials: currentVersion.socials ?? null,
        sourcePayload: basePayload,
        subjectTitle: subjectTitle || draft.subjectTitle,
      });
      setDraft(updated);
      if (draftId) {
        await createContextEvent({
          sessionId: draftId,
          eventType: 'draft.version',
          actor: currentUserEmail ?? null,
          content: `New version saved (v${updated.latestVersionNo}).`,
          payload: { versionNo: updated.latestVersionNo },
        });
        const events = await listContextEvents(draftId, 12);
        setContextEvents(events);
      }
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
      if (draftId) {
        await createContextEvent({
          sessionId: draftId,
          eventType: 'publish.website',
          actor: currentUserEmail ?? null,
          content: `Published to website: ${result.canonicalUrl}`,
          payload: { canonicalUrl: result.canonicalUrl },
        });
        const events = await listContextEvents(draftId, 12);
        setContextEvents(events);
      }
      setMessage(`Website publish complete: ${result.canonicalUrl}${result.deployTriggered ? ' — Lens site rebuild triggered ✅' : ''}`);
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
      if (draftId) {
        await createContextEvent({
          sessionId: draftId,
          eventType: 'publish.social',
          actor: currentUserEmail ?? null,
          content: `Social publish completed (${successCount} channel(s)).`,
          payload: { successCount, accounts: selectedAccountIds },
        });
        const events = await listContextEvents(draftId, 12);
        setContextEvents(events);
      }
      setMessage(`Social publish finished. ${successCount} channel(s) reported published.`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Failed to publish to social channels.');
    } finally {
      setIsPublishingSocial(false);
    }
  };

  const handleAssetUpload = async (kind: ImageKind, file: File) => {
    if (!draft) return;
    setIsUploadingAsset(true);
    setUploadKind(kind);
    setError(null);
    setMessage(null);
    try {
      const result = await uploadDraftAsset({ draftId: draft.id, file, kind });
      if (kind === 'hero') {
        setHeroImageUrl(result.url);
      } else if (kind === 'poster') {
        setPosterImageUrl(result.url);
      } else {
        setThumbnailImageUrl(result.url);
      }
      setMessage(`Uploaded ${kind} image to Cloudflare.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload asset.');
    } finally {
      setIsUploadingAsset(false);
      setUploadKind(null);
    }
  };

  const handleAddContextNote = async () => {
    if (!draftId || !contextNote.trim()) return;
    setIsContextSaving(true);
    try {
      await createContextEvent({
        sessionId: draftId,
        eventType: 'editor.note',
        actor: currentUserEmail ?? null,
        content: contextNote.trim(),
      });
      const events = await listContextEvents(draftId, 12);
      setContextEvents(events);
      setContextNote('');
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Failed to save context note.');
    } finally {
      setIsContextSaving(false);
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
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-300">
              <a href="/studio/drafts" className="hover:text-sky-200 transition-colors">← Studio</a>
              <span className="text-slate-600">|</span>
              <span>Editor Review Surface</span>
            </div>
            <h1 className="mt-0.5 truncate text-lg font-semibold">{subjectTitle}</h1>
            <div className="mt-0.5 text-xs text-slate-400">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' :
                status === 'published' ? 'bg-green-500/15 text-green-300' :
                status === 'editing' ? 'bg-blue-500/15 text-blue-300' :
                status === 'failed' ? 'bg-red-500/15 text-red-300' :
                'bg-amber-500/15 text-amber-300'
              }`}>{status}</span>
              <span className="ml-2">v{draft.latestVersionNo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.assign('/')} className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:border-slate-500 hover:text-white">
              ← Back
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

        <aside className="space-y-3">
          {error && <div className="rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}
          {message && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{message}</div>}

          {/* ── Pipeline progress ── */}
          <PipelineProgress status={status} />

          {/* ── Quick Actions ── */}
          <div className="rounded-[20px] border border-slate-800 bg-slate-950/60 p-5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => void handleSaveMetadata()}
                disabled={isSaving}
                className="rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-medium text-slate-200 transition hover:border-sky-500 hover:text-sky-200 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save Metadata'}
              </button>
              <button
                onClick={() => void handleSaveVersion()}
                disabled={isSaving}
                className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-white disabled:opacity-50"
              >
                Save Version
              </button>
              <button
                onClick={() => void handleSaveMetadata('approved')}
                disabled={isSaving || status === 'approved' || status === 'published'}
                className="rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => void handlePublishWebsite()}
                disabled={isPublishingWebsite}
                className="rounded-xl bg-sky-500 px-3 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
              >
                {isPublishingWebsite ? 'Publishing…' : 'Publish Web'}
              </button>
            </div>
            {socialReadyAccounts.length > 0 && (
              <button
                onClick={() => void handlePublishSocial()}
                disabled={isPublishingSocial || selectedAccountIds.length === 0}
                className="mt-2 w-full rounded-xl bg-amber-400 px-3 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
              >
                {isPublishingSocial ? 'Publishing…' : `Publish Social (${selectedAccountIds.length})`}
              </button>
            )}
          </div>

          {/* ── Version & Meta ── */}
          <div className="rounded-[20px] border border-slate-800 bg-slate-950/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Draft Info</span>
              <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[10px] font-medium text-slate-300">v{draft.latestVersionNo}</span>
            </div>
            <div className="space-y-3 text-sm">
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-slate-400">Title</div>
                <input value={subjectTitle} onChange={(e) => setSubjectTitle(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none" />
              </label>
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-slate-400">Status</div>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none">
                  {['generated', 'editing', 'approved', 'scheduled', 'published', 'failed'].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* ── SEO ── */}
          <SidebarSection title="SEO" badge={seoTitle ? <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-300">Set</span> : <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-300">Missing</span>}>
            <div className="space-y-3">
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-slate-400">SEO Title</div>
                <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Search-friendly title" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none" />
              </label>
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-slate-400">SEO Description</div>
                <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Meta description for search engines" rows={3} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs leading-5 text-slate-100 focus:border-sky-500 focus:outline-none" />
              </label>
            </div>
          </SidebarSection>

          {/* ── Images ── */}
          <SidebarSection
            title="Images"
            defaultOpen={!!(heroImageUrl || posterImageUrl || thumbnailImageUrl)}
            badge={
              [heroImageUrl, posterImageUrl, thumbnailImageUrl].filter(Boolean).length > 0
                ? <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-300">{[heroImageUrl, posterImageUrl, thumbnailImageUrl].filter(Boolean).length}/3</span>
                : <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-300 animate-pulse">⚠ Required</span>
            }
          >
            <div className="space-y-3">
              {!heroImageUrl && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2.5 text-[11px] leading-4 text-amber-200">
                  <strong>⚠ Hero image required before publishing.</strong><br />
                  Upload a landscape image (min 1200×630px) — this is shown as the full-width banner on the article page and in the homepage carousel.
                </div>
              )}
              {([
                { key: 'hero', label: 'Hero — Banner (1200×630px, landscape)', value: heroImageUrl, setter: setHeroImageUrl },
                { key: 'poster', label: 'Poster — Sidebar (600×900px, portrait)', value: posterImageUrl, setter: setPosterImageUrl },
                { key: 'thumbnail', label: 'Thumb — Cards & Social (400×225px)', value: thumbnailImageUrl, setter: setThumbnailImageUrl },
              ] as const).map((item) => (
                <div key={item.key} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">{item.label}</span>
                    {item.value && (
                      <a href={item.value} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 hover:underline">
                        Open ↗
                      </a>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={item.value}
                      onChange={(event) => item.setter(event.target.value)}
                      placeholder="Paste URL"
                      className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                    <label className="inline-flex shrink-0 cursor-pointer items-center rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-sky-500 hover:text-sky-200">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handleAssetUpload(item.key, file);
                          event.currentTarget.value = '';
                        }}
                      />
                      {isUploadingAsset && uploadKind === item.key ? '…' : '↑'}
                    </label>
                  </div>
                  {item.value && (
                    <img src={item.value} alt={item.label} className="mt-2 h-24 w-full rounded-lg border border-slate-800 object-cover" />
                  )}
                </div>
              ))}
              <p className="text-[10px] text-slate-500">Click <strong className="text-slate-400">Save Version</strong> after uploading images to persist them. Poster & Thumbnail fall back to Hero if not set.</p>
              <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Publish Checklist</div>
                <div className="space-y-1">
                  <div className={`flex items-center gap-1.5 text-[11px] ${heroImageUrl ? 'text-emerald-300' : 'text-amber-300'}`}>
                    <span>{heroImageUrl ? '✓' : '○'}</span> Hero image uploaded
                  </div>
                  <div className={`flex items-center gap-1.5 text-[11px] ${seoTitle ? 'text-emerald-300' : 'text-slate-500'}`}>
                    <span>{seoTitle ? '✓' : '○'}</span> SEO title set
                  </div>
                  <div className={`flex items-center gap-1.5 text-[11px] ${seoDescription ? 'text-emerald-300' : 'text-slate-500'}`}>
                    <span>{seoDescription ? '✓' : '○'}</span> SEO description set
                  </div>
                  <div className={`flex items-center gap-1.5 text-[11px] ${markdown.length > 200 ? 'text-emerald-300' : 'text-amber-300'}`}>
                    <span>{markdown.length > 200 ? '✓' : '○'}</span> Content reviewed ({markdown.length.toLocaleString()} chars)
                  </div>
                </div>
              </div>
            </div>
          </SidebarSection>

          {/* ── Publishing URLs ── */}
          <SidebarSection title="Publishing" badge={websiteUrl ? <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-300">Live</span> : null}>
            <div className="space-y-3">
              <label className="block">
                <div className="mb-1 text-xs font-medium text-slate-400">Website URL</div>
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="Auto-filled after publish" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none" />
              </label>
              <label className="block">
                <div className="mb-1 text-xs font-medium text-slate-400">Medium URL</div>
                <input value={mediumUrl} onChange={(e) => setMediumUrl(e.target.value)} placeholder="Optional cross-post link" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none" />
              </label>
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noreferrer" className="inline-block text-xs text-sky-300 hover:underline">
                  View published page ↗
                </a>
              )}
            </div>
          </SidebarSection>

          {/* ── Social Targets ── */}
          <SidebarSection
            title="Social"
            defaultOpen={socialReadyAccounts.length > 0}
            badge={
              socialReadyAccounts.length > 0
                ? <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-300">{socialReadyAccounts.length}</span>
                : <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[9px] text-slate-400">0</span>
            }
          >
            {socialReadyAccounts.length === 0 ? (
              <div className="rounded-lg bg-slate-900/60 px-3 py-2.5 text-xs text-slate-500">
                No connected social accounts. Add accounts in Admin Settings → Omnichannel → Channels.
              </div>
            ) : (
              <div className="space-y-2">
                {socialReadyAccounts.map((account) => (
                  <label key={account.id} className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedAccountIds.includes(account.id)}
                      onChange={(event) =>
                        setSelectedAccountIds((current) =>
                          event.target.checked ? [...current, account.id] : current.filter((id) => id !== account.id),
                        )
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium">{account.displayName ?? account.handle ?? account.platform}</div>
                      <div className="text-[10px] text-slate-500">{account.platform}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </SidebarSection>

          {/* ── Context Memory ── */}
          <SidebarSection title="Context Memory" defaultOpen={false} badge={contextEvents.length > 0 ? <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] text-indigo-300">{contextEvents.length}</span> : null}>
            <div className="space-y-3">
              <textarea
                value={contextNote}
                onChange={(event) => setContextNote(event.target.value)}
                placeholder="Add editorial notes, tone shifts, or decisions…"
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs leading-5 text-slate-100 focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={() => void handleAddContextNote()}
                disabled={isContextSaving || !contextNote.trim()}
                className="w-full rounded-lg bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/30 disabled:opacity-50"
              >
                {isContextSaving ? 'Saving…' : 'Save Note'}
              </button>
              {isContextLoading ? (
                <div className="text-[10px] text-slate-500">Loading context…</div>
              ) : contextEvents.length > 0 ? (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {contextEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase text-slate-500">{event.eventType.replace('.', ' ')}</span>
                        <span className="text-[10px] text-slate-600">{new Date(event.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      <div className="mt-1 text-[11px] leading-4 text-slate-300">{event.content}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500">No context notes yet.</div>
              )}
            </div>
          </SidebarSection>
        </aside>
      </main>
    </div>
  );
};
