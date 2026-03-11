import type { Client, Row } from "@libsql/client";
import { resolveNativeConnectorForPlatform } from "./nativeConnectors";

export type DraftStatus =
  | "generated"
  | "editing"
  | "approved"
  | "scheduled"
  | "published"
  | "failed";

export interface DraftVersionInput {
  analysis?: unknown;
  analysisObjectKey?: string | null;
  blogMarkdown: string;
  id?: string;
  markdownObjectKey?: string | null;
  createdBy?: string | null;
  editorNotes?: string | null;
  socials?: unknown;
  socialsObjectKey?: string | null;
  sourcePayload: unknown;
  sourcePayloadObjectKey?: string | null;
  storageBackend?: string;
  video?: unknown;
  videoObjectKey?: string | null;
  versionNo?: number;
}

export interface CreateDraftInput {
  createdBy?: string | null;
  draftId?: string;
  reviewStage?: string | null;
  seoDescription?: string | null;
  seoTitle?: string | null;
  sourcePayload: unknown;
  status?: DraftStatus;
  subjectTitle: string;
  subjectType?: string;
  version: DraftVersionInput;
}

export interface UpdateDraftInput {
  mediumUrl?: string | null;
  reviewStage?: string | null;
  seoDescription?: string | null;
  seoTitle?: string | null;
  status?: DraftStatus;
  subjectTitle?: string;
  websiteUrl?: string | null;
}

export interface PublicationInput {
  channel: string;
  errorMessage?: string | null;
  externalId?: string | null;
  externalUrl?: string | null;
  payload?: unknown;
  publishedAt?: string | null;
  status: string;
  versionId?: string | null;
}

export type SocialConnectionStatus =
  | "discovered"
  | "pending_connection"
  | "connected"
  | "expired"
  | "failed"
  | "disabled";

export interface CreateSocialAccountInput {
  connectorKey?: string | null;
  connectionStatus?: SocialConnectionStatus;
  createdBy?: string | null;
  displayName?: string | null;
  handle?: string | null;
  normalizedUrl: string;
  platform: string;
  profileUrl: string;
}

export interface UpdateSocialAccountInput {
  connectorKey?: string | null;
  connectionStatus?: SocialConnectionStatus;
  connectedAt?: string | null;
  disabledAt?: string | null;
  displayName?: string | null;
  handle?: string | null;
  isDefaultPublishTarget?: boolean;
  lastVerifiedAt?: string | null;
  lastTestMessage?: string | null;
  lastTestStatus?: string | null;
  oauthState?: string | null;
  remoteAccountId?: string | null;
  remoteUserId?: string | null;
  tokenExpiresAt?: string | null;
}

export interface AiKeyRecord {
  createdAt: string;
  id: string;
  isDefault: boolean;
  keyHint: string | null;
  model: string | null;
  ownerEmail: string | null;
  provider: string;
  updatedAt: string;
}

export interface UpsertAiKeyInput {
  encryptedKey: string;
  isDefault?: boolean;
  keyHint?: string | null;
  model?: string | null;
  ownerEmail?: string | null;
  provider?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix: string) {
  const random = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${random}`;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }
  return JSON.parse(value) as T;
}

function rowValue(row: Row, key: string) {
  return row[key] ?? null;
}

function mapDraftRow(row: Row) {
  return {
    createdAt: String(rowValue(row, "created_at")),
    createdBy: rowValue(row, "created_by") ? String(rowValue(row, "created_by")) : null,
    currentVersionId: rowValue(row, "current_version_id") ? String(rowValue(row, "current_version_id")) : null,
    id: String(rowValue(row, "id")),
    latestVersionNo: Number(rowValue(row, "latest_version_no") ?? 0),
    mediumUrl: rowValue(row, "medium_url") ? String(rowValue(row, "medium_url")) : null,
    reviewStage: rowValue(row, "review_stage") ? String(rowValue(row, "review_stage")) : null,
    seoDescription: rowValue(row, "seo_description") ? String(rowValue(row, "seo_description")) : null,
    seoTitle: rowValue(row, "seo_title") ? String(rowValue(row, "seo_title")) : null,
    status: String(rowValue(row, "status")),
    subjectTitle: String(rowValue(row, "subject_title")),
    subjectType: String(rowValue(row, "subject_type")),
    updatedAt: String(rowValue(row, "updated_at")),
    websiteUrl: rowValue(row, "website_url") ? String(rowValue(row, "website_url")) : null,
  };
}

function mapVersionRow(row: Row) {
  return {
    analysis: parseJson(rowValue(row, "analysis_json") ? String(rowValue(row, "analysis_json")) : null),
    analysisObjectKey: rowValue(row, "analysis_object_key") ? String(rowValue(row, "analysis_object_key")) : null,
    blogMarkdown: String(rowValue(row, "blog_markdown")),
    createdAt: String(rowValue(row, "created_at")),
    createdBy: rowValue(row, "created_by") ? String(rowValue(row, "created_by")) : null,
    draftId: String(rowValue(row, "draft_id")),
    editorNotes: rowValue(row, "editor_notes") ? String(rowValue(row, "editor_notes")) : null,
    id: String(rowValue(row, "id")),
    markdownObjectKey: rowValue(row, "markdown_object_key") ? String(rowValue(row, "markdown_object_key")) : null,
    socials: parseJson(rowValue(row, "socials_json") ? String(rowValue(row, "socials_json")) : null),
    socialsObjectKey: rowValue(row, "socials_object_key") ? String(rowValue(row, "socials_object_key")) : null,
    sourcePayload: parseJson(rowValue(row, "source_payload_json") ? String(rowValue(row, "source_payload_json")) : null),
    sourcePayloadObjectKey: rowValue(row, "source_payload_object_key")
      ? String(rowValue(row, "source_payload_object_key"))
      : null,
    storageBackend: rowValue(row, "storage_backend") ? String(rowValue(row, "storage_backend")) : "turso",
    versionNo: Number(rowValue(row, "version_no") ?? 0),
    video: parseJson(rowValue(row, "video_json") ? String(rowValue(row, "video_json")) : null),
    videoObjectKey: rowValue(row, "video_object_key") ? String(rowValue(row, "video_object_key")) : null,
  };
}

function mapPublicationRow(row: Row) {
  return {
    channel: String(rowValue(row, "channel")),
    createdAt: String(rowValue(row, "created_at")),
    draftId: String(rowValue(row, "draft_id")),
    errorMessage: rowValue(row, "error_message") ? String(rowValue(row, "error_message")) : null,
    externalId: rowValue(row, "external_id") ? String(rowValue(row, "external_id")) : null,
    externalUrl: rowValue(row, "external_url") ? String(rowValue(row, "external_url")) : null,
    id: String(rowValue(row, "id")),
    payload: parseJson(rowValue(row, "payload_json") ? String(rowValue(row, "payload_json")) : null),
    publishedAt: rowValue(row, "published_at") ? String(rowValue(row, "published_at")) : null,
    status: String(rowValue(row, "status")),
    updatedAt: String(rowValue(row, "updated_at")),
    versionId: rowValue(row, "version_id") ? String(rowValue(row, "version_id")) : null,
  };
}

function mapSocialAccountRow(row: Row) {
  return {
    connectorKey: rowValue(row, "provider") ? String(rowValue(row, "provider")) : null,
    accessTokenEncrypted: rowValue(row, "access_token_encrypted") ? String(rowValue(row, "access_token_encrypted")) : null,
    connectedAt: rowValue(row, "connected_at") ? String(rowValue(row, "connected_at")) : null,
    connectionStatus: String(rowValue(row, "connection_status")),
    createdAt: String(rowValue(row, "created_at")),
    createdBy: rowValue(row, "created_by") ? String(rowValue(row, "created_by")) : null,
    disabledAt: rowValue(row, "disabled_at") ? String(rowValue(row, "disabled_at")) : null,
    displayName: rowValue(row, "display_name") ? String(rowValue(row, "display_name")) : null,
    handle: rowValue(row, "handle") ? String(rowValue(row, "handle")) : null,
    id: String(rowValue(row, "id")),
    isDefaultPublishTarget: Number(rowValue(row, "is_default_publish_target") ?? 0) === 1,
    lastVerifiedAt: rowValue(row, "last_verified_at") ? String(rowValue(row, "last_verified_at")) : null,
    lastTestMessage: rowValue(row, "last_test_message") ? String(rowValue(row, "last_test_message")) : null,
    lastTestStatus: rowValue(row, "last_test_status") ? String(rowValue(row, "last_test_status")) : null,
    normalizedUrl: String(rowValue(row, "normalized_url")),
    oauthState: rowValue(row, "oauth_state") ? String(rowValue(row, "oauth_state")) : null,
    platform: String(rowValue(row, "platform")),
    profileUrl: String(rowValue(row, "profile_url")),
    refreshTokenEncrypted: rowValue(row, "refresh_token_encrypted") ? String(rowValue(row, "refresh_token_encrypted")) : null,
    remoteAccountId: rowValue(row, "provider_profile_id") ? String(rowValue(row, "provider_profile_id")) : null,
    remoteUserId: rowValue(row, "provider_user_id") ? String(rowValue(row, "provider_user_id")) : null,
    tokenExpiresAt: rowValue(row, "token_expires_at") ? String(rowValue(row, "token_expires_at")) : null,
    updatedAt: String(rowValue(row, "updated_at")),
    workspaceId: rowValue(row, "workspace_id") ? String(rowValue(row, "workspace_id")) : null,
  };
}

function mapAiKeyRow(row: Row): AiKeyRecord {
  return {
    createdAt: String(rowValue(row, "created_at")),
    id: String(rowValue(row, "id")),
    isDefault: Number(rowValue(row, "is_default") ?? 0) === 1,
    keyHint: rowValue(row, "key_hint") ? String(rowValue(row, "key_hint")) : null,
    model: rowValue(row, "model") ? String(rowValue(row, "model")) : null,
    ownerEmail: rowValue(row, "owner_email") ? String(rowValue(row, "owner_email")) : null,
    provider: String(rowValue(row, "provider")),
    updatedAt: String(rowValue(row, "updated_at")),
  };
}

function buildConnectionTestResult(socialAccount: Awaited<ReturnType<typeof getSocialAccountById>>) {
  if (!socialAccount) {
    return null;
  }

  if (socialAccount.disabledAt || socialAccount.connectionStatus === "disabled") {
    return {
      checkedAt: nowIso(),
      details: "This channel is disabled in Greybrainer.",
      ok: false,
      status: "disabled",
    };
  }

  if (socialAccount.connectionStatus !== "connected") {
    return {
      checkedAt: nowIso(),
      details: "URL saved successfully. Native channel auth is still pending, so publishing is not ready yet.",
      ok: false,
      status: "auth_required",
    };
  }

  if (!socialAccount.accessTokenEncrypted) {
    return {
      checkedAt: nowIso(),
      details: "Channel is marked connected, but no access token is stored.",
      ok: false,
      status: "auth_required",
    };
  }

  if (socialAccount.platform === "linkedin" && !socialAccount.remoteAccountId) {
    return {
      checkedAt: nowIso(),
      details: "LinkedIn auth is connected, but the organization publish target is not configured yet.",
      ok: false,
      status: "auth_required",
    };
  }

  return {
    checkedAt: nowIso(),
    details: "Channel is connected and ready for one-click publishing.",
    ok: true,
    status: "ready",
  };
}

async function getCurrentVersion(client: Client, currentVersionId: string | null) {
  if (!currentVersionId) {
    return null;
  }

  const versionResult = await client.execute({
    sql: "SELECT * FROM draft_versions WHERE id = ?",
    args: [currentVersionId],
  });

  const row = versionResult.rows[0];
  return row ? mapVersionRow(row) : null;
}

async function getPublications(client: Client, draftId: string) {
  const publicationsResult = await client.execute({
    sql: "SELECT * FROM channel_publications WHERE draft_id = ? ORDER BY created_at DESC",
    args: [draftId],
  });

  return publicationsResult.rows.map(mapPublicationRow);
}

async function getDraftVersions(client: Client, draftId: string) {
  const versionsResult = await client.execute({
    sql: "SELECT * FROM draft_versions WHERE draft_id = ? ORDER BY version_no DESC",
    args: [draftId],
  });

  return versionsResult.rows.map(mapVersionRow);
}

export async function createDraft(client: Client, input: CreateDraftInput) {
  const draftId = input.draftId ?? generateId("draft");
  const versionId = input.version.id ?? generateId("version");
  const createdAt = nowIso();

  await client.batch(
    [
      {
        sql: `
          INSERT INTO drafts (
            id, subject_type, subject_title, review_stage, status, created_by,
            current_version_id, latest_version_no, seo_title, seo_description,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          draftId,
          input.subjectType ?? "movie",
          input.subjectTitle,
          input.reviewStage ?? null,
          input.status ?? "generated",
          input.createdBy ?? input.version.createdBy ?? null,
          versionId,
          1,
          input.seoTitle ?? null,
          input.seoDescription ?? null,
          createdAt,
          createdAt,
        ],
      },
      {
        sql: `
          INSERT INTO draft_versions (
            id, draft_id, version_no, source_payload_json, analysis_json,
            blog_markdown, socials_json, video_json, editor_notes,
            created_by, created_at, storage_backend, source_payload_object_key,
            analysis_object_key, markdown_object_key, socials_object_key, video_object_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          versionId,
          draftId,
          1,
          JSON.stringify(input.sourcePayload ?? {}),
          JSON.stringify(input.version.analysis ?? null),
          input.version.blogMarkdown,
          JSON.stringify(input.version.socials ?? null),
          JSON.stringify(input.version.video ?? null),
          input.version.editorNotes ?? null,
          input.version.createdBy ?? input.createdBy ?? null,
          createdAt,
          input.version.storageBackend ?? "turso",
          input.version.sourcePayloadObjectKey ?? null,
          input.version.analysisObjectKey ?? null,
          input.version.markdownObjectKey ?? null,
          input.version.socialsObjectKey ?? null,
          input.version.videoObjectKey ?? null,
        ],
      },
    ],
    "write",
  );

  return getDraftById(client, draftId);
}

export async function getDraftById(client: Client, draftId: string) {
  const draftResult = await client.execute({
    sql: "SELECT * FROM drafts WHERE id = ?",
    args: [draftId],
  });

  const draftRow = draftResult.rows[0];
  if (!draftRow) {
    return null;
  }

  const draft = mapDraftRow(draftRow);
  const currentVersion = await getCurrentVersion(client, draft.currentVersionId);
  const publications = await getPublications(client, draft.id);
  const versions = await getDraftVersions(client, draft.id);

  return {
    ...draft,
    currentVersion,
    publications,
    versions,
  };
}

export async function listDrafts(client: Client, limit = 20) {
  const result = await client.execute({
    sql: "SELECT * FROM drafts ORDER BY updated_at DESC LIMIT ?",
    args: [limit],
  });

  return result.rows.map(mapDraftRow);
}

export async function getDraftBySubjectTypeAndReviewStage(
  client: Client,
  subjectType: string,
  reviewStage: string,
) {
  const result = await client.execute({
    sql: "SELECT id FROM drafts WHERE subject_type = ? AND review_stage = ? ORDER BY updated_at DESC LIMIT 1",
    args: [subjectType, reviewStage],
  });

  const id = result.rows[0]?.id ? String(result.rows[0].id) : null;
  return id ? getDraftById(client, id) : null;
}

export async function updateDraft(client: Client, draftId: string, input: UpdateDraftInput) {
  const existing = await getDraftById(client, draftId);
  if (!existing) {
    return null;
  }

  const updatedAt = nowIso();
  await client.execute({
    sql: `
      UPDATE drafts
      SET subject_title = ?, review_stage = ?, status = ?, seo_title = ?,
          seo_description = ?, website_url = ?, medium_url = ?, updated_at = ?
      WHERE id = ?
    `,
    args: [
      input.subjectTitle ?? existing.subjectTitle,
      input.reviewStage ?? existing.reviewStage,
      input.status ?? existing.status,
      input.seoTitle ?? existing.seoTitle,
      input.seoDescription ?? existing.seoDescription,
      input.websiteUrl ?? existing.websiteUrl,
      input.mediumUrl ?? existing.mediumUrl,
      updatedAt,
      draftId,
    ],
  });

  return getDraftById(client, draftId);
}

export async function createDraftVersion(client: Client, draftId: string, input: DraftVersionInput) {
  const existing = await getDraftById(client, draftId);
  if (!existing) {
    return null;
  }

  const versionId = input.id ?? generateId("version");
  const versionNo = input.versionNo ?? existing.latestVersionNo + 1;
  const createdAt = nowIso();

  await client.batch(
    [
      {
        sql: `
          INSERT INTO draft_versions (
            id, draft_id, version_no, source_payload_json, analysis_json,
            blog_markdown, socials_json, video_json, editor_notes,
            created_by, created_at, storage_backend, source_payload_object_key,
            analysis_object_key, markdown_object_key, socials_object_key, video_object_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          versionId,
          draftId,
          versionNo,
          JSON.stringify(input.sourcePayload ?? {}),
          JSON.stringify(input.analysis ?? null),
          input.blogMarkdown,
          JSON.stringify(input.socials ?? null),
          JSON.stringify(input.video ?? null),
          input.editorNotes ?? null,
          input.createdBy ?? null,
          createdAt,
          input.storageBackend ?? "turso",
          input.sourcePayloadObjectKey ?? null,
          input.analysisObjectKey ?? null,
          input.markdownObjectKey ?? null,
          input.socialsObjectKey ?? null,
          input.videoObjectKey ?? null,
        ],
      },
      {
        sql: `
          UPDATE drafts
          SET current_version_id = ?, latest_version_no = ?, status = ?, updated_at = ?
          WHERE id = ?
        `,
        args: [versionId, versionNo, "editing", createdAt, draftId],
      },
    ],
    "write",
  );

  return getDraftById(client, draftId);
}

export async function listDraftVersions(client: Client, draftId: string) {
  const existing = await getDraftById(client, draftId);
  if (!existing) {
    return null;
  }

  return getDraftVersions(client, draftId);
}

export async function listSocialAccounts(client: Client) {
  const result = await client.execute({
    sql: "SELECT * FROM social_accounts ORDER BY updated_at DESC LIMIT 100",
  });

  return result.rows.map(mapSocialAccountRow);
}

export async function listAiKeys(client: Client, provider = "gemini") {
  const result = await client.execute({
    sql: "SELECT * FROM ai_keys WHERE provider = ? ORDER BY updated_at DESC",
    args: [provider],
  });

  return result.rows.map(mapAiKeyRow);
}

export async function getDefaultAiKey(client: Client, provider = "gemini") {
  const result = await client.execute({
    sql: "SELECT * FROM ai_keys WHERE provider = ? AND is_default = 1 ORDER BY updated_at DESC LIMIT 1",
    args: [provider],
  });

  const row = result.rows[0];
  return row ? mapAiKeyRow(row) : null;
}

export async function getAiKeyEncrypted(client: Client, keyId: string) {
  const result = await client.execute({
    sql: "SELECT encrypted_key FROM ai_keys WHERE id = ?",
    args: [keyId],
  });

  return result.rows[0]?.encrypted_key ? String(result.rows[0].encrypted_key) : null;
}

export async function upsertAiKey(client: Client, input: UpsertAiKeyInput) {
  const provider = input.provider ?? "gemini";
  const now = nowIso();
  const id = generateId("aikey");

  if (input.isDefault) {
    await client.execute({
      sql: "UPDATE ai_keys SET is_default = 0 WHERE provider = ?",
      args: [provider],
    });
  }

  await client.execute({
    sql: `
      INSERT INTO ai_keys (
        id, provider, owner_email, model, key_hint, encrypted_key,
        is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      provider,
      input.ownerEmail ?? null,
      input.model ?? null,
      input.keyHint ?? null,
      input.encryptedKey,
      input.isDefault ? 1 : 0,
      now,
      now,
    ],
  });

  const recordResult = await client.execute({
    sql: "SELECT * FROM ai_keys WHERE id = ?",
    args: [id],
  });

  return recordResult.rows[0] ? mapAiKeyRow(recordResult.rows[0]) : null;
}

export async function getSocialAccountById(client: Client, socialAccountId: string) {
  const result = await client.execute({
    sql: "SELECT * FROM social_accounts WHERE id = ?",
    args: [socialAccountId],
  });

  const row = result.rows[0];
  return row ? mapSocialAccountRow(row) : null;
}

export async function getSocialAccountByOauthState(client: Client, oauthState: string) {
  const result = await client.execute({
    sql: "SELECT * FROM social_accounts WHERE oauth_state = ?",
    args: [oauthState],
  });

  const row = result.rows[0];
  return row ? mapSocialAccountRow(row) : null;
}

export async function createSocialAccount(client: Client, input: CreateSocialAccountInput) {
  const existingResult = await client.execute({
    sql: "SELECT * FROM social_accounts WHERE platform = ? AND normalized_url = ?",
    args: [input.platform, input.normalizedUrl],
  });

  const existingRow = existingResult.rows[0];
  if (existingRow) {
    return mapSocialAccountRow(existingRow);
  }

  const id = generateId("social");
  const createdAt = nowIso();

  await client.execute({
    sql: `
      INSERT INTO social_accounts (
        id, platform, profile_url, normalized_url, handle, display_name,
        connection_status, provider, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      input.platform,
      input.profileUrl,
      input.normalizedUrl,
      input.handle ?? null,
      input.displayName ?? null,
      input.connectionStatus ?? "pending_connection",
      input.connectorKey ?? resolveNativeConnectorForPlatform(input.platform),
      input.createdBy ?? null,
      createdAt,
      createdAt,
    ],
  });

  return getSocialAccountById(client, id);
}

export async function updateSocialAccount(client: Client, socialAccountId: string, input: UpdateSocialAccountInput) {
  const existing = await getSocialAccountById(client, socialAccountId);
  if (!existing) {
    return null;
  }

  const updatedAt = nowIso();
  await client.execute({
    sql: `
      UPDATE social_accounts
      SET display_name = ?, handle = ?, connection_status = ?, provider_profile_id = ?,
          provider_user_id = ?, last_verified_at = ?, disabled_at = ?, provider = ?,
          is_default_publish_target = ?, oauth_state = ?, connected_at = ?,
          access_token_encrypted = COALESCE(?, access_token_encrypted),
          refresh_token_encrypted = COALESCE(?, refresh_token_encrypted),
          token_expires_at = ?, last_test_status = ?, last_test_message = ?, updated_at = ?
      WHERE id = ?
    `,
    args: [
      input.displayName ?? existing.displayName,
      input.handle ?? existing.handle,
      input.connectionStatus ?? existing.connectionStatus,
      input.remoteAccountId ?? existing.remoteAccountId,
      input.remoteUserId ?? existing.remoteUserId,
      input.lastVerifiedAt ?? existing.lastVerifiedAt,
      input.disabledAt ?? existing.disabledAt,
      input.connectorKey ?? existing.connectorKey,
      input.isDefaultPublishTarget === undefined
        ? Number(existing.isDefaultPublishTarget)
        : Number(input.isDefaultPublishTarget),
      input.oauthState ?? existing.oauthState,
      input.connectedAt ?? existing.connectedAt,
      null,
      null,
      input.tokenExpiresAt ?? existing.tokenExpiresAt,
      input.lastTestStatus ?? existing.lastTestStatus,
      input.lastTestMessage ?? existing.lastTestMessage,
      updatedAt,
      socialAccountId,
    ],
  });

  return getSocialAccountById(client, socialAccountId);
}

export async function testSocialAccountConnection(client: Client, socialAccountId: string) {
  const existing = await getSocialAccountById(client, socialAccountId);
  if (!existing) {
    return null;
  }

  const result = buildConnectionTestResult(existing);
  const checkedAt = result?.checkedAt ?? nowIso();
  await client.execute({
    sql: `
      UPDATE social_accounts
      SET last_verified_at = ?, last_test_status = ?, last_test_message = ?, updated_at = ?
      WHERE id = ?
    `,
    args: [checkedAt, result?.status ?? null, result?.details ?? null, checkedAt, socialAccountId],
  });

  const refreshed = await getSocialAccountById(client, socialAccountId);
  return {
    socialAccount: refreshed,
    test: result,
  };
}

export async function storeSocialAccountTokens(
  client: Client,
  socialAccountId: string,
  input: {
    accessTokenEncrypted: string;
    connectedAt?: string | null;
    connectionStatus?: SocialConnectionStatus;
    oauthState?: string | null;
    refreshTokenEncrypted?: string | null;
    remoteAccountId?: string | null;
    remoteUserId?: string | null;
    tokenExpiresAt?: string | null;
  },
) {
  const existing = await getSocialAccountById(client, socialAccountId);
  if (!existing) {
    return null;
  }

  const connectedAt = input.connectedAt ?? nowIso();
  await client.execute({
    sql: `
      UPDATE social_accounts
      SET access_token_encrypted = ?, refresh_token_encrypted = ?, token_expires_at = ?,
          connection_status = ?, connected_at = ?, oauth_state = ?, provider_profile_id = ?,
          provider_user_id = ?, last_verified_at = ?, last_test_status = ?, last_test_message = ?, updated_at = ?
      WHERE id = ?
    `,
    args: [
      input.accessTokenEncrypted,
      input.refreshTokenEncrypted ?? null,
      input.tokenExpiresAt ?? null,
      input.connectionStatus ?? "connected",
      connectedAt,
      input.oauthState ?? null,
      input.remoteAccountId ?? existing.remoteAccountId,
      input.remoteUserId ?? existing.remoteUserId,
      connectedAt,
      "ready",
      "Native auth completed successfully.",
      connectedAt,
      socialAccountId,
    ],
  });

  return getSocialAccountById(client, socialAccountId);
}

export async function upsertPublication(client: Client, draftId: string, input: PublicationInput) {
  const existing = await getDraftById(client, draftId);
  if (!existing) {
    return null;
  }

  const publicationResult = await client.execute({
    sql: "SELECT id FROM channel_publications WHERE draft_id = ? AND channel = ?",
    args: [draftId, input.channel],
  });

  const now = nowIso();
  const existingId = publicationResult.rows[0]?.id ? String(publicationResult.rows[0].id) : null;

  if (existingId) {
    await client.execute({
      sql: `
        UPDATE channel_publications
        SET version_id = ?, status = ?, external_id = ?, external_url = ?,
            payload_json = ?, error_message = ?, published_at = ?, updated_at = ?
        WHERE id = ?
      `,
      args: [
        input.versionId ?? null,
        input.status,
        input.externalId ?? null,
        input.externalUrl ?? null,
        JSON.stringify(input.payload ?? null),
        input.errorMessage ?? null,
        input.publishedAt ?? null,
        now,
        existingId,
      ],
    });
  } else {
    await client.execute({
      sql: `
        INSERT INTO channel_publications (
          id, draft_id, version_id, channel, status, external_id, external_url,
          payload_json, error_message, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        generateId("pub"),
        draftId,
        input.versionId ?? null,
        input.channel,
        input.status,
        input.externalId ?? null,
        input.externalUrl ?? null,
        JSON.stringify(input.payload ?? null),
        input.errorMessage ?? null,
        input.publishedAt ?? null,
        now,
        now,
      ],
    });
  }

  return getPublications(client, draftId);
}
