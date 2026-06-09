CREATE TABLE IF NOT EXISTS ai_key_runtime_status (
  ai_key_id TEXT PRIMARY KEY,
  status TEXT,
  last_used_at TEXT,
  last_success_at TEXT,
  last_failure_at TEXT,
  last_failure_code TEXT,
  last_failure_reason TEXT,
  last_quota_exhausted_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (ai_key_id) REFERENCES ai_keys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_key_runtime_status_status
  ON ai_key_runtime_status (status, updated_at DESC);
