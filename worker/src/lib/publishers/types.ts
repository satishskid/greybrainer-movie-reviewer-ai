import type { PublishMedia } from "../grounding";

export interface PublisherInput {
  accessToken: string;
  accountId: string;
  media?: PublishMedia | null;
  text: string | string[];
}

export interface PublisherResult {
  postId: string;
  providerResponse?: unknown;
  url: string | null;
}

export interface PublisherErrorDetails {
  body?: string;
  provider: string;
  retryAfterSeconds?: number | null;
  status?: number;
}

export class PublisherError extends Error {
  details: PublisherErrorDetails;

  constructor(message: string, details: PublisherErrorDetails) {
    super(message);
    this.name = "PublisherError";
    this.details = details;
  }
}

export type Fetcher = typeof fetch;

export async function fetchWithBackoff(
  fetcher: Fetcher,
  input: RequestInfo | URL,
  init: RequestInit,
  provider: string,
  attempts = 3,
) {
  let response: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    response = await fetcher(input, init);
    if (response.ok || ![429, 500, 502, 503, 504].includes(response.status)) return response;
    const retryAfter = Number(response.headers.get("retry-after") ?? "0");
    const delay = Math.min((retryAfter || 2 ** attempt) * 1000, 8_000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  if (!response) throw new PublisherError(`${provider} did not return a response.`, { provider });
  return response;
}

export async function providerError(response: Response, provider: string, action: string) {
  const body = await response.text();
  throw new PublisherError(`${provider} ${action} failed with ${response.status}.`, {
    body: body.slice(0, 2_000),
    provider,
    retryAfterSeconds: Number(response.headers.get("retry-after") ?? "0") || null,
    status: response.status,
  });
}
