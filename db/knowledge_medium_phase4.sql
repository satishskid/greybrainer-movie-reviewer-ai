-- One-time follow-up migration for Medium knowledge ingestion.
-- Apply this after the social channel migrations.

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_account TEXT NOT NULL,
  external_id TEXT NOT NULL UNIQUE,
  article_id TEXT NOT NULL,
  title TEXT NOT NULL,
  canonical_url TEXT NOT NULL UNIQUE,
  author_name TEXT,
  published_at TEXT,
  updated_at TEXT,
  summary TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  html_content TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  raw_payload_json TEXT,
  content_hash TEXT NOT NULL,
  ingestion_status TEXT NOT NULL DEFAULT 'ingested',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  last_ingested_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_published_at
  ON knowledge_documents (published_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_account
  ON knowledge_documents (source_type, source_account, published_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  heading TEXT,
  content_markdown TEXT NOT NULL,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_chunks_document_index
  ON knowledge_chunks (document_id, chunk_index);
