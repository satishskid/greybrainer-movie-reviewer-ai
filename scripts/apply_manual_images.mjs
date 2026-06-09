import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
};
const hasFlag = (flag) => args.includes(flag);

const DEV_VARS_PATH = new URL("../.dev.vars", import.meta.url);
const DEFAULT_MAP_PATH = new URL("../data/manual-image-map.json", import.meta.url);
const dryRun = hasFlag("--dry-run");
const mapPath = getArg("--map") ? new URL(getArg("--map"), `file://${process.cwd()}/`).pathname : DEFAULT_MAP_PATH;

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

function applyImagePayload(payload, imageUrl) {
  const next = payload && typeof payload === "object" ? { ...payload } : {};
  const nested = next.image && typeof next.image === "object" ? { ...next.image } : {};

  next.heroImageUrl = imageUrl;
  next.posterImageUrl = imageUrl;
  next.thumbnailImageUrl = imageUrl;
  next.imageUrl = imageUrl;

  nested.heroUrl = imageUrl;
  nested.posterUrl = imageUrl;
  nested.thumbnailUrl = imageUrl;
  next.image = nested;

  return next;
}

async function main() {
  const env = await loadEnv();
  const mapRaw = await readFile(mapPath, "utf8");
  const urlMap = JSON.parse(mapRaw);
  const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

  let updated = 0;
  let missing = 0;

  for (const [canonicalUrl, imageUrl] of Object.entries(urlMap)) {
    const result = await client.execute({
      sql: `
        SELECT
          cp.external_url,
          COALESCE(cp.version_id, d.current_version_id) AS version_id,
          dv.source_payload_json
        FROM channel_publications cp
        JOIN drafts d ON d.id = cp.draft_id
        LEFT JOIN draft_versions dv ON dv.id = COALESCE(cp.version_id, d.current_version_id)
        WHERE cp.channel = 'website' AND cp.status = 'published' AND cp.external_url = ?
      `,
      args: [canonicalUrl],
    });

    if (!result.rows.length) {
      missing += 1;
      console.log(`No publication found for ${canonicalUrl}`);
      continue;
    }

    for (const row of result.rows) {
      const versionId = row.version_id ? String(row.version_id) : null;
      if (!versionId) continue;
      const payload = row.source_payload_json ? JSON.parse(String(row.source_payload_json)) : {};
      const nextPayload = applyImagePayload(payload, imageUrl);
      if (!dryRun) {
        await client.execute({
          sql: "UPDATE draft_versions SET source_payload_json = ? WHERE id = ?",
          args: [JSON.stringify(nextPayload), versionId],
        });
      }
      updated += 1;
      console.log(`${dryRun ? "Would update" : "Updated"} ${canonicalUrl} -> ${imageUrl}`);
    }
  }

  await client.close();
  console.log(`${dryRun ? "Dry run" : "Update complete"}: ${updated} updated, ${missing} missing.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
