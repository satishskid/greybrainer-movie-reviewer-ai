CREATE TABLE IF NOT EXISTS knowledge_import_jobs (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL DEFAULT 'medium',
  source_url TEXT NOT NULL UNIQUE,
  canonical_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT,
  title TEXT,
  document_id TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_import_jobs_status
  ON knowledge_import_jobs (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_import_jobs_canonical_url
  ON knowledge_import_jobs (canonical_url);
