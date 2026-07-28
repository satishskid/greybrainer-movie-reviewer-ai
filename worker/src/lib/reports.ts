import type { Client } from "@libsql/client";
import { getDraftById } from "./repository";

export interface GreybrainerCastMember {
  actor: string;
  role?: string;
}

export interface GreybrainerScores {
  concept: number;
  overall: number;
  performance: number;
  story: number;
}

export interface GreybrainerReport {
  cast: GreybrainerCastMember[];
  creators: string[];
  director: string;
  generatedAt: string;
  id: string;
  layerAnalysis: {
    concept: string;
    performance: string;
    story: string;
  };
  morphokinetics?: {
    keyMoments: Array<{
      dominantEmotion?: string;
      emotionalValence?: number;
      eventDescription?: string;
      intensityScore?: number;
      time?: number;
    }>;
    overallSummary: string;
    timelineStructureNotes?: string;
  } | null;
  platform: string;
  releaseDate: string;
  reportUrl: string;
  representativeScenes: string[];
  scores: GreybrainerScores;
  sources: string[];
  summary: string;
  title: string;
  versionId: string;
}

export interface ReportSummary {
  generatedAt: string;
  id: string;
  overallScore: number;
  platform: string;
  reportUrl: string;
  title: string;
  versionId: string;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function factLabel(value: unknown) {
  return asString(value).replace(/^[#*_`\s]+|[#*_`\s]+$/g, "").trim();
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function atPath(root: unknown, path: string) {
  let current = root;
  for (const key of path.split(".")) {
    current = asRecord(current)[key];
  }
  return current;
}

function firstString(root: unknown, paths: string[]) {
  for (const path of paths) {
    const value = asString(atPath(root, path));
    if (value) return value;
  }
  return "";
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function layerRecord(sourcePayload: JsonRecord, id: string) {
  const layers = atPath(sourcePayload, "layerAnalyses");
  if (!Array.isArray(layers)) return {};
  return asRecord(
    layers.find((layer) => {
      const layerId = asString(asRecord(layer).id).toUpperCase();
      return layerId === id;
    }),
  );
}

function exactLayerScore(layer: JsonRecord, label: string) {
  const score = asNumber(layer.userScore) ?? asNumber(layer.aiSuggestedScore);
  if (score === null) {
    throw new Error(`Canonical report is missing the stored ${label} score.`);
  }
  return score;
}

function exactLayerText(layer: JsonRecord) {
  return asString(layer.editedText) || asString(layer.aiGeneratedText);
}

function parseCast(sourcePayload: JsonRecord, analysis: JsonRecord) {
  const personnel = asRecord(sourcePayload.personnelData);
  const fallbackPersonnel = asRecord(analysis.personnelData);
  const rawCast = Array.isArray(personnel.cast)
    ? personnel.cast
    : Array.isArray(fallbackPersonnel.cast)
      ? fallbackPersonnel.cast
      : null;

  if (rawCast) {
    return rawCast
      .map((value) => {
        if (typeof value === "string") return { actor: factLabel(value) };
        const item = asRecord(value);
        const actor = factLabel(item.actor) || factLabel(item.name);
        const role = factLabel(item.role) || factLabel(item.character);
        return actor ? { actor, ...(role ? { role } : {}) } : null;
      })
      .filter((value): value is GreybrainerCastMember => Boolean(value));
  }

  const mainCast = stringArray(personnel.mainCast).length
    ? stringArray(personnel.mainCast)
    : stringArray(fallbackPersonnel.mainCast);
  return mainCast.map((actor) => ({ actor }));
}

function parseSources(sourcePayload: JsonRecord, analysis: JsonRecord) {
  const sources: string[] = [];
  const sourceGroups = [
    atPath(sourcePayload, "personnelData.sources"),
    atPath(analysis, "personnelData.sources"),
  ];
  for (const group of sourceGroups) {
    if (!Array.isArray(group)) continue;
    for (const source of group) {
      const uri = asString(asRecord(source).uri);
      if (uri) sources.push(uri);
    }
  }

  const layers = atPath(sourcePayload, "layerAnalyses");
  if (Array.isArray(layers)) {
    for (const layer of layers) {
      const groundingSources = asRecord(layer).groundingSources;
      if (!Array.isArray(groundingSources)) continue;
      for (const source of groundingSources) {
        const uri = asString(asRecord(source).uri);
        if (uri) sources.push(uri);
      }
    }
  }
  return uniqueStrings(sources);
}

function parseRepresentativeScenes(sourcePayload: JsonRecord, analysis: JsonRecord) {
  const sourceScenes = stringArray(atPath(sourcePayload, "summaryReportData.pixarStyleScenes"));
  return sourceScenes.length > 0 ? sourceScenes : stringArray(analysis.pixarStyleScenes);
}

function parseMorphokinetics(sourcePayload: JsonRecord, analysis: JsonRecord) {
  const raw = asRecord(sourcePayload.morphokineticsAnalysis);
  const fallback = asRecord(analysis.morphokineticsAnalysis);
  const selected = Object.keys(raw).length ? raw : fallback;
  if (!Object.keys(selected).length) return null;

  const keyMoments = Array.isArray(selected.keyMoments)
    ? selected.keyMoments.map((moment) => {
        const item = asRecord(moment);
        return {
          dominantEmotion: asString(item.dominantEmotion) || undefined,
          emotionalValence: asNumber(item.emotionalValence) ?? undefined,
          eventDescription: asString(item.eventDescription) || undefined,
          intensityScore: asNumber(item.intensityScore) ?? undefined,
          time: asNumber(item.time) ?? undefined,
        };
      })
    : [];
  const isPlaceholder = (value: string) =>
    /(?:could not be parsed|not available|analysis unavailable)/i.test(value);
  const overallSummary = asString(selected.overallSummary);
  const timelineStructureNotes = asString(selected.timelineStructureNotes);
  const usefulSummary = isPlaceholder(overallSummary) ? "" : overallSummary;
  const usefulTimeline = isPlaceholder(timelineStructureNotes) ? "" : timelineStructureNotes;
  if (!keyMoments.length && !usefulSummary && !usefulTimeline) return null;

  return {
    keyMoments,
    overallSummary: usefulSummary,
    timelineStructureNotes: usefulTimeline || undefined,
  };
}

export async function getReport(client: Client, id: string): Promise<GreybrainerReport | null> {
  const draft = await getDraftById(client, id);
  if (!draft?.currentVersion) return null;

  const sourcePayload = asRecord(draft.currentVersion.sourcePayload);
  const analysis = asRecord(draft.currentVersion.analysis);
  const storyLayer = layerRecord(sourcePayload, "STORY");
  const conceptLayer = layerRecord(sourcePayload, "CONCEPTUALIZATION");
  const performanceLayer = layerRecord(sourcePayload, "PERFORMANCE");
  const story = exactLayerScore(storyLayer, "Story / Script");
  const concept = exactLayerScore(conceptLayer, "Concept / Orchestration");
  const performance = exactLayerScore(performanceLayer, "Performance / Execution");
  const storedOverall =
    asNumber(atPath(sourcePayload, "summaryReportData.overallScore")) ??
    asNumber(atPath(analysis, "overallScore"));
  const overall = storedOverall ?? Number(((story + concept + performance) / 3).toFixed(1));
  const personnel = asRecord(sourcePayload.personnelData);
  const fallbackPersonnel = asRecord(analysis.personnelData);
  const creators = uniqueStrings(
    [
      ...stringArray(sourcePayload.creators),
      ...stringArray(atPath(sourcePayload, "summaryReportData.creators")),
    ].map(factLabel),
  );
  const summary =
    firstString(sourcePayload, ["summaryReportData.reportText", "summary", "reportText"]) ||
    firstString(analysis, ["reportText", "summary"]) ||
    draft.currentVersion.summaryHook ||
    "";

  return {
    cast: parseCast(sourcePayload, analysis),
    creators,
    director: factLabel(personnel.director) || factLabel(fallbackPersonnel.director),
    generatedAt: draft.currentVersion.createdAt,
    id: draft.id,
    layerAnalysis: {
      concept: exactLayerText(conceptLayer),
      performance: exactLayerText(performanceLayer),
      story: exactLayerText(storyLayer),
    },
    morphokinetics: parseMorphokinetics(sourcePayload, analysis),
    platform: firstString(sourcePayload, [
      "platform",
      "streamingPlatform",
      "summaryReportData.platform",
      "movie.platform",
    ]),
    releaseDate: firstString(sourcePayload, [
      "releaseDate",
      "release_date",
      "summaryReportData.releaseDate",
      "movie.releaseDate",
    ]),
    reportUrl: draft.websiteUrl ?? "",
    representativeScenes: parseRepresentativeScenes(sourcePayload, analysis),
    scores: { concept, overall, performance, story },
    sources: parseSources(sourcePayload, analysis),
    summary,
    title: draft.subjectTitle,
    versionId: draft.currentVersion.id,
  };
}

export async function listReports(
  client: Client,
  limit = 20,
  cursor?: string | null,
): Promise<{ nextCursor: string | null; reports: ReportSummary[] }> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const offset = Math.max(Number.parseInt(cursor ?? "0", 10) || 0, 0);
  const result = await client.execute({
    sql: `
      SELECT id
      FROM drafts
      WHERE current_version_id IS NOT NULL AND subject_type = 'movie'
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [safeLimit + 1, offset],
  });

  const ids = result.rows.slice(0, safeLimit).map((row) => String(row.id));
  const resolved = await Promise.allSettled(ids.map((id) => getReport(client, id)));
  const reports = resolved
    .filter(
      (result): result is PromiseFulfilledResult<GreybrainerReport> =>
        result.status === "fulfilled" && Boolean(result.value),
    )
    .map((result) => result.value)
    .map((report) => ({
      generatedAt: report.generatedAt,
      id: report.id,
      overallScore: report.scores.overall,
      platform: report.platform,
      reportUrl: report.reportUrl,
      title: report.title,
      versionId: report.versionId,
    }));

  return {
    nextCursor: result.rows.length > safeLimit ? String(offset + safeLimit) : null,
    reports,
  };
}
