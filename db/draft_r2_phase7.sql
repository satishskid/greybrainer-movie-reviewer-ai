ALTER TABLE draft_versions ADD COLUMN storage_backend TEXT NOT NULL DEFAULT 'turso';

ALTER TABLE draft_versions ADD COLUMN source_payload_object_key TEXT;

ALTER TABLE draft_versions ADD COLUMN analysis_object_key TEXT;

ALTER TABLE draft_versions ADD COLUMN markdown_object_key TEXT;

ALTER TABLE draft_versions ADD COLUMN socials_object_key TEXT;

ALTER TABLE draft_versions ADD COLUMN video_object_key TEXT;
