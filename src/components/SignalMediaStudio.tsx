import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Monitor,
  RefreshCw,
  Save,
  Sparkles,
  Smartphone,
  Upload,
  X,
} from 'lucide-react';
import {
  getSignalVisualSourceUrls,
  buildSingleShotImagePrompt,
  buildSingleShotReelPrompt,
  type SignalMediaCopy,
  type SignalMediaDraft,
  type SignalMediaFormat,
} from '../services/signalMediaService';

export type SignalMediaUploadKey =
  | 'signal-actor-1'
  | 'signal-actor-2'
  | 'signal-actor-3'
  | 'signal-director'
  | 'signal-platform-logo'
  | 'signal-still';

interface SignalMediaStudioProps {
  draft: SignalMediaDraft;
  isGeneratingFormat: SignalMediaFormat | null;
  isSaving: boolean;
  isUploadingKey: SignalMediaUploadKey | null;
  onAssetUpload: (key: SignalMediaUploadKey, file: File) => Promise<void>;
  onChange: (draft: SignalMediaDraft) => void;
  onGenerateVisual: (format: SignalMediaFormat) => Promise<void>;
  onReset: () => void;
  onSave: () => Promise<void>;
}

interface FormatDefinition {
  height: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  width: number;
}

const FORMAT_DEFINITIONS: Record<SignalMediaFormat, FormatDefinition> = {
  social: {
    height: 1350,
    icon: ImageIcon,
    label: 'Social 4:5',
    width: 1080,
  },
  youtube: {
    height: 720,
    icon: Monitor,
    label: 'YouTube 16:9',
    width: 1280,
  },
  reel: {
    height: 1920,
    icon: Smartphone,
    label: 'Reel 9:16',
    width: 1080,
  },
};

const ASSET_SLOTS: Array<{
  index?: number;
  key: SignalMediaUploadKey;
  label: string;
  note: string;
}> = [
  { key: 'signal-actor-1', index: 0, label: 'Lead performer', note: 'Official portrait or still' },
  { key: 'signal-actor-2', index: 1, label: 'Second performer', note: 'Official portrait or still' },
  { key: 'signal-actor-3', index: 2, label: 'Third performer', note: 'Optional' },
  { key: 'signal-director', label: 'Director', note: 'Official portrait' },
  { key: 'signal-still', label: 'Movie still', note: 'Landscape preferred' },
  { key: 'signal-platform-logo', label: 'Platform or studio', note: 'Optional verified logo' },
];

function clip(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).replace(/\s+\S*$/, '').trim()}...`;
}

function scoreLabel(score: number | null): string {
  return score === null ? 'N/A' : score.toFixed(1);
}

function safeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'greybrainer-signal';
}

function triggerDownload(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function SignalScoreBars({ copy, compact = false }: { copy: SignalMediaCopy; compact?: boolean }) {
  const maxScore = Math.max(
    10,
    ...copy.layers.map((layer) => layer.score ?? 0),
  );
  const strongestScore = Math.max(...copy.layers.map((layer) => layer.score ?? -1));

  return (
    <div className={compact ? 'space-y-2' : 'grid grid-cols-3 gap-3'}>
      {copy.layers.map((layer) => {
        const isStrongest = layer.score !== null && layer.score === strongestScore;
        return (
          <div
            key={layer.id}
            className={`border px-3 py-2 ${
              compact ? 'rounded-md' : 'rounded-lg'
            } ${
              isStrongest
                ? 'border-red-500/80 bg-red-500/10'
                : 'border-white/15 bg-black/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`${compact ? 'text-[14px]' : 'text-[16px]'} font-semibold uppercase text-white/65`}>{layer.label}</span>
              <span className={`${compact ? 'text-[22px]' : 'text-[28px]'} font-bold ${isStrongest ? 'text-red-300' : 'text-white'}`}>
                {scoreLabel(layer.score)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-white/10">
              <div
                className={isStrongest ? 'h-full bg-red-500' : 'h-full bg-sky-400'}
                style={{ width: `${Math.max(0, Math.min(100, ((layer.score ?? 0) / maxScore) * 100))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmotionalMotion({ copy, compact = false }: { copy: SignalMediaCopy; compact?: boolean }) {
  const moments = [
    ['Hook', copy.morphokinetics.opening],
    ['Rise', copy.morphokinetics.rise],
    ['Dip', copy.morphokinetics.dip],
    ['Peak', copy.morphokinetics.peak],
    ['Aftertaste', copy.morphokinetics.aftertaste],
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[15px] font-semibold uppercase tracking-[0.16em] text-white/55">
          Emotional motion
        </span>
        <span className="text-[14px] text-red-300">Morphokinetics</span>
      </div>
      <div className="relative grid grid-cols-5 gap-1">
        <div className="absolute left-[8%] right-[8%] top-2.5 h-0.5 bg-gradient-to-r from-sky-400 via-red-500 to-amber-300" />
        {moments.map(([label, description]) => (
          <div key={label} className="relative min-w-0 pt-7">
            <span className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-full border-2 border-[#080d18] ${
              label === 'Peak' ? 'h-6 w-6 bg-red-500' : 'h-5 w-5 bg-sky-400'
            }`} />
            <div className="text-center text-[12px] font-semibold uppercase text-white/75">{label}</div>
            {!compact && (
              <div className="mt-1 line-clamp-2 text-center text-[11px] leading-[1.3] text-white/45">
                {clip(description, 54)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PortraitStrip({ draft }: { draft: SignalMediaDraft }) {
  const sources = [
    ...draft.assets.actorUrls
      .map((url, index) => ({
        label: draft.copy.mainCast[index] || `Performer ${index + 1}`,
        url,
      }))
      .filter((item) => item.url),
    ...(draft.assets.directorUrl
      ? [{ label: draft.copy.director || 'Director', url: draft.assets.directorUrl }]
      : []),
  ].slice(0, 4);

  if (!sources.length) return null;

  return (
    <div className="flex gap-2">
      {sources.map((source) => (
        <div key={`${source.label}-${source.url}`} className="min-w-0 flex-1">
          <img
            alt={source.label}
            crossOrigin="anonymous"
            src={source.url}
            className="aspect-[16/9] w-full rounded-md border border-white/15 object-cover"
          />
          <div className="mt-1 truncate text-center text-[12px] font-medium text-white/65">{source.label}</div>
        </div>
      ))}
    </div>
  );
}

function SignalCard({
  draft,
  format,
}: {
  draft: SignalMediaDraft;
  format: SignalMediaFormat;
}) {
  const definition = FORMAT_DEFINITIONS[format];
  const generatedBackgroundUrl = draft.assets.generatedVisualUrls[format];
  const backgroundUrl = generatedBackgroundUrl || draft.assets.stillUrl || draft.assets.posterUrl;
  const isLandscape = format === 'youtube';
  const isReel = format === 'reel';
  const titleSize = isLandscape ? 'text-[44px]' : isReel ? 'text-[64px]' : 'text-[52px]';
  const hookSize = isLandscape ? 'text-[28px]' : isReel ? 'text-[42px]' : 'text-[32px]';
  const overall = draft.copy.overallScore === null ? 'N/A' : draft.copy.overallScore.toFixed(1);

  return (
    <div
      className="relative isolate overflow-hidden bg-[#080d18] text-white"
      style={{ height: definition.height, width: definition.width }}
    >
      {generatedBackgroundUrl && (
        <div className="absolute inset-0">
          <img
            alt=""
            crossOrigin="anonymous"
            src={generatedBackgroundUrl}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/25" />
          <div
            className={`absolute inset-0 ${
              isLandscape
                ? 'bg-gradient-to-r from-transparent via-[#080d18]/45 to-[#080d18]/95'
                : 'bg-gradient-to-b from-transparent via-[#080d18]/55 to-[#080d18]'
            }`}
          />
        </div>
      )}
      {!generatedBackgroundUrl && (
        <div className={isLandscape ? 'absolute inset-y-0 left-0 w-[47%]' : 'absolute inset-x-0 top-0 h-[43%]'}>
        {backgroundUrl ? (
          <img
            alt=""
            crossOrigin="anonymous"
            src={backgroundUrl}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900 text-white/20">
            <Film className="h-16 w-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div
          className={`absolute inset-0 ${
            isLandscape
              ? 'bg-gradient-to-r from-transparent via-transparent to-[#080d18]'
              : 'bg-gradient-to-b from-transparent via-transparent to-[#080d18]'
          }`}
        />
      </div>
      )}

      <div className={`relative z-10 flex h-full flex-col ${isLandscape ? 'ml-[43%] p-[4%]' : 'p-[5%]'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="whitespace-nowrap text-[20px] font-black uppercase tracking-[0.2em] text-red-500">
            Greybrainer Signal
          </div>
          <div className="flex items-center gap-2">
            {draft.assets.platformLogoUrl && (
              <img
                alt=""
                crossOrigin="anonymous"
                src={draft.assets.platformLogoUrl}
                className="h-10 max-w-32 object-contain"
              />
            )}
            <div className={`rounded-md bg-red-600 px-5 py-2 text-[18px] font-black uppercase text-white ${
              draft.copy.verdict === 'MISS' ? 'bg-slate-600' : draft.copy.verdict === 'WATCH IF' ? 'bg-amber-500 text-black' : ''
            }`}>
              {draft.copy.verdict}
            </div>
          </div>
        </div>

        <div className={isLandscape ? 'mt-5' : isReel ? 'mt-[40%]' : 'mt-[30%]'}>
          <h2 className={`${titleSize} max-w-[95%] font-black leading-[1.02] text-white`}>
            {draft.copy.title}
          </h2>
          <p className={`${hookSize} mt-2 max-w-[98%] font-bold leading-[1.12] text-white`}>
            {clip(draft.copy.hook, isLandscape ? 148 : isReel ? 168 : 132)}
          </p>
        </div>

        <div className={isLandscape ? 'mt-4' : 'mt-3'}>
          <SignalScoreBars copy={draft.copy} compact={isLandscape} />
        </div>

        {!isLandscape && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-sky-400/25 bg-sky-400/5 p-4">
              <div className="text-[14px] font-bold uppercase tracking-[0.16em] text-sky-300">Where it shines</div>
              <p className="mt-2 text-[18px] leading-[1.3] text-white/78">
                {clip(draft.copy.creatorWin, isReel ? 210 : 150)}
              </p>
            </div>
            <div className="rounded-lg border border-amber-300/25 bg-amber-300/5 p-4">
              <div className="text-[14px] font-bold uppercase tracking-[0.16em] text-amber-200">Where it slips</div>
              <p className="mt-2 text-[18px] leading-[1.3] text-white/78">
                {clip(draft.copy.creatorGap, isReel ? 210 : 150)}
              </p>
            </div>
          </div>
        )}

        <div className={isLandscape ? 'mt-4' : 'mt-3'}>
          <EmotionalMotion copy={draft.copy} compact={isLandscape} />
        </div>

        {!isLandscape && (
          <div className="mt-4">
            <PortraitStrip draft={draft} />
          </div>
        )}

        {!isLandscape && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-4">
            <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-red-300">
              The Greybrainer read
            </div>
            <p className={`${isReel ? 'text-[20px]' : 'text-[17px]'} mt-2 leading-[1.4] text-white/68`}>
              {clip(draft.copy.caption, isReel ? 320 : 300)}
            </p>
          </div>
        )}

        {isReel && (
          <div className="mt-5 border-l-4 border-sky-400 bg-sky-400/[0.06] px-5 py-3">
            <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-sky-300">
              Audience verdict
            </div>
            <p className="mt-2 text-[20px] font-semibold leading-[1.35] text-white/85">
              {clip(draft.copy.audienceLine, 160)}
            </p>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-white/10 pt-3">
          <div className="max-w-[72%]">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/35">Character movement</div>
            <div className="mt-1 text-[16px] leading-[1.3] text-white/65">
              {clip(draft.copy.characterJourney, isLandscape ? 120 : 165)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[56px] font-black leading-none text-white">{overall}</div>
            <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-red-300">Overall / 10</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] font-medium text-white/35">
          <span>Evidence-led film analysis</span>
          <span>movies.greybrain.in</span>
        </div>
      </div>
    </div>
  );
}

function SignalCardPreview({
  draft,
  format,
}: {
  draft: SignalMediaDraft;
  format: SignalMediaFormat;
}) {
  const definition = FORMAT_DEFINITIONS[format];
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const updateScale = () => {
      setScale(Math.min(1, host.clientWidth / definition.width));
    };
    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(host);
    return () => observer.disconnect();
  }, [definition.width]);

  return (
    <div
      ref={hostRef}
      className="mx-auto min-w-0 overflow-hidden rounded-lg border border-slate-700 bg-black shadow-2xl shadow-black/30"
      style={{
        height: definition.height * scale,
        maxWidth: definition.width,
        width: '100%',
      }}
    >
      <div
        style={{
          height: definition.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: definition.width,
        }}
      >
        <SignalCard draft={draft} format={format} />
      </div>
    </div>
  );
}

function EditableField({
  label,
  onChange,
  rows = 2,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs leading-5 text-slate-200 outline-none transition focus:border-sky-500"
      />
    </label>
  );
}

export const SignalMediaStudio: React.FC<SignalMediaStudioProps> = ({
  draft,
  isGeneratingFormat,
  isSaving,
  isUploadingKey,
  onAssetUpload,
  onChange,
  onGenerateVisual,
  onReset,
  onSave,
}) => {
  const [format, setFormat] = useState<SignalMediaFormat>('social');
  const [promptMode, setPromptMode] = useState<'image' | 'reel'>('image');
  const [copied, setCopied] = useState<'image' | 'reel' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportRefs = useRef<Record<SignalMediaFormat, HTMLDivElement | null>>({
    reel: null,
    social: null,
    youtube: null,
  });

  const imagePrompt = useMemo(() => buildSingleShotImagePrompt(draft, format), [draft, format]);
  const reelPrompt = useMemo(() => buildSingleShotReelPrompt(draft), [draft]);
  const activePrompt = promptMode === 'image' ? imagePrompt : reelPrompt;
  const visualSourceCount = useMemo(() => getSignalVisualSourceUrls(draft).length, [draft]);
  const generatedVisualUrl = draft.assets.generatedVisualUrls[format];
  const isGenerating = isGeneratingFormat === format;

  const updateCopy = <K extends keyof SignalMediaCopy>(key: K, value: SignalMediaCopy[K]) => {
    onChange({
      ...draft,
      copy: {
        ...draft.copy,
        [key]: value,
      },
    });
  };

  const updateMorpho = (key: keyof SignalMediaCopy['morphokinetics'], value: string) => {
    updateCopy('morphokinetics', {
      ...draft.copy.morphokinetics,
      [key]: value,
    });
  };

  const assetValue = (slot: (typeof ASSET_SLOTS)[number]) => {
    if (typeof slot.index === 'number') return draft.assets.actorUrls[slot.index] ?? '';
    if (slot.key === 'signal-director') return draft.assets.directorUrl;
    if (slot.key === 'signal-still') return draft.assets.stillUrl;
    return draft.assets.platformLogoUrl;
  };

  const clearAsset = (slot: (typeof ASSET_SLOTS)[number]) => {
    if (typeof slot.index === 'number') {
      const actorUrls = [...draft.assets.actorUrls];
      actorUrls[slot.index] = '';
      onChange({ ...draft, assets: { ...draft.assets, actorUrls } });
      return;
    }
    const key = slot.key === 'signal-director'
      ? 'directorUrl'
      : slot.key === 'signal-still'
        ? 'stillUrl'
        : 'platformLogoUrl';
    onChange({ ...draft, assets: { ...draft.assets, [key]: '' } });
  };

  const copyPrompt = async (mode: 'image' | 'reel') => {
    const value = mode === 'image' ? imagePrompt : reelPrompt;
    await navigator.clipboard.writeText(value);
    setCopied(mode);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const clearGeneratedVisual = () => {
    onChange({
      ...draft,
      assets: {
        ...draft.assets,
        generatedVisualUrls: {
          ...draft.assets.generatedVisualUrls,
          [format]: '',
        },
      },
    });
  };

  const exportFormat = async (targetFormat: SignalMediaFormat) => {
    const node = exportRefs.current[targetFormat];
    if (!node) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const definition = FORMAT_DEFINITIONS[targetFormat];
      const dataUrl = await toPng(node, {
        backgroundColor: '#080d18',
        cacheBust: true,
        height: definition.height,
        pixelRatio: 1,
        skipFonts: true,
        width: definition.width,
      });
      triggerDownload(
        dataUrl,
        `${safeFileName(draft.copy.title)}-greybrainer-${targetFormat}.png`,
      );
    } catch (error) {
      console.error('Signal card export failed:', error);
      setExportError('Export failed. Use only uploaded R2 images, then try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-14rem)] bg-[#0a111d]">
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Greybrainer Media Pack</h2>
            <p className="mt-1 text-xs text-slate-400">
              Review evidence in, approved social assets out.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset from review
            </button>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={isSaving}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-sky-500 px-3 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save Media Pack'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/[0.06] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-sky-300" />
                  Gemini visual production
                </h3>
                <p className="mt-1 max-w-xl text-[11px] leading-5 text-slate-400">
                  Gemini composes the approved images only. Greybrainer adds every word, score and signal afterward.
                </p>
              </div>
              <div className="whitespace-nowrap text-[10px] font-medium text-slate-500">
                {visualSourceCount} source{visualSourceCount === 1 ? '' : 's'}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onGenerateVisual(format)}
                disabled={isGeneratingFormat !== null || visualSourceCount === 0}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-sky-500 px-3 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isGenerating
                  ? 'Creating visual...'
                  : generatedVisualUrl
                    ? `Regenerate ${FORMAT_DEFINITIONS[format].label}`
                    : `Generate ${FORMAT_DEFINITIONS[format].label}`}
              </button>
              {generatedVisualUrl && (
                <button
                  type="button"
                  onClick={clearGeneratedVisual}
                  disabled={isGeneratingFormat !== null}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-medium text-slate-300 transition hover:border-red-500 hover:text-red-200 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Use original images
                </button>
              )}
            </div>
            {visualSourceCount === 0 && (
              <p className="mt-3 text-[11px] text-amber-200">
                Upload at least one approved still, poster or portrait below to enable Gemini.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-md border border-slate-800 bg-slate-950 p-1">
              {(Object.entries(FORMAT_DEFINITIONS) as Array<[SignalMediaFormat, FormatDefinition]>).map(([key, definition]) => {
                const Icon = definition.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormat(key)}
                    className={`inline-flex h-8 items-center gap-2 rounded px-3 text-xs font-medium transition ${
                      format === key ? 'bg-slate-100 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {definition.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => void exportFormat(format)}
              disabled={isExporting}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-3 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {isExporting ? 'Exporting...' : `Download ${FORMAT_DEFINITIONS[format].label}`}
            </button>
          </div>

          <SignalCardPreview draft={draft} format={format} />
          {exportError && (
            <div className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs text-red-200">
              {exportError}
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Approved image sources</h3>
                <p className="mt-1 text-[11px] text-slate-500">Uploads are saved to the draft automatically.</p>
              </div>
              <div className="text-[10px] text-slate-500">
                Poster: {draft.assets.posterUrl ? 'ready' : 'use Images panel'}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ASSET_SLOTS.map((slot) => {
                const value = assetValue(slot);
                return (
                  <div key={slot.key} className="rounded-md border border-slate-800 bg-slate-900/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-slate-200">{slot.label}</div>
                        <div className="mt-0.5 text-[10px] text-slate-500">{slot.note}</div>
                      </div>
                      <div className="flex gap-1">
                        {value && (
                          <button
                            type="button"
                            onClick={() => clearAsset(slot)}
                            title={`Remove ${slot.label}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-700 text-slate-400 transition hover:border-red-500 hover:text-red-300"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <label
                          title={`Upload ${slot.label}`}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-slate-700 text-slate-300 transition hover:border-sky-500 hover:text-sky-300"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void onAssetUpload(slot.key, file);
                              event.currentTarget.value = '';
                            }}
                          />
                          {isUploadingKey === slot.key ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                        </label>
                      </div>
                    </div>
                    {value ? (
                      <img
                        alt={slot.label}
                        crossOrigin="anonymous"
                        src={value}
                        className="mt-3 aspect-video w-full rounded border border-slate-800 object-cover"
                      />
                    ) : (
                      <div className="mt-3 flex aspect-video items-center justify-center rounded border border-dashed border-slate-700 text-slate-600">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Manual AI fallback</h3>
                <p className="mt-1 text-[11px] text-slate-500">Use this prompt only when the direct Gemini button is unavailable.</p>
              </div>
              <div className="inline-flex rounded border border-slate-800 bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() => setPromptMode('image')}
                  className={`inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium ${
                    promptMode === 'image' ? 'bg-slate-100 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  <ImageIcon className="h-3 w-3" />
                  Image
                </button>
                <button
                  type="button"
                  onClick={() => setPromptMode('reel')}
                  className={`inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium ${
                    promptMode === 'reel' ? 'bg-slate-100 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  <Film className="h-3 w-3" />
                  Reel
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={activePrompt}
              rows={12}
              className="mt-3 w-full resize-y rounded-md border border-slate-800 bg-[#070b12] px-3 py-3 font-mono text-[10px] leading-4 text-slate-400 outline-none"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void copyPrompt(promptMode)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-500"
              >
                {copied === promptMode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === promptMode ? 'Copied' : `Copy ${promptMode === 'image' ? 'Image' : 'Reel'} Prompt`}
              </button>
              <a
                href="https://gemini.google.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-200"
              >
                Open Gemini
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://chatgpt.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                ChatGPT Image
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://www.meta.ai/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Meta AI
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Editorial copy</h3>
              <select
                value={draft.copy.verdict}
                onChange={(event) => updateCopy('verdict', event.target.value as SignalMediaCopy['verdict'])}
                className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-slate-100 outline-none focus:border-sky-500"
              >
                <option value="WATCH">WATCH</option>
                <option value="WATCH IF">WATCH IF</option>
                <option value="MISS">MISS</option>
              </select>
            </div>
            <div className="space-y-4">
              <EditableField label="Hook" value={draft.copy.hook} onChange={(value) => updateCopy('hook', value)} />
              <EditableField label="Audience answer" value={draft.copy.audienceLine} onChange={(value) => updateCopy('audienceLine', value)} />
              <EditableField label="Where it shines" value={draft.copy.creatorWin} onChange={(value) => updateCopy('creatorWin', value)} />
              <EditableField label="Where it slips" value={draft.copy.creatorGap} onChange={(value) => updateCopy('creatorGap', value)} />
              <EditableField label="Character movement" value={draft.copy.characterJourney} onChange={(value) => updateCopy('characterJourney', value)} />
              <EditableField label="Caption and voiceover" rows={5} value={draft.copy.caption} onChange={(value) => updateCopy('caption', value)} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <h3 className="text-sm font-semibold text-white">Emotional motion</h3>
            <div className="mt-4 space-y-3">
              {([
                ['opening', 'Opening hook'],
                ['rise', 'Emotional rise'],
                ['dip', 'Dip or drag'],
                ['peak', 'Peak'],
                ['aftertaste', 'Aftertaste'],
              ] as const).map(([key, label]) => (
                <EditableField
                  key={key}
                  label={label}
                  rows={2}
                  value={draft.copy.morphokinetics[key]}
                  onChange={(value) => updateMorpho(key, value)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0">
        {(Object.keys(FORMAT_DEFINITIONS) as SignalMediaFormat[]).map((key) => (
          <div
            key={key}
            ref={(node) => {
              exportRefs.current[key] = node;
            }}
          >
            <SignalCard draft={draft} format={key} />
          </div>
        ))}
      </div>
    </div>
  );
};
