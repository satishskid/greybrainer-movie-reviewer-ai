CREATE TABLE IF NOT EXISTS context_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT,
  content TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_context_events_session_created
  ON context_events (session_id, created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS context_events_fts
  USING fts5(event_id UNINDEXED, session_id, content, tokenize = 'porter');
