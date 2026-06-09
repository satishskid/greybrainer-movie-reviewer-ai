export interface KnowledgeChunk {
  chunkIndex: number;
  contentMarkdown: string;
  heading: string | null;
  metadata: unknown;
  tokenEstimate: number;
}

export interface ParsedMediumArticle {
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

function extractMetaContent(html: string, attribute: string, value: string) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]*${attribute}=["']${escapedValue}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${escapedValue}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeXmlEntities(match[1].trim());
    }
  }

  return null;
}

function extractTagInnerHtml(html: string, tagName: string) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match?.[1]?.trim() ?? null;
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

export function decodeXmlEntities(input: string) {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function htmlToMarkdown(html: string) {
  return decodeXmlEntities(
    html
      .replace(/<img[^>]*>/gi, "")
      .replace(/<figure[\s\S]*?<\/figure>/gi, "")
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => {
        const heading = stripHtmlToText(content).trim();
        return `\n\n${"#".repeat(Number(level))} ${heading}\n\n`;
      })
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => `- ${stripHtmlToText(content).trim()}\n`)
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => `${stripHtmlToText(content).trim()}\n\n`)
      .replace(/<ol[^>]*>|<\/ol>|<ul[^>]*>|<\/ul>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

export function canonicalizeMediumUrl(url: string) {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

export function articleIdFromValues(guid: string | null, link: string) {
  if (guid) {
    const guidMatch = guid.match(/\/p\/([a-f0-9]+)$/i);
    if (guidMatch) {
      return guidMatch[1];
    }
  }

  const canonical = canonicalizeMediumUrl(link);
  const match = canonical.match(/-([a-f0-9]{8,})$/i);
  if (match) {
    return match[1];
  }

  return crypto.randomUUID().replace(/-/g, "");
}

export async function hashString(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function estimateTokens(content: string) {
  return Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length * 1.3));
}

export function chunkMarkdown(markdown: string, metadata: { articleId: string; canonicalUrl: string; title: string }) {
  const lines = markdown.split("\n");
  const chunks: KnowledgeChunk[] = [];

  let currentHeading: string | null = null;
  let currentLines: string[] = [];
  let chunkIndex = 0;

  const pushChunk = () => {
    const contentMarkdown = currentLines.join("\n").trim();
    if (!contentMarkdown) {
      return;
    }

    chunks.push({
      chunkIndex,
      contentMarkdown,
      heading: currentHeading,
      metadata: {
        ...metadata,
        heading: currentHeading,
      },
      tokenEstimate: estimateTokens(contentMarkdown),
    });
    chunkIndex += 1;
  };

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line.trim())) {
      pushChunk();
      currentHeading = line.replace(/^#{1,6}\s+/, "").trim();
      currentLines = [line];
      continue;
    }

    currentLines.push(line);
  }

  pushChunk();

  if (chunks.length === 0 && markdown.trim()) {
    chunks.push({
      chunkIndex: 0,
      contentMarkdown: markdown.trim(),
      heading: metadata.title,
      metadata,
      tokenEstimate: estimateTokens(markdown),
    });
  }

  return chunks;
}

export async function fetchMediumArticleByUrl(articleUrl: string): Promise<ParsedMediumArticle> {
  const canonicalUrl = canonicalizeMediumUrl(articleUrl);
  const response = await fetch(canonicalUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Medium article fetch failed with ${response.status}.`);
  }

  const html = await response.text();
  if (/Just a moment/i.test(html) || /Enable JavaScript and cookies to continue/i.test(html)) {
    throw new Error("Medium blocked the article fetch with an anti-bot challenge.");
  }

  const articleHtml = extractTagInnerHtml(html, "article") ?? html;
  const title =
    extractMetaContent(html, "property", "og:title") ??
    extractMetaContent(html, "name", "twitter:title") ??
    stripHtmlToText(extractTagInnerHtml(html, "title") ?? "") ??
    "Untitled";
  const markdownContent = htmlToMarkdown(articleHtml);

  if (markdownContent.trim().length < 120) {
    throw new Error("Medium article content could not be extracted cleanly from the page.");
  }

  return {
    articleId: articleIdFromValues(null, canonicalUrl),
    authorName: extractMetaContent(html, "name", "author"),
    canonicalUrl,
    externalId: canonicalUrl,
    htmlContent: articleHtml,
    markdownContent,
    publishedAt: extractMetaContent(html, "property", "article:published_time"),
    rawPayload: {
      fetchedFromUrl: canonicalUrl,
      htmlLength: articleHtml.length,
      pageTitle: title,
    },
    sourceAccount: "@GreyBrainer",
    sourceType: "medium",
    summary: extractMetaContent(html, "property", "og:description"),
    tags: [],
    title,
    updatedAt: extractMetaContent(html, "property", "article:modified_time"),
  };
}
