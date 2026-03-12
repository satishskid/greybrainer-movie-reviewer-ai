import React, { useEffect, useMemo, useState } from 'react';
import { generateDailyBrief, listDrafts, type DailyBriefGenerationResult, type DraftRecord } from '../services/omnichannelDraftService';
import { LoadingSpinner } from './LoadingSpinner';

interface DailyBriefStudioProps {
  currentUserEmail?: string | null;
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

export const DailyBriefStudio: React.FC<DailyBriefStudioProps> = ({ currentUserEmail, onOpenPublishingWorkspace }) => {
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
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/80 via-slate-900 to-slate-950 p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">
              Adaptive Daily Flow
            </div>
            <h3 className="text-2xl font-semibold text-white">Daily Lens Brief</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This is the only automated editorial draft in Greybrainer. Every morning the Worker generates one daily
              intelligence brief, stores it in Cloudflare, and leaves it ready for editor review before publishing.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Generation</div>
                <div className="mt-1 text-sm font-medium text-slate-100">Scheduled daily at 09:00 IST</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Format</div>
                <div className="mt-1 text-sm font-medium text-slate-100">Includes `[[LENS_NARRATIVE: ...]]`</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Review</div>
                <div className="mt-1 text-sm font-medium text-slate-100">Editor approves before website/social</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:w-72">
            <button
              onClick={() => void handleGenerate(false)}
              disabled={isGenerating}
              className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-sky-900 disabled:text-slate-400"
            >
              {isGenerating ? 'Generating…' : "Generate Today's Draft"}
            </button>
            <button
              onClick={() => void handleGenerate(true)}
              disabled={isGenerating}
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Regenerate as New Version
            </button>
            <button
              onClick={() => void loadDailyDrafts()}
              disabled={isLoading}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh Draft Status
            </button>
            {onOpenPublishingWorkspace && (
              <button
                onClick={onOpenPublishingWorkspace}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/15"
              >
                Open Review & Publishing Workspace
              </button>
            )}
          </div>
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
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-5 text-sm text-slate-300">
          <LoadingSpinner size="sm" />
          Loading daily brief drafts...
        </div>
      ) : latestDraft ? (
        <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Latest Daily Draft</div>
                <h4 className="mt-2 text-xl font-semibold text-slate-100">{latestDraft.subjectTitle}</h4>
                <p className="mt-2 text-sm text-slate-400">
                  Generated {formatTimestamp(latestDraft.updatedAt)} • Status: <span className="text-sky-300">{latestDraft.status}</span>
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                Review stage: {latestDraft.reviewStage ?? 'not set'}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Narrative Tag</div>
                <div className="mt-2 text-sm font-medium text-slate-100">
                  {latestSummary?.hasNarrativeTag ? 'Present' : 'Missing'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Website URL</div>
                <div className="mt-2 break-all text-sm text-slate-100">
                  {latestDraft.websiteUrl ?? 'Not published yet'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Version</div>
                <div className="mt-2 text-sm text-slate-100">v{latestDraft.latestVersionNo}</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
              <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">Editor Preview</div>
              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{latestSummary?.preview ?? 'No preview available.'}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Recent Daily Drafts</div>
            <div className="mt-4 space-y-3">
              {dailyDrafts.slice(0, 5).map((draft) => (
                <div key={draft.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="text-sm font-medium text-slate-100">{draft.subjectTitle}</div>
                  <div className="mt-1 text-xs text-slate-400">{formatTimestamp(draft.updatedAt)}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">{draft.status}</span>
                    <span className="text-slate-500">v{draft.latestVersionNo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-300">
          No daily brief drafts exist yet. Use <span className="font-medium text-sky-300">Generate Today's Draft</span> to seed
          the first one, then the editor can review and publish it from the Omnichannel workspace.
        </div>
      )}
    </div>
  );
};
