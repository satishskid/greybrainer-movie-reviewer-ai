ALTER TABLE knowledge_documents ADD COLUMN storage_backend TEXT NOT NULL DEFAULT 'turso';

ALTER TABLE knowledge_documents ADD COLUMN raw_payload_object_key TEXT;

ALTER TABLE knowledge_documents ADD COLUMN html_object_key TEXT;

ALTER TABLE knowledge_documents ADD COLUMN markdown_object_key TEXT;

ALTER TABLE knowledge_documents ADD COLUMN chunk_manifest_object_key TEXT;
