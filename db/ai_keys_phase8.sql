CREATE TABLE IF NOT EXISTS ai_keys (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  owner_email TEXT,
  model TEXT,
  key_hint TEXT,
  encrypted_key TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_keys_provider ON ai_keys (provider);
CREATE INDEX IF NOT EXISTS idx_ai_keys_default ON ai_keys (provider, is_default);
