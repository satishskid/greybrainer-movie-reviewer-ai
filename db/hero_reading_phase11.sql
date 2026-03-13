-- Phase 11: Daily blog hero priority + reading enhancements
-- Adds hero priority columns so daily briefs float to top of manifest,
-- and keyword/reading metadata for the interlinked reading page.

ALTER TABLE drafts ADD COLUMN is_hero_candidate INTEGER NOT NULL DEFAULT 0;

ALTER TABLE drafts ADD COLUMN hero_priority INTEGER NOT NULL DEFAULT 0;
-- 100 = daily brief (always highest), 50 = featured review, 0 = normal

ALTER TABLE draft_versions ADD COLUMN keywords_json TEXT;
-- JSON array: ["OTT", "Pan-Indian", "Netflix", "Institutional Dissent"]

ALTER TABLE draft_versions ADD COLUMN summary_hook TEXT;
-- One-paragraph gist for the hero card overlay (≤150 chars)

ALTER TABLE draft_versions ADD COLUMN reading_metadata_json TEXT;
-- JSON: { sectionAnchors, relatedSlugs, estimatedReadTime }
