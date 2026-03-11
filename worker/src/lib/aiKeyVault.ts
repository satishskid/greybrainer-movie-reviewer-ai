import type { Client } from "@libsql/client";
import type { Env } from "./db";
import { encryptSecret } from "./tokenCrypto";
import { listAiKeys, upsertAiKey } from "./repository";

function maskKeyHint(value: string) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length <= 6 ? trimmed : trimmed.slice(-6);
}

export async function saveAiKey(
  client: Client,
  env: Env,
  input: {
    provider?: string;
    ownerEmail?: string | null;
    model?: string | null;
    rawKey: string;
    isDefault?: boolean;
  },
) {
  if (!env.SOCIAL_TOKEN_ENCRYPTION_KEY) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY is not configured.");
  }

  const provider = input.provider ?? "gemini";
  const encryptedKey = await encryptSecret(input.rawKey, env.SOCIAL_TOKEN_ENCRYPTION_KEY);
  const record = await upsertAiKey(client, {
    encryptedKey,
    isDefault: input.isDefault ?? true,
    keyHint: maskKeyHint(input.rawKey),
    model: input.model ?? null,
    ownerEmail: input.ownerEmail ?? null,
    provider,
  });

  if (!record) {
    throw new Error("Failed to store BYOK key.");
  }

  return record;
}

export async function listAiKeysForProvider(client: Client, provider = "gemini") {
  return listAiKeys(client, provider);
}
