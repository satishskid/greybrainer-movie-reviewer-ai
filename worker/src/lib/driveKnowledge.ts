import type { Client } from "@libsql/client";
import type { Env } from "./db";
import {
  getKnowledgeDocumentByCanonicalUrl,
  replaceKnowledgeChunks,
  upsertKnowledgeDocument,
  upsertKnowledgeImportJob,
} from "./knowledgeRepository";
import { chunkMarkdown, hashString } from "./mediumArticle";
import { htmlPreview, persistKnowledgeArtifacts } from "./knowledgeStorage";

interface DriveFolderEntry {
  documentUrl: string;
  fileId: string;
  title: string;
}

interface ParsedDriveDocEntry {
  articleId: string;
  canonicalUrl: string;
  markdownContent: string;
  summary: string | null;
  title: string;
}

export interface DriveFolderSyncResult {
  folderId: string;
  folderTitle: string | null;
  imported: number;
  results: Array<{
    documentId?: string | null;
    sourceUrl: string;
    status: "imported" | "duplicate" | "failed" | "skipped";
    title: string;
    error?: string;
  }>;
  scanned: number;
}

function extractFolderId(folderUrlOrId: string) {
  if (!folderUrlOrId.includes("/")) {
    return folderUrlOrId.trim();
  }

  const match = folderUrlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    throw new Error("Could not determine Google Drive folder ID.");
  }

  return match[1];
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripGoogleDocText(raw: string) {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractSummary(markdownContent: string) {
  return (
    markdownContent
      .split("\n\n")
      .map((section) => section.trim())
      .find((section) => section.length > 40) ?? null
  );
}

function embeddedFolderViewUrl(folderId: string) {
  return `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
}

function googleDocExportTxtUrl(fileId: string) {
  return `https://docs.google.com/document/d/${fileId}/export?format=txt`;
}

function splitArchiveEntries(fileId: string, documentUrl: string, documentTitle: string, rawText: string): ParsedDriveDocEntry[] {
  const lines = rawText.split("\n");
  const datePattern = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/;
  const sections: Array<{ heading: string; content: string[] }> = [];
  let current: { heading: string; content: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (datePattern.test(trimmed)) {
      if (current) {
        sections.push(current);
      }
      current = { heading: trimmed, content: [trimmed] };
      continue;
    }

    if (!current) {
      current = { heading: documentTitle, content: [] };
    }
    current.content.push(line);
  }

  if (current) {
    sections.push(current);
  }

  const datedSections = sections.filter((section) => datePattern.test(section.heading) && section.content.join("\n").trim().length > 120);
  if (datedSections.length >= 2) {
    return datedSections.map((section) => {
      const markdownContent = section.content.join("\n").trim();
      const sectionLines = markdownContent.split("\n").map((item) => item.trim()).filter(Boolean);
      const inferredTitle = sectionLines[1] && !datePattern.test(sectionLines[1]) ? sectionLines[1] : documentTitle;
      const dateSlug = section.heading.replace(/[./]/g, "-");
      return {
        articleId: `${fileId}-${dateSlug}`,
        canonicalUrl: `${documentUrl}#${dateSlug}`,
        markdownContent,
        summary: extractSummary(markdownContent),
        title: `${inferredTitle} (${section.heading})`,
      };
    });
  }

  const markdownContent = rawText.trim();
  return [
    {
      articleId: fileId,
      canonicalUrl: documentUrl,
      markdownContent,
      summary: extractSummary(markdownContent),
      title: documentTitle,
    },
  ];
}

function parseFolderEntries(html: string) {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const folderTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;
  const entries: DriveFolderEntry[] = [];
  const pattern =
    /<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[^>]*>[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    entries.push({
      documentUrl: decodeHtmlEntities(match[2].trim()).replace(/\?usp=.*/, ""),
      fileId: match[1].trim(),
      title: decodeHtmlEntities(match[3].trim()),
    });
  }

  return { entries, folderTitle };
}

async function fetchDriveFolderEntries(folderId: string) {
  const response = await fetch(embeddedFolderViewUrl(folderId), {
    headers: {
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Drive folder fetch failed with ${response.status}.`);
  }

  const html = await response.text();
  const parsed = parseFolderEntries(html);
  if (parsed.entries.length === 0) {
    throw new Error("No importable files were found in the shared Google Drive folder.");
  }

  return parsed;
}

async function fetchGoogleDocText(fileId: string) {
  const response = await fetch(googleDocExportTxtUrl(fileId), {
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Google Doc export failed with ${response.status}.`);
  }

  const text = stripGoogleDocText(await response.text());
  if (text.length < 80) {
    throw new Error("Google Doc export did not return enough readable content.");
  }

  return text;
}

export async function syncSharedDriveFolder(
  client: Client,
  env: Env,
  input: { folderUrlOrId: string; requestedBy?: string | null },
): Promise<DriveFolderSyncResult> {
  const folderId = extractFolderId(input.folderUrlOrId);
  const { entries, folderTitle } = await fetchDriveFolderEntries(folderId);
  const results: DriveFolderSyncResult["results"] = [];

  for (const entry of entries) {
    try {
      const rawText = await fetchGoogleDocText(entry.fileId);
      const parsedEntries = splitArchiveEntries(entry.fileId, entry.documentUrl, entry.title, rawText);

      for (const parsedEntry of parsedEntries) {
        const existing = await getKnowledgeDocumentByCanonicalUrl(client, parsedEntry.canonicalUrl);
        if (existing) {
          await upsertKnowledgeImportJob(client, {
            canonicalUrl: parsedEntry.canonicalUrl,
            documentId: existing.id,
            requestedBy: input.requestedBy ?? null,
            sourceType: "google-drive",
            sourceUrl: entry.documentUrl,
            status: "duplicate",
            title: parsedEntry.title,
          });
          results.push({
            documentId: existing.id,
            sourceUrl: entry.documentUrl,
            status: "duplicate",
            title: parsedEntry.title,
          });
          continue;
        }

        const chunks = chunkMarkdown(parsedEntry.markdownContent, {
          articleId: parsedEntry.articleId,
          canonicalUrl: parsedEntry.canonicalUrl,
          title: parsedEntry.title,
        });
        const storage = await persistKnowledgeArtifacts(env, {
          articleId: parsedEntry.articleId,
          canonicalUrl: parsedEntry.canonicalUrl,
          chunks,
          feedUrl: `google-drive-folder:${folderId}`,
          htmlContent: `<pre>${parsedEntry.markdownContent}</pre>`,
          markdownContent: parsedEntry.markdownContent,
          rawPayload: {
            fileId: entry.fileId,
            folderId,
            folderTitle,
            sourceDocumentUrl: entry.documentUrl,
            sourceExportUrl: googleDocExportTxtUrl(entry.fileId),
          },
          sourceAccount: folderTitle ?? "google-drive",
          sourceType: "google-drive",
          title: parsedEntry.title,
        });
        const contentHash = await hashString(parsedEntry.markdownContent);
        const document = await upsertKnowledgeDocument(client, {
          articleId: parsedEntry.articleId,
          authorName: null,
          canonicalUrl: parsedEntry.canonicalUrl,
          chunkManifestObjectKey: storage.chunkManifestObjectKey,
          contentHash,
          externalId: parsedEntry.articleId,
          htmlContent:
            storage.storageBackend === "r2"
              ? htmlPreview(`<pre>${parsedEntry.markdownContent}</pre>`)
              : `<pre>${parsedEntry.markdownContent}</pre>`,
          htmlObjectKey: storage.htmlObjectKey,
          ingestionStatus: "rag_ready",
          markdownContent: storage.markdownPreview,
          markdownObjectKey: storage.markdownObjectKey,
          publishedAt: null,
          rawPayload: storage.rawPayloadPreview,
          rawPayloadObjectKey: storage.rawPayloadObjectKey,
          sourceAccount: folderTitle ?? "google-drive",
          sourceType: "google-drive",
          storageBackend: storage.storageBackend,
          summary: parsedEntry.summary,
          tags: ["google-drive", "archive"],
          title: parsedEntry.title,
          updatedAt: null,
        });

        if (!document) {
          throw new Error("Drive knowledge document could not be created.");
        }

        await replaceKnowledgeChunks(client, document.id, chunks);
        await upsertKnowledgeImportJob(client, {
          canonicalUrl: parsedEntry.canonicalUrl,
          documentId: document.id,
          requestedBy: input.requestedBy ?? null,
          sourceType: "google-drive",
          sourceUrl: entry.documentUrl,
          status: "imported",
          title: parsedEntry.title,
        });
        results.push({
          documentId: document.id,
          sourceUrl: entry.documentUrl,
          status: "imported",
          title: parsedEntry.title,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Drive archive import failed.";
      await upsertKnowledgeImportJob(client, {
        canonicalUrl: entry.documentUrl,
        errorMessage: message,
        requestedBy: input.requestedBy ?? null,
        sourceType: "google-drive",
        sourceUrl: entry.documentUrl,
        status: "failed",
        title: entry.title,
      });
      results.push({
        error: message,
        sourceUrl: entry.documentUrl,
        status: "failed",
        title: entry.title,
      });
    }
  }

  return {
    folderId,
    folderTitle,
    imported: results.filter((item) => item.status === "imported").length,
    results,
    scanned: entries.length,
  };
}
