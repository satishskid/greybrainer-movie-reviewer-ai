import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
};

const hasFlag = (flag) => args.includes(flag);

const DEFAULT_FEED_URL = "https://medium.com/feed/@GreyBrainer";
const DEFAULT_API_BASE = "https://greybrainer-omnichannel-api.satish-9f4.workers.dev/api";

const DEV_VARS_PATH = new URL("../.dev.vars", import.meta.url);

function parseEnvFile(source) {
  const env = {};
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value;
  }
  return env;
}

async function loadEnv() {
  const env = { ...process.env };
  try {
    const file = await readFile(DEV_VARS_PATH, "utf8");
    Object.assign(env, parseEnvFile(file));
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
  return env;
}

function decodeXmlEntities(input) {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractTagValue(source, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i");
  const match = source.match(pattern);
  if (!match) return null;
  const value = match[1].trim();
  const cdataMatch = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeXmlEntities(cdataMatch ? cdataMatch[1] : value);
}

function extractTagValues(source, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "gi");
  const values = [];
  let match;
  while ((match = pattern.exec(source))) {
    const value = match[1].trim();
    const cdataMatch = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
    values.push(decodeXmlEntities((cdataMatch ? cdataMatch[1] : value).trim()));
  }
  return values;
}

function stripHtmlToText(html) {
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

function htmlToMarkdown(html) {
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

function parseRssItems(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.map((itemXml) => {
    const title = extractTagValue(itemXml, "title") ?? "Untitled";
    const link = extractTagValue(itemXml, "link");
    if (!link) {
      throw new Error("Feed item missing link.");
    }
    const canonicalUrl = new URL(link.split("?")[0]).toString();
    const htmlContent = extractTagValue(itemXml, "content:encoded") ?? "";
    const markdownContent = htmlToMarkdown(htmlContent);
    const summary = markdownContent.split("\n\n").find((section) => section.trim().length > 40) ?? null;
    return {
      title,
      canonicalUrl,
      htmlContent,
      markdownContent,
      summary,
      tags: extractTagValues(itemXml, "category"),
    };
  });
}

function extractFirstImageUrl(html) {
  const imgTags = html.match(/<img[^>]*>/gi) ?? [];
  for (const tag of imgTags) {
    const srcMatch = tag.match(/\s(?:src|data-src)=["']([^"']+)["']/i);
    if (srcMatch?.[1]) {
      return decodeXmlEntities(srcMatch[1]);
    }
    const srcsetMatch = tag.match(/\ssrcset=["']([^"']+)["']/i);
    if (srcsetMatch?.[1]) {
      const first = srcsetMatch[1].split(",")[0]?.trim().split(/\s+/)[0];
      if (first) return decodeXmlEntities(first);
    }
  }
  return null;
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function inferContentType(title, tags) {
  const loweredTitle = title.toLowerCase();
  const loweredTags = tags.map((tag) => tag.toLowerCase());
  if (loweredTags.some((tag) => tag.includes("brief") || tag.includes("daily"))) {
    return { subjectType: "daily-brief", reviewStage: "Daily Brief" };
  }
  if (
    loweredTitle.includes("study") ||
    loweredTitle.includes("research") ||
    loweredTitle.includes("trend") ||
    loweredTags.some((tag) => tag.includes("research") || tag.includes("trend") || tag.includes("industry"))
  ) {
    return { subjectType: "research", reviewStage: "Research Study" };
  }
  return { subjectType: "movie", reviewStage: "Full Movie/Series Review" };
}

async function main() {
  const env = await loadEnv();
  const apiBase = getArg("--api") ?? env.OMNICHANNEL_API_BASE ?? DEFAULT_API_BASE;
  const feedUrl = getArg("--feed") ?? env.MEDIUM_FEED_URL ?? DEFAULT_FEED_URL;
  const limitArg = Number(getArg("--limit") ?? "0");
  const offset = Number(getArg("--offset") ?? "0");
  const limit = Number.isFinite(limitArg) ? limitArg : 0;
  const dryRun = hasFlag("--dry-run");
  const skipKnowledge = !hasFlag("--ingest-knowledge");

  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .dev.vars or environment.");
  }

  const response = await fetch(feedUrl, {
    headers: { accept: "application/rss+xml, application/xml, text/xml" },
  });
  if (!response.ok) {
    throw new Error(`Feed fetch failed: ${response.status}`);
  }
  const xml = await response.text();
  const items = parseRssItems(xml);
  const selected = items.slice(offset, limit > 0 ? offset + limit : undefined);

  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

  const existingRows = await client.execute({
    sql: "SELECT subject_title, medium_url FROM drafts",
    args: [],
  });
  const existingMediumUrls = new Set(
    existingRows.rows
      .map((row) => (row.medium_url ? String(row.medium_url) : null))
      .filter(Boolean),
  );
  const existingTitles = new Set(
    existingRows.rows
      .map((row) => (row.subject_title ? normalizeTitle(String(row.subject_title)) : null))
      .filter(Boolean),
  );

  const results = [];

  for (const item of selected) {
    const normalizedTitle = normalizeTitle(item.title);
    if (existingMediumUrls.has(item.canonicalUrl) || existingTitles.has(normalizedTitle)) {
      results.push({ title: item.title, status: "skipped", reason: "already imported" });
      continue;
    }

    const imageUrl = extractFirstImageUrl(item.htmlContent);
    const { subjectType, reviewStage } = inferContentType(item.title, item.tags);
    const blogMarkdown = `# ${item.title}\n\n${item.markdownContent}`.trim();
    const seoDescription = item.summary?.split(/\n/)[0]?.slice(0, 240) ?? null;

    const payload = {
      subjectTitle: item.title,
      subjectType,
      reviewStage,
      status: "approved",
      createdBy: "system:medium-import",
      seoTitle: item.title,
      seoDescription,
      sourcePayload: {
        title: item.title,
        tags: item.tags,
        heroImageUrl: imageUrl,
        posterImageUrl: imageUrl,
        thumbnailImageUrl: imageUrl,
      },
      version: {
        blogMarkdown,
        analysis: null,
        sourcePayload: {
          title: item.title,
          tags: item.tags,
          heroImageUrl: imageUrl,
          posterImageUrl: imageUrl,
          thumbnailImageUrl: imageUrl,
        },
        createdBy: "system:medium-import",
      },
    };

    if (dryRun) {
      results.push({ title: item.title, status: "dry-run", imageUrl });
      continue;
    }

    const createResponse = await fetch(`${apiBase}/drafts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!createResponse.ok) {
      const text = await createResponse.text();
      results.push({ title: item.title, status: "failed", reason: `create ${createResponse.status}: ${text}` });
      continue;
    }

    const created = await createResponse.json();
    const draftId = created?.draft?.id;

    if (draftId) {
      await fetch(`${apiBase}/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediumUrl: item.canonicalUrl }),
      });

      const publishResponse = await fetch(`${apiBase}/drafts/${draftId}/publish-website`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestedBy: "system:medium-import", skipKnowledge }),
      });

      if (!publishResponse.ok) {
        const text = await publishResponse.text();
        results.push({ title: item.title, status: "failed", reason: `publish ${publishResponse.status}: ${text}` });
        continue;
      }

      const published = await publishResponse.json();
      results.push({ title: item.title, status: "published", websiteUrl: published?.canonicalUrl, imageUrl });
      existingMediumUrls.add(item.canonicalUrl);
      existingTitles.add(normalizedTitle);
    }
  }

  await client.close();

  console.log(JSON.stringify({ feedUrl, total: selected.length, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
