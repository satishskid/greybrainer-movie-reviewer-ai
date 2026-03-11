import type { Env } from "./db";

export interface KnowledgeArtifactSet {
  articleId: string;
  canonicalUrl: string;
  chunks: Array<{
    chunkIndex: number;
    contentMarkdown: string;
    heading: string | null;
    metadata: unknown;
    tokenEstimate: number;
  }>;
  feedUrl: string;
  htmlContent: string;
  markdownContent: string;
  rawPayload: unknown;
  sourceAccount: string;
  sourceType: string;
  title: string;
}

export interface KnowledgeStorageResult {
  chunkManifestObjectKey: string | null;
  htmlObjectKey: string | null;
  markdownObjectKey: string | null;
  markdownPreview: string;
  rawPayloadObjectKey: string | null;
  rawPayloadPreview: unknown;
  storageBackend: "r2" | "turso";
}

const MARKDOWN_PREVIEW_LIMIT = 4000;
const HTML_PREVIEW_LIMIT = 2000;

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function truncate(input: string, limit: number) {
  if (input.length <= limit) {
    return input;
  }
  return `${input.slice(0, limit)}\n...[truncated]`;
}

function normalizeSourceSegment(input: string) {
  return input.replace(/^@+/, "").toLowerCase();
}

function buildBaseKey(input: KnowledgeArtifactSet) {
  const sourceAccount = normalizeSourceSegment(input.sourceAccount);
  return [
    "knowledge",
    input.sourceType,
    sourceAccount,
    input.articleId,
    slugify(input.title) || "untitled",
  ].join("/");
}

async function putJson(bucket: R2Bucket, key: string, value: unknown) {
  await bucket.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
    },
  });
}

async function putText(bucket: R2Bucket, key: string, value: string, contentType: string) {
  await bucket.put(key, value, {
    httpMetadata: {
      contentType,
    },
  });
}

export async function persistKnowledgeArtifacts(
  env: Env,
  input: KnowledgeArtifactSet,
): Promise<KnowledgeStorageResult> {
  if (!env.KNOWLEDGE_R2 || env.KNOWLEDGE_STORAGE_MODE === "turso") {
    return {
      chunkManifestObjectKey: null,
      htmlObjectKey: null,
      markdownObjectKey: null,
      markdownPreview: input.markdownContent,
      rawPayloadObjectKey: null,
      rawPayloadPreview: input.rawPayload,
      storageBackend: "turso",
    };
  }

  const baseKey = buildBaseKey(input);
  const rawPayloadObjectKey = `${baseKey}/raw.json`;
  const htmlObjectKey = `${baseKey}/content.html`;
  const markdownObjectKey = `${baseKey}/content.md`;
  const chunkManifestObjectKey = `${baseKey}/chunks.json`;

  await Promise.all([
    putJson(env.KNOWLEDGE_R2, rawPayloadObjectKey, {
      canonicalUrl: input.canonicalUrl,
      feedUrl: input.feedUrl,
      payload: input.rawPayload,
      title: input.title,
    }),
    putText(env.KNOWLEDGE_R2, htmlObjectKey, input.htmlContent, "text/html; charset=utf-8"),
    putText(env.KNOWLEDGE_R2, markdownObjectKey, input.markdownContent, "text/markdown; charset=utf-8"),
    putJson(env.KNOWLEDGE_R2, chunkManifestObjectKey, {
      articleId: input.articleId,
      canonicalUrl: input.canonicalUrl,
      chunks: input.chunks,
      title: input.title,
    }),
  ]);

  return {
    chunkManifestObjectKey,
    htmlObjectKey,
    markdownObjectKey,
    markdownPreview: truncate(input.markdownContent, MARKDOWN_PREVIEW_LIMIT),
    rawPayloadObjectKey,
    rawPayloadPreview: {
      canonicalUrl: input.canonicalUrl,
      chunkManifestObjectKey,
      feedUrl: input.feedUrl,
      htmlObjectKey,
      markdownObjectKey,
      title: input.title,
    },
    storageBackend: "r2",
  };
}

export function htmlPreview(htmlContent: string) {
  return truncate(htmlContent, HTML_PREVIEW_LIMIT);
}
