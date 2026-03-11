-- One-time follow-up migration for social channel onboarding.
-- Apply this after db/schema.sql has already created the base Phase 1 tables.

CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  platform TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  handle TEXT,
  display_name TEXT,
  connection_status TEXT NOT NULL DEFAULT 'pending_connection',
  provider TEXT NOT NULL DEFAULT 'native-generic',
  provider_profile_id TEXT,
  provider_user_id TEXT,
  is_default_publish_target INTEGER NOT NULL DEFAULT 0,
  last_verified_at TEXT,
  connected_at TEXT,
  disabled_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_platform_url
  ON social_accounts (platform, normalized_url);

CREATE INDEX IF NOT EXISTS idx_social_accounts_status_updated_at
  ON social_accounts (connection_status, updated_at DESC);

ALTER TABLE channel_publications ADD COLUMN social_account_id TEXT;
ALTER TABLE channel_publications ADD COLUMN provider TEXT;
ALTER TABLE channel_publications ADD COLUMN provider_post_id TEXT;
ALTER TABLE channel_publications ADD COLUMN scheduled_for TEXT;
ALTER TABLE channel_publications ADD COLUMN analytics_json TEXT;
ALTER TABLE channel_publications ADD COLUMN last_synced_at TEXT;

CREATE INDEX IF NOT EXISTS idx_channel_publications_social_account
  ON channel_publications (social_account_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS publication_events (
  id TEXT PRIMARY KEY,
  publication_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publication_id) REFERENCES channel_publications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_publication_events_publication_created_at
  ON publication_events (publication_id, created_at DESC);
