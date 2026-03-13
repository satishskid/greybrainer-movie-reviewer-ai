import { type LensEntry, sampleEntries } from "./editorials";

interface ManifestRing {
  accent: "story" | "concept" | "performance";
  description: string | null;
  label: string;
  score: number;
  shortLabel: string;
}

interface ManifestMoment {
  emotion: string;
  event: string;
  intensity: number;
  tag?: string;
  timeLabel: string;
  valence: "positive" | "negative" | "neutral";
}

interface ManifestEntry {
  canonicalUrl: string;
  category: string;
  contentType: "review" | "brief" | "study";
  dek: string;
  heroImageUrl: string | null;
  heroPriority: number;
  keywords: string[];
  overallScore: number | null;
  platform: string | null;
  posterImageUrl: string | null;
  posterLabel: string;
  publishedAt: string | null;
  readingMetadata: {
    estimatedReadTime: string;
    sectionAnchors: Array<{ id: string; label: string; wordCount: number }>;
    relatedSlugs: string[];
  } | null;
  releaseFocus: string;
  reviewStage: string | null;
  scoreRings: ManifestRing[];
  slug: string;
  source: "live-worker";
  subjectType: string;
  summary: string | null;
  summaryHook: string | null;
  tags: string[];
  thumbnailEyebrow: string;
  thumbnailImageUrl: string | null;
  title: string;
  verdict: string | null;
  websiteUrl: string;
  year: string | null;
  blogMarkdown: string;
  morphokinetics: {
    summary: string | null;
    timelineNotes: string | null;
    keyMoments: ManifestMoment[];
  } | null;
}

const DEFAULT_MANIFEST_URL =
  (import.meta as any).env?.PUBLIC_LENS_MANIFEST_URL ||
  "https://greybrainer-omnichannel-api.satish-9f4.workers.dev/api/public/lens/manifest?limit=200";

/** The public site URL — used for canonical links and social cards. */
export const SITE_URL = "https://cinema.greybrain.ai";

function pickHeroGradient(seed: string) {
  const palette = [
    "linear-gradient(135deg, rgba(22,36,58,0.96), rgba(10,12,20,0.98) 55%, rgba(83,34,28,0.94))",
    "linear-gradient(135deg, rgba(53,23,53,0.96), rgba(9,12,22,0.98) 50%, rgba(19,74,91,0.92))",
    "linear-gradient(135deg, rgba(18,52,74,0.96), rgba(8,11,18,0.98) 60%, rgba(112,38,22,0.92))",
    "linear-gradient(135deg, rgba(52,19,34,0.96), rgba(11,14,22,0.98) 56%, rgba(26,68,88,0.92))",
    "linear-gradient(135deg, rgba(33,54,44,0.96), rgba(10,12,20,0.98) 56%, rgba(83,32,20,0.92))",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % palette.length;
  }
  return palette[Math.abs(hash) % palette.length];
}

function formatDate(value: string | null) {
  if (!value) {
    return "Undated";
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function estimateReadTime(markdown: string) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(3, Math.round(words / 180));
  return `${minutes} min read`;
}

function stripLensNarrative(markdown: string) {
  return markdown.replace(/\[\[LENS_NARRATIVE:[\s\S]*?\]\]/g, "").trim();
}

function parseSections(markdown: string) {
  // If the entire markdown looks like garbled web scraping, return empty
  const lower = markdown.toLowerCase();
  const scrapingSignals = ['sign in', 'sign up', 'open in app', 'medium.com', 'page not found', '404', 'sitemap/sitemap.xml', 'get app', 'new-story'];
  const hitCount = scrapingSignals.filter(s => lower.includes(s)).length;
  if (hitCount >= 3) {
    return [{ heading: 'Overview', body: ['Full analysis content is being prepared. Check back soon.'] }];
  }

  const cleaned = stripLensNarrative(markdown);
  const lines = cleaned.split("\n");
  const sections: Array<{ heading: string; body: string[] }> = [];
  let currentHeading = "Overview";
  let paragraph: string[] = [];
  let body: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      body.push(paragraph.join(" ").trim());
      paragraph = [];
    }
  };

  const flushSection = () => {
    flushParagraph();
    if (body.length) {
      sections.push({
        heading: currentHeading,
        body,
      });
    }
    body = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("# ")) {
      continue;
    }

    if (line.startsWith("## ")) {
      flushSection();
      currentHeading = line.replace(/^##\s+/, "").trim() || "Overview";
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      body.push(line.replace(/^- /, "• "));
      continue;
    }

    paragraph.push(line);
  }

  flushSection();

  if (!sections.length) {
    sections.push({
      heading: "Overview",
      body: cleaned ? [cleaned] : [],
    });
  }

  return sections;
}

function coerceCriticAngle(entry: ManifestEntry) {
  if (entry.reviewStage?.trim()) {
    return entry.reviewStage.trim();
  }
  if (entry.contentType === "brief") {
    return "Daily screen intelligence";
  }
  if (entry.contentType === "study") {
    return "Cultural pattern analysis";
  }
  return "Quantified film review";
}

function coerceMood(entry: ManifestEntry) {
  if (entry.contentType === "brief") {
    return "Fast, analytical, newsroom-ready";
  }
  if (entry.contentType === "study") {
    return "Strategic, interpretive, high-context";
  }
  return "Cinematic, critical, precise";
}

/** Known junk tokens that indicate scraped/garbled content from external sites. */
/** Strong signals — a single hit means the content is scraped junk. */
const STRONG_JUNK = [
  'medium.com', 'sitemap/sitemap.xml', 'mobilenavbar', 'utm_source',
  'post_page', 'global_nav', 'new-story', 'out of nothing, something',
];
/** Weak signals — need 2+ hits to flag as junk. */
const WEAK_JUNK = [
  'sitemap', 'sign in', 'sign up', 'open in app', 'get app',
  'page not found', '404', 'write',
  'something. maybe these stories',
];

function isGarbledText(text: string): boolean {
  if (!text || text.length < 5) return true;
  const lower = text.toLowerCase();
  // Any strong signal = instant reject
  if (STRONG_JUNK.some(t => lower.includes(t))) return true;
  // 2+ weak signals = reject
  const weakHits = WEAK_JUNK.filter(t => lower.includes(t)).length;
  if (weakHits >= 2) return true;
  // Single common web-nav words
  if (['sitemap', 'search', 'sign in', 'sign up', 'write', 'get app'].includes(lower.trim())) return true;
  return false;
}

/** Strip markdown link syntax, bare URLs, separators etc. from display text. */
function cleanDisplayText(raw: string | null | undefined): string {
  if (!raw) return '';
  const cleaned = raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // [text](url) → text
    .replace(/https?:\/\/\S+/g, '')               // bare URLs
    .replace(/-{3,}/g, '')                          // --- separators
    .replace(/\*\*(.*?)\*\*/g, '$1')              // **bold** → bold
    .replace(/^\s*[#]+\s*/gm, '')                 // heading markers
    .replace(/\s+/g, ' ')                           // collapse whitespace
    .trim();
  return isGarbledText(cleaned) ? '' : cleaned;
}

function coercePullQuote(entry: ManifestEntry) {
  const candidates = [entry.verdict, entry.summary, entry.dek];
  for (const raw of candidates) {
    const cleaned = cleanDisplayText(raw);
    if (cleaned.length > 20) return cleaned;
  }
  return 'Analysis in three dimensions.';
}

function normalizeManifestEntry(entry: ManifestEntry): LensEntry {
  const sections = parseSections(entry.blogMarkdown);
  return {
    slug: entry.slug,
    title: entry.title,
    dek: cleanDisplayText(entry.dek) || cleanDisplayText(entry.summary) || cleanDisplayText(entry.verdict) || entry.title,
    category: entry.category,
    contentType: entry.contentType,
    runTime: estimateReadTime(entry.blogMarkdown),
    releaseFocus: entry.releaseFocus,
    criticAngle: coerceCriticAngle(entry),
    mood: coerceMood(entry),
    publishedAt: formatDate(entry.publishedAt),
    heroGradient: pickHeroGradient(entry.slug),
    heroImageUrl: entry.heroImageUrl ?? undefined,
    pullQuote: coercePullQuote(entry),
    tags: entry.tags,
    thumbnailEyebrow: entry.thumbnailEyebrow,
    thumbnailImageUrl: entry.thumbnailImageUrl ?? undefined,
    posterLabel: entry.posterLabel,
    posterImageUrl: entry.posterImageUrl ?? undefined,
    platform: entry.platform ?? undefined,
    year: entry.year ?? undefined,
    overallScore: entry.overallScore ?? undefined,
    verdict: cleanDisplayText(entry.verdict) || undefined,
    summary: cleanDisplayText(entry.summary) || undefined,
    blogMarkdown: entry.blogMarkdown,
    scoreRings: entry.scoreRings ?? undefined,
    morphokinetics: entry.morphokinetics
      ? {
          summary: entry.morphokinetics.summary ?? "",
          timelineNotes: entry.morphokinetics.timelineNotes ?? "",
          keyMoments: entry.morphokinetics.keyMoments ?? [],
        }
      : undefined,
    sections,
    heroPriority: entry.heroPriority ?? 0,
    keywords: entry.keywords ?? [],
    summaryHook: entry.summaryHook ?? undefined,
    readingMetadata: entry.readingMetadata ?? undefined,
  };
}

export async function getLensEntries(): Promise<LensEntry[]> {
  try {
    const response = await fetch(DEFAULT_MANIFEST_URL);
    if (!response.ok) {
      return sampleEntries;
    }
    const payload = (await response.json()) as { entries?: ManifestEntry[] };
    const entries = payload.entries ?? [];
    if (!entries.length) {
      return sampleEntries;
    }
    return entries.map(normalizeManifestEntry);
  } catch {
    return sampleEntries;
  }
}
