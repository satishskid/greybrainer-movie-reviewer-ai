const DEFAULT_POSTIZ_BASE_URL = "https://api.postiz.com/public/v1";

export interface PostizIntegrationRecord {
  customer: {
    id: string | null;
    name: string | null;
  } | null;
  disabled: boolean;
  id: string;
  identifier: string;
  name: string | null;
  picture: string | null;
  profile: string | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function compactText(value: unknown, maxLength = 1000) {
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

function validateHttpsOrLocal(url: URL) {
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    throw new Error("Postiz URL must use HTTPS, except local development URLs.");
  }
}

export function normalizePostizBaseUrl(rawBaseUrl?: string | null) {
  const trimmed = rawBaseUrl?.trim() || DEFAULT_POSTIZ_BASE_URL;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Postiz base URL is invalid.");
  }

  validateHttpsOrLocal(url);

  let pathname = url.pathname.replace(/\/+$/, "");
  pathname = pathname.replace(/\/(posts|integrations|upload-from-url|upload)$/, "");
  if (url.hostname === "api.postiz.com" && (pathname === "" || pathname === "/")) {
    pathname = "/public/v1";
  }
  if (!pathname) pathname = "/";
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function toPostizResourceUrl(rawBaseUrl: string | null | undefined, resource: "integrations" | "posts" | "upload-from-url") {
  const baseUrl = normalizePostizBaseUrl(rawBaseUrl);
  return `${baseUrl}/${resource}`;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapPostizIntegration(value: unknown): PostizIntegrationRecord | null {
  if (!isPlainObject(value)) return null;
  const id = stringOrNull(value.id);
  const identifier = stringOrNull(value.identifier);
  if (!id || !identifier) return null;

  const customer = isPlainObject(value.customer)
    ? {
        id: stringOrNull(value.customer.id),
        name: stringOrNull(value.customer.name),
      }
    : null;

  return {
    customer,
    disabled: Boolean(value.disabled),
    id,
    identifier,
    name: stringOrNull(value.name),
    picture: stringOrNull(value.picture),
    profile: stringOrNull(value.profile),
  };
}

export async function listPostizIntegrations(input: {
  apiKey: string;
  baseUrl?: string | null;
  group?: string | null;
}) {
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    throw new Error("Postiz API key is required.");
  }

  const integrationsUrl = new URL(toPostizResourceUrl(input.baseUrl, "integrations"));
  if (input.group?.trim()) {
    integrationsUrl.searchParams.set("group", input.group.trim());
  }

  const response = await fetch(integrationsUrl.toString(), {
    headers: {
      Authorization: apiKey,
      "user-agent": "Greybrainer-Publishing-Lane/1.0",
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`Postiz integrations request failed with HTTP ${response.status}: ${compactText(responseBody, 500) ?? "unknown error"}`);
  }

  const rawIntegrations = Array.isArray(responseBody)
    ? responseBody
    : isPlainObject(responseBody) && Array.isArray(responseBody.integrations)
      ? responseBody.integrations
      : null;
  if (!rawIntegrations) {
    throw new Error("Postiz integrations response did not match the expected array shape.");
  }

  return rawIntegrations
    .map(mapPostizIntegration)
    .filter((item): item is PostizIntegrationRecord => Boolean(item));
}
