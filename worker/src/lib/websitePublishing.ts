import type { Client } from "@libsql/client";
import type { Env } from "./db";
import { chunkMarkdown, hashString } from "./mediumArticle";
import { replaceKnowledgeChunks, upsertKnowledgeDocument } from "./knowledgeRepository";
import { htmlPreview, persistKnowledgeArtifacts } from "./knowledgeStorage";
import { getDraftById, updateDraft, upsertPublication } from "./repository";

interface WebsitePublishInput {
  draftId: string;
  requestedBy?: string | null;
  versionId?: string | null;
  websiteUrl?: string | null;
}

export interface WebsitePublishResult {
  canonicalUrl: string;
  draft: Awaited<ReturnType<typeof getDraftById>>;
  knowledgeDocumentId: string;
  publication: {
    channel: string;
    externalId: string;
    externalUrl: string;
    status: string;
    versionId: string;
  };
  slug: string;
  storage: {
    analysisObjectKey: string | null;
    blogObjectKey: string;
    metadataObjectKey: string;
    socialsObjectKey: string | null;
    sourcePayloadObjectKey: string | null;
    versionBaseKey: string;
  };
}

const DEFAULT_WEBSITE_BASE_URL = "https://greybrainer-dev.pages.dev/lens";

function nowIso() {
  return new Date().toISOString();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(input: string) {
  const escaped = escapeHtml(input);
  return escaped
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownToHtml(markdown: string, title: string) {
  const lines = markdown.split("\n");
  const blocks: string[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }
    blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join(" ").trim())}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(6, headingMatch[1].length);
      blocks.push(`<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listItems.push(line.slice(2).trim());
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    title,
  )}</title></head><body><article>${blocks.join("")}</article></body></html>`;
}

function extractSummary(markdown: string, fallback: string | null) {
  if (fallback?.trim()) {
    return fallback.trim();
  }

  const sections = markdown
    .split(/\n{2,}/)
    .map((section) => section.replace(/^#{1,6}\s+/, "").trim())
    .filter((section) => section.length > 40);
  return sections[0] ?? null;
}

function resolveCanonicalUrl(
  env: Env,
  draft: NonNullable<Awaited<ReturnType<typeof getDraftById>>>,
  title: string,
  explicitWebsiteUrl?: string | null,
) {
  const websiteUrl = explicitWebsiteUrl?.trim() || draft.websiteUrl?.trim();
  if (websiteUrl) {
    const parsed = new URL(websiteUrl);
    parsed.hash = "";
    return {
      canonicalUrl: parsed.toString(),
      slug: parsed.pathname.split("/").filter(Boolean).pop() ?? (slugify(title) || draft.id),
    };
  }

  const baseUrl = (env.WEBSITE_BASE_URL ?? DEFAULT_WEBSITE_BASE_URL).replace(/\/+$/, "");
  const slug = slugify(title) || draft.id;
  return {
    canonicalUrl: `${baseUrl}/${slug}`,
    slug,
  };
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

async function persistPublishedWebsiteArtifacts(
  env: Env,
  input: {
    canonicalUrl: string;
    draft: NonNullable<Awaited<ReturnType<typeof getDraftById>>>;
    htmlContent: string;
    requestedBy?: string | null;
    selectedVersion: NonNullable<NonNullable<Awaited<ReturnType<typeof getDraftById>>>["currentVersion"]>;
    slug: string;
    summary: string | null;
    title: string;
  },
) {
  if (!env.CONTENT_R2) {
    throw new Error("CONTENT_R2 is not configured. Website publishing requires the Cloudflare content bucket.");
  }

  const versionSegment = `v${input.selectedVersion.versionNo}-${slugify(input.selectedVersion.id) || input.selectedVersion.id}`;
  const baseKey = ["published", "website", input.slug, versionSegment].join("/");
  const metadataObjectKey = `${baseKey}/metadata.json`;
  const blogObjectKey = `${baseKey}/content.md`;
  const htmlObjectKey = `${baseKey}/content.html`;
  const analysisObjectKey = `${baseKey}/analysis.json`;
  const socialsObjectKey = `${baseKey}/socials.json`;
  const sourcePayloadObjectKey = `${baseKey}/source-payload.json`;

  await Promise.all([
    putJson(env.CONTENT_R2, metadataObjectKey, {
      canonicalUrl: input.canonicalUrl,
      draftId: input.draft.id,
      publishedAt: nowIso(),
      publishedBy: input.requestedBy ?? null,
      reviewStage: input.draft.reviewStage,
      seoDescription: input.draft.seoDescription,
      seoTitle: input.title,
      slug: input.slug,
      sourceDraftVersionId: input.selectedVersion.id,
      status: "published",
      subjectTitle: input.draft.subjectTitle,
      summary: input.summary,
      title: input.title,
    }),
    putText(env.CONTENT_R2, blogObjectKey, input.selectedVersion.blogMarkdown, "text/markdown; charset=utf-8"),
    putText(env.CONTENT_R2, htmlObjectKey, input.htmlContent, "text/html; charset=utf-8"),
    putJson(env.CONTENT_R2, analysisObjectKey, input.selectedVersion.analysis ?? null),
    putJson(env.CONTENT_R2, socialsObjectKey, input.selectedVersion.socials ?? null),
    putJson(env.CONTENT_R2, sourcePayloadObjectKey, input.selectedVersion.sourcePayload ?? null),
  ]);

  return {
    analysisObjectKey,
    blogObjectKey,
    htmlObjectKey,
    metadataObjectKey,
    socialsObjectKey,
    sourcePayloadObjectKey,
    versionBaseKey: baseKey,
  };
}

export async function publishDraftToWebsite(
  client: Client,
  env: Env,
  input: WebsitePublishInput,
): Promise<WebsitePublishResult> {
  const draft = await getDraftById(client, input.draftId);
  if (!draft) {
    throw new Error("Draft not found.");
  }

  if (draft.status !== "approved" && draft.status !== "published") {
    throw new Error("Draft must be approved before website publishing.");
  }

  const selectedVersion =
    draft.versions?.find((version) => version.id === (input.versionId ?? draft.currentVersionId)) ??
    draft.currentVersion ??
    null;
  if (!selectedVersion) {
    throw new Error("Draft has no version available for website publishing.");
  }

  const title = draft.seoTitle?.trim() || draft.subjectTitle;
  const { canonicalUrl, slug } = resolveCanonicalUrl(env, draft, title, input.websiteUrl);
  const htmlContent = markdownToHtml(selectedVersion.blogMarkdown, title);
  const summary = extractSummary(selectedVersion.blogMarkdown, draft.seoDescription);
  const publishedAt = nowIso();
  const storage = await persistPublishedWebsiteArtifacts(env, {
    canonicalUrl,
    draft,
    htmlContent,
    requestedBy: input.requestedBy ?? null,
    selectedVersion,
    slug,
    summary,
    title,
  });

  const chunks = chunkMarkdown(selectedVersion.blogMarkdown, {
    articleId: draft.id,
    canonicalUrl,
    title,
  });
  const knowledgeStorage = await persistKnowledgeArtifacts(env, {
    articleId: draft.id,
    canonicalUrl,
    chunks,
    feedUrl: canonicalUrl,
    htmlContent,
    markdownContent: selectedVersion.blogMarkdown,
    rawPayload: {
      draftId: draft.id,
      draftStatus: "published",
      publicationChannel: "website",
      publishedArtifact: storage,
      requestedBy: input.requestedBy ?? null,
      reviewStage: draft.reviewStage,
      seoDescription: draft.seoDescription,
      sourcePayload: selectedVersion.sourcePayload ?? null,
      versionId: selectedVersion.id,
      versionNo: selectedVersion.versionNo,
    },
    sourceAccount: "greybrain.ai",
    sourceType: "greybrainer-website",
    title,
  });
  const contentHash = await hashString(selectedVersion.blogMarkdown);
  const knowledgeDocument = await upsertKnowledgeDocument(client, {
    articleId: draft.id,
    authorName: input.requestedBy ?? draft.createdBy ?? null,
    canonicalUrl,
    chunkManifestObjectKey: knowledgeStorage.chunkManifestObjectKey,
    contentHash,
    externalId: `greybrainer-website:${draft.id}`,
    htmlContent: knowledgeStorage.storageBackend === "r2" ? htmlPreview(htmlContent) : htmlContent,
    htmlObjectKey: knowledgeStorage.htmlObjectKey,
    ingestionStatus: "rag_ready",
    markdownContent: knowledgeStorage.markdownPreview,
    markdownObjectKey: knowledgeStorage.markdownObjectKey,
    publishedAt,
    rawPayload: knowledgeStorage.rawPayloadPreview,
    rawPayloadObjectKey: knowledgeStorage.rawPayloadObjectKey,
    sourceAccount: "greybrain.ai",
    sourceType: "greybrainer-website",
    storageBackend: knowledgeStorage.storageBackend,
    summary,
    tags: [draft.subjectType, "website", "published"].filter(Boolean),
    title,
    updatedAt: publishedAt,
  });

  if (!knowledgeDocument) {
    throw new Error("Failed to persist website knowledge document.");
  }

  await replaceKnowledgeChunks(client, knowledgeDocument.id, chunks);

  await updateDraft(client, draft.id, {
    status: "published",
    websiteUrl: canonicalUrl,
  });

  const publications = await upsertPublication(client, draft.id, {
    channel: "website",
    externalId: slug,
    externalUrl: canonicalUrl,
    payload: {
      contentStorage: storage,
      knowledgeDocumentId: knowledgeDocument.id,
      publishedAt,
      requestedBy: input.requestedBy ?? null,
      title,
    },
    publishedAt,
    status: "published",
    versionId: selectedVersion.id,
  });

  const refreshedDraft = await getDraftById(client, draft.id);
  const websitePublication = publications?.find((publication) => publication.channel === "website");
  if (!refreshedDraft || !websitePublication) {
    throw new Error("Website publication completed, but the refreshed draft state could not be loaded.");
  }

  return {
    canonicalUrl,
    draft: refreshedDraft,
    knowledgeDocumentId: knowledgeDocument.id,
    publication: {
      channel: websitePublication.channel,
      externalId: websitePublication.externalId ?? slug,
      externalUrl: websitePublication.externalUrl ?? canonicalUrl,
      status: websitePublication.status,
      versionId: websitePublication.versionId ?? selectedVersion.id,
    },
    slug,
    storage: {
      analysisObjectKey: storage.analysisObjectKey,
      blogObjectKey: storage.blogObjectKey,
      metadataObjectKey: storage.metadataObjectKey,
      socialsObjectKey: storage.socialsObjectKey,
      sourcePayloadObjectKey: storage.sourcePayloadObjectKey,
      versionBaseKey: storage.versionBaseKey,
    },
  };
}
