import { createClient } from "@libsql/client/web";

export interface Env {
  CF_AI_GATEWAY_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_GATEWAY_NAME?: string;
  CF_AI_GATEWAY_TOKEN?: string;
  CONTENT_R2?: R2Bucket;
  KNOWLEDGE_R2?: R2Bucket;
  DRAFT_STORAGE_MODE?: string;
  DAILY_BRIEF_ENABLED?: string;
  DAILY_BRIEF_TIMEZONE?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  KNOWLEDGE_SYNC_BATCH_SIZE?: string;
  KNOWLEDGE_STORAGE_MODE?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  LINKEDIN_OAUTH_SCOPES?: string;
  LINKEDIN_REDIRECT_URI?: string;
  MEDIUM_CLIENT_ID?: string;
  MEDIUM_CLIENT_SECRET?: string;
  MEDIUM_OAUTH_SCOPES?: string;
  MEDIUM_REDIRECT_URI?: string;
  MEDIUM_FEED_URL?: string;
  OMNICHANNEL_API_VERSION?: string;
  SOCIAL_CONNECT_SUCCESS_URL?: string;
  SOCIAL_TOKEN_ENCRYPTION_KEY?: string;
  WEBSITE_BASE_URL?: string;
  TURSO_AUTH_TOKEN: string;
  TURSO_DATABASE_URL: string;
}

export function createDbClient(env: Env) {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}
