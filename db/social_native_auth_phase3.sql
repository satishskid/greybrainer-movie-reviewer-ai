-- One-time follow-up migration for native connector auth state and encrypted tokens.
-- Apply this after db/social_channels_phase2.sql.

ALTER TABLE social_accounts ADD COLUMN oauth_state TEXT;
ALTER TABLE social_accounts ADD COLUMN access_token_encrypted TEXT;
ALTER TABLE social_accounts ADD COLUMN refresh_token_encrypted TEXT;
ALTER TABLE social_accounts ADD COLUMN token_expires_at TEXT;
ALTER TABLE social_accounts ADD COLUMN last_test_status TEXT;
ALTER TABLE social_accounts ADD COLUMN last_test_message TEXT;

CREATE INDEX IF NOT EXISTS idx_social_accounts_oauth_state
  ON social_accounts (oauth_state);
