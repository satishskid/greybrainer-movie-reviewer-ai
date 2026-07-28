import type { Client } from "@libsql/client";
import type { Env } from "./db";
import {
  getAiKeyEncrypted,
  getDefaultAiKey,
  recordAiKeyRuntimeStatus,
} from "./repository";
import { decryptSecret } from "./tokenCrypto";

export type SignalImageFormat = "social" | "youtube" | "reel";

export interface SignalImageInput {
  draftId: string;
  format: SignalImageFormat;
  prompt: string;
  sourceUrls: string[];
}

const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";
const MAX_PROMPT_LENGTH = 8_000;
const MAX_SOURCE_IMAGES = 5;

const ASPECT_RATIOS: Record<SignalImageFormat, "4:5" | "16:9" | "9:16"> = {
  reel: "9:16",
  social: "4:5",
  youtube: "16:9",
};

function nowIso() {
  return new Date().toISOString();
}

function isQuotaError(status: number, text: string) {
  const lower = text.toLowerCase();
  return status === 429 || lower.includes("resource_exhausted") || lower.includes("quota");
}

function getGeminiRequestConfig(env: Env, apiKey: string) {
  const gatewayAccountId = env.CF_AI_GATEWAY_ACCOUNT_ID?.trim();
  const gatewayName = env.CF_AI_GATEWAY_GATEWAY_NAME?.trim();

  if (gatewayAccountId && gatewayName) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    };
    if (env.CF_AI_GATEWAY_TOKEN?.trim()) {
      headers["cf-aig-authorization"] = `Bearer ${env.CF_AI_GATEWAY_TOKEN.trim()}`;
    }
    return {
      headers,
      url: `https://gateway.ai.cloudflare.com/v1/${gatewayAccountId}/${gatewayName}/google-ai-studio/v1beta/interactions`,
      via: "Cloudflare AI Gateway",
    };
  }

  return {
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    url: "https://generativelanguage.googleapis.com/v1beta/interactions",
    via: "Google AI Studio",
  };
}

async function getGeminiKey(client: Client, env: Env) {
  let apiKey = env.GEMINI_API_KEY?.trim() || null;
  let activeKeyId: string | null = null;

  if (env.SOCIAL_TOKEN_ENCRYPTION_KEY) {
    const defaultKey = await getDefaultAiKey(client, "gemini");
    if (defaultKey) {
      activeKeyId = defaultKey.id;
      const encrypted = await getAiKeyEncrypted(client, defaultKey.id);
      if (encrypted) {
        apiKey = await decryptSecret(encrypted, env.SOCIAL_TOKEN_ENCRYPTION_KEY);
      }
    }
  }

  if (!apiKey) {
    throw new Error("Gemini API key is not configured in the Worker key vault.");
  }

  return { activeKeyId, apiKey };
}

function validateSourceUrls(sourceUrls: string[]) {
  const unique = sourceUrls
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, MAX_SOURCE_IMAGES);

  return unique.map((value) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Every Gemini source image must be a valid URL.");
    }
    if (url.protocol !== "https:") {
      throw new Error("Gemini source images must use HTTPS.");
    }
    return url.toString();
  });
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function imageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

export async function generateSignalImage(
  client: Client,
  env: Env,
  input: SignalImageInput,
  requestOrigin: string,
) {
  if (!env.CONTENT_R2) {
    throw new Error("CONTENT_R2 is not configured.");
  }
  if (!input.draftId.trim()) {
    throw new Error("draftId is required.");
  }
  if (!ASPECT_RATIOS[input.format]) {
    throw new Error("format must be social, youtube or reel.");
  }
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("A visual prompt is required.");
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error("The visual prompt is too long.");
  }

  const sourceUrls = validateSourceUrls(input.sourceUrls);
  if (!sourceUrls.length) {
    throw new Error("Upload at least one approved poster, still or portrait before generating.");
  }

  const { activeKeyId, apiKey } = await getGeminiKey(client, env);
  const model = env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const requestConfig = getGeminiRequestConfig(env, apiKey);
  const usedAt = nowIso();
  const response = await fetch(requestConfig.url, {
    method: "POST",
    headers: requestConfig.headers,
    body: JSON.stringify({
      input: [
        { type: "text", text: prompt },
        ...sourceUrls.map((uri) => ({ type: "image", uri })),
      ],
      model,
      response_format: {
        aspect_ratio: ASPECT_RATIOS[input.format],
        delivery: "inline",
        image_size: "2K",
        mime_type: "image/png",
        type: "image",
      },
      store: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const quotaExhausted = isQuotaError(response.status, errorText);
    if (activeKeyId) {
      await recordAiKeyRuntimeStatus(client, {
        keyId: activeKeyId,
        lastFailureAt: usedAt,
        lastFailureCode: String(response.status),
        lastFailureReason: errorText.slice(0, 1000),
        lastQuotaExhaustedAt: quotaExhausted ? usedAt : null,
        lastUsedAt: usedAt,
        status: quotaExhausted ? "quota_exhausted" : "failed",
      });
    }
    const reason = quotaExhausted
      ? "Gemini image quota is exhausted. The existing card renderer is still available."
      : `Gemini image generation failed through ${requestConfig.via} (${response.status}).`;
    throw new Error(reason);
  }

  const payload = (await response.json()) as {
    output_image?: { data?: string; mime_type?: string };
    outputs?: Array<{ data?: string; mime_type?: string; type?: string }>;
  };
  const output =
    payload.output_image ??
    payload.outputs?.find((item) => item.type === "image" && item.data);
  if (!output?.data) {
    throw new Error("Gemini completed without returning an image.");
  }

  const mimeType =
    output.mime_type === "image/jpeg" || output.mime_type === "image/webp"
      ? output.mime_type
      : "image/png";
  const bytes = decodeBase64(output.data);
  const safeDraftId = input.draftId.replace(/[^a-z0-9_-]/gi, "").slice(0, 120);
  const suffix = crypto.randomUUID().split("-")[0];
  const key = `draft-assets/${safeDraftId}/signal-gemini-${input.format}-${Date.now()}-${suffix}.${imageExtension(mimeType)}`;

  await env.CONTENT_R2.put(key, bytes, {
    httpMetadata: { contentType: mimeType },
    customMetadata: {
      draftId: input.draftId,
      format: input.format,
      kind: "signal-gemini",
      model,
      sourceCount: String(sourceUrls.length),
    },
  });

  if (activeKeyId) {
    await recordAiKeyRuntimeStatus(client, {
      keyId: activeKeyId,
      lastSuccessAt: usedAt,
      lastUsedAt: usedAt,
      status: "healthy",
    });
  }

  return {
    format: input.format,
    key,
    model,
    sourceCount: sourceUrls.length,
    url: `${requestOrigin}/api/assets/${encodeURIComponent(key)}`,
  };
}
