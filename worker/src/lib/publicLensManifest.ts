import type { Client, Row } from "@libsql/client";
import { getDraftById } from "./repository";
import type { Env } from "./db";

type LensContentType = "review" | "brief" | "study";

interface LensManifestMetadata {
  category?: string | null;
  heroImageUrl?: string | null;
  platform?: string | null;
  posterImageUrl?: string | null;
  releaseFocus?: string | null;
  tags?: string[] | null;
  thumbnailEyebrow?: string | null;
  thumbnailImageUrl?: string | null;
  verdict?: string | null;
  year?: string | null;
}

interface WebsitePublicationRow {
  createdAt: string;
  draftId: string;
  externalId: string;
  externalUrl: string;
  blogMarkdown: string | null;
  heroPriority: number;
  isHeroCandidate: boolean;
  keywordsJson: string | null;
  readingMetadataJson: string | null;
  sourcePayload: Record<string, unknown> | null;
  analysis: Record<string, unknown> | null;
  publishedAt: string | null;
  reviewStage: string | null;
  seoDescription: string | null;
  seoTitle: string | null;
  status: string;
  subjectTitle: string;
  subjectType: string;
  summaryHook: string | null;
  updatedAt: string;
  versionId: string | null;
}

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

export interface PublicLensManifestEntry {
  blogMarkdown: string;
  canonicalUrl: string;
  category: string;
  contentType: LensContentType;
  dek: string;
  heroImageUrl: string | null;
  heroPriority: number;
  keywords: string[];
  morphokinetics: {
    summary: string | null;
    timelineNotes: string | null;
    keyMoments: ManifestMoment[];
  } | null;
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
}

function rowValue(row: Row, key: string) {
  return row[key] ?? null;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }
  return JSON.parse(value) as T;
}

function mapPublicationRow(row: Row): WebsitePublicationRow {
  return {
    createdAt: String(rowValue(row, "created_at")),
    draftId: String(rowValue(row, "draft_id")),
    externalId: String(rowValue(row, "external_id")),
    externalUrl: String(rowValue(row, "external_url")),
    blogMarkdown: rowValue(row, "blog_markdown") ? String(rowValue(row, "blog_markdown")) : null,
    heroPriority: Number(rowValue(row, "hero_priority") ?? 0),
    isHeroCandidate: Number(rowValue(row, "is_hero_candidate") ?? 0) === 1,
    keywordsJson: rowValue(row, "keywords_json") ? String(rowValue(row, "keywords_json")) : null,
    readingMetadataJson: rowValue(row, "reading_metadata_json") ? String(rowValue(row, "reading_metadata_json")) : null,
    sourcePayload: parseJson(rowValue(row, "source_payload_json") ? String(rowValue(row, "source_payload_json")) : null),
    analysis: parseJson(rowValue(row, "analysis_json") ? String(rowValue(row, "analysis_json")) : null),
    publishedAt: rowValue(row, "published_at") ? String(rowValue(row, "published_at")) : null,
    reviewStage: rowValue(row, "review_stage") ? String(rowValue(row, "review_stage")) : null,
    seoDescription: rowValue(row, "seo_description") ? String(rowValue(row, "seo_description")) : null,
    seoTitle: rowValue(row, "seo_title") ? String(rowValue(row, "seo_title")) : null,
    status: String(rowValue(row, "status")),
    subjectTitle: String(rowValue(row, "subject_title")),
    subjectType: String(rowValue(row, "subject_type")),
    summaryHook: rowValue(row, "summary_hook") ? String(rowValue(row, "summary_hook")) : null,
    updatedAt: String(rowValue(row, "updated_at")),
    versionId: rowValue(row, "version_id") ? String(rowValue(row, "version_id")) : null,
  };
}

async function listPublishedWebsiteRows(client: Client, limit: number) {
  const result = await client.execute({
    sql: `
      SELECT
        cp.*,
        d.subject_title,
        d.subject_type,
        d.review_stage,
        d.seo_title,
        d.seo_description,
        d.hero_priority,
        d.is_hero_candidate,
        dv.blog_markdown,
        dv.source_payload_json,
        dv.analysis_json,
        dv.keywords_json,
        dv.summary_hook,
        dv.reading_metadata_json
      FROM channel_publications cp
      JOIN drafts d ON d.id = cp.draft_id
      LEFT JOIN draft_versions dv ON dv.id = COALESCE(cp.version_id, d.current_version_id)
      WHERE cp.channel = 'website' AND cp.status = 'published'
      ORDER BY d.hero_priority DESC, cp.published_at DESC, cp.updated_at DESC
      LIMIT ?
    `,
    args: [limit],
  });

  return result.rows.map(mapPublicationRow);
}

function firstSentence(text: string | null | undefined) {
  if (!text) {
    return null;
  }
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return null;
  }
  const match = cleaned.match(/.+?[.!?](?:\s|$)/);
  return match?.[0]?.trim() ?? cleaned;
}

function stripMarkdown(text: string) {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function generatePosterDataUrl(title: string, accent: string) {
  const safeTitle = title.length > 18 ? `${title.slice(0, 18)}…` : title;
  const svg = `
    <svg width="460" height="680" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#0b0f18" />
        </linearGradient>
      </defs>
      <rect width="460" height="680" fill="url(#grad)" />
      <rect x="22" y="22" width="416" height="636" rx="28" fill="rgba(9, 12, 20, 0.4)" stroke="rgba(255,255,255,0.2)" />
      <text x="50%" y="50%" fill="white" font-family="Newsreader, serif" font-size="34" text-anchor="middle">
        ${safeTitle}
      </text>
      <text x="50%" y="58%" fill="rgba(255,255,255,0.7)" font-family="Manrope, sans-serif" font-size="18" text-anchor="middle">
        Greybrainer Lens
      </text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function pickPosterAccent(title: string) {
  const palette = ["#dd5f3d", "#5bbad4", "#7f6af2", "#d64d72", "#35bda4"];
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) % palette.length;
  }
  return palette[Math.abs(hash) % palette.length];
}

function extractDek(markdown: string, fallback: string | null) {
  if (fallback?.trim()) {
    return fallback.trim();
  }

  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith("#"));

  for (const block of paragraphs) {
    const cleaned = stripMarkdown(block);
    if (cleaned.length >= 80) {
      return cleaned;
    }
  }

  return stripMarkdown(markdown).slice(0, 240);
}

function normalizeContentType(subjectType: string, reviewStage: string | null, title: string, tags: string[]) {
  const loweredSubjectType = subjectType.toLowerCase();
  const loweredReviewStage = (reviewStage ?? "").toLowerCase();
  const loweredTitle = title.toLowerCase();
  const loweredTags = tags.map((tag) => tag.toLowerCase());

  if (loweredSubjectType === "daily-brief") {
    return "brief" as const;
  }

  if (
    loweredSubjectType.includes("research") ||
    loweredReviewStage.includes("research") ||
    loweredReviewStage.includes("study") ||
    loweredTitle.includes("study") ||
    loweredTitle.includes("research") ||
    loweredTags.some((tag) => tag.includes("research") || tag.includes("trend") || tag.includes("industry"))
  ) {
    return "study" as const;
  }

  return "review" as const;
}

function categoryForContentType(contentType: LensContentType, reviewStage: string | null) {
  if (contentType === "brief") {
    return "Intelligence Brief";
  }

  if (contentType === "study") {
    return reviewStage?.trim() || "Research Study";
  }

  return "Quantified Review";
}

function eyebrowForContentType(contentType: LensContentType, reviewStage: string | null) {
  if (contentType === "brief") {
    return "Morning Brief";
  }

  if (contentType === "study") {
    return reviewStage?.toLowerCase().includes("trend") ? "Trend Study" : "Research File";
  }

  return "Three-Ring Review";
}

function labelForContentType(contentType: LensContentType, title: string) {
  if (contentType === "brief") {
    return "Intelligence Brief";
  }

  if (contentType === "study") {
    return "Research Study";
  }

  return title;
}

function inferReleaseFocus(contentType: LensContentType, metadata: LensManifestMetadata, subjectType: string) {
  if (metadata.releaseFocus?.trim()) {
    return metadata.releaseFocus.trim();
  }

  if (metadata.platform?.trim()) {
    return metadata.platform.trim();
  }

  if (contentType === "brief") {
    return "Daily Intelligence";
  }

  if (contentType === "study") {
    return "Theme and Audience Analysis";
  }

  return subjectType === "movie" ? "Film Analysis" : subjectType;
}

function extractLayerAnalyses(sourcePayload: unknown) {
  if (!sourcePayload || typeof sourcePayload !== "object") {
    return [];
  }
  const payload = sourcePayload as { layerAnalyses?: unknown };
  return Array.isArray(payload.layerAnalyses) ? payload.layerAnalyses : [];
}

function coerceScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractScoreRings(sourcePayload: unknown): ManifestRing[] {
  const ringMap = new Map<string, ManifestRing>();

  for (const layer of extractLayerAnalyses(sourcePayload)) {
    if (!layer || typeof layer !== "object") {
      continue;
    }

    const record = layer as {
      id?: string;
      title?: string;
      shortTitle?: string;
      description?: string;
      editedText?: string;
      userScore?: unknown;
    };
    const key = (record.id ?? "").toUpperCase();
    const score = coerceScore(record.userScore);
    if (!score) {
      continue;
    }

    if (key === "STORY") {
      ringMap.set("story", {
        accent: "story",
        description: record.description ?? firstSentence(record.editedText) ?? null,
        label: record.title ?? "Magic of Story/Script",
        score,
        shortLabel: record.shortTitle ?? "Story",
      });
    }

    if (key === "CONCEPTUALIZATION") {
      ringMap.set("concept", {
        accent: "concept",
        description: record.description ?? firstSentence(record.editedText) ?? null,
        label: record.title ?? "Magic of Conceptualization",
        score,
        shortLabel: record.shortTitle ?? "Concept",
      });
    }

    if (key === "PERFORMANCE") {
      ringMap.set("performance", {
        accent: "performance",
        description: record.description ?? firstSentence(record.editedText) ?? null,
        label: record.title ?? "Magic of Performance/Execution",
        score,
        shortLabel: record.shortTitle ?? "Performance",
      });
    }
  }

  return ["story", "concept", "performance"]
    .map((key) => ringMap.get(key))
    .filter((ring): ring is ManifestRing => Boolean(ring));
}

function extractOverallScore(sourcePayload: unknown, scoreRings: ManifestRing[]) {
  if (!sourcePayload || typeof sourcePayload !== "object") {
    return scoreRings.length ? Number((scoreRings.reduce((sum, ring) => sum + ring.score, 0) / scoreRings.length).toFixed(1)) : null;
  }

  const payload = sourcePayload as {
    layerAnalyses?: Array<{ userScore?: unknown }>;
    summaryReportData?: { overallScore?: unknown };
  };

  const explicit = coerceScore(payload.summaryReportData?.overallScore);
  if (explicit) {
    return explicit;
  }

  if (!scoreRings.length) {
    return null;
  }

  return Number((scoreRings.reduce((sum, ring) => sum + ring.score, 0) / scoreRings.length).toFixed(1));
}

function extractMorphokinetics(sourcePayload: unknown, analysis: unknown) {
  const candidates: Array<unknown> = [];
  if (sourcePayload && typeof sourcePayload === "object") {
    candidates.push((sourcePayload as { morphokineticsAnalysis?: unknown }).morphokineticsAnalysis);
  }
  if (analysis && typeof analysis === "object") {
    candidates.push((analysis as { morphokineticsAnalysis?: unknown }).morphokineticsAnalysis);
  }

  const record = candidates.find((candidate) => candidate && typeof candidate === "object") as
    | {
        overallSummary?: string;
        timelineStructureNotes?: string;
        keyMoments?: Array<{
          dominantEmotion?: string;
          emotionalValence?: number;
          eventDescription?: string;
          intensityScore?: number;
          isPacingShift?: boolean;
          isTwist?: boolean;
          time?: number;
        }>;
      }
    | undefined;

  if (!record) {
    return null;
  }

  const keyMoments = Array.isArray(record.keyMoments)
    ? record.keyMoments.slice(0, 8).map((moment) => {
        const percentage = typeof moment.time === "number" ? `~${Math.round(moment.time * 100)}%` : "Key moment";
        const valence =
          typeof moment.emotionalValence === "number"
            ? moment.emotionalValence > 0
              ? "positive"
              : moment.emotionalValence < 0
                ? "negative"
                : "neutral"
            : "neutral";
        return {
          emotion: moment.dominantEmotion ?? "Shift",
          event: moment.eventDescription ?? "Narrative shift",
          intensity: typeof moment.intensityScore === "number" ? moment.intensityScore : 5,
          tag: moment.isTwist ? "Twist" : moment.isPacingShift ? "Pacing Shift" : undefined,
          timeLabel: percentage,
          valence,
        } satisfies ManifestMoment;
      })
    : [];

  return {
    keyMoments,
    summary: record.overallSummary ?? null,
    timelineNotes: record.timelineStructureNotes ?? null,
  };
}

async function readMetadataFromR2(bucket: R2Bucket | undefined, metadataObjectKey: string | null | undefined) {
  if (!bucket || !metadataObjectKey) {
    return {};
  }

  try {
    const object = await bucket.get(metadataObjectKey);
    if (!object) {
      return {};
    }

    const payload = (await object.json()) as LensManifestMetadata & {
      tags?: string[] | null;
      image?: {
        heroUrl?: string | null;
        posterUrl?: string | null;
        thumbnailUrl?: string | null;
      };
    };

    return {
      category: payload.category ?? null,
      heroImageUrl: payload.heroImageUrl ?? payload.image?.heroUrl ?? null,
      platform: payload.platform ?? null,
      posterImageUrl: payload.posterImageUrl ?? payload.image?.posterUrl ?? null,
      releaseFocus: payload.releaseFocus ?? null,
      tags: payload.tags ?? null,
      thumbnailEyebrow: payload.thumbnailEyebrow ?? null,
      thumbnailImageUrl: payload.thumbnailImageUrl ?? payload.image?.thumbnailUrl ?? null,
      verdict: payload.verdict ?? null,
      year: payload.year ?? null,
    } satisfies LensManifestMetadata;
  } catch {
    return {};
  }
}

function extractMetadataFromSourcePayload(sourcePayload: unknown): LensManifestMetadata {
  if (!sourcePayload || typeof sourcePayload !== "object") {
    return {};
  }

  const payload = sourcePayload as {
    tags?: string[] | null;
    image?: {
      heroUrl?: string | null;
      posterUrl?: string | null;
      thumbnailUrl?: string | null;
    };
    imageUrl?: string | null;
    heroImageUrl?: string | null;
    platform?: string | null;
    posterImageUrl?: string | null;
    releaseFocus?: string | null;
    thumbnailImageUrl?: string | null;
    title?: string | null;
    verdict?: string | null;
    year?: string | null;
  };

  return {
    heroImageUrl: payload.heroImageUrl ?? payload.image?.heroUrl ?? payload.imageUrl ?? null,
    platform: payload.platform ?? null,
    posterImageUrl: payload.posterImageUrl ?? payload.image?.posterUrl ?? payload.imageUrl ?? null,
    releaseFocus: payload.releaseFocus ?? null,
    tags: Array.isArray(payload.tags) ? payload.tags.filter((tag) => typeof tag === "string") : null,
    thumbnailImageUrl: payload.thumbnailImageUrl ?? payload.image?.thumbnailUrl ?? payload.imageUrl ?? null,
    verdict: payload.verdict ?? null,
    year: payload.year ?? null,
  };
}

function mergeMetadata(primary: LensManifestMetadata, secondary: LensManifestMetadata): LensManifestMetadata {
  return {
    category: primary.category ?? secondary.category ?? null,
    heroImageUrl: primary.heroImageUrl ?? secondary.heroImageUrl ?? null,
    platform: primary.platform ?? secondary.platform ?? null,
    posterImageUrl: primary.posterImageUrl ?? secondary.posterImageUrl ?? null,
    releaseFocus: primary.releaseFocus ?? secondary.releaseFocus ?? null,
    tags: primary.tags ?? secondary.tags ?? null,
    thumbnailEyebrow: primary.thumbnailEyebrow ?? secondary.thumbnailEyebrow ?? null,
    thumbnailImageUrl: primary.thumbnailImageUrl ?? secondary.thumbnailImageUrl ?? null,
    verdict: primary.verdict ?? secondary.verdict ?? null,
    year: primary.year ?? secondary.year ?? null,
  };
}

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }
  if (url.startsWith("data:image/")) {
    return true;
  }
  if (!/^https?:\/\//i.test(url)) {
    return false;
  }
  if (/linkedin\.com\/pulse/i.test(url) && !/media\.licdn\.com/i.test(url)) {
    return false;
  }
  if (/miro\.medium\.com\/v2\/resize:fill:(32|48|64)/i.test(url)) {
    return false;
  }
  if (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)) {
    return true;
  }
  if (/cdn-images-1\.medium\.com|miro\.medium\.com|static\.licdn\.com|media\.licdn\.com/i.test(url)) {
    return true;
  }
  return false;
}

function normalizeImageUrl(url: string | null | undefined) {
  return isLikelyImageUrl(url) ? url ?? null : null;
}

export async function listPublicLensManifest(client: Client, env: Env, limit = 100): Promise<PublicLensManifestEntry[]> {
  const publications = await listPublishedWebsiteRows(client, limit);
  const entries = await Promise.all(
    publications.map(async (publication) => {
      if (!publication.blogMarkdown) {
        return null;
      }

      const sourcePayload = (publication.sourcePayload ?? {}) as Record<string, unknown>;
      const metadata = extractMetadataFromSourcePayload(sourcePayload);
      const scoreRings = extractScoreRings(sourcePayload);
      const overallScore = extractOverallScore(sourcePayload, scoreRings);
      const contentType = normalizeContentType(
        publication.subjectType,
        publication.reviewStage,
        publication.subjectTitle,
        metadata.tags ?? [],
      );
      const category = metadata.category?.trim() || categoryForContentType(contentType, publication.reviewStage);
      const thumbnailEyebrow =
        metadata.thumbnailEyebrow?.trim() || eyebrowForContentType(contentType, publication.reviewStage);
      const summary = publication.seoDescription?.trim() || firstSentence(extractDek(publication.blogMarkdown, null));
      const verdict = metadata.verdict?.trim() || summary;
      const posterFallback = generatePosterDataUrl(publication.subjectTitle, pickPosterAccent(publication.subjectTitle));
      const posterImageUrl = normalizeImageUrl(metadata.posterImageUrl) ?? posterFallback;
      const heroImageUrl =
        normalizeImageUrl(metadata.heroImageUrl) ??
        normalizeImageUrl(metadata.posterImageUrl) ??
        posterFallback;
      const thumbnailImageUrl =
        normalizeImageUrl(metadata.thumbnailImageUrl) ??
        normalizeImageUrl(metadata.posterImageUrl) ??
        normalizeImageUrl(metadata.heroImageUrl) ??
        posterFallback;
      // Parse keywords and reading metadata from the version
      const keywords: string[] = parseJson<string[]>(publication.keywordsJson) ?? [];
      const readingMetadata = parseJson<{
        estimatedReadTime: string;
        sectionAnchors: Array<{ id: string; label: string; wordCount: number }>;
        relatedSlugs: string[];
      }>(publication.readingMetadataJson);

      return {
        blogMarkdown: publication.blogMarkdown,
        canonicalUrl: publication.externalUrl,
        category,
        contentType,
        dek: extractDek(publication.blogMarkdown, publication.seoDescription),
        heroImageUrl,
        heroPriority: publication.heroPriority,
        keywords,
        morphokinetics: extractMorphokinetics(sourcePayload, publication.analysis),
        overallScore,
        platform: metadata.platform ?? null,
        posterImageUrl,
        posterLabel: labelForContentType(contentType, publication.subjectTitle),
        publishedAt: publication.publishedAt,
        readingMetadata: readingMetadata ?? null,
        releaseFocus: inferReleaseFocus(contentType, metadata, publication.subjectType),
        reviewStage: publication.reviewStage,
        scoreRings,
        slug: publication.externalId,
        source: "live-worker" as const,
        subjectType: publication.subjectType,
        summary,
        summaryHook: publication.summaryHook,
        tags: [publication.subjectType, publication.reviewStage, publication.status, "website", ...(metadata.tags ?? [])].filter(
          (tag): tag is string => Boolean(tag && tag.trim()),
        ),
        thumbnailEyebrow,
        thumbnailImageUrl,
        title: publication.seoTitle?.trim() || publication.subjectTitle,
        verdict,
        websiteUrl: publication.externalUrl,
        year: metadata.year ?? null,
      } satisfies PublicLensManifestEntry;
    }),
  );

  const filtered = entries.filter((entry): entry is PublicLensManifestEntry => Boolean(entry));
  const seen = new Set<string>();
  return filtered.filter((entry) => {
    const key = `${entry.slug}:${entry.websiteUrl}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
