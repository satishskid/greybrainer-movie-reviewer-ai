import type { Env } from "./db";

interface DraftArtifactInput {
  analysis?: unknown;
  blogMarkdown: string;
  draftId: string;
  keywords?: string[];
  readingMetadata?: unknown;
  socials?: unknown;
  sourcePayload: unknown;
  versionId: string;
  versionNo: number;
  video?: unknown;
}

export interface DraftArtifactResult {
  analysisObjectKey: string | null;
  markdownObjectKey: string | null;
  socialsObjectKey: string | null;
  sourcePayloadObjectKey: string | null;
  storageBackend: "r2" | "turso";
  videoObjectKey: string | null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function draftBaseKey(input: DraftArtifactInput) {
  return ["drafts", input.draftId, `v${input.versionNo}-${slugify(input.versionId) || input.versionId}`].join("/");
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

export async function persistDraftArtifacts(env: Env, input: DraftArtifactInput): Promise<DraftArtifactResult> {
  if (!env.CONTENT_R2 || env.DRAFT_STORAGE_MODE === "turso") {
    return {
      analysisObjectKey: null,
      markdownObjectKey: null,
      socialsObjectKey: null,
      sourcePayloadObjectKey: null,
      storageBackend: "turso",
      videoObjectKey: null,
    };
  }

  const baseKey = draftBaseKey(input);
  const sourcePayloadObjectKey = `${baseKey}/source-payload.json`;
  const analysisObjectKey = `${baseKey}/analysis.json`;
  const markdownObjectKey = `${baseKey}/blog.md`;
  const socialsObjectKey = `${baseKey}/socials.json`;
  const videoObjectKey = `${baseKey}/video.json`;
  const keywordsObjectKey = `${baseKey}/keywords.json`;
  const readingMetadataObjectKey = `${baseKey}/reading-metadata.json`;

  await Promise.all([
    putJson(env.CONTENT_R2, sourcePayloadObjectKey, input.sourcePayload ?? {}),
    putJson(env.CONTENT_R2, analysisObjectKey, input.analysis ?? null),
    putText(env.CONTENT_R2, markdownObjectKey, input.blogMarkdown, "text/markdown; charset=utf-8"),
    putJson(env.CONTENT_R2, socialsObjectKey, input.socials ?? null),
    putJson(env.CONTENT_R2, videoObjectKey, input.video ?? null),
    input.keywords ? putJson(env.CONTENT_R2, keywordsObjectKey, input.keywords) : Promise.resolve(),
    input.readingMetadata ? putJson(env.CONTENT_R2, readingMetadataObjectKey, input.readingMetadata) : Promise.resolve(),
  ]);

  return {
    analysisObjectKey,
    markdownObjectKey,
    socialsObjectKey,
    sourcePayloadObjectKey,
    storageBackend: "r2",
    videoObjectKey,
  };
}
