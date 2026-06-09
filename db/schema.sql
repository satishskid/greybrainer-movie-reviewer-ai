CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL DEFAULT 'movie',
  subject_title TEXT NOT NULL,
  review_stage TEXT,
  status TEXT NOT NULL DEFAULT 'generated',
  created_by TEXT,
  current_version_id TEXT,
  latest_version_no INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  website_url TEXT,
  medium_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drafts_status_updated_at
  ON drafts (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS draft_versions (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  source_payload_json TEXT NOT NULL,
  analysis_json TEXT,
  blog_markdown TEXT NOT NULL,
  socials_json TEXT,
  video_json TEXT,
  editor_notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_versions_draft_version
  ON draft_versions (draft_id, version_no);

CREATE TABLE IF NOT EXISTS channel_publications (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  version_id TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  external_url TEXT,
  payload_json TEXT,
  error_message TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES draft_versions(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_publications_draft_channel
  ON channel_publications (draft_id, channel);
