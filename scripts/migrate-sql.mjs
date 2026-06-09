import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

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

async function loadConfig() {
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
    throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN. Add them to .dev.vars or your shell.");
  }

  return {
    authToken: env.TURSO_AUTH_TOKEN,
    url: env.TURSO_DATABASE_URL,
  };
}

async function main() {
  const schemaArg = process.argv[2];
  if (!schemaArg) {
    throw new Error("Usage: node scripts/migrate-sql.mjs <relative-sql-file>");
  }

  const config = await loadConfig();
  const schemaUrl = new URL(`../${schemaArg}`, import.meta.url);
  const schema = await readFile(schemaUrl, "utf8");
  const statements = schema
    .split(/;\s*\n/g)
    .map((statement) => statement.trim())
    .filter(Boolean);

  const client = createClient(config);
  for (const statement of statements) {
    await client.execute(statement);
  }

  console.log(`Applied ${statements.length} schema statements from ${schemaArg} to ${config.url}.`);
  await client.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
