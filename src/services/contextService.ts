const DEFAULT_API_BASE_URL = "/api";

export interface ContextEventRecord {
  id: string;
  sessionId: string;
  eventType: string;
  actor: string | null;
  content: string;
  payload: unknown | null;
  createdAt: string;
}

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_OMNICHANNEL_API_BASE_URL;
  return configured && configured.trim().length > 0 ? configured : DEFAULT_API_BASE_URL;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, init);
  } catch {
    throw new Error(`Unable to reach the Cloudflare backend at ${getApiBaseUrl()}.`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Worker API returned non-JSON (${contentType || "no content-type"}) for ${path}. ` +
      `Ensure VITE_OMNICHANNEL_API_BASE_URL is set correctly (current: ${getApiBaseUrl()}).`
    );
  }
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `Request failed for ${path}.`);
  }
  return response.json() as Promise<T>;
}

export async function listContextEvents(sessionId: string, limit = 20): Promise<ContextEventRecord[]> {
  const data = await requestJson<{ events: ContextEventRecord[] }>(`/context/events?sessionId=${encodeURIComponent(sessionId)}&limit=${limit}`);
  return data.events;
}

export async function createContextEvent(input: {
  sessionId: string;
  eventType: string;
  actor?: string | null;
  content: string;
  payload?: unknown | null;
}): Promise<ContextEventRecord> {
  const data = await requestJson<{ event: ContextEventRecord }>("/context/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return data.event;
}
