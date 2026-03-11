import type { ReviewStage, SocialSnippets } from "../types";

const DEFAULT_API_BASE_URL = "/api";

export interface SaveDraftPayload {
  analysis?: unknown;
  blogMarkdown: string;
  createdBy?: string | null;
  editorNotes?: string | null;
  reviewStage?: ReviewStage | string;
  seoDescription?: string | null;
  seoTitle?: string | null;
  socials?: SocialSnippets | null;
  sourcePayload: unknown;
  subjectTitle: string;
}

export interface DraftVersionRecord {
  analysis: unknown;
  analysisObjectKey?: string | null;
  blogMarkdown: string;
  createdAt: string;
  createdBy: string | null;
  draftId: string;
  editorNotes: string | null;
  id: string;
  markdownObjectKey?: string | null;
  socials: SocialSnippets | null;
  socialsObjectKey?: string | null;
  sourcePayload: unknown;
  sourcePayloadObjectKey?: string | null;
  storageBackend?: string;
  versionNo: number;
  video: unknown;
  videoObjectKey?: string | null;
}

export interface PublicationRecord {
  channel: string;
  createdAt: string;
  draftId: string;
  errorMessage: string | null;
  externalId: string | null;
  externalUrl: string | null;
  id: string;
  payload: unknown;
  publishedAt: string | null;
  status: string;
  updatedAt: string;
  versionId: string | null;
}

export interface DraftPublishResult {
  draftId: string;
  results: Array<{
    error?: string;
    externalUrl?: string | null;
    publications?: PublicationRecord[];
    socialAccountId: string;
    status: string;
  }>;
}

export interface WebsitePublishResult {
  canonicalUrl: string;
  draft: DraftRecord;
  knowledgeDocumentId: string;
  publication: {
    channel: string;
    externalId: string;
    externalUrl: string;
    status: string;
    versionId: string;
  };
  slug: string;
  storage: {
    analysisObjectKey: string | null;
    blogObjectKey: string;
    metadataObjectKey: string;
    socialsObjectKey: string | null;
    sourcePayloadObjectKey: string | null;
    versionBaseKey: string;
  };
}

export interface DraftRecord {
  createdAt: string;
  createdBy: string | null;
  currentVersion?: DraftVersionRecord | null;
  currentVersionId: string | null;
  id: string;
  latestVersionNo: number;
  mediumUrl: string | null;
  publications?: PublicationRecord[];
  reviewStage: string | null;
  seoDescription: string | null;
  seoTitle: string | null;
  status: string;
  subjectTitle: string;
  subjectType: string;
  updatedAt: string;
  versions?: DraftVersionRecord[];
  websiteUrl: string | null;
}

export interface PublicationPayload {
  channel: string;
  errorMessage?: string | null;
  externalId?: string | null;
  externalUrl?: string | null;
  payload?: unknown;
  publishedAt?: string | null;
  status: string;
  versionId?: string | null;
}

export interface SocialAccountDiscovery {
  connectionStatus: "pending_connection";
  displayName: string | null;
  handle: string | null;
  normalizedUrl: string;
  platform:
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
  profileUrl: string;
}

export interface SocialAccountRecord {
  connectorKey: string | null;
  accessTokenEncrypted?: string | null;
  connectedAt: string | null;
  connectionStatus: string;
  createdAt: string;
  createdBy: string | null;
  disabledAt: string | null;
  displayName: string | null;
  handle: string | null;
  id: string;
  isDefaultPublishTarget: boolean;
  lastVerifiedAt: string | null;
  lastTestMessage?: string | null;
  lastTestStatus?: string | null;
  normalizedUrl: string;
  oauthState?: string | null;
  platform: string;
  profileUrl: string;
  refreshTokenEncrypted?: string | null;
  remoteAccountId: string | null;
  remoteUserId: string | null;
  tokenExpiresAt?: string | null;
  updatedAt: string;
  workspaceId: string | null;
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

export interface SocialAccountTestResult {
  checkedAt: string;
  details: string;
  ok: boolean;
  status: "ready" | "auth_required" | "disabled";
}

export interface SocialConnectResult {
  connectUrl: string;
  connectorKey: string;
  instructions: string;
}

export interface KnowledgeDocumentRecord {
  articleId: string;
  canonicalUrl: string;
  chunkCount: number;
  createdAt: string;
  htmlObjectKey: string | null;
  id: string;
  ingestionStatus: string;
  markdownObjectKey: string | null;
  publishedAt: string | null;
  rawPayloadObjectKey: string | null;
  sourceAccount: string;
  sourceType: string;
  storageBackend: string;
  title: string;
  updatedAt: string | null;
}

export interface KnowledgeImportJobRecord {
  attemptCount: number;
  canonicalUrl: string | null;
  createdAt: string;
  documentId: string | null;
  errorMessage: string | null;
  id: string;
  lastAttemptedAt: string | null;
  requestedBy: string | null;
  sourceType: string;
  sourceUrl: string;
  status: string;
  title: string | null;
  updatedAt: string;
}

export interface KnowledgeBackfillResult {
  requested: number;
  results: Array<{
    canonicalUrl: string | null;
    documentId?: string | null;
    error?: string;
    sourceUrl: string;
    status: "imported" | "duplicate" | "failed" | "skipped";
    title?: string | null;
  }>;
}

export interface DriveFolderSyncResult {
  folderId: string;
  folderTitle: string | null;
  imported: number;
  results: Array<{
    documentId?: string | null;
    error?: string;
    sourceUrl: string;
    status: "imported" | "duplicate" | "failed" | "skipped";
    title: string;
  }>;
  scanned: number;
}

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_OMNICHANNEL_API_BASE_URL;
  return configured && configured.trim().length > 0 ? configured : DEFAULT_API_BASE_URL;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, init);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `Request failed for ${path}.`);
  }
  return response.json() as Promise<T>;
}

function buildDraftPayload(payload: SaveDraftPayload) {
  return {
    createdBy: payload.createdBy ?? null,
    reviewStage: payload.reviewStage ?? null,
    seoDescription: payload.seoDescription ?? null,
    seoTitle: payload.seoTitle ?? payload.subjectTitle,
    sourcePayload: payload.sourcePayload,
    subjectTitle: payload.subjectTitle,
    version: {
      analysis: payload.analysis ?? null,
      blogMarkdown: payload.blogMarkdown,
      createdBy: payload.createdBy ?? null,
      editorNotes: payload.editorNotes ?? null,
      socials: payload.socials ?? null,
      sourcePayload: payload.sourcePayload,
    },
  };
}

export async function saveDraft(payload: SaveDraftPayload): Promise<DraftRecord> {
  const data = await requestJson<{ draft: DraftRecord }>("/drafts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(buildDraftPayload(payload)),
  });

  return data.draft;
}

export async function saveDraftVersion(draftId: string, payload: SaveDraftPayload): Promise<DraftRecord> {
  const data = await requestJson<{ draft: DraftRecord }>(`/drafts/${draftId}/versions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      analysis: payload.analysis ?? null,
      blogMarkdown: payload.blogMarkdown,
      createdBy: payload.createdBy ?? null,
      editorNotes: payload.editorNotes ?? null,
      socials: payload.socials ?? null,
      sourcePayload: payload.sourcePayload,
    }),
  });

  return data.draft;
}

export async function listDrafts(limit = 20): Promise<DraftRecord[]> {
  const data = await requestJson<{ drafts: DraftRecord[] }>(`/drafts?limit=${limit}`);
  return data.drafts;
}

export async function getDraft(draftId: string): Promise<DraftRecord> {
  const data = await requestJson<{ draft: DraftRecord }>(`/drafts/${draftId}`);
  return data.draft;
}

export async function listDraftVersions(draftId: string): Promise<DraftVersionRecord[]> {
  const data = await requestJson<{ versions: DraftVersionRecord[] }>(`/drafts/${draftId}/versions`);
  return data.versions;
}

export async function updateDraftRecord(
  draftId: string,
  updates: Partial<Pick<DraftRecord, "mediumUrl" | "reviewStage" | "seoDescription" | "seoTitle" | "status" | "subjectTitle" | "websiteUrl">>,
): Promise<DraftRecord> {
  const data = await requestJson<{ draft: DraftRecord }>(`/drafts/${draftId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  return data.draft;
}

export async function upsertDraftPublication(draftId: string, payload: PublicationPayload): Promise<PublicationRecord[]> {
  const data = await requestJson<{ publications: PublicationRecord[] }>(`/drafts/${draftId}/publications`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return data.publications;
}

export async function discoverSocialAccount(profileUrl: string): Promise<SocialAccountDiscovery> {
  const data = await requestJson<{ discovery: SocialAccountDiscovery }>("/social-accounts/discover", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ profileUrl }),
  });

  return data.discovery;
}

export async function listSocialAccounts(): Promise<SocialAccountRecord[]> {
  const data = await requestJson<{ socialAccounts: SocialAccountRecord[] }>("/social-accounts");
  return data.socialAccounts;
}

export async function createSocialAccount(
  input: Pick<SocialAccountDiscovery, "displayName" | "handle" | "normalizedUrl" | "platform" | "profileUrl"> & {
    connectorKey?: string | null;
    connectionStatus?: string;
    createdBy?: string | null;
  },
): Promise<SocialAccountRecord> {
  const data = await requestJson<{ socialAccount: SocialAccountRecord }>("/social-accounts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return data.socialAccount;
}

export async function updateSocialAccountRecord(
  socialAccountId: string,
  updates: Partial<
    Pick<
      SocialAccountRecord,
      "connectionStatus" | "connectorKey" | "displayName" | "handle" | "isDefaultPublishTarget" | "lastVerifiedAt" | "remoteAccountId" | "remoteUserId"
    > & {
      disabledAt?: string | null;
    }
  >,
): Promise<SocialAccountRecord> {
  const data = await requestJson<{ socialAccount: SocialAccountRecord }>(`/social-accounts/${socialAccountId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  return data.socialAccount;
}

export async function testSocialAccountRecord(
  socialAccountId: string,
): Promise<{ socialAccount: SocialAccountRecord; test: SocialAccountTestResult }> {
  return requestJson<{ socialAccount: SocialAccountRecord; test: SocialAccountTestResult }>(`/social-accounts/${socialAccountId}/test`, {
    method: "POST",
  });
}

export async function connectSocialAccountRecord(socialAccountId: string): Promise<SocialConnectResult> {
  return requestJson<SocialConnectResult>(`/social-accounts/${socialAccountId}/connect`, {
    method: "POST",
  });
}

export async function listAiKeys(provider = "gemini"): Promise<AiKeyRecord[]> {
  const data = await requestJson<{ keys: AiKeyRecord[] }>(`/ai-keys?provider=${provider}`);
  return data.keys;
}

export async function saveAiKey(
  input: { provider?: string; ownerEmail?: string | null; rawKey: string; isDefault?: boolean; model?: string | null },
): Promise<AiKeyRecord> {
  const data = await requestJson<{ key: AiKeyRecord }>("/ai-keys", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return data.key;
}

export async function publishDraftToSocialAccounts(draftId: string, socialAccountIds: string[]): Promise<DraftPublishResult> {
  return requestJson<DraftPublishResult>(`/drafts/${draftId}/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ socialAccountIds }),
  });
}

export async function publishDraftToWebsite(
  draftId: string,
  payload: {
    requestedBy?: string | null;
    versionId?: string | null;
    websiteUrl?: string | null;
  },
): Promise<WebsitePublishResult> {
  return requestJson<WebsitePublishResult>(`/drafts/${draftId}/publish-website`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestedBy: payload.requestedBy ?? null,
      versionId: payload.versionId ?? null,
      websiteUrl: payload.websiteUrl ?? null,
    }),
  });
}

export async function listKnowledgeDocuments(limit = 20): Promise<KnowledgeDocumentRecord[]> {
  const data = await requestJson<{ documents: KnowledgeDocumentRecord[] }>(`/knowledge/documents?limit=${limit}`);
  return data.documents;
}

export async function listKnowledgeImportJobs(limit = 20): Promise<KnowledgeImportJobRecord[]> {
  const data = await requestJson<{ jobs: KnowledgeImportJobRecord[] }>(`/knowledge/backfill/jobs?limit=${limit}`);
  return data.jobs;
}

export async function backfillKnowledgeUrls(urls: string[], requestedBy?: string | null): Promise<KnowledgeBackfillResult> {
  return requestJson<KnowledgeBackfillResult>("/knowledge/backfill/urls", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestedBy: requestedBy ?? null,
      urls,
    }),
  });
}

export async function syncDriveFolder(folderUrlOrId: string, requestedBy?: string | null): Promise<DriveFolderSyncResult> {
  return requestJson<DriveFolderSyncResult>("/knowledge/drive/folder/sync", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      folderUrlOrId,
      requestedBy: requestedBy ?? null,
    }),
  });
}
