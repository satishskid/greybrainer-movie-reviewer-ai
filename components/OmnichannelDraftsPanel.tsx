import React, { useEffect, useMemo, useState } from 'react';
import {
  type DraftRecord,
  getDraft,
  listDraftVersions,
  listDrafts,
  listSocialAccounts,
  publishDraftToWebsite,
  publishDraftToSocialAccounts,
  type DraftVersionRecord,
  type PublicationRecord,
  type PublicationPayload,
  type SocialAccountRecord,
  upsertDraftPublication,
  updateDraftRecord,
} from '../services/omnichannelDraftService';
import { OmnichannelChannelsPanel } from './OmnichannelChannelsPanel';
import { OmnichannelKnowledgePanel } from './OmnichannelKnowledgePanel';
import { LoadingSpinner } from './LoadingSpinner';

interface OmnichannelDraftsPanelProps {
  currentUserEmail?: string | null;
}

const CHANNELS = ['website', 'medium', 'x', 'linkedin'] as const;
const STATUSES = ['generated', 'editing', 'approved', 'scheduled', 'published', 'failed'] as const;
const PUBLICATION_STATUSES = ['pending', 'scheduled', 'published', 'failed'] as const;

export const OmnichannelDraftsPanel: React.FC<OmnichannelDraftsPanelProps> = ({ currentUserEmail }) => {
  const [activeSection, setActiveSection] = useState<'drafts' | 'channels' | 'knowledge'>('drafts');
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<DraftRecord | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isLoadingSocialAccounts, setIsLoadingSocialAccounts] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingPublication, setIsSavingPublication] = useState(false);
  const [isPublishingDraft, setIsPublishingDraft] = useState(false);
  const [isPublishingWebsite, setIsPublishingWebsite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [websitePublishMessage, setWebsitePublishMessage] = useState<string | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountRecord[]>([]);
  const [selectedPublishAccountIds, setSelectedPublishAccountIds] = useState<string[]>([]);
  const [statusDraft, setStatusDraft] = useState<string>('generated');
  const [reviewStageDraft, setReviewStageDraft] = useState('');
  const [subjectTitleDraft, setSubjectTitleDraft] = useState('');
  const [seoTitleDraft, setSeoTitleDraft] = useState('');
  const [seoDescriptionDraft, setSeoDescriptionDraft] = useState('');
  const [websiteUrlDraft, setWebsiteUrlDraft] = useState('');
  const [mediumUrlDraft, setMediumUrlDraft] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [publicationForm, setPublicationForm] = useState<PublicationPayload>({
    channel: 'medium',
    externalId: '',
    externalUrl: '',
    publishedAt: '',
    status: 'pending',
    versionId: null,
  });

  const selectedPublicationMap = useMemo(() => {
    const map = new Map<string, PublicationRecord>();
    selectedDraft?.publications?.forEach((publication) => {
      if (publication) {
        map.set(publication.channel, publication);
      }
    });
    return map;
  }, [selectedDraft]);

  const selectedVersion = useMemo<DraftVersionRecord | null>(() => {
    if (!selectedDraft?.versions?.length) {
      return selectedDraft?.currentVersion ?? null;
    }

    return (
      selectedDraft.versions.find((version) => version.id === selectedVersionId) ??
      selectedDraft.currentVersion ??
      selectedDraft.versions[0] ??
      null
    );
  }, [selectedDraft, selectedVersionId]);

  const loadDrafts = async (keepSelection = true) => {
    setIsLoadingList(true);
    setError(null);
    try {
      const nextDrafts = await listDrafts(50);
      setDrafts(nextDrafts);
      const nextSelectedId =
        keepSelection && selectedDraftId && nextDrafts.some((draft) => draft.id === selectedDraftId)
          ? selectedDraftId
          : nextDrafts[0]?.id ?? null;
      setSelectedDraftId(nextSelectedId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load drafts.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    void loadDrafts(false);
  }, []);

  useEffect(() => {
    let active = true;
    const loadAccounts = async () => {
      setIsLoadingSocialAccounts(true);
      try {
        const records = await listSocialAccounts();
        if (!active) return;
        setSocialAccounts(records);
        setSelectedPublishAccountIds(records.filter((account) => account.isDefaultPublishTarget).map((account) => account.id));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load channel targets.');
      } finally {
        if (active) setIsLoadingSocialAccounts(false);
      }
    };

    void loadAccounts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedDraftId) {
      setSelectedDraft(null);
      return;
    }

    let active = true;
    const loadSelectedDraft = async () => {
      setIsLoadingDraft(true);
      setError(null);
      try {
        const draft = await getDraft(selectedDraftId);
        if (!active) return;
        setSelectedDraft(draft);
        setStatusDraft(draft.status);
        setReviewStageDraft(draft.reviewStage ?? '');
        setSubjectTitleDraft(draft.subjectTitle);
        setSeoTitleDraft(draft.seoTitle ?? '');
        setSeoDescriptionDraft(draft.seoDescription ?? '');
        setWebsiteUrlDraft(draft.websiteUrl ?? '');
        setMediumUrlDraft(draft.mediumUrl ?? '');
        setSelectedVersionId(draft.currentVersionId);
        setPublicationForm((current) => ({
          ...current,
          versionId: draft.currentVersionId,
        }));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load draft.');
      } finally {
        if (active) setIsLoadingDraft(false);
      }
    };

    void loadSelectedDraft();

    return () => {
      active = false;
    };
  }, [selectedDraftId]);

  useEffect(() => {
    if (!selectedDraftId) {
      return;
    }

    let active = true;
    const loadVersions = async () => {
      setIsLoadingVersions(true);
      try {
        const versions = await listDraftVersions(selectedDraftId);
        if (!active) return;
        setSelectedDraft((current) => (current && current.id === selectedDraftId ? { ...current, versions } : current));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load draft versions.');
      } finally {
        if (active) setIsLoadingVersions(false);
      }
    };

    void loadVersions();

    return () => {
      active = false;
    };
  }, [selectedDraftId]);

  useEffect(() => {
    const selectedPublication = selectedPublicationMap.get(publicationForm.channel);
    setPublicationForm((current) => ({
      ...current,
      channel: current.channel,
      externalId: selectedPublication?.externalId ?? '',
      externalUrl: selectedPublication?.externalUrl ?? '',
      publishedAt: selectedPublication?.publishedAt ?? '',
      status: selectedPublication?.status ?? current.status ?? 'pending',
      versionId: selectedDraft?.currentVersionId ?? null,
    }));
  }, [publicationForm.channel, selectedDraft?.currentVersionId, selectedPublicationMap]);

  const handleUpdateDraft = async () => {
    if (!selectedDraft) return;
    setIsSavingStatus(true);
    setError(null);
    try {
      const updatedDraft = await updateDraftRecord(selectedDraft.id, {
        reviewStage: reviewStageDraft || null,
        seoDescription: seoDescriptionDraft || null,
        seoTitle: seoTitleDraft || null,
        mediumUrl: mediumUrlDraft || null,
        status: statusDraft as DraftRecord['status'],
        subjectTitle: subjectTitleDraft.trim() || selectedDraft.subjectTitle,
        websiteUrl: websiteUrlDraft || null,
      });
      setSelectedDraft(updatedDraft);
      setDrafts((current) => current.map((draft) => (draft.id === updatedDraft.id ? updatedDraft : draft)));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update draft.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleSavePublication = async () => {
    if (!selectedDraft) return;
    setIsSavingPublication(true);
    setError(null);
    try {
      const publications = await upsertDraftPublication(selectedDraft.id, {
        ...publicationForm,
        externalId: publicationForm.externalId || null,
        externalUrl: publicationForm.externalUrl || null,
        payload: {
          updatedBy: currentUserEmail ?? 'unknown',
        },
        publishedAt: publicationForm.publishedAt || null,
        versionId: selectedVersion?.id ?? selectedDraft.currentVersionId,
      });
      setSelectedDraft({
        ...selectedDraft,
        publications,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save publication state.');
    } finally {
      setIsSavingPublication(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!selectedDraft || selectedPublishAccountIds.length === 0) {
      setError('Select at least one social channel before publishing.');
      return;
    }

    setIsPublishingDraft(true);
    setPublishMessage(null);
    setError(null);
    try {
      const result = await publishDraftToSocialAccounts(selectedDraft.id, selectedPublishAccountIds);
      const publishedCount = result.results.filter((item) => item.status === 'published').length;
      const failedCount = result.results.filter((item) => item.status !== 'published').length;
      setPublishMessage(
        failedCount > 0
          ? `${publishedCount} channel(s) published, ${failedCount} channel(s) still need auth or implementation.`
          : `Published to ${publishedCount} channel(s).`,
      );
      const refreshedDraft = await getDraft(selectedDraft.id);
      setSelectedDraft(refreshedDraft);
      setDrafts((current) => current.map((draft) => (draft.id === refreshedDraft.id ? refreshedDraft : draft)));
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Failed to publish draft.');
    } finally {
      setIsPublishingDraft(false);
    }
  };

  const handlePublishWebsite = async () => {
    if (!selectedDraft) {
      return;
    }

    setIsPublishingWebsite(true);
    setWebsitePublishMessage(null);
    setError(null);
    try {
      const result = await publishDraftToWebsite(selectedDraft.id, {
        requestedBy: currentUserEmail ?? null,
        versionId: selectedVersion?.id ?? selectedDraft.currentVersionId,
        websiteUrl: websiteUrlDraft.trim() || null,
      });
      setSelectedDraft(result.draft);
      setDrafts((current) => current.map((draft) => (draft.id === result.draft.id ? result.draft : draft)));
      setWebsiteUrlDraft(result.draft.websiteUrl ?? result.canonicalUrl);
      setStatusDraft(result.draft.status);
      setWebsitePublishMessage(`Website artifact published to ${result.canonicalUrl} and indexed as knowledge document ${result.knowledgeDocumentId}.`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Failed to publish website artifact.');
    } finally {
      setIsPublishingWebsite(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-slate-100">Omnichannel Workspace</h3>
          <p className="text-sm text-slate-400">
            Draft inventory, channel onboarding, and publication routing for the Cloudflare/Turso backend.
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-700 bg-slate-900/50 p-1">
          <button
            onClick={() => setActiveSection('drafts')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === 'drafts' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setActiveSection('channels')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === 'channels' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setActiveSection('knowledge')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === 'knowledge' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Knowledge
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-600/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {activeSection === 'channels' ? (
        <OmnichannelChannelsPanel currentUserEmail={currentUserEmail} />
      ) : activeSection === 'knowledge' ? (
        <OmnichannelKnowledgePanel currentUserEmail={currentUserEmail} />
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-700 bg-slate-800/70">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-200">Draft Queue</div>
              <div className="text-xs text-slate-500">Most recently updated first</div>
            </div>
            <button
              onClick={() => void loadDrafts(true)}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Refresh Drafts
            </button>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {isLoadingList ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : drafts.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500">No drafts stored yet.</div>
            ) : (
              drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => setSelectedDraftId(draft.id)}
                  className={`w-full border-b border-slate-700/60 px-4 py-3 text-left transition-colors hover:bg-slate-700/40 ${
                    selectedDraftId === draft.id ? 'bg-slate-700/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{draft.subjectTitle}</div>
                      <div className="text-xs text-slate-500">{draft.reviewStage ?? 'No review stage'}</div>
                    </div>
                    <span className="rounded-full bg-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300">
                      {draft.status}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    v{draft.latestVersionNo} • {new Date(draft.updatedAt).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
          {isLoadingDraft ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : !selectedDraft ? (
            <div className="py-12 text-center text-sm text-slate-500">Select a draft to inspect or manage it.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-xl font-semibold text-slate-100">{selectedDraft.subjectTitle}</h4>
                  <div className="mt-1 text-xs text-slate-500">
                    {selectedDraft.id} • current version {selectedDraft.currentVersion?.versionNo ?? selectedDraft.latestVersionNo}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.open(`/studio/drafts/${selectedDraft.id}`, '_blank', 'noopener,noreferrer')}
                    className="rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/15"
                  >
                    Open Full Review
                  </button>
                  <div className="rounded-full bg-emerald-900/30 px-3 py-1 text-xs uppercase tracking-wide text-emerald-300">
                    {selectedDraft.status}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Review Stage</div>
                  <div className="mt-2 text-sm text-slate-200">{selectedDraft.reviewStage ?? 'Not set'}</div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Updated</div>
                  <div className="mt-2 text-sm text-slate-200">{new Date(selectedDraft.updatedAt).toLocaleString()}</div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Created By</div>
                  <div className="mt-2 text-sm text-slate-200">{selectedDraft.createdBy ?? 'Unknown'}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="mb-4 text-sm font-medium text-slate-200">Draft Metadata</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="text-sm text-slate-300 md:col-span-2 xl:col-span-1">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Subject Title</div>
                    <input
                      value={subjectTitleDraft}
                      onChange={(event) => setSubjectTitleDraft(event.target.value)}
                      placeholder="Movie title"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-300">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Status</div>
                    <select
                      value={statusDraft}
                      onChange={(event) => setStatusDraft(event.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-slate-300">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Review Stage</div>
                    <input
                      value={reviewStageDraft}
                      onChange={(event) => setReviewStageDraft(event.target.value)}
                      placeholder="pre-release, theatrical, post-release"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-300">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Website URL</div>
                    <input
                      value={websiteUrlDraft}
                      onChange={(event) => setWebsiteUrlDraft(event.target.value)}
                      placeholder="https://greybrainer-dev.pages.dev/lens/..."
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-300">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Medium URL</div>
                    <input
                      value={mediumUrlDraft}
                      onChange={(event) => setMediumUrlDraft(event.target.value)}
                      placeholder="https://medium.com/@GreyBrainer/..."
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-300 md:col-span-2 xl:col-span-3">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">SEO Title</div>
                    <input
                      value={seoTitleDraft}
                      onChange={(event) => setSeoTitleDraft(event.target.value)}
                      placeholder="SEO title for website or Medium"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-300 md:col-span-2 xl:col-span-3">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">SEO Description</div>
                    <textarea
                      value={seoDescriptionDraft}
                      onChange={(event) => setSeoDescriptionDraft(event.target.value)}
                      placeholder="Short search summary"
                      rows={3}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => void handleUpdateDraft()}
                    disabled={isSavingStatus}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:bg-emerald-800"
                  >
                    {isSavingStatus ? 'Saving...' : 'Save Metadata'}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Website Publish</div>
                    <div className="text-xs text-slate-500">
                      Publish the selected version into Cloudflare R2, register the website URL, and sync it into the knowledge base.
                    </div>
                  </div>
                  <button
                    onClick={() => void handlePublishWebsite()}
                    disabled={isPublishingWebsite || (selectedDraft.status !== 'approved' && selectedDraft.status !== 'published')}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:bg-sky-900"
                  >
                    {isPublishingWebsite ? 'Publishing Website…' : `Publish ${selectedVersion ? `v${selectedVersion.versionNo}` : 'Current'} to Website`}
                  </button>
                </div>

                {websitePublishMessage && (
                  <div className="mb-4 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
                    {websitePublishMessage}
                  </div>
                )}

                <div className="rounded-lg border border-slate-700 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
                  {selectedDraft.status === 'approved' || selectedDraft.status === 'published'
                    ? `Selected version ${selectedVersion ? `v${selectedVersion.versionNo}` : 'current'} will be finalized into the website artifact package.`
                    : 'Set draft status to approved, save metadata, then publish to website.'}
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-200">One-Button Publish</div>
                    <div className="text-xs text-slate-500">
                      Select saved channels, test them in the Channels tab, then publish the current draft version.
                    </div>
                  </div>
                  <button
                    onClick={() => void handlePublishDraft()}
                    disabled={isPublishingDraft || selectedPublishAccountIds.length === 0}
                    className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-fuchsia-500 disabled:bg-fuchsia-900"
                  >
                    {isPublishingDraft ? 'Publishing...' : 'Publish Current Draft'}
                  </button>
                </div>

                {publishMessage && (
                  <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {publishMessage}
                  </div>
                )}

                {isLoadingSocialAccounts ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {socialAccounts.map((account) => {
                      const checked = selectedPublishAccountIds.includes(account.id);
                      const ready = account.connectionStatus === 'connected';
                      return (
                        <label key={account.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setSelectedPublishAccountIds((current) =>
                                event.target.checked
                                  ? [...current, account.id]
                                  : current.filter((item) => item !== account.id),
                              );
                            }}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium capitalize text-slate-100">{account.platform}</div>
                            <div className="truncate text-xs text-slate-400">{account.handle ?? account.displayName ?? account.normalizedUrl}</div>
                            <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">{account.connectorKey}</div>
                            <div className={`mt-2 text-[11px] ${ready ? 'text-emerald-300' : 'text-amber-300'}`}>
                              {ready ? 'ready to publish' : 'auth or connector work still needed'}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
                <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-200">Version History</div>
                    {isLoadingVersions && <span className="text-xs text-slate-500">Loading…</span>}
                  </div>
                  <div className="space-y-2">
                    {(selectedDraft.versions ?? []).map((version) => (
                      <button
                        key={version.id}
                        onClick={() => setSelectedVersionId(version.id)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                          selectedVersion?.id === version.id
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 bg-slate-800/70 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-200">v{version.versionNo}</span>
                          {selectedDraft.currentVersionId === version.id && (
                            <span className="rounded-full bg-emerald-900/40 px-2 py-1 text-[10px] uppercase tracking-wide text-emerald-300">
                              current
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                          {new Date(version.createdAt).toLocaleString()}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-slate-400">
                          {version.createdBy ?? 'Unknown editor'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                  <div className="mb-3 text-sm font-medium text-slate-200">
                    Markdown Draft {selectedVersion ? `(v${selectedVersion.versionNo})` : ''}
                  </div>
                  <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/70 p-4 text-xs leading-6 text-slate-300">
                    {selectedVersion?.blogMarkdown ?? 'No version markdown found.'}
                  </pre>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
                      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Editor Notes</div>
                      <div className="text-sm text-slate-300">
                        {selectedVersion?.editorNotes?.trim() || 'No editor notes stored for this version.'}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
                      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Social Output</div>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-6 text-slate-300">
                        {selectedVersion?.socials ? JSON.stringify(selectedVersion.socials, null, 2) : 'No social payload stored.'}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                    <div className="mb-3 text-sm font-medium text-slate-200">Channel States</div>
                    <div className="space-y-2">
                      {CHANNELS.map((channel) => {
                        const publication = selectedPublicationMap.get(channel);
                        return (
                          <div key={channel} className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-200">{channel}</span>
                              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                {publication?.status ?? 'not-set'}
                              </span>
                            </div>
                            {publication?.externalUrl && (
                              <a
                                href={publication.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 block truncate text-xs text-sky-400 hover:text-sky-300"
                              >
                                {publication.externalUrl}
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                    <div className="mb-3 text-sm font-medium text-slate-200">Update Publication State</div>
                    <div className="space-y-3">
                      <select
                        value={publicationForm.channel}
                        onChange={(event) => setPublicationForm((current) => ({ ...current, channel: event.target.value }))}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      >
                        {CHANNELS.map((channel) => (
                          <option key={channel} value={channel}>
                            {channel}
                          </option>
                        ))}
                      </select>

                      <select
                        value={publicationForm.status}
                        onChange={(event) => setPublicationForm((current) => ({ ...current, status: event.target.value }))}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      >
                        {PUBLICATION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <input
                        value={publicationForm.externalUrl ?? ''}
                        onChange={(event) => setPublicationForm((current) => ({ ...current, externalUrl: event.target.value }))}
                        placeholder="Published URL"
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />

                      <input
                        value={publicationForm.externalId ?? ''}
                        onChange={(event) => setPublicationForm((current) => ({ ...current, externalId: event.target.value }))}
                        placeholder="External ID"
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />

                      <input
                        value={publicationForm.publishedAt ?? ''}
                        onChange={(event) => setPublicationForm((current) => ({ ...current, publishedAt: event.target.value }))}
                        placeholder="2026-03-11T09:00:00.000Z"
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />

                      <button
                        onClick={() => void handleSavePublication()}
                        disabled={isSavingPublication}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-indigo-800"
                      >
                        {isSavingPublication ? 'Saving...' : 'Save Publication State'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
