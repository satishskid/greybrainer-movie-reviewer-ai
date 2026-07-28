import type { Client } from "@libsql/client";
import type { Env } from "../db";
import {
  normalizeGroundingDraft,
  tokenFingerprint,
  verifyGroundingToken,
  type GroundingDraft,
} from "../grounding";
import {
  claimPublicationJob,
  createPublicationJob,
  getPublicationJob,
  listDuePublicationJobs,
  updatePublicationJob,
  type PublicationJob,
} from "../publicationJobs";
import type { PhaseOneChannel } from "../produce";
import {
  getSocialAccountById,
  listSocialAccounts,
  storeSocialAccountTokens,
  upsertPublication,
} from "../repository";
import { getReport } from "../reports";
import { decryptSecret, encryptSecret } from "../tokenCrypto";
import { publishToLinkedIn } from "./linkedin";
import { publishToX } from "./x";
import type { PublisherResult } from "./types";

interface BrandAllowlist {
  linkedin?: string;
  x?: string;
}

function parseAllowlist(env: Env): BrandAllowlist {
  if (!env.GREYBRAINER_HANDLE_ALLOWLIST?.trim()) {
    throw new Error("GREYBRAINER_HANDLE_ALLOWLIST is not configured.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(env.GREYBRAINER_HANDLE_ALLOWLIST);
  } catch {
    throw new Error("GREYBRAINER_HANDLE_ALLOWLIST must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("GREYBRAINER_HANDLE_ALLOWLIST must be a channel-to-account JSON object.");
  }
  const record = parsed as Record<string, unknown>;
  return {
    linkedin: typeof record.linkedin === "string" ? record.linkedin.trim() : undefined,
    x: typeof record.x === "string" ? record.x.trim() : undefined,
  };
}

export function getAllowlistedTargetId(env: Env, channel: PhaseOneChannel) {
  const target = parseAllowlist(env)[channel];
  if (!target) throw new Error(`No Greybrainer ${channel} target is configured in the brand allowlist.`);
  if (channel === "linkedin" && !/^urn:li:(organization|person):\d+$/.test(target)) {
    throw new Error("LinkedIn allowlist target must be an exact organization or person URN.");
  }
  if (channel === "x" && !/^\d{1,19}$/.test(target)) {
    throw new Error("X allowlist target must be the exact numeric Greybrainer user id.");
  }
  return target;
}

function accountMatchesTarget(
  account: Awaited<ReturnType<typeof getSocialAccountById>>,
  target: string,
  channel: PhaseOneChannel,
) {
  if (!account || account.platform !== channel) return false;
  const candidates = [
    account.remoteAccountId,
    account.remoteUserId,
    account.handle,
    account.normalizedUrl,
    account.profileUrl,
    channel === "linkedin" && account.remoteAccountId
      ? `urn:li:organization:${account.remoteAccountId}`
      : null,
  ];
  return candidates.some((candidate) => candidate === target);
}

async function resolveAllowlistedAccount(client: Client, env: Env, channel: PhaseOneChannel) {
  const target = getAllowlistedTargetId(env, channel);
  const accounts = await listSocialAccounts(client);
  const account = accounts.find((candidate) => accountMatchesTarget(candidate, target, channel));
  if (!account) {
    throw new Error(`The allowlisted ${channel} target is not mapped to a Writer Hub social account.`);
  }
  if (account.connectionStatus !== "connected" || account.disabledAt) {
    throw new Error(`The allowlisted ${channel} account is not connected.`);
  }
  if (!account.accessTokenEncrypted) {
    throw new Error(`The allowlisted ${channel} account has no stored access token.`);
  }
  return { account, target };
}

function formBody(values: Record<string, string>) {
  return new URLSearchParams(values).toString();
}

async function refreshAccessToken(
  client: Client,
  env: Env,
  channel: PhaseOneChannel,
  account: Awaited<ReturnType<typeof getSocialAccountById>>,
) {
  if (!account?.refreshTokenEncrypted || !env.SOCIAL_TOKEN_ENCRYPTION_KEY) return null;
  const expiresAt = account.tokenExpiresAt ? Date.parse(account.tokenExpiresAt) : Number.POSITIVE_INFINITY;
  if (expiresAt > Date.now() + 5 * 60_000) return null;
  const refreshToken = await decryptSecret(account.refreshTokenEncrypted, env.SOCIAL_TOKEN_ENCRYPTION_KEY);
  const endpoint =
    channel === "x"
      ? "https://api.x.com/2/oauth2/token"
      : "https://www.linkedin.com/oauth/v2/accessToken";
  const clientId = channel === "x" ? env.X_CLIENT_ID : env.LINKEDIN_CLIENT_ID;
  const clientSecret = channel === "x" ? env.X_CLIENT_SECRET : env.LINKEDIN_CLIENT_SECRET;
  if (!clientId) throw new Error(`${channel} client id is required for token refresh.`);
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded" };
  if (clientSecret) {
    headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  }
  const response = await fetch(endpoint, {
    body: formBody({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    headers,
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`${channel} token refresh failed with ${response.status}.`);
  }
  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };
  if (!body.access_token) throw new Error(`${channel} token refresh returned no access token.`);
  const encryptedAccessToken = await encryptSecret(body.access_token, env.SOCIAL_TOKEN_ENCRYPTION_KEY);
  const encryptedRefreshToken = body.refresh_token
    ? await encryptSecret(body.refresh_token, env.SOCIAL_TOKEN_ENCRYPTION_KEY)
    : account.refreshTokenEncrypted;
  await storeSocialAccountTokens(client, account.id, {
    accessTokenEncrypted: encryptedAccessToken,
    refreshTokenEncrypted: encryptedRefreshToken,
    remoteAccountId: account.remoteAccountId,
    remoteUserId: account.remoteUserId,
    tokenExpiresAt:
      typeof body.expires_in === "number"
        ? new Date(Date.now() + body.expires_in * 1000).toISOString()
        : account.tokenExpiresAt,
  });
  return body.access_token;
}

async function accessTokenForAccount(
  client: Client,
  env: Env,
  channel: PhaseOneChannel,
  account: Awaited<ReturnType<typeof getSocialAccountById>>,
) {
  if (!account?.accessTokenEncrypted || !env.SOCIAL_TOKEN_ENCRYPTION_KEY) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY and a connected access token are required.");
  }
  const refreshed = await refreshAccessToken(client, env, channel, account);
  if (refreshed) return refreshed;
  return decryptSecret(account.accessTokenEncrypted, env.SOCIAL_TOKEN_ENCRYPTION_KEY);
}

async function deliverPublicationJob(client: Client, env: Env, job: PublicationJob) {
  const configuredTarget = getAllowlistedTargetId(env, job.channel);
  if (configuredTarget !== job.targetAccountId) {
    throw new Error("Scheduled job target no longer matches the Greybrainer brand allowlist.");
  }
  const claimedJob = await claimPublicationJob(client, job.id);
  if (!claimedJob) {
    throw new Error("Publication job is already claimed or is not due.");
  }

  try {
    const { account } = await resolveAllowlistedAccount(client, env, claimedJob.channel);
    const accessToken = await accessTokenForAccount(client, env, claimedJob.channel, account);
    let result: PublisherResult;
    if (claimedJob.channel === "x") {
      result = await publishToX({
        accessToken,
        accountId: claimedJob.targetAccountId,
        media: claimedJob.media,
        text: claimedJob.content.text,
      });
    } else {
      result = await publishToLinkedIn(
        {
          accessToken,
          accountId: claimedJob.targetAccountId,
          media: claimedJob.media,
          text: claimedJob.content.text,
        },
        env.LINKEDIN_API_VERSION ?? "202606",
      );
    }
    const publishedAt = new Date().toISOString();
    await updatePublicationJob(client, claimedJob.id, {
      externalId: result.postId,
      externalUrl: result.url,
      publishedAt,
      status: "published",
    });
    await upsertPublication(client, claimedJob.draftId, {
      channel: claimedJob.channel,
      externalId: result.postId,
      externalUrl: result.url,
      payload: {
        jobId: claimedJob.id,
        socialAccountId: account.id,
        targetAccountId: claimedJob.targetAccountId,
      },
      publishedAt,
      status: "published",
      versionId: claimedJob.versionId,
    });
    return getPublicationJob(client, claimedJob.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected publisher error.";
    await updatePublicationJob(client, claimedJob.id, {
      errorMessage: message,
      status: "failed",
    });
    await upsertPublication(client, claimedJob.draftId, {
      channel: claimedJob.channel,
      errorMessage: message,
      payload: { jobId: claimedJob.id, targetAccountId: claimedJob.targetAccountId },
      status: "failed",
      versionId: claimedJob.versionId,
    });
    throw error;
  }
}

export async function publishGrounded(input: {
  channel: PhaseOneChannel;
  client: Client;
  draft: GroundingDraft;
  env: Env;
  groundingToken: string;
  schedule?: string | null;
}) {
  if (!input.env.GROUNDING_HMAC_SECRET) {
    throw new Error("GROUNDING_HMAC_SECRET is not configured.");
  }
  const target = getAllowlistedTargetId(input.env, input.channel);
  const normalizedDraft = normalizeGroundingDraft({ ...input.draft, channel: input.channel });
  const tokenPayload = await verifyGroundingToken({
    accountId: target,
    channel: input.channel,
    draft: normalizedDraft,
    secret: input.env.GROUNDING_HMAC_SECRET,
    token: input.groundingToken,
  });
  const report = await getReport(input.client, tokenPayload.reportId);
  if (!report || report.versionId !== tokenPayload.reportVersionId) {
    throw new Error("The canonical report changed after grounding. Verify the draft again.");
  }
  const scheduledAt = input.schedule ? new Date(input.schedule) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Schedule must be a valid ISO date-time.");
  }
  const isScheduled = Boolean(scheduledAt && scheduledAt.getTime() > Date.now());
  const job = await createPublicationJob(input.client, {
    channel: input.channel,
    content: normalizedDraft,
    draftId: report.id,
    groundingTokenHash: await tokenFingerprint(input.groundingToken),
    media: normalizedDraft.media,
    scheduledAt: scheduledAt?.toISOString() ?? null,
    status: isScheduled ? "scheduled" : "pending",
    targetAccountId: target,
    versionId: report.versionId,
  });
  if (!job) throw new Error("Publication job could not be created.");
  if (isScheduled) {
    return { postId: job.id, status: "scheduled" as const, url: null };
  }
  const published = await deliverPublicationJob(input.client, input.env, job);
  return {
    postId: published?.externalId ?? job.id,
    status: published?.status ?? "failed",
    url: published?.externalUrl ?? null,
  };
}

export async function processDuePublicationJobs(client: Client, env: Env) {
  const jobs = await listDuePublicationJobs(client, new Date().toISOString());
  const results: Array<{ error?: string; id: string; status: string }> = [];
  for (const job of jobs) {
    try {
      const result = await deliverPublicationJob(client, env, job);
      results.push({ id: job.id, status: result?.status ?? "failed" });
    } catch (error) {
      results.push({
        error: error instanceof Error ? error.message : "Unexpected publisher error.",
        id: job.id,
        status: "failed",
      });
    }
  }
  return results;
}
