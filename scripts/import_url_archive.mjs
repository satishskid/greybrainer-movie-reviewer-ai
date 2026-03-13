import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
};

const hasFlag = (flag) => args.includes(flag);

const DEFAULT_API_BASE = "https://greybrainer-omnichannel-api.satish-9f4.workers.dev/api";
const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
const DEV_VARS_PATH = new URL("../.dev.vars", import.meta.url);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleCase(input) {
  return input
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ")
    .trim();
}

function fallbackTitleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split("/").filter(Boolean).pop() ?? "untitled";
    const cleaned = slug.replace(/-[a-f0-9]{8,}$/i, "").replace(/-/g, " ").trim();
    return cleaned ? titleCase(cleaned) : "Untitled";
  } catch {
    return "Untitled";
  }
}

function parseMarkdownTableLine(line) {
  if (!line.includes("|")) return null;
  const cells = line
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
  if (cells.length < 2) return null;
  const urlCell = cells.find((cell) => cell.startsWith("http"));
  if (!urlCell) return null;
  const titleCell = cells.find((cell) => cell !== urlCell && cell !== "#" && !/^\d+$/.test(cell));
  return { title: titleCell ?? null, url: urlCell };
}

function extractUrls(text) {
  const results = [];
  const seen = new Set();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const table = parseMarkdownTableLine(trimmed);
    if (table) {
      if (!seen.has(table.url)) {
        seen.add(table.url);
        results.push(table);
      }
      continue;
    }

    const urlMatch = trimmed.match(/https?:\/\/\S+/g);
    if (urlMatch) {
      for (const url of urlMatch) {
        if (seen.has(url)) continue;
        seen.add(url);
        results.push({ url, title: null });
      }
    }
  }

  return results;
}

async function resolveShortUrl(url) {
  if (!/lnkd\.in/i.test(url)) {
    return url;
  }
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": DEFAULT_UA },
    });
    if (response.url && !/lnkd\.in/i.test(response.url) && response.url !== "https://www.linkedin.com/") {
      return response.url;
    }
    const text = await response.text();
    const metaMatch = text.match(/url=([^"'>\s]+)/i);
    if (metaMatch?.[1]) {
      const resolved = metaMatch[1].replace(/&amp;/g, "&");
      if (resolved !== "https://www.linkedin.com/") {
        return resolved;
      }
    }
    const hrefMatch = text.match(/https?:\/\/[^"']+/i);
    if (hrefMatch?.[0] && !/lnkd\.in/i.test(hrefMatch[0])) {
      if (hrefMatch[0] !== "https://www.linkedin.com/") {
        return hrefMatch[0];
      }
    }
    return response.url || url;
  } catch {
    return url;
  }
}

function extractFirstImage(markdown) {
  const imageMatches = [...markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi)].map((match) => match[1]);
  const preferredImage = imageMatches.find((candidate) =>
    /licdn|cdn-images-1\.medium\.com/i.test(candidate) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(candidate),
  );
  if (preferredImage) return preferredImage;

  const urlMatch = markdown.match(/https?:\/\/[^)\s]+/g);
  if (!urlMatch) return null;
  const preferred = urlMatch.find((candidate) =>
    /licdn|cdn-images-1\.medium\.com/i.test(candidate) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(candidate),
  );
  return preferred ?? null;
}

function parseJinaMarkdown(raw, fallbackTitle) {
  const titleMatch = raw.match(/^\s*Title:\s*(.+)$/im);
  let title = titleMatch?.[1]?.trim() || fallbackTitle || "Untitled";
  if (/^medium$/i.test(title) || /^linkedin$/i.test(title) || /just a moment/i.test(title)) {
    title = fallbackTitle || "Untitled";
  }
  const marker = "Markdown Content:";
  const index = raw.indexOf(marker);
  let markdown = index >= 0 ? raw.slice(index + marker.length).trim() : raw.trim();
  markdown = markdown
    .split("\n")
    .filter((line) => !line.startsWith("Warning:") && !line.startsWith("URL Source:"))
    .join("\n")
    .trim();
  return { title, markdown };
}

function inferContentType(title) {
  const lowered = title.toLowerCase();
  if (/(brief|morning|weekend|must-watch|list)/i.test(lowered)) {
    return { subjectType: "daily-brief", reviewStage: "Daily Brief", contentType: "brief" };
  }
  if (/(trend|shift|study|research|analysis|screen mood|landscape|pulse)/i.test(lowered)) {
    return { subjectType: "research", reviewStage: "Research Study", contentType: "study" };
  }
  return { subjectType: "movie", reviewStage: "Full Movie/Series Review", contentType: "review" };
}

async function fetchViaJina(url) {
  const clean = url.replace(/^https?:\/\//, "");
  const jinaUrl = `https://r.jina.ai/http://${clean}`;
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(jinaUrl, { headers: { "user-agent": DEFAULT_UA } });
    if (response.ok) {
      const text = await response.text();
      if (/Just a moment|security verification|captcha/i.test(text)) {
        lastError = new Error("Jina mirror blocked by anti-bot.");
      } else {
        return text;
      }
    } else {
      lastError = new Error(`Jina fetch failed (${response.status})`);
    }
    await sleep(1500 * (attempt + 1));
  }
  throw lastError ?? new Error("Jina fetch failed.");
}

async function main() {
  const filePath = getArg("--file");
  if (!filePath) {
    console.error("Usage: node scripts/import_url_archive.mjs --file /path/to/urls.txt [--dry-run] [--ingest-knowledge]");
    process.exit(1);
  }

  const env = await loadEnv();
  const apiBase = getArg("--api") ?? env.OMNICHANNEL_API_BASE ?? DEFAULT_API_BASE;
  const dryRun = hasFlag("--dry-run");
  const skipKnowledge = !hasFlag("--ingest-knowledge");
  const delayMs = Number(getArg("--delay") ?? "0");
  const raw = await readFile(filePath, "utf8");
  const domainFilter = getArg("--domain");
  const domains = domainFilter
    ? domainFilter
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : null;
  const entries = extractUrls(raw).filter((entry) =>
    domains ? domains.some((domain) => entry.url.includes(domain)) : true,
  );

  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .dev.vars or environment.");
  }

  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

  const existingRows = await client.execute({
    sql: "SELECT subject_title FROM drafts",
    args: [],
  });
  const existingTitles = new Set(
    existingRows.rows
      .map((row) => (row.subject_title ? normalizeTitle(String(row.subject_title)) : null))
      .filter(Boolean),
  );

  const results = [];

  for (const entry of entries) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }
    const resolved = await resolveShortUrl(entry.url);
    try {
      const parsed = new URL(resolved);
      if (parsed.hostname.includes("linkedin.com")) {
        if (parsed.pathname === "/") {
          results.push({ url: resolved, status: "failed", reason: "Short link resolved to LinkedIn login page." });
          continue;
        }
        if (!parsed.pathname.startsWith("/pulse/")) {
          results.push({ url: resolved, status: "skipped", reason: "Non-article LinkedIn URL (requires auth or not content)." });
          continue;
        }
      }
      if (parsed.hostname === "www.linkedin.com" && parsed.pathname === "/") {
        results.push({ url: resolved, status: "failed", reason: "Short link resolved to LinkedIn login page." });
        continue;
      }
    } catch {
      // ignore
    }
    const text = await fetchViaJina(resolved).catch((error) => {
      results.push({ url: resolved, status: "failed", reason: error instanceof Error ? error.message : "Fetch failed" });
      return null;
    });
    if (!text) continue;

    const parsed = parseJinaMarkdown(text, entry.title);
    let title = parsed.title;
    if (!title || /^untitled$/i.test(title)) {
      title = entry.title ?? fallbackTitleFromUrl(resolved);
    }
    const normalizedTitle = normalizeTitle(title);
    if (existingTitles.has(normalizedTitle)) {
      results.push({ url: resolved, title, status: "skipped", reason: "already imported" });
      continue;
    }

    let markdown = parsed.markdown;
    if (!markdown.startsWith("# ")) {
      markdown = `# ${title}\n\n${markdown}`.trim();
    }

    if (markdown.length < 240) {
      results.push({ url: resolved, title, status: "failed", reason: "content too short" });
      continue;
    }

    const imageUrl = extractFirstImage(markdown);
    const { subjectType, reviewStage } = inferContentType(title);
    const seoDescription = markdown
      .split(/\n{2,}/)
      .map((block) => block.replace(/^#{1,6}\s+/, "").trim())
      .find((block) => block.length > 40)
      ?.slice(0, 240);

    const payload = {
      subjectTitle: title,
      subjectType,
      reviewStage,
      status: "approved",
      createdBy: "system:archive-import",
      seoTitle: title,
      seoDescription: seoDescription ?? null,
      sourcePayload: {
        title,
        sourceUrl: resolved,
        sourceType: "archive-import",
        tags: ["archive", "linkedin", "greybrainer"],
        heroImageUrl: imageUrl,
        posterImageUrl: imageUrl,
        thumbnailImageUrl: imageUrl,
      },
      version: {
        blogMarkdown: markdown,
        analysis: null,
        sourcePayload: {
          title,
          sourceUrl: resolved,
          sourceType: "archive-import",
          tags: ["archive", "linkedin", "greybrainer"],
          heroImageUrl: imageUrl,
          posterImageUrl: imageUrl,
          thumbnailImageUrl: imageUrl,
        },
        createdBy: "system:archive-import",
      },
    };

    if (dryRun) {
      results.push({ url: resolved, title, status: "dry-run", imageUrl });
      continue;
    }

    const createResponse = await fetch(`${apiBase}/drafts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      results.push({ url: resolved, title, status: "failed", reason: `create ${createResponse.status}: ${errorText}` });
      continue;
    }

    const created = await createResponse.json();
    const draftId = created?.draft?.id;

    const publishResponse = await fetch(`${apiBase}/drafts/${draftId}/publish-website`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestedBy: "system:archive-import", skipKnowledge }),
    });

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      results.push({ url: resolved, title, status: "failed", reason: `publish ${publishResponse.status}: ${errorText}` });
      continue;
    }

    const published = await publishResponse.json();
    results.push({ url: resolved, title, status: "published", websiteUrl: published?.canonicalUrl, imageUrl });
    existingTitles.add(normalizedTitle);
  }

  await client.close();
  console.log(JSON.stringify({ total: entries.length, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
