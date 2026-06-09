import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
};
const hasFlag = (flag) => args.includes(flag);

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
const DEV_VARS_PATH = new URL("../.dev.vars", import.meta.url);

const limit = Number(getArg("--limit") ?? "200");
const delayMs = Number(getArg("--delay") ?? "250");
const dryRun = hasFlag("--dry-run");
const force = hasFlag("--force");
const verbose = hasFlag("--verbose");
const sourceFilePath = getArg("--source-file");
const sourceFetch = hasFlag("--source-fetch");

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
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .dev.vars or environment.");
  }
  return env;
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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

function extractMetaTitle(html) {
  const metaMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (metaMatch?.[1]) return decodeHtmlEntities(metaMatch[1]).trim();
  const nameMatch = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
  if (nameMatch?.[1]) return decodeHtmlEntities(nameMatch[1]).trim();
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) return decodeHtmlEntities(titleMatch[1]).trim();
  return null;
}

function extractJsonLdTitle(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const headline = node.headline || node.name || node.title;
        if (typeof headline === "string" && headline.trim()) {
          return decodeHtmlEntities(headline).trim();
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function loadSourceUrlMap() {
  if (!sourceFilePath) return new Map();
  const content = await readFile(sourceFilePath, "utf8");
  const map = new Map();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const table = parseMarkdownTableLine(trimmed);
    if (table?.title && table.url) {
      map.set(normalizeTitle(table.title), table.url);
      continue;
    }
    const match = trimmed.match(/^(https?:\/\/\S+)/i);
    if (match?.[1]) {
      const url = match[1];
      const remainder = trimmed.replace(match[1], "").trim();
      if (remainder) {
        map.set(normalizeTitle(remainder), url);
        continue;
      }
      if (sourceFetch) {
        const html = await fetchHtml(url);
        if (html) {
          const title = extractMetaTitle(html) || extractJsonLdTitle(html);
          if (title) {
            map.set(normalizeTitle(title), url);
            continue;
          }
        }
      }
      map.set(normalizeTitle(url), url);
    }
  }
  return map;
}

function parseMetaTags(html) {
  const tags = [];
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const raw = match[0];
    const attrs = {};
    for (const attr of raw.matchAll(/([a-zA-Z:_-]+)\s*=\s*["']([^"']+)["']/g)) {
      attrs[attr[1].toLowerCase()] = attr[2];
    }
    tags.push(attrs);
  }
  return tags;
}

function isLikelyImageUrl(url) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  if (!/^https?:\/\//i.test(url)) return false;
  if (/favicon|apple-touch-icon|sprite|icon/i.test(url)) return false;
  const resizeMatch = url.match(/miro\.medium\.com\/v2\/resize:fill:(\d+)/i);
  if (resizeMatch?.[1]) {
    const size = Number(resizeMatch[1]);
    if (Number.isFinite(size) && size < 200) {
      return false;
    }
  }
  if (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)) return true;
  if (/cdn-images-1\.medium\.com|miro\.medium\.com|static\.licdn\.com|media\.licdn\.com/i.test(url)) return true;
  return true;
}

function decodeHtmlEntities(value) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'");
}

function normalizeUrl(candidate, baseUrl) {
  if (!candidate) return null;
  try {
    return new URL(decodeHtmlEntities(candidate), baseUrl).toString();
  } catch {
    return null;
  }
}

function pickMetaImage(html, pageUrl) {
  const tags = parseMetaTags(html);
  const candidates = [];
  for (const tag of tags) {
    const property = tag.property ?? tag.name ?? "";
    const content = tag.content ?? "";
    if (!content) continue;
    const key = property.toLowerCase();
    if (
      key === "og:image" ||
      key === "og:image:url" ||
      key === "og:image:secure_url" ||
      key === "twitter:image" ||
      key === "twitter:image:src"
    ) {
      const normalized = normalizeUrl(content, pageUrl);
      if (normalized) candidates.push(normalized);
    }
  }
  return candidates.find((url) => isLikelyImageUrl(url)) ?? null;
}

function extractJsonLdImage(html, pageUrl) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const image = node.image ?? node.thumbnailUrl ?? node.thumbnailURL;
        if (typeof image === "string") {
          const normalized = normalizeUrl(image, pageUrl);
          if (normalized && isLikelyImageUrl(normalized)) return normalized;
        }
        if (Array.isArray(image)) {
          for (const entry of image) {
            if (typeof entry === "string") {
              const normalized = normalizeUrl(entry, pageUrl);
              if (normalized && isLikelyImageUrl(normalized)) return normalized;
            } else if (entry && typeof entry === "object" && typeof entry.url === "string") {
              const normalized = normalizeUrl(entry.url, pageUrl);
              if (normalized && isLikelyImageUrl(normalized)) return normalized;
            }
          }
        }
        if (image && typeof image === "object" && typeof image.url === "string") {
          const normalized = normalizeUrl(image.url, pageUrl);
          if (normalized && isLikelyImageUrl(normalized)) return normalized;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function pickHtmlImage(html, pageUrl) {
  const matches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const candidate of matches) {
    const normalized = normalizeUrl(candidate, pageUrl);
    if (normalized && isLikelyImageUrl(normalized)) {
      return normalized;
    }
  }
  return null;
}

function pickMarkdownImage(markdown) {
  if (!markdown) return null;
  const matches = [...markdown.matchAll(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/gi)].map((match) => match[1]);
  for (const candidate of matches) {
    if (isLikelyImageUrl(candidate)) return candidate;
  }
  return null;
}

function getExistingImage(payload) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload;
  const nested = record.image && typeof record.image === "object" ? record.image : {};
  const candidate =
    record.heroImageUrl ||
    record.posterImageUrl ||
    record.thumbnailImageUrl ||
    record.imageUrl ||
    nested.heroUrl ||
    nested.posterUrl ||
    nested.thumbnailUrl ||
    null;
  if (!candidate) return null;
  return isLikelyImageUrl(candidate) ? candidate : null;
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, { headers: { "user-agent": DEFAULT_UA } });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // fall through to Jina
  }
  try {
    const clean = url.replace(/^https?:\/\//, "");
    const response = await fetch(`https://r.jina.ai/http://${clean}`, { headers: { "user-agent": DEFAULT_UA } });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    return null;
  }
  return null;
}

function applyImagePayload(payload, imageUrl, forceUpdate) {
  const next = payload && typeof payload === "object" ? { ...payload } : {};
  const nested = next.image && typeof next.image === "object" ? { ...next.image } : {};

  if (forceUpdate || !next.heroImageUrl) next.heroImageUrl = imageUrl;
  if (forceUpdate || !next.posterImageUrl) next.posterImageUrl = imageUrl;
  if (forceUpdate || !next.thumbnailImageUrl) next.thumbnailImageUrl = imageUrl;
  if (forceUpdate || !next.imageUrl) next.imageUrl = imageUrl;

  if (forceUpdate || !nested.heroUrl) nested.heroUrl = imageUrl;
  if (forceUpdate || !nested.posterUrl) nested.posterUrl = imageUrl;
  if (forceUpdate || !nested.thumbnailUrl) nested.thumbnailUrl = imageUrl;
  next.image = nested;

  return next;
}

async function main() {
  const env = await loadEnv();
  const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  const sourceUrlMap = await loadSourceUrlMap();

  const result = await client.execute({
    sql: `
      SELECT
        cp.external_url,
        cp.external_id,
        cp.draft_id,
        COALESCE(cp.version_id, d.current_version_id) AS version_id,
        dv.source_payload_json,
        dv.blog_markdown,
        d.subject_title
      FROM channel_publications cp
      JOIN drafts d ON d.id = cp.draft_id
      LEFT JOIN draft_versions dv ON dv.id = COALESCE(cp.version_id, d.current_version_id)
      WHERE cp.channel = 'website' AND cp.status = 'published'
      ORDER BY cp.published_at DESC, cp.updated_at DESC
      LIMIT ?
    `,
    args: [Number.isFinite(limit) ? limit : 200],
  });

  let updated = 0;
  let skipped = 0;
  let alreadyPresent = 0;
  let noCandidate = 0;

  for (const row of result.rows) {
    const versionId = row.version_id ? String(row.version_id) : null;
    const canonicalUrl = row.external_url ? String(row.external_url) : null;
    const subjectTitle = row.subject_title ? String(row.subject_title) : "";
    const sourcePayloadRaw = row.source_payload_json ? String(row.source_payload_json) : "{}";
    const blogMarkdown = row.blog_markdown ? String(row.blog_markdown) : "";

    if (!versionId || !canonicalUrl) {
      skipped += 1;
      continue;
    }

    const sourcePayload = JSON.parse(sourcePayloadRaw);
    const sourceUrl =
      typeof sourcePayload.sourceUrl === "string"
        ? sourcePayload.sourceUrl
        : typeof sourcePayload.originUrl === "string"
          ? sourcePayload.originUrl
          : typeof sourcePayload.canonicalUrl === "string"
            ? sourcePayload.canonicalUrl
            : null;
    const mappedUrl = subjectTitle ? sourceUrlMap.get(normalizeTitle(subjectTitle)) ?? null : null;
    const existingImage = getExistingImage(sourcePayload);
    if (existingImage && !force) {
      skipped += 1;
      alreadyPresent += 1;
      continue;
    }

    const markdownImage = pickMarkdownImage(blogMarkdown);
    let candidate = null;

    const fetchTarget = sourceUrl || mappedUrl || canonicalUrl;
    if (fetchTarget) {
      const html = await fetchHtml(fetchTarget);
      if (html) {
        candidate =
          pickMetaImage(html, fetchTarget) ||
          extractJsonLdImage(html, fetchTarget) ||
          pickHtmlImage(html, fetchTarget);
      }
    }

    if (!candidate) {
      candidate = markdownImage;
    }

    if (!candidate) {
      skipped += 1;
      noCandidate += 1;
      if (verbose) {
        console.log(`No image found for ${canonicalUrl}`);
      }
      continue;
    }

    const nextPayload = applyImagePayload(sourcePayload, candidate, force);
    if (dryRun) {
      updated += 1;
    } else {
      await client.execute({
        sql: "UPDATE draft_versions SET source_payload_json = ? WHERE id = ?",
        args: [JSON.stringify(nextPayload), versionId],
      });
      updated += 1;
    }

    if (verbose) {
      console.log(`Updated ${canonicalUrl} -> ${candidate}`);
    }

    await sleep(delayMs);
  }

  await client.close();
  console.log(
    `${dryRun ? "Dry run" : "Update complete"}: ${updated} updated, ${skipped} skipped (limit ${limit}).`,
  );
  console.log(`Details: ${alreadyPresent} already had images, ${noCandidate} had no candidates.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
