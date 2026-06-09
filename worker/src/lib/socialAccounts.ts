export type SocialPlatform =
  | "linkedin"
  | "medium"
  | "x"
  | "instagram"
  | "youtube"
  | "facebook"
  | "threads"
  | "tiktok"
  | "pinterest"
  | "unknown";

export interface DiscoveredSocialAccount {
  connectionStatus: "pending_connection";
  displayName: string | null;
  handle: string | null;
  normalizedUrl: string;
  platform: SocialPlatform;
  profileUrl: string;
}

function normalizeUrl(input: string) {
  const url = new URL(input.trim());
  url.hash = "";

  const query = new URLSearchParams(url.search);
  query.delete("viewAsMember");
  query.delete("trk");
  query.delete("igshid");
  url.search = query.toString() ? `?${query.toString()}` : "";

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url;
}

function detectLinkedIn(url: URL): DiscoveredSocialAccount | null {
  if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const [entityType, slug] = segments;
  const displaySlug = slug.trim();
  if (!displaySlug) {
    return null;
  }

  const displayName = displaySlug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    connectionStatus: "pending_connection",
    displayName,
    handle: displaySlug,
    normalizedUrl: `${url.origin}/${entityType}/${displaySlug}`,
    platform: "linkedin",
    profileUrl: url.toString(),
  };
}

function detectMedium(url: URL): DiscoveredSocialAccount | null {
  if (!/(^|\.)medium\.com$/i.test(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const slug = segments[0].trim();
  if (!slug) {
    return null;
  }

  return {
    connectionStatus: "pending_connection",
    displayName: slug.startsWith("@") ? slug.slice(1) : slug,
    handle: slug.startsWith("@") ? slug : `@${slug}`,
    normalizedUrl: `${url.origin}/${slug}`,
    platform: "medium",
    profileUrl: url.toString(),
  };
}

function detectX(url: URL): DiscoveredSocialAccount | null {
  if (!/(^|\.)x\.com$/i.test(url.hostname) && !/(^|\.)twitter\.com$/i.test(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const slug = segments[0]?.trim();
  if (!slug || ["home", "explore", "i"].includes(slug.toLowerCase())) {
    return null;
  }

  return {
    connectionStatus: "pending_connection",
    displayName: slug,
    handle: `@${slug.replace(/^@/, "")}`,
    normalizedUrl: `https://x.com/${slug.replace(/^@/, "")}`,
    platform: "x",
    profileUrl: url.toString(),
  };
}

function detectInstagram(url: URL): DiscoveredSocialAccount | null {
  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const slug = segments[0]?.trim();
  if (!slug) {
    return null;
  }

  return {
    connectionStatus: "pending_connection",
    displayName: slug,
    handle: `@${slug.replace(/^@/, "")}`,
    normalizedUrl: `https://www.instagram.com/${slug.replace(/^@/, "")}`,
    platform: "instagram",
    profileUrl: url.toString(),
  };
}

function detectYouTube(url: URL): DiscoveredSocialAccount | null {
  if (!/(^|\.)youtube\.com$/i.test(url.hostname) && !/(^|\.)youtu\.be$/i.test(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const slug = segments.length >= 2 ? segments[1]?.trim() : segments[0]?.trim();
  if (!slug) {
    return null;
  }

  return {
    connectionStatus: "pending_connection",
    displayName: slug.replace(/^@/, ""),
    handle: slug.startsWith("@") ? slug : `@${slug}`,
    normalizedUrl: `${url.origin}/${segments.slice(0, Math.min(2, segments.length)).join("/")}`,
    platform: "youtube",
    profileUrl: url.toString(),
  };
}

function detectFacebook(url: URL): DiscoveredSocialAccount | null {
  if (!/(^|\.)facebook\.com$/i.test(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const slug = segments[0]?.trim();
  if (!slug) {
    return null;
  }

  return {
    connectionStatus: "pending_connection",
    displayName: slug,
    handle: slug,
    normalizedUrl: `https://www.facebook.com/${slug}`,
    platform: "facebook",
    profileUrl: url.toString(),
  };
}

function detectThreads(url: URL): DiscoveredSocialAccount | null {
  if (!/(^|\.)threads\.net$/i.test(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const slug = segments[0]?.trim();
  if (!slug) {
    return null;
  }

  return {
    connectionStatus: "pending_connection",
    displayName: slug.replace(/^@/, ""),
    handle: slug.startsWith("@") ? slug : `@${slug}`,
    normalizedUrl: `https://www.threads.net/${slug.startsWith("@") ? slug : `@${slug}`}`,
    platform: "threads",
    profileUrl: url.toString(),
  };
}

function detectTikTok(url: URL): DiscoveredSocialAccount | null {
  if (!/(^|\.)tiktok\.com$/i.test(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const slug = segments[0]?.trim();
  if (!slug) {
    return null;
  }

  return {
    connectionStatus: "pending_connection",
    displayName: slug.replace(/^@/, ""),
    handle: slug.startsWith("@") ? slug : `@${slug}`,
    normalizedUrl: `https://www.tiktok.com/${slug.startsWith("@") ? slug : `@${slug}`}`,
    platform: "tiktok",
    profileUrl: url.toString(),
  };
}

function detectPinterest(url: URL): DiscoveredSocialAccount | null {
  if (!/(^|\.)pinterest\.com$/i.test(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const slug = segments[0]?.trim();
  if (!slug) {
    return null;
  }

  return {
    connectionStatus: "pending_connection",
    displayName: slug,
    handle: slug,
    normalizedUrl: `https://www.pinterest.com/${slug}`,
    platform: "pinterest",
    profileUrl: url.toString(),
  };
}

export function discoverSocialAccount(profileUrl: string): DiscoveredSocialAccount {
  let normalized: URL;
  try {
    normalized = normalizeUrl(profileUrl);
  } catch {
    throw new Error("Enter a valid social profile URL.");
  }

  const discovery =
    detectLinkedIn(normalized) ??
    detectMedium(normalized) ??
    detectX(normalized) ??
    detectInstagram(normalized) ??
    detectYouTube(normalized) ??
    detectFacebook(normalized) ??
    detectThreads(normalized) ??
    detectTikTok(normalized) ??
    detectPinterest(normalized);

  if (!discovery) {
    throw new Error("Greybrainer could not detect a supported platform from this URL.");
  }

  return discovery;
}
