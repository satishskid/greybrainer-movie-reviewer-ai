import type { Client } from "@libsql/client";

let schemaReady: Promise<void> | null = null;

async function applySchema(client: Client) {
  const columns = await client.execute("PRAGMA table_info(social_accounts)");
  const hasPkceVerifier = columns.rows.some(
    (row) => String(row.name ?? "") === "oauth_code_verifier_encrypted",
  );
  if (!hasPkceVerifier) {
    await client.execute(
      "ALTER TABLE social_accounts ADD COLUMN oauth_code_verifier_encrypted TEXT",
    );
  }

  await client.batch(
    [
      {
        sql: `
          CREATE TABLE IF NOT EXISTS publication_jobs (
            id TEXT PRIMARY KEY,
            draft_id TEXT NOT NULL,
            version_id TEXT NOT NULL,
            channel TEXT NOT NULL,
            target_account_id TEXT NOT NULL,
            content_json TEXT NOT NULL,
            media_json TEXT,
            grounding_token_hash TEXT NOT NULL,
            scheduled_at TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            external_id TEXT,
            external_url TEXT,
            error_message TEXT,
            attempt_count INTEGER NOT NULL DEFAULT 0,
            published_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE,
            FOREIGN KEY (version_id) REFERENCES draft_versions(id) ON DELETE CASCADE
          )
        `,
        args: [],
      },
      {
        sql: `
          CREATE INDEX IF NOT EXISTS idx_publication_jobs_due
          ON publication_jobs (status, scheduled_at)
        `,
        args: [],
      },
      {
        sql: `
          CREATE INDEX IF NOT EXISTS idx_publication_jobs_draft_created
          ON publication_jobs (draft_id, created_at DESC)
        `,
        args: [],
      },
    ],
    "write",
  );
}

export async function ensureOmnichannelSchema(client: Client) {
  if (!schemaReady) {
    schemaReady = applySchema(client).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
