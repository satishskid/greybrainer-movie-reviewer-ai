import type { Client } from "@libsql/client";
import type { Env } from "./db";
import {
  getKnowledgeDocumentByCanonicalUrl,
  replaceKnowledgeChunks,
  upsertKnowledgeDocument,
  upsertKnowledgeImportJob,
} from "./knowledgeRepository";
import {
  canonicalizeMediumUrl,
  chunkMarkdown,
  fetchMediumArticleByUrl,
  hashString,
} from "./mediumArticle";
import { htmlPreview, persistKnowledgeArtifacts } from "./knowledgeStorage";

export interface KnowledgeBackfillResult {
  requested: number;
  results: Array<{
    canonicalUrl: string | null;
    documentId?: string | null;
    error?: string;
    sourceUrl: string;
    status: "imported" | "duplicate" | "failed" | "skipped";
    title?: string | null;
  }>;
}

function normalizeLines(raw: string[]) {
  return raw
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function isMediumArticleUrl(input: string) {
  try {
    const parsed = new URL(input);
    return /(^|\.)medium\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

export async function backfillMediumUrls(
  client: Client,
  env: Env,
  input: { requestedBy?: string | null; urls: string[] },
): Promise<KnowledgeBackfillResult> {
  const urls = normalizeLines(input.urls);
  const results: KnowledgeBackfillResult["results"] = [];

  for (const sourceUrl of urls) {
    if (!isMediumArticleUrl(sourceUrl)) {
      await upsertKnowledgeImportJob(client, {
        errorMessage: "Only Medium article URLs are supported in this backfill flow.",
        requestedBy: input.requestedBy ?? null,
        sourceUrl,
        status: "failed",
      });
      results.push({
        canonicalUrl: null,
        error: "Only Medium article URLs are supported in this backfill flow.",
        sourceUrl,
        status: "failed",
      });
      continue;
    }

    const canonicalUrl = canonicalizeMediumUrl(sourceUrl);
    const existingDocument = await getKnowledgeDocumentByCanonicalUrl(client, canonicalUrl);
    if (existingDocument) {
      await upsertKnowledgeImportJob(client, {
        canonicalUrl,
        documentId: existingDocument.id,
        requestedBy: input.requestedBy ?? null,
        sourceUrl,
        status: "duplicate",
        title: existingDocument.title,
      });
      results.push({
        canonicalUrl,
        documentId: existingDocument.id,
        sourceUrl,
        status: "duplicate",
        title: existingDocument.title,
      });
      continue;
    }

    try {
      const article = await fetchMediumArticleByUrl(canonicalUrl);
      const chunks = chunkMarkdown(article.markdownContent, {
        articleId: article.articleId,
        canonicalUrl: article.canonicalUrl,
        title: article.title,
      });
      const storage = await persistKnowledgeArtifacts(env, {
        articleId: article.articleId,
        canonicalUrl: article.canonicalUrl,
        chunks,
        feedUrl: "manual-backfill",
        htmlContent: article.htmlContent,
        markdownContent: article.markdownContent,
        rawPayload: article.rawPayload,
        sourceAccount: article.sourceAccount,
        sourceType: article.sourceType,
        title: article.title,
      });
      const contentHash = await hashString(article.markdownContent);
      const document = await upsertKnowledgeDocument(client, {
        ...article,
        chunkManifestObjectKey: storage.chunkManifestObjectKey,
        contentHash,
        htmlContent: storage.storageBackend === "r2" ? htmlPreview(article.htmlContent) : article.htmlContent,
        htmlObjectKey: storage.htmlObjectKey,
        ingestionStatus: "rag_ready",
        markdownContent: storage.markdownPreview,
        markdownObjectKey: storage.markdownObjectKey,
        rawPayload: storage.rawPayloadPreview,
        rawPayloadObjectKey: storage.rawPayloadObjectKey,
        storageBackend: storage.storageBackend,
      });

      if (!document) {
        throw new Error("Knowledge document could not be created.");
      }

      await replaceKnowledgeChunks(client, document.id, chunks);
      await upsertKnowledgeImportJob(client, {
        canonicalUrl,
        documentId: document.id,
        requestedBy: input.requestedBy ?? null,
        sourceUrl,
        status: "imported",
        title: document.title,
      });
      results.push({
        canonicalUrl,
        documentId: document.id,
        sourceUrl,
        status: "imported",
        title: document.title,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Archive import failed.";
      await upsertKnowledgeImportJob(client, {
        canonicalUrl,
        errorMessage: message,
        requestedBy: input.requestedBy ?? null,
        sourceUrl,
        status: "failed",
      });
      results.push({
        canonicalUrl,
        error: message,
        sourceUrl,
        status: "failed",
      });
    }
  }

  return {
    requested: urls.length,
    results,
  };
}
