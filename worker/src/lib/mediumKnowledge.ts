import type { Client } from "@libsql/client";
import type { Env } from "./db";
import { articleIdFromValues, chunkMarkdown, decodeXmlEntities, hashString, htmlToMarkdown } from "./mediumArticle";
import { replaceKnowledgeChunks, upsertKnowledgeDocument } from "./knowledgeRepository";
import { htmlPreview, persistKnowledgeArtifacts } from "./knowledgeStorage";

export interface MediumKnowledgeSyncResult {
  feedUrl: string;
  hasMore: boolean;
  imported: number;
  limit: number;
  nextOffset: number | null;
  offset: number;
  storageBackend: "r2" | "turso";
  totalFeedItems: number;
  items: Array<{
    articleId: string;
    canonicalUrl: string;
    chunkCount: number;
    documentId: string;
    title: string;
  }>;
}

interface ParsedFeedItem {
  articleId: string;
  authorName: string | null;
  canonicalUrl: string;
  externalId: string;
  htmlContent: string;
  markdownContent: string;
  publishedAt: string | null;
  rawPayload: unknown;
  sourceAccount: string;
  sourceType: string;
  summary: string | null;
  tags: string[];
  title: string;
  updatedAt: string | null;
}

const DEFAULT_MEDIUM_FEED_URL = "https://medium.com/feed/@GreyBrainer";
const DEFAULT_BATCH_SIZE = 4;

function extractTagValue(source: string, tagName: string) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i");
  const match = source.match(pattern);
  if (!match) {
    return null;
  }

  const value = match[1].trim();
  const cdataMatch = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeXmlEntities(cdataMatch ? cdataMatch[1] : value);
}

function extractTagValues(source: string, tagName: string) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "gi");
  const values: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    const value = match[1].trim();
    const cdataMatch = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
    values.push(decodeXmlEntities((cdataMatch ? cdataMatch[1] : value).trim()));
  }

  return values;
}

function stripHtmlToText(html: string) {
  return decodeXmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function parseRssItems(xml: string) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.map((itemXml) => {
    const title = extractTagValue(itemXml, "title") ?? "Untitled";
    const link = extractTagValue(itemXml, "link");
    if (!link) {
      throw new Error("Feed item is missing a link.");
    }

    const canonicalUrl = new URL(link.split("?")[0]).toString();
    const guid = extractTagValue(itemXml, "guid");
    const articleId = articleIdFromValues(guid, link);
    const htmlContent = extractTagValue(itemXml, "content:encoded") ?? "";
    const markdownContent = htmlToMarkdown(htmlContent);
    const summary = markdownContent.split("\n\n").find((section) => section.trim().length > 40) ?? null;

    return {
      articleId,
      authorName: extractTagValue(itemXml, "dc:creator"),
      canonicalUrl,
      externalId: guid ?? canonicalUrl,
      htmlContent,
      markdownContent,
      publishedAt: extractTagValue(itemXml, "pubDate"),
      rawPayload: {
        authorName: extractTagValue(itemXml, "dc:creator"),
        guid,
        htmlContent,
        link,
        title,
      },
      sourceAccount: "@GreyBrainer",
      sourceType: "medium",
      summary,
      tags: extractTagValues(itemXml, "category"),
      title,
      updatedAt: extractTagValue(itemXml, "atom:updated"),
    } satisfies ParsedFeedItem;
  });
}


export async function syncMediumKnowledgeFeed(
  client: Client,
  env: Env,
  options?: {
    limit?: number;
    offset?: number;
  },
): Promise<MediumKnowledgeSyncResult> {
  const feedUrl = env.MEDIUM_FEED_URL ?? DEFAULT_MEDIUM_FEED_URL;
  const requestedLimit = options?.limit ?? Number(env.KNOWLEDGE_SYNC_BATCH_SIZE ?? DEFAULT_BATCH_SIZE);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_BATCH_SIZE, 8));
  const requestedOffset = options?.offset ?? 0;
  const offset = Math.max(0, Number.isFinite(requestedOffset) ? requestedOffset : 0);
  const response = await fetch(feedUrl, {
    headers: {
      accept: "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Medium feed sync failed with ${response.status}.`);
  }

  const xml = await response.text();
  const parsedItems = parseRssItems(xml);
  const selectedItems = parsedItems.slice(offset, offset + limit);
  const imported: MediumKnowledgeSyncResult["items"] = [];
  const storageBackend: MediumKnowledgeSyncResult["storageBackend"] =
    env.KNOWLEDGE_R2 && env.KNOWLEDGE_STORAGE_MODE !== "turso" ? "r2" : "turso";

  for (const item of selectedItems) {
    const chunks = chunkMarkdown(item.markdownContent, {
      articleId: item.articleId,
      canonicalUrl: item.canonicalUrl,
      title: item.title,
    });
    const storage = await persistKnowledgeArtifacts(env, {
      articleId: item.articleId,
      canonicalUrl: item.canonicalUrl,
      chunks,
      feedUrl,
      htmlContent: item.htmlContent,
      markdownContent: item.markdownContent,
      rawPayload: item.rawPayload,
      sourceAccount: item.sourceAccount,
      sourceType: item.sourceType,
      title: item.title,
    });
    const contentHash = await hashString(item.markdownContent);
    const document = await upsertKnowledgeDocument(client, {
      ...item,
      chunkManifestObjectKey: storage.chunkManifestObjectKey,
      contentHash,
      htmlContent: storage.storageBackend === "r2" ? htmlPreview(item.htmlContent) : item.htmlContent,
      htmlObjectKey: storage.htmlObjectKey,
      ingestionStatus: "rag_ready",
      markdownContent: storage.markdownPreview,
      markdownObjectKey: storage.markdownObjectKey,
      rawPayload: storage.rawPayloadPreview,
      rawPayloadObjectKey: storage.rawPayloadObjectKey,
      storageBackend: storage.storageBackend,
    });

    if (!document) {
      continue;
    }

    await replaceKnowledgeChunks(client, document.id, chunks);

    imported.push({
      articleId: item.articleId,
      canonicalUrl: item.canonicalUrl,
      chunkCount: chunks.length,
      documentId: document.id,
      title: item.title,
    });
  }

  return {
    feedUrl,
    hasMore: offset + limit < parsedItems.length,
    imported: imported.length,
    items: imported,
    limit,
    nextOffset: offset + limit < parsedItems.length ? offset + limit : null,
    offset,
    storageBackend,
    totalFeedItems: parsedItems.length,
  };
}
