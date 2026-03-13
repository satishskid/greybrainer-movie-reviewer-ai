import React, { useEffect, useMemo, useState } from 'react';
import { generateDailyBrief, listDrafts, type DailyBriefGenerationResult, type DraftRecord } from '../services/omnichannelDraftService';
import { LoadingSpinner } from './LoadingSpinner';

interface DailyBriefStudioProps {
  currentUserEmail?: string | null;
  /** @deprecated No longer used — the button now navigates directly to /studio/drafts/:id */
  onOpenPublishingWorkspace?: () => void;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getNarrativePreview(markdown: string | null | undefined) {
  if (!markdown) {
    return 'No draft body available yet.';
  }

  const cleaned = markdown
    .replace(/\[\[LENS_NARRATIVE:[\s\S]*?\]\]/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) {
    return 'Draft contains the narrative tag block and is ready for editor review.';
  }

  return cleaned.length > 520 ? `${cleaned.slice(0, 520).trim()}...` : cleaned;
}

function openDraftInEditor(draftId: string) {
  window.open(`/studio/drafts/${draftId}`, '_blank');
}

const STATUS_COLORS: Record<string, string> = {
  generated: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  editing: 'border-blue-500/40 bg-blue-500/10 text-blue-200',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  published: 'border-green-500/40 bg-green-500/10 text-green-200',
  scheduled: 'border-purple-500/40 bg-purple-500/10 text-purple-200',
  failed: 'border-red-500/40 bg-red-500/10 text-red-200',
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'border-slate-700 bg-slate-800 text-slate-300';
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${color}`}>
      {status}
    </span>
  );
}

export const DailyBriefStudio: React.FC<DailyBriefStudioProps> = ({ currentUserEmail }) => {
  const [dailyDrafts, setDailyDrafts] = useState<DraftRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<DailyBriefGenerationResult | null>(null);

  const loadDailyDrafts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const drafts = await listDrafts(50);
      setDailyDrafts(drafts.filter((draft) => draft.subjectType === 'daily-brief'));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load daily brief drafts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDailyDrafts();
  }, []);

  const latestDraft = dailyDrafts[0] ?? null;

  const latestSummary = useMemo(() => {
    if (!latestDraft?.currentVersion?.blogMarkdown) {
      return null;
    }

    return {
      hasNarrativeTag: latestDraft.currentVersion.blogMarkdown.includes('[[LENS_NARRATIVE:'),
      preview: getNarrativePreview(latestDraft.currentVersion.blogMarkdown),
    };
  }, [latestDraft]);

  const handleGenerate = async (force = false) => {
    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);

    try {
      const result = await generateDailyBrief({
        force,
        requestedBy: currentUserEmail ?? 'editor:daily-brief',
        timezone: 'Asia/Kolkata',
      });
      setGenerationResult(result);
      await loadDailyDrafts();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Failed to generate the daily brief.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Pipeline Steps ── */}
      <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-950/60 via-slate-900 to-slate-950 p-5 shadow-xl">
        <div className="mb-4">
          <div className="mb-1 inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">
            Editorial Pipeline
          </div>
          <h3 className="text-xl font-semibold text-white">Daily Lens Brief</h3>
          <p className="mt-1 text-sm text-slate-400">
            One automated editorial draft per day. Generate → Edit → Approve → Publish.
          </p>
        </div>

        {/* Step indicators */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/40 p-3 text-center">
            <div className="text-lg">①</div>
            <div className="mt-1 text-xs font-semibold text-sky-200">Generate</div>
            <div className="mt-0.5 text-[10px] text-slate-500">Auto or manual</div>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/40 p-3 text-center">
            <div className="text-lg">②</div>
            <div className="mt-1 text-xs font-semibold text-blue-200">Edit</div>
            <div className="mt-0.5 text-[10px] text-slate-500">Full-page editor</div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-center">
            <div className="text-lg">③</div>
            <div className="mt-1 text-xs font-semibold text-emerald-200">Approve</div>
            <div className="mt-0.5 text-[10px] text-slate-500">Editor sign-off</div>
          </div>
          <div className="rounded-xl border border-green-500/30 bg-green-950/40 p-3 text-center">
            <div className="text-lg">④</div>
            <div className="mt-1 text-xs font-semibold text-green-200">Publish</div>
            <div className="mt-0.5 text-[10px] text-slate-500">Website + social</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => void handleGenerate(false)}
            disabled={isGenerating}
            className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-sky-900 disabled:text-slate-400"
          >
            {isGenerating ? 'Generating…' : "Generate Today's Draft"}
          </button>
          <button
            onClick={() => void handleGenerate(true)}
            disabled={isGenerating}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-sky-400 hover:text-sky-200 disabled:opacity-50"
          >
            Regenerate
          </button>
          <button
            onClick={() => void loadDailyDrafts()}
            disabled={isLoading}
            className="rounded-xl border border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
          >
            Refresh
          </button>
          {latestDraft && (
            <button
              onClick={() => openDraftInEditor(latestDraft.id)}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Open Latest in Editor →
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {generationResult && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
          <div className="font-medium">
            {generationResult.status === 'generated'
              ? `Daily brief ready for ${generationResult.dateLabel}.`
              : generationResult.message ?? `Daily brief status: ${generationResult.status}`}
          </div>
          <div className="mt-1 text-xs text-emerald-200/80">
            Draft ID: {generationResult.draftId ?? 'not returned'} • Date key: {generationResult.dateKey}
            {generationResult.generationMode ? ` • Mode: ${generationResult.generationMode}` : ''}
          </div>
          {generationResult.draftId && (
            <button
              onClick={() => openDraftInEditor(generationResult.draftId!)}
              className="mt-2 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
            >
              Open in Editor →
            </button>
          )}
        </div>
      )}

      {/* ── Draft Queue ── */}
      {isLoading ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-5 text-sm text-slate-300">
          <LoadingSpinner size="sm" />
          Loading daily brief drafts...
        </div>
      ) : latestDraft ? (
        <div className="space-y-4">
          {/* Latest draft hero card */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-semibold text-slate-100">{latestDraft.subjectTitle}</h4>
                  <StatusBadge status={latestDraft.status} />
                </div>
                <p className="mt-1.5 text-sm text-slate-400">
                  {formatTimestamp(latestDraft.updatedAt)} • v{latestDraft.latestVersionNo}
                  {latestDraft.reviewStage ? ` • ${latestDraft.reviewStage}` : ''}
                </p>
              </div>
              <button
                onClick={() => openDraftInEditor(latestDraft.id)}
                className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow transition hover:bg-slate-100"
              >
                Open in Editor →
              </button>
            </div>

            {/* Preview */}
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">Draft Preview</div>
              <div className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {latestSummary?.preview ?? 'No preview available.'}
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Narrative tag: {latestSummary?.hasNarrativeTag ? '✓ Present' : '✗ Missing'}</span>
              <span>Website: {latestDraft.websiteUrl ? '✓ Published' : '✗ Not yet'}</span>
            </div>
          </div>

          {/* Recent drafts list */}
          {dailyDrafts.length > 1 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">Recent Daily Drafts</div>
              <div className="divide-y divide-slate-800">
                {dailyDrafts.slice(1, 8).map((draft) => (
                  <div key={draft.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-200">{draft.subjectTitle}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{formatTimestamp(draft.updatedAt)}</div>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <StatusBadge status={draft.status} />
                      <button
                        onClick={() => openDraftInEditor(draft.id)}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-sky-400 hover:text-sky-200"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-300">
          No daily brief drafts exist yet. Use <span className="font-medium text-sky-300">Generate Today's Draft</span> to seed
          the first one, then open it in the editor to review and publish.
        </div>
      )}
    </div>
  );
};
