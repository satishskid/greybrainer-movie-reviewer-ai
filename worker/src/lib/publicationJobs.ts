import type { Client, Row } from "@libsql/client";
import type { GroundingDraft, PublishMedia } from "./grounding";
import type { PhaseOneChannel } from "./produce";

export type PublicationJobStatus = "failed" | "pending" | "published" | "publishing" | "scheduled";

export interface PublicationJob {
  attemptCount: number;
  channel: PhaseOneChannel;
  content: GroundingDraft;
  createdAt: string;
  draftId: string;
  errorMessage: string | null;
  externalId: string | null;
  externalUrl: string | null;
  groundingTokenHash: string;
  id: string;
  media: PublishMedia | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  status: PublicationJobStatus;
  targetAccountId: string;
  updatedAt: string;
  versionId: string;
}

function rowValue(row: Row, key: string) {
  return row[key] ?? null;
}

function parseJson<T>(value: unknown): T | null {
  if (!value) return null;
  return JSON.parse(String(value)) as T;
}

function mapJob(row: Row): PublicationJob {
  return {
    attemptCount: Number(rowValue(row, "attempt_count") ?? 0),
    channel: String(rowValue(row, "channel")) as PhaseOneChannel,
    content: parseJson<GroundingDraft>(rowValue(row, "content_json")) as GroundingDraft,
    createdAt: String(rowValue(row, "created_at")),
    draftId: String(rowValue(row, "draft_id")),
    errorMessage: rowValue(row, "error_message") ? String(rowValue(row, "error_message")) : null,
    externalId: rowValue(row, "external_id") ? String(rowValue(row, "external_id")) : null,
    externalUrl: rowValue(row, "external_url") ? String(rowValue(row, "external_url")) : null,
    groundingTokenHash: String(rowValue(row, "grounding_token_hash")),
    id: String(rowValue(row, "id")),
    media: parseJson<PublishMedia>(rowValue(row, "media_json")),
    publishedAt: rowValue(row, "published_at") ? String(rowValue(row, "published_at")) : null,
    scheduledAt: rowValue(row, "scheduled_at") ? String(rowValue(row, "scheduled_at")) : null,
    status: String(rowValue(row, "status")) as PublicationJobStatus,
    targetAccountId: String(rowValue(row, "target_account_id")),
    updatedAt: String(rowValue(row, "updated_at")),
    versionId: String(rowValue(row, "version_id")),
  };
}

export async function createPublicationJob(
  client: Client,
  input: {
    channel: PhaseOneChannel;
    content: GroundingDraft;
    draftId: string;
    groundingTokenHash: string;
    media?: PublishMedia | null;
    scheduledAt?: string | null;
    status: PublicationJobStatus;
    targetAccountId: string;
    versionId: string;
  },
) {
  const id = `post_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  await client.execute({
    sql: `
      INSERT INTO publication_jobs (
        id, draft_id, version_id, channel, target_account_id, content_json,
        media_json, grounding_token_hash, scheduled_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      input.draftId,
      input.versionId,
      input.channel,
      input.targetAccountId,
      JSON.stringify(input.content),
      input.media ? JSON.stringify(input.media) : null,
      input.groundingTokenHash,
      input.scheduledAt ?? null,
      input.status,
      now,
      now,
    ],
  });
  return getPublicationJob(client, id);
}

export async function getPublicationJob(client: Client, id: string) {
  const result = await client.execute({
    sql: "SELECT * FROM publication_jobs WHERE id = ?",
    args: [id],
  });
  return result.rows[0] ? mapJob(result.rows[0]) : null;
}

export async function listScheduledPublicationJobs(client: Client, limit = 100) {
  const result = await client.execute({
    sql: `
      SELECT *
      FROM publication_jobs
      WHERE status = 'scheduled'
      ORDER BY scheduled_at ASC
      LIMIT ?
    `,
    args: [Math.min(Math.max(Math.floor(limit), 1), 100)],
  });
  return result.rows.map(mapJob);
}

export async function listDuePublicationJobs(client: Client, now: string, limit = 20) {
  const result = await client.execute({
    sql: `
      SELECT *
      FROM publication_jobs
      WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?
      ORDER BY scheduled_at ASC
      LIMIT ?
    `,
    args: [now, Math.min(Math.max(Math.floor(limit), 1), 100)],
  });
  return result.rows.map(mapJob);
}

export async function claimPublicationJob(client: Client, id: string) {
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `
      UPDATE publication_jobs
      SET status = 'publishing', attempt_count = attempt_count + 1, updated_at = ?
      WHERE id = ?
        AND (
          status = 'pending'
          OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?)
        )
    `,
    args: [now, id, now],
  });
  if (result.rowsAffected !== 1) return null;
  return getPublicationJob(client, id);
}

export async function updatePublicationJob(
  client: Client,
  id: string,
  input: {
    errorMessage?: string | null;
    externalId?: string | null;
    externalUrl?: string | null;
    incrementAttempt?: boolean;
    publishedAt?: string | null;
    status: PublicationJobStatus;
  },
) {
  const current = await getPublicationJob(client, id);
  if (!current) return null;
  const now = new Date().toISOString();
  await client.execute({
    sql: `
      UPDATE publication_jobs
      SET status = ?, external_id = ?, external_url = ?, error_message = ?,
          attempt_count = ?, published_at = ?, updated_at = ?
      WHERE id = ?
    `,
    args: [
      input.status,
      input.externalId ?? current.externalId,
      input.externalUrl ?? current.externalUrl,
      input.errorMessage ?? null,
      current.attemptCount + (input.incrementAttempt ? 1 : 0),
      input.publishedAt ?? current.publishedAt,
      now,
      id,
    ],
  });
  return getPublicationJob(client, id);
}
