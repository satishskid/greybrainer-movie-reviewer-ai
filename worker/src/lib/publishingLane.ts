import type { Client } from "@libsql/client";
import type { Env } from "./db";
import { publishDraftToSocialAccounts } from "./nativeConnectorRuntime";
import { toPostizResourceUrl } from "./postizApi";
import { getDraftById, upsertPublication } from "./repository";
import { publishDraftToWebsite, type WebsitePublishResult } from "./websitePublishing";

type AuthType = "bearer" | "x-api-key" | "custom-header" | "none";
type ChannelMode = "native" | "postiz" | "webhook";

const DEFAULT_POSTIZ_POSTS_URL = "https://api.postiz.com/public/v1/posts";

export interface PublishLaneChannelInput {
  apiKey?: string | null;
  authHeaderName?: string | null;
  authType?: AuthType;
  channel: string;
  copy?: string | string[] | null;
  enabled?: boolean;
  endpointUrl?: string | null;
  mode: ChannelMode;
  postizIntegrationId?: string | null;
  postizType?: string | null;
  postizUploadMedia?: boolean;
  socialAccountId?: string | null;
  tags?: string[];
}

export interface PublishLaneInput {
  channels?: PublishLaneChannelInput[];
  dryRun?: boolean;
  pack?: {
    articleMarkdown?: string | null;
    canonicalUrl?: string | null;
    excerpt?: string | null;
    hashtags?: string[];
    media?: {
      heroImageUrl?: string | null;
      posterImageUrl?: string | null;
      thumbnailImageUrl?: string | null;
    };
    seoDescription?: string | null;
    seoTitle?: string | null;
    slug?: string | null;
    tags?: string[];
    title?: string | null;
  };
  publishWebsite?: boolean;
  requestedBy?: string | null;
  versionId?: string | null;
  websiteUrl?: string | null;
}

export interface PublishLaneChannelResult {
  channel: string;
  endpointHost?: string | null;
  error?: string | null;
  externalId?: string | null;
  externalUrl?: string | null;
  mode: ChannelMode | "website";
  responseStatus?: number | null;
  socialAccountId?: string | null;
  status: "ready" | "published" | "failed" | "skipped";
}

function nowIso() {
  return new Date().toISOString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function compactText(value: unknown, maxLength = 1200) {
  if (typeof value === "string") {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  }
  try {
    const serialized = JSON.stringify(value);
    return serialized.length > maxLength ? `${serialized.slice(0, maxLength)}...` : serialized;
  } catch {
    return null;
  }
}

function validateEndpointUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Endpoint URL is invalid.");
  }

  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    throw new Error("Endpoint URL must use HTTPS, except local development URLs.");
  }

  return url;
}

function toPostizPostsUrl(rawUrl?: string | null) {
  return validateEndpointUrl(toPostizResourceUrl(rawUrl?.trim() || DEFAULT_POSTIZ_POSTS_URL, "posts"));
}

function toPostizUploadUrl(postsUrl: URL) {
  const uploadUrl = new URL(postsUrl.toString());
  uploadUrl.pathname = uploadUrl.pathname.replace(/\/posts\/?$/, "/upload-from-url");
  if (uploadUrl.pathname === postsUrl.pathname) {
    uploadUrl.pathname = `${uploadUrl.pathname.replace(/\/$/, "")}/upload-from-url`;
  }
  return uploadUrl;
}

function extractNestedString(source: unknown, path: string[]) {
  let cursor = source;
  for (const part of path) {
    if (!isPlainObject(cursor)) return null;
    cursor = cursor[part];
  }
  return typeof cursor === "string" && cursor.trim() ? cursor.trim() : null;
}

function extractExternalUrl(responseBody: unknown) {
  if (!isPlainObject(responseBody)) return null;
  return (
    extractNestedString(responseBody, ["externalUrl"]) ??
    extractNestedString(responseBody, ["url"]) ??
    extractNestedString(responseBody, ["postUrl"]) ??
    extractNestedString(responseBody, ["permalink"]) ??
    extractNestedString(responseBody, ["link"]) ??
    extractNestedString(responseBody, ["data", "externalUrl"]) ??
    extractNestedString(responseBody, ["data", "url"]) ??
    extractNestedString(responseBody, ["data", "permalink"])
  );
}

function extractExternalId(responseBody: unknown) {
  if (!isPlainObject(responseBody)) return null;
  return (
    extractNestedString(responseBody, ["externalId"]) ??
    extractNestedString(responseBody, ["id"]) ??
    extractNestedString(responseBody, ["postId"]) ??
    extractNestedString(responseBody, ["data", "id"]) ??
    extractNestedString(responseBody, ["data", "postId"])
  );
}

function buildAuthHeaders(channel: PublishLaneChannelInput) {
  const headers: Record<string, string> = {};
  const apiKey = channel.apiKey?.trim();
  if (!apiKey || channel.authType === "none") return headers;

  if (channel.authType === "x-api-key") {
    headers["x-api-key"] = apiKey;
    return headers;
  }

  if (channel.authType === "custom-header") {
    const headerName = channel.authHeaderName?.trim();
    if (!headerName || !/^[a-z0-9-]+$/i.test(headerName)) {
      throw new Error("Custom auth header name is invalid.");
    }
    headers[headerName] = apiKey;
    return headers;
  }

  headers.authorization = `Bearer ${apiKey}`;
  return headers;
}

function buildWebhookPayload(input: {
  canonicalUrl: string | null;
  channel: PublishLaneChannelInput;
  draft: NonNullable<Awaited<ReturnType<typeof getDraftById>>>;
  pack: PublishLaneInput["pack"];
}) {
  return {
    article: {
      canonicalUrl: input.canonicalUrl,
      draftId: input.draft.id,
      markdown: input.pack?.articleMarkdown ?? input.draft.currentVersion?.blogMarkdown ?? "",
      reviewStage: input.draft.reviewStage,
      seoDescription: input.pack?.seoDescription ?? input.draft.seoDescription,
      seoTitle: input.pack?.seoTitle ?? input.draft.seoTitle ?? input.draft.subjectTitle,
      slug: input.pack?.slug ?? null,
      title: input.pack?.title ?? input.draft.subjectTitle,
      versionId: input.draft.currentVersion?.id ?? input.draft.currentVersionId,
    },
    channel: {
      name: input.channel.channel,
      tags: input.channel.tags ?? input.pack?.hashtags ?? input.pack?.tags ?? [],
    },
    content: {
      copy: input.channel.copy ?? "",
      excerpt: input.pack?.excerpt ?? null,
      hashtags: input.pack?.hashtags ?? [],
      media: input.pack?.media ?? null,
    },
    source: {
      platform: "greybrainer",
      workflow: "publishing-lane",
    },
  };
}

function normalizeCopy(copy: string | string[] | null | undefined) {
  if (Array.isArray(copy)) return copy.filter(Boolean).join("\n\n");
  return copy ?? "";
}

function labelizeTag(tag: string) {
  return tag.replace(/^#/, "").replace(/[-_]+/g, " ").trim();
}

function defaultPostizType(channel: string) {
  switch (channel) {
    case "facebook":
      return "facebook";
    case "instagram":
      return "instagram";
    case "linkedin":
      return "linkedin";
    case "medium":
      return "medium";
    case "x":
      return "x";
    default:
      return channel;
  }
}

function buildPostizSettings(input: {
  canonicalUrl: string | null;
  channel: PublishLaneChannelInput;
  pack: PublishLaneInput["pack"];
}) {
  const type = input.channel.postizType?.trim() || defaultPostizType(input.channel.channel);
  const base = { __type: type };

  if (type === "medium") {
    return {
      ...base,
      subtitle: input.pack?.excerpt ?? "",
      tags: (input.pack?.tags ?? input.channel.tags ?? []).map((tag) => ({
        label: labelizeTag(tag),
        value: labelizeTag(tag).toLowerCase().replace(/\s+/g, "-"),
      })),
      title: input.pack?.seoTitle ?? input.pack?.title ?? "Greybrainer Review",
    };
  }

  if (type === "facebook") {
    return {
      ...base,
      url: input.canonicalUrl ?? undefined,
    };
  }

  if (type === "instagram" || type === "instagram-standalone") {
    return {
      ...base,
      post_type: "post",
    };
  }

  if (type === "x") {
    return {
      ...base,
      who_can_reply_post: "everyone",
    };
  }

  return base;
}

function mediaUrlForPostiz(channel: PublishLaneChannelInput, pack: PublishLaneInput["pack"]) {
  if (channel.postizUploadMedia === false) return null;
  if (!pack?.media) return null;
  if (channel.channel === "instagram") {
    return pack.media.thumbnailImageUrl ?? pack.media.posterImageUrl ?? pack.media.heroImageUrl ?? null;
  }
  return pack.media.thumbnailImageUrl ?? pack.media.heroImageUrl ?? pack.media.posterImageUrl ?? null;
}

async function uploadPostizMediaFromUrl(input: {
  apiKey: string;
  mediaUrl: string;
  postsUrl: URL;
}) {
  const uploadUrl = toPostizUploadUrl(input.postsUrl);
  const response = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: input.apiKey,
      "content-type": "application/json",
      "user-agent": "Greybrainer-Publishing-Lane/1.0",
    },
    body: JSON.stringify({ url: input.mediaUrl }),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Postiz media upload failed with HTTP ${response.status}: ${compactText(responseBody, 500) ?? "unknown error"}`);
  }

  if (!isPlainObject(responseBody) || !responseBody.id || !responseBody.path) {
    throw new Error("Postiz media upload returned an unexpected response.");
  }

  return {
    id: String(responseBody.id),
    path: String(responseBody.path),
  };
}

async function buildPostizPayload(input: {
  apiKey: string;
  canonicalUrl: string | null;
  channel: PublishLaneChannelInput;
  draft: NonNullable<Awaited<ReturnType<typeof getDraftById>>>;
  pack: PublishLaneInput["pack"];
  postsUrl: URL;
}) {
  const image = [];
  const mediaUrl = mediaUrlForPostiz(input.channel, input.pack);
  if (mediaUrl) {
    image.push(await uploadPostizMediaFromUrl({
      apiKey: input.apiKey,
      mediaUrl,
      postsUrl: input.postsUrl,
    }));
  }

  return {
    type: "now",
    shortLink: false,
    tags: input.pack?.tags ?? input.channel.tags ?? [],
    posts: [
      {
        integration: { id: input.channel.postizIntegrationId?.trim() },
        value: [
          {
            content: normalizeCopy(input.channel.copy),
            image,
          },
        ],
        settings: buildPostizSettings({
          canonicalUrl: input.canonicalUrl,
          channel: input.channel,
          pack: input.pack,
        }),
      },
    ],
  };
}

async function publishWebhookChannel(
  client: Client,
  input: {
    canonicalUrl: string | null;
    channel: PublishLaneChannelInput;
    draft: NonNullable<Awaited<ReturnType<typeof getDraftById>>>;
    pack: PublishLaneInput["pack"];
  },
): Promise<PublishLaneChannelResult> {
  const endpoint = input.channel.endpointUrl?.trim();
  if (!endpoint) {
    const message = "Webhook endpoint URL is required.";
    await upsertPublication(client, input.draft.id, {
      channel: input.channel.channel,
      errorMessage: message,
      externalUrl: null,
      payload: {
        mode: "webhook",
        reason: "missing_endpoint",
      },
      status: "failed",
      versionId: input.draft.currentVersion?.id ?? input.draft.currentVersionId,
    });
    return {
      channel: input.channel.channel,
      error: message,
      mode: "webhook",
      status: "failed",
    };
  }

  let url: URL;
  try {
    url = validateEndpointUrl(endpoint);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Endpoint URL is invalid.";
    await upsertPublication(client, input.draft.id, {
      channel: input.channel.channel,
      errorMessage: message,
      externalUrl: null,
      payload: {
        endpointHost: null,
        mode: "webhook",
        reason: "invalid_endpoint",
      },
      status: "failed",
      versionId: input.draft.currentVersion?.id ?? input.draft.currentVersionId,
    });
    return {
      channel: input.channel.channel,
      error: message,
      mode: "webhook",
      status: "failed",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const payload = buildWebhookPayload(input);
  const idempotencyKey = `${input.draft.id}:${input.channel.channel}:${input.draft.currentVersion?.id ?? input.draft.currentVersionId ?? "current"}`;

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
        "user-agent": "Greybrainer-Publishing-Lane/1.0",
        "x-greybrainer-channel": input.channel.channel,
        "x-greybrainer-draft-id": input.draft.id,
        ...buildAuthHeaders(input.channel),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const responseBody = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");
    const externalUrl = extractExternalUrl(responseBody);
    const externalId = extractExternalId(responseBody);
    const status = response.ok ? "published" : "failed";
    const errorMessage = response.ok ? null : `Webhook returned HTTP ${response.status}.`;

    await upsertPublication(client, input.draft.id, {
      channel: input.channel.channel,
      errorMessage,
      externalId,
      externalUrl,
      payload: {
        endpointHost: url.host,
        mode: "webhook",
        responsePreview: compactText(responseBody),
        responseStatus: response.status,
      },
      publishedAt: response.ok ? nowIso() : null,
      status,
      versionId: input.draft.currentVersion?.id ?? input.draft.currentVersionId,
    });

    return {
      channel: input.channel.channel,
      endpointHost: url.host,
      error: errorMessage,
      externalId,
      externalUrl,
      mode: "webhook",
      responseStatus: response.status,
      status,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error && error.name === "AbortError"
        ? "Webhook timed out after 20 seconds."
        : error instanceof Error
          ? error.message
          : "Webhook publish failed.";
    await upsertPublication(client, input.draft.id, {
      channel: input.channel.channel,
      errorMessage,
      externalUrl: null,
      payload: {
        endpointHost: url.host,
        mode: "webhook",
      },
      status: "failed",
      versionId: input.draft.currentVersion?.id ?? input.draft.currentVersionId,
    });
    return {
      channel: input.channel.channel,
      endpointHost: url.host,
      error: errorMessage,
      mode: "webhook",
      status: "failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function publishPostizChannel(
  client: Client,
  input: {
    canonicalUrl: string | null;
    channel: PublishLaneChannelInput;
    draft: NonNullable<Awaited<ReturnType<typeof getDraftById>>>;
    pack: PublishLaneInput["pack"];
  },
): Promise<PublishLaneChannelResult> {
  const apiKey = input.channel.apiKey?.trim();
  const integrationId = input.channel.postizIntegrationId?.trim();
  if (!apiKey || !integrationId) {
    const message = "Postiz API key and integration ID are required.";
    await upsertPublication(client, input.draft.id, {
      channel: input.channel.channel,
      errorMessage: message,
      externalUrl: null,
      payload: {
        endpointHost: null,
        mode: "postiz",
        reason: "missing_postiz_credentials",
      },
      status: "failed",
      versionId: input.draft.currentVersion?.id ?? input.draft.currentVersionId,
    });
    return {
      channel: input.channel.channel,
      error: message,
      mode: "postiz",
      status: "failed",
    };
  }

  let postsUrl: URL;
  try {
    postsUrl = toPostizPostsUrl(input.channel.endpointUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Postiz API URL is invalid.";
    await upsertPublication(client, input.draft.id, {
      channel: input.channel.channel,
      errorMessage: message,
      externalUrl: null,
      payload: {
        endpointHost: null,
        mode: "postiz",
        reason: "invalid_postiz_endpoint",
      },
      status: "failed",
      versionId: input.draft.currentVersion?.id ?? input.draft.currentVersionId,
    });
    return {
      channel: input.channel.channel,
      error: message,
      mode: "postiz",
      status: "failed",
    };
  }

  try {
    const payload = await buildPostizPayload({
      apiKey,
      canonicalUrl: input.canonicalUrl,
      channel: input.channel,
      draft: input.draft,
      pack: input.pack,
      postsUrl,
    });
    const response = await fetch(postsUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "content-type": "application/json",
        "idempotency-key": `${input.draft.id}:${input.channel.channel}:${input.draft.currentVersion?.id ?? input.draft.currentVersionId ?? "current"}`,
        "user-agent": "Greybrainer-Publishing-Lane/1.0",
      },
      body: JSON.stringify(payload),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const responseBody = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");
    const externalUrl = extractExternalUrl(responseBody);
    const externalId = extractExternalId(responseBody);
    const status = response.ok ? "published" : "failed";
    const errorMessage = response.ok ? null : `Postiz returned HTTP ${response.status}.`;

    await upsertPublication(client, input.draft.id, {
      channel: input.channel.channel,
      errorMessage,
      externalId,
      externalUrl,
      payload: {
        endpointHost: postsUrl.host,
        integrationId,
        mode: "postiz",
        postizType: payload.posts[0].settings.__type,
        responsePreview: compactText(responseBody),
        responseStatus: response.status,
      },
      publishedAt: response.ok ? nowIso() : null,
      status,
      versionId: input.draft.currentVersion?.id ?? input.draft.currentVersionId,
    });

    return {
      channel: input.channel.channel,
      endpointHost: postsUrl.host,
      error: errorMessage,
      externalId,
      externalUrl,
      mode: "postiz",
      responseStatus: response.status,
      status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Postiz publish failed.";
    await upsertPublication(client, input.draft.id, {
      channel: input.channel.channel,
      errorMessage,
      externalUrl: null,
      payload: {
        endpointHost: postsUrl.host,
        integrationId,
        mode: "postiz",
      },
      status: "failed",
      versionId: input.draft.currentVersion?.id ?? input.draft.currentVersionId,
    });
    return {
      channel: input.channel.channel,
      endpointHost: postsUrl.host,
      error: errorMessage,
      mode: "postiz",
      status: "failed",
    };
  }
}

function buildDryRunResult(input: {
  canonicalUrl: string | null;
  channel: PublishLaneChannelInput;
  draft: NonNullable<Awaited<ReturnType<typeof getDraftById>>>;
  pack: PublishLaneInput["pack"];
}): PublishLaneChannelResult & { payloadPreview?: unknown } {
  if (input.channel.mode === "native") {
    return {
      channel: input.channel.channel,
      mode: "native",
      socialAccountId: input.channel.socialAccountId ?? null,
      status: input.channel.socialAccountId ? "ready" : "failed",
      error: input.channel.socialAccountId ? null : "Native social account is required.",
    };
  }

  if (input.channel.mode === "postiz") {
    const postsUrl = (() => {
      try {
        return toPostizPostsUrl(input.channel.endpointUrl);
      } catch {
        return null;
      }
    })();
    return {
      channel: input.channel.channel,
      endpointHost: postsUrl?.host ?? null,
      mode: "postiz",
      payloadPreview: postsUrl
        ? {
            type: "now",
            posts: [
              {
                integration: { id: input.channel.postizIntegrationId ?? "" },
                value: [{ content: normalizeCopy(input.channel.copy), image: [] }],
                settings: buildPostizSettings({
                  canonicalUrl: input.canonicalUrl,
                  channel: input.channel,
                  pack: input.pack,
                }),
              },
            ],
          }
        : null,
      status: input.channel.apiKey && input.channel.postizIntegrationId && postsUrl ? "ready" : "failed",
      error: input.channel.apiKey && input.channel.postizIntegrationId && postsUrl
        ? null
        : "Postiz API key, integration ID, and valid API URL are required.",
    };
  }

  return {
    channel: input.channel.channel,
    endpointHost: input.channel.endpointUrl ? (() => {
      try {
        return validateEndpointUrl(input.channel.endpointUrl).host;
      } catch {
        return null;
      }
    })() : null,
    mode: "webhook",
    payloadPreview: buildWebhookPayload(input),
    status: input.channel.endpointUrl ? "ready" : "failed",
    error: input.channel.endpointUrl ? null : "Webhook endpoint URL is required.",
  };
}

export async function publishDraftThroughLane(client: Client, env: Env, draftId: string, input: PublishLaneInput) {
  const draft = await getDraftById(client, draftId);
  if (!draft?.currentVersion) {
    throw new Error("Draft or current version not found.");
  }

  const dryRun = input.dryRun !== false;
  const enabledChannels = (input.channels ?? []).filter((channel) => channel.enabled !== false);
  const shouldPublishWebsite = input.publishWebsite !== false;
  const versionId = input.versionId ?? draft.currentVersion.id;

  let website: WebsitePublishResult | null = null;
  let canonicalUrl = input.pack?.canonicalUrl ?? input.websiteUrl ?? draft.websiteUrl ?? null;

  if (dryRun) {
    const results = enabledChannels.map((channel) =>
      buildDryRunResult({
        canonicalUrl,
        channel,
        draft,
        pack: input.pack,
      }),
    );
    return {
      canonicalUrl,
      draftId,
      dryRun: true,
      results,
      website: shouldPublishWebsite
        ? {
            mode: "website",
            status: "ready",
          }
        : {
            mode: "website",
            status: "skipped",
          },
    };
  }

  if (shouldPublishWebsite) {
    website = await publishDraftToWebsite(client, env, {
      draftId,
      requestedBy: input.requestedBy ?? null,
      versionId,
      websiteUrl: input.websiteUrl ?? null,
    });
    canonicalUrl = website.canonicalUrl;
  }

  const nativeAccountIds = enabledChannels
    .filter((channel) => channel.mode === "native" && channel.socialAccountId)
    .map((channel) => channel.socialAccountId as string);

  const results: PublishLaneChannelResult[] = [];
  if (nativeAccountIds.length > 0) {
    const nativeResult = await publishDraftToSocialAccounts(client, env, draftId, nativeAccountIds);
    for (const item of nativeResult.results) {
      const channel = enabledChannels.find((candidate) => candidate.socialAccountId === item.socialAccountId);
      results.push({
        channel: channel?.channel ?? "native-social",
        error: item.error ?? null,
        externalUrl: item.externalUrl ?? null,
        mode: "native",
        socialAccountId: item.socialAccountId,
        status: item.status === "published" ? "published" : "failed",
      });
    }
  }

  for (const channel of enabledChannels.filter((item) => item.mode === "postiz")) {
    const result = await publishPostizChannel(client, {
      canonicalUrl,
      channel,
      draft,
      pack: input.pack,
    });
    results.push(result);
  }

  for (const channel of enabledChannels.filter((item) => item.mode === "webhook")) {
    const result = await publishWebhookChannel(client, {
      canonicalUrl,
      channel,
      draft,
      pack: input.pack,
    });
    results.push(result);
  }

  return {
    canonicalUrl,
    draftId,
    dryRun: false,
    results,
    website,
  };
}
