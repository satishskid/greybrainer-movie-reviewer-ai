type UnknownRecord = Record<string, unknown>;

export type SignalVerdict = 'WATCH' | 'WATCH IF' | 'MISS';
export type SignalMediaFormat = 'social' | 'youtube' | 'reel';

export interface SignalLayerScore {
  evidence: string;
  focus: string;
  id: 'STORY' | 'CONCEPTUALIZATION' | 'PERFORMANCE';
  label: string;
  score: number | null;
}

export interface SignalMorphokinetics {
  aftertaste: string;
  dip: string;
  opening: string;
  peak: string;
  rise: string;
}

export interface SignalMediaAssets {
  actorUrls: string[];
  directorUrl: string;
  platformLogoUrl: string;
  posterUrl: string;
  stillUrl: string;
}

export interface SignalMediaCopy {
  audienceLine: string;
  caption: string;
  characterJourney: string;
  craftLine: string;
  creatorGap: string;
  creatorWin: string;
  director: string;
  hook: string;
  layers: SignalLayerScore[];
  mainCast: string[];
  morphokinetics: SignalMorphokinetics;
  overallScore: number | null;
  title: string;
  verdict: SignalVerdict;
}

export interface SignalMediaDraft {
  assets: SignalMediaAssets;
  copy: SignalMediaCopy;
  version: 1;
}

interface BuildSignalMediaInput {
  analysis?: unknown;
  markdown: string;
  sourcePayload?: unknown;
  title: string;
}

const LAYER_META: Record<SignalLayerScore['id'], { focus: string; label: string }> = {
  STORY: {
    focus: 'the writing and narrative engine',
    label: 'Story',
  },
  CONCEPTUALIZATION: {
    focus: "the director's orchestration and design",
    label: 'Orchestration',
  },
  PERFORMANCE: {
    focus: 'the performances and screen craft',
    label: 'Performance',
  },
};

const EMPTY_MORPHOKINETICS: SignalMorphokinetics = {
  aftertaste: 'Not identified in the saved review.',
  dip: 'Not identified in the saved review.',
  opening: 'Not identified in the saved review.',
  peak: 'Not identified in the saved review.',
  rise: 'Not identified in the saved review.',
};

export const EMPTY_SIGNAL_MEDIA_ASSETS: SignalMediaAssets = {
  actorUrls: ['', '', ''],
  directorUrl: '',
  platformLogoUrl: '',
  posterUrl: '',
  stillUrl: '',
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asRecordArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.map(asRecord).filter((item): item is UnknownRecord => Boolean(item))
    : [];
}

function readString(record: UnknownRecord | null, keys: string[]): string {
  if (!record) return '';
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readNumber(record: UnknownRecord | null, keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function readStringArray(record: UnknownRecord | null, keys: string[]): string[] {
  if (!record) return [];
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) continue;
    const strings = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
    if (strings.length) return strings;
  }
  return [];
}

function stripMarkup(value: string): string {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#*_`>~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clipText(value: string, maxLength: number): string {
  const text = stripMarkup(value);
  if (!text || text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength + 1).replace(/\s+\S*$/, '').trim();
  return `${clipped}.`;
}

function firstSentence(value: string, maxLength = 220): string {
  const text = stripMarkup(value);
  if (!text) return '';
  const sentence = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  return clipText(sentence, maxLength);
}

function readSuggestion(record: UnknownRecord | null): string {
  if (!record) return '';
  const value = record.improvementSuggestions;
  if (typeof value === 'string') return firstSentence(value);
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === 'string' && Boolean(item.trim()));
    return first ? firstSentence(first) : '';
  }
  return '';
}

function findNestedRecord(records: Array<UnknownRecord | null>, keys: string[]): UnknownRecord | null {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const nested = asRecord(record[key]);
      if (nested) return nested;
    }
  }
  return null;
}

function findLayerRecords(source: UnknownRecord | null, analysis: UnknownRecord | null): UnknownRecord[] {
  for (const candidate of [
    source?.layerAnalyses,
    source?.layerData,
    analysis?.layerAnalyses,
    analysis?.layerData,
  ]) {
    const records = asRecordArray(candidate);
    if (records.length) return records;
  }
  return [];
}

function fallbackScore(source: UnknownRecord | null, id: SignalLayerScore['id']): number | null {
  const key =
    id === 'STORY'
      ? 'storyScore'
      : id === 'CONCEPTUALIZATION'
        ? 'conceptScore'
        : 'executionScore';
  return readNumber(source, [key]);
}

function buildLayers(source: UnknownRecord | null, analysis: UnknownRecord | null): SignalLayerScore[] {
  const layerRecords = findLayerRecords(source, analysis);
  return (Object.keys(LAYER_META) as SignalLayerScore['id'][]).map((id) => {
    const record =
      layerRecords.find((item) => readString(item, ['id']).toUpperCase() === id) ?? null;
    const meta = LAYER_META[id];
    return {
      evidence:
        firstSentence(readString(record, ['editedText', 'aiGeneratedText', 'description'])) ||
        `The saved review does not yet contain a concise ${meta.label.toLowerCase()} evidence line.`,
      focus: meta.focus,
      id,
      label: meta.label,
      score: readNumber(record, ['userScore', 'aiSuggestedScore']) ?? fallbackScore(source, id),
    };
  });
}

function buildMorphokinetics(
  source: UnknownRecord | null,
  analysis: UnknownRecord | null,
): SignalMorphokinetics {
  const morpho = findNestedRecord(
    [source, analysis],
    ['morphokineticsAnalysis', 'morphoData'],
  );
  const moments = asRecordArray(morpho?.keyMoments)
    .map((moment) => ({
      description: firstSentence(readString(moment, ['eventDescription', 'description']), 150),
      intensity: readNumber(moment, ['intensityScore', 'intensity']) ?? 0,
      time: readNumber(moment, ['time']) ?? 0,
    }))
    .filter((moment) => moment.description)
    .sort((a, b) => a.time - b.time);

  if (!moments.length) {
    const summary = firstSentence(readString(morpho, ['overallSummary']), 180);
    return summary ? { ...EMPTY_MORPHOKINETICS, aftertaste: summary } : EMPTY_MORPHOKINETICS;
  }

  const opening = moments[0];
  const aftertaste = moments[moments.length - 1];
  const peak = [...moments].sort((a, b) => b.intensity - a.intensity)[0];
  const interior = moments.length > 2 ? moments.slice(1, -1) : moments;
  const dip = [...interior].sort((a, b) => a.intensity - b.intensity)[0];
  const beforePeak = moments.filter((moment) => moment.time > opening.time && moment.time < peak.time);
  const rise = beforePeak.length
    ? [...beforePeak].sort((a, b) => b.intensity - a.intensity)[0]
    : moments[Math.min(1, moments.length - 1)];

  return {
    aftertaste: aftertaste.description,
    dip: dip.description,
    opening: opening.description,
    peak: peak.description,
    rise: rise.description,
  };
}

function deriveVerdict(overall: number | null, layers: SignalLayerScore[]): SignalVerdict {
  if (overall === null) return 'WATCH IF';
  const scores = layers
    .map((layer) => layer.score)
    .filter((score): score is number => score !== null);
  const lowest = scores.length ? Math.min(...scores) : null;
  if (overall !== null && overall >= 7.5 && (lowest === null || lowest >= 5.5)) return 'WATCH';
  if (overall !== null && overall >= 5.8) return 'WATCH IF';
  return 'MISS';
}

function buildAudienceLine(
  verdict: SignalVerdict,
  strongest: SignalLayerScore,
  weakest: SignalLayerScore,
): string {
  if (verdict === 'WATCH') {
    return `Worth watching for ${strongest.focus}; its strongest choices outweigh the weaker ${weakest.label.toLowerCase()} signal.`;
  }
  if (verdict === 'WATCH IF') {
    return `Watch it if you value ${strongest.focus}; viewers sensitive to uneven ${weakest.label.toLowerCase()} may feel the drop.`;
  }
  return `Miss it unless ${strongest.focus} is your main reason to watch; the weaker ${weakest.label.toLowerCase()} signal limits the payoff.`;
}

function readPersistedDraft(source: UnknownRecord | null): SignalMediaDraft | null {
  const persisted = asRecord(source?.signalMedia);
  const persistedCopy = asRecord(persisted?.copy);
  const persistedAssets = asRecord(persisted?.assets);
  if (!persistedCopy || !persistedAssets) return null;

  const layers = asRecordArray(persistedCopy.layers)
    .map((layer) => {
      const id = readString(layer, ['id']) as SignalLayerScore['id'];
      if (!LAYER_META[id]) return null;
      return {
        evidence: readString(layer, ['evidence']),
        focus: readString(layer, ['focus']) || LAYER_META[id].focus,
        id,
        label: readString(layer, ['label']) || LAYER_META[id].label,
        score: readNumber(layer, ['score']),
      };
    })
    .filter((layer): layer is SignalLayerScore => Boolean(layer));
  if (layers.length !== 3) return null;

  const morphokinetics = asRecord(persistedCopy.morphokinetics);
  const actorUrls = readStringArray(persistedAssets, ['actorUrls']);
  const verdictValue = readString(persistedCopy, ['verdict']);
  const verdict: SignalVerdict =
    verdictValue === 'WATCH' || verdictValue === 'WATCH IF' || verdictValue === 'MISS'
      ? verdictValue
      : 'WATCH IF';

  return {
    assets: {
      actorUrls: [0, 1, 2].map((index) => actorUrls[index] ?? ''),
      directorUrl: readString(persistedAssets, ['directorUrl']),
      platformLogoUrl: readString(persistedAssets, ['platformLogoUrl']),
      posterUrl: readString(persistedAssets, ['posterUrl']),
      stillUrl: readString(persistedAssets, ['stillUrl']),
    },
    copy: {
      audienceLine: readString(persistedCopy, ['audienceLine']),
      caption: readString(persistedCopy, ['caption']),
      characterJourney: readString(persistedCopy, ['characterJourney']),
      craftLine: readString(persistedCopy, ['craftLine']),
      creatorGap: readString(persistedCopy, ['creatorGap']),
      creatorWin: readString(persistedCopy, ['creatorWin']),
      director: readString(persistedCopy, ['director']),
      hook: readString(persistedCopy, ['hook']),
      layers,
      mainCast: readStringArray(persistedCopy, ['mainCast']),
      morphokinetics: {
        aftertaste: readString(morphokinetics, ['aftertaste']) || EMPTY_MORPHOKINETICS.aftertaste,
        dip: readString(morphokinetics, ['dip']) || EMPTY_MORPHOKINETICS.dip,
        opening: readString(morphokinetics, ['opening']) || EMPTY_MORPHOKINETICS.opening,
        peak: readString(morphokinetics, ['peak']) || EMPTY_MORPHOKINETICS.peak,
        rise: readString(morphokinetics, ['rise']) || EMPTY_MORPHOKINETICS.rise,
      },
      overallScore: readNumber(persistedCopy, ['overallScore']),
      title: readString(persistedCopy, ['title']),
      verdict,
    },
    version: 1,
  };
}

export function createSignalMediaDraft(input: BuildSignalMediaInput): SignalMediaDraft {
  const source = asRecord(input.sourcePayload);
  const persisted = readPersistedDraft(source);
  if (persisted) return persisted;

  const analysis = asRecord(input.analysis);
  const summary = findNestedRecord([source, analysis], ['summaryReportData']);
  const personnel = findNestedRecord([source, analysis], ['personnelData']);
  const layers = buildLayers(source, analysis);
  const scoredLayers = layers
    .filter((layer) => layer.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const strongest = scoredLayers[0] ?? layers[0];
  const weakest = scoredLayers[scoredLayers.length - 1] ?? layers[layers.length - 1];
  const scoreValues = scoredLayers
    .map((layer) => layer.score)
    .filter((score): score is number => score !== null);
  const overallScore = scoreValues.length
    ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
    : readNumber(source, ['overallScore']);
  const verdict = deriveVerdict(overallScore, layers);
  const title = input.title.trim() || readString(source, ['title']) || 'Untitled review';
  const layerRecords = findLayerRecords(source, analysis);
  const weakRecord =
    layerRecords.find((item) => readString(item, ['id']).toUpperCase() === weakest.id) ?? null;
  const overallSuggestions =
    readSuggestion(summary) ||
    readSuggestion(analysis) ||
    firstSentence(readString(summary, ['overallImprovementSuggestions']), 220);
  const creatorGap =
    readSuggestion(weakRecord) ||
    overallSuggestions ||
    `The saved review does not yet identify a specific ${weakest.label.toLowerCase()} weakness.`;
  const storyRecord =
    layerRecords.find((item) => readString(item, ['id']).toUpperCase() === 'STORY') ?? null;
  const vonnegut = asRecord(storyRecord?.vonnegutShape);
  const characterJourney =
    firstSentence(readString(vonnegut, ['justification']), 180) ||
    firstSentence(readString(storyRecord, ['editedText', 'aiGeneratedText']), 180) ||
    'The saved review does not yet isolate the protagonist journey.';
  const hook =
    verdict === 'WATCH'
      ? `${title} earns a watch through ${strongest.focus}, even when its ${weakest.label.toLowerCase()} loses force.`
      : verdict === 'WATCH IF'
        ? `${title} works best through ${strongest.focus}, but its ${weakest.label.toLowerCase()} makes this a selective watch.`
        : `${title} shows flashes of ${strongest.focus}, but its weaker ${weakest.label.toLowerCase()} keeps the payoff out of reach.`;
  const morphokinetics = buildMorphokinetics(source, analysis);
  const director = readString(personnel, ['director']);
  const mainCast = readStringArray(personnel, ['mainCast']).slice(0, 3);
  const craftLine = strongest.evidence;
  const scoreLabel = overallScore === null ? 'not scored' : `${overallScore.toFixed(1)}/10`;
  const caption = clipText(
    `${hook} ${craftLine} Where it slips: ${creatorGap} The emotional peak arrives with ${morphokinetics.peak} Greybrainer signal: ${scoreLabel}.`,
    620,
  );

  return {
    assets: {
      ...EMPTY_SIGNAL_MEDIA_ASSETS,
      posterUrl:
        readString(source, ['posterImageUrl', 'heroImageUrl', 'imageUrl']) || '',
      stillUrl: readString(source, ['heroImageUrl', 'imageUrl']) || '',
    },
    copy: {
      audienceLine: buildAudienceLine(verdict, strongest, weakest),
      caption,
      characterJourney,
      craftLine,
      creatorGap,
      creatorWin: strongest.evidence,
      director,
      hook,
      layers,
      mainCast,
      morphokinetics,
      overallScore,
      title,
      verdict,
    },
    version: 1,
  };
}

function formatLabel(format: SignalMediaFormat): string {
  if (format === 'youtube') return '16:9 landscape, 1280x720';
  if (format === 'reel') return '9:16 portrait, 1080x1920';
  return '4:5 portrait, 1080x1350';
}

function scoreText(layer: SignalLayerScore): string {
  return `${layer.label}: ${layer.score === null ? 'Not scored' : `${layer.score.toFixed(1)}/10`}`;
}

function assetLine(label: string, value: string): string {
  return `${label}: ${value || 'not supplied - omit rather than invent'}`;
}

export function buildSingleShotImagePrompt(
  draft: SignalMediaDraft,
  format: SignalMediaFormat,
): string {
  const { assets, copy } = draft;
  const castNames = copy.mainCast.length ? copy.mainCast.join(', ') : 'No verified cast names supplied';
  const overall = copy.overallScore === null ? 'Not scored' : `${copy.overallScore.toFixed(1)}/10`;

  return `CREATE ONE FINISHED GREYBRAINER MOVIE SIGNAL INFOGRAPHIC

OUTPUT
- Produce exactly one polished editorial image.
- Format: ${formatLabel(format)}.
- It must work as a social post, article thumbnail and video cover.
- Do not return design notes, alternatives, mockups or explanatory text.

SOURCE IMAGES
The user may attach official poster, actor, director, still and platform images with this prompt. Preserve real faces exactly. Crop and compose the supplied photographs; do not redraw, beautify, age, de-age, merge or replace any person's face.

${assetLine('Official poster URL', assets.posterUrl)}
${assets.actorUrls.map((url, index) => assetLine(`Actor ${index + 1} URL`, url)).join('\n')}
${assetLine('Director URL', assets.directorUrl)}
${assetLine('Official movie still URL', assets.stillUrl)}
${assetLine('Verified platform or studio logo URL', assets.platformLogoUrl)}

If this tool has web and image search, use it only to locate missing official publicity images from the film's verified studio, streaming platform, distributor or verified cast and director pages. Match identities against the names below. Never invent a face, credit, platform, logo, release date, rating or plot fact. If an asset cannot be verified, omit it and keep the composition elegant.

VERIFIED REVIEW DATA
Movie: ${copy.title}
Director: ${copy.director || 'Not verified in the saved report'}
Principal cast: ${castNames}
Verdict: ${copy.verdict}
Overall Greybrainer signal: ${overall}
${copy.layers.map(scoreText).join('\n')}

EXACT PUBLIC COPY
Main hook: "${copy.hook}"
Audience answer: "${copy.audienceLine}"
Where it shines: "${copy.creatorWin}"
Where it slips: "${copy.creatorGap}"
Character movement: "${copy.characterJourney}"
Emotional opening: "${copy.morphokinetics.opening}"
Emotional rise: "${copy.morphokinetics.rise}"
Emotional dip: "${copy.morphokinetics.dip}"
Emotional peak: "${copy.morphokinetics.peak}"
Aftertaste: "${copy.morphokinetics.aftertaste}"

COMPOSITION
- Use an immediate movie-first visual: poster or official still at the top, with recognisable principal performers visible.
- Put GREYBRAINER SIGNAL in a restrained masthead.
- Make ${copy.verdict} the clearest decision badge.
- Make the hook the largest editorial headline after the movie title.
- Show three clean evidence bars for Story, Orchestration and Performance. Highlight only the highest score.
- Include a compact red Morphokinetics pulse line labelled Hook, Rise, Dip, Peak and Aftertaste.
- Include two short editorial areas: WHERE IT SHINES and WHERE IT SLIPS.
- Give the credited director and performers visual acknowledgement without turning the piece into fan art.
- End with: "Full evidence-led review at movies.greybrain.in"
- Palette: near-black, true white, Greybrainer red, one cool blue accent and one restrained amber accent.
- Typography: bold editorial sans serif, high contrast, generous spacing, no script fonts.
- Keep the image cinematic and inviting, but visually disciplined enough for producers and critics.

TEXT ACCURACY
- Use only the exact public copy and scores above.
- Spell GREYBRAINER, all names and every score exactly.
- Do not add stars, thumbs, Rotten Tomatoes styling, fake quotations or invented statistics.
- Do not use a star-rating motif. The verdict and evidence scores replace subjective stars.
- Keep the public copy readable at phone size. Shorten visual decoration before reducing legibility.
- Before returning the image, check every visible word, name and number against this prompt.`;
}

export function buildSingleShotReelPrompt(draft: SignalMediaDraft): string {
  const { assets, copy } = draft;
  const overall = copy.overallScore === null ? 'Not scored' : `${copy.overallScore.toFixed(1)}/10`;
  const strongest = [...copy.layers].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  const weakest = [...copy.layers].sort((a, b) => (a.score ?? 99) - (b.score ?? 99))[0];

  return `CREATE ONE FINISHED 30-SECOND GREYBRAINER VERTICAL REVIEW REEL

OUTPUT
- Produce one 9:16, 1080x1920 vertical video, 25 to 30 seconds.
- Use the supplied official poster, cast, director and movie-still images as moving editorial layers.
- Use controlled pans, crops, score reveals and a Morphokinetics pulse animation.
- Do not invent movie footage, lip sync, dialogue, faces, credits, logos, scenes or plot events.

SOURCE IMAGES
${assetLine('Official poster URL', assets.posterUrl)}
${assets.actorUrls.map((url, index) => assetLine(`Actor ${index + 1} URL`, url)).join('\n')}
${assetLine('Director URL', assets.directorUrl)}
${assetLine('Official movie still URL', assets.stillUrl)}
${assetLine('Verified platform or studio logo URL', assets.platformLogoUrl)}

If web search is available, fill missing imagery only from verified official publicity sources. Preserve every real face exactly. Omit anything that cannot be verified.

TIMELINE
0-3s: Movie title and the question "WATCH OR MISS?"
3-6s: Reveal "${copy.verdict}" and "${copy.hook}"
6-12s: Highlight ${strongest.label}, ${strongest.score === null ? 'not scored' : `${strongest.score.toFixed(1)}/10`}, with: "${copy.creatorWin}"
12-18s: Credit ${copy.director || 'the verified director and craft team'}${copy.mainCast.length ? ` and ${copy.mainCast.join(', ')}` : ''}.
18-22s: Show the weaker ${weakest.label} signal with: "${copy.creatorGap}"
22-26s: Animate the emotional line from "${copy.morphokinetics.opening}" through the peak "${copy.morphokinetics.peak}".
26-30s: Show all three scores, overall ${overall}, and "Read the full evidence-led review at movies.greybrain.in".

VOICEOVER - READ EXACTLY
"${clipText(copy.caption, 520)}"

STYLE
- Greybrainer editorial identity: near-black, white, signal red, cool blue and restrained amber.
- Bold readable captions, safe inside mobile margins.
- No star ratings, fake audience reactions, excessive transitions or generic AI cinema imagery.
- Keep principal performers recognisable and give the director and craft departments clear credit.
- Add burned-in captions matching the voiceover.
- End on a clean branded thumbnail frame that can also be exported as the reel cover.`;
}
