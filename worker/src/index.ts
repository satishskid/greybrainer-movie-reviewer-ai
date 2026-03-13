import { createDbClient, type Env } from "./lib/db";
import { listAiKeysForProvider, saveAiKey } from "./lib/aiKeyVault";
import { generateDailyBrief } from "./lib/dailyBrief";
import { persistDraftArtifacts } from "./lib/draftStorage";
import { syncSharedDriveFolder } from "./lib/driveKnowledge";
import { backfillMediumUrls } from "./lib/knowledgeBackfill";
import { listKnowledgeDocuments, listKnowledgeImportJobs } from "./lib/knowledgeRepository";
import { syncMediumKnowledgeFeed } from "./lib/mediumKnowledge";
import { handleNativeCallback, publishDraftToSocialAccounts, startNativeConnection } from "./lib/nativeConnectorRuntime";
import { listPublicLensManifest } from "./lib/publicLensManifest";
import { publishDraftToWebsite } from "./lib/websitePublishing";
import { handleWebsitePreviewRoute } from "./lib/websitePreview";
import { createContextEvent, listContextEvents, searchContextEvents } from "./lib/contextRepository";
import {
  createSocialAccount,
  type CreateDraftInput,
  type CreateSocialAccountInput,
  createDraft,
  createDraftVersion,
  type DraftVersionInput,
  getDraftById,
  getSocialAccountById,
  listDraftVersions,
  listDrafts,
  listSocialAccounts,
  type PublicationInput,
  testSocialAccountConnection,
  type UpdateSocialAccountInput,
  type UpdateDraftInput,
  updateSocialAccount,
  updateDraft,
  upsertPublication,
} from "./lib/repository";
import { discoverSocialAccount } from "./lib/socialAccounts";

function corsHeaders() {
  return {
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
    "access-control-allow-origin": "*",
    "access-control-max-age": "86400",
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function badRequest(message: string) {
  return json({ error: message }, 400);
}

function generateEntityId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function toSafeExtension(filename: string, contentType: string | null) {
  const nameMatch = filename.match(/\.([a-z0-9]+)$/i);
  if (nameMatch?.[1]) {
    return nameMatch[1].toLowerCase();
  }
  if (contentType?.startsWith("image/")) {
    return contentType.replace("image/", "");
  }
  return "bin";
}

function toAssetKey(draftId: string, kind: string, filename: string, contentType: string | null) {
  const extension = toSafeExtension(filename, contentType);
  const suffix = crypto.randomUUID().split("-")[0];
  const safeKind = kind.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "asset";
  return `draft-assets/${draftId}/${safeKind}-${Date.now()}-${suffix}.${extension}`;
}

async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function pathSegments(request: Request) {
  return new URL(request.url).pathname.replace(/^\/+|\/+$/g, "").split("/");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (url.pathname === "/preview" || url.pathname === "/preview/" || url.pathname.startsWith("/preview/lens/")) {
      const client = createDbClient(env);
      try {
        const response = await handleWebsitePreviewRoute(client, env.CONTENT_R2, url);
        return response ?? json({ error: "Not found" }, 404);
      } finally {
        client.close();
      }
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        cloudflare: {
          aiGatewayEnabled: Boolean(env.CF_AI_GATEWAY_ACCOUNT_ID?.trim() && env.CF_AI_GATEWAY_GATEWAY_NAME?.trim()),
          dailyBriefEnabled: env.DAILY_BRIEF_ENABLED === "true",
          draftStorageMode: env.DRAFT_STORAGE_MODE ?? "turso",
          fallbackGeminiModel: env.GEMINI_MODEL ?? "gemini-2.5-flash",
          knowledgeStorageMode: env.KNOWLEDGE_STORAGE_MODE ?? "turso",
        },
        service: "greybrainer-omnichannel-api",
        version: env.OMNICHANNEL_API_VERSION ?? "unknown",
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname.startsWith("/api/connect/callback/") && request.method === "GET") {
      const platform = url.pathname.split("/").filter(Boolean).pop() ?? "";
      const client = createDbClient(env);
      try {
        return await handleNativeCallback(client, env, platform, url);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected callback error";
        return new Response(message, { status: 500 });
      } finally {
        client.close();
      }
    }

    const segments = pathSegments(request);
    if (segments[0] !== "api") {
      return json({ error: "Not found" }, 404);
    }

    const client = createDbClient(env);

    try {
      if (segments[1] === "knowledge") {
        if (segments[2] === "drive" && segments[3] === "folder" && segments[4] === "sync" && request.method === "POST") {
          const body = await parseBody<{ folderUrlOrId?: string; requestedBy?: string | null }>(request);
          if (!body?.folderUrlOrId) {
            return badRequest("folderUrlOrId is required.");
          }

          const result = await syncSharedDriveFolder(client, env, {
            folderUrlOrId: body.folderUrlOrId,
            requestedBy: body.requestedBy ?? null,
          });
          return json(result, 201);
        }

        if (segments[2] === "backfill" && segments[3] === "jobs" && request.method === "GET") {
          const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);
          const jobs = await listKnowledgeImportJobs(client, Number.isFinite(limit) ? limit : 20);
          return json({ jobs });
        }

        if (segments[2] === "backfill" && segments[3] === "urls" && request.method === "POST") {
          const body = await parseBody<{ requestedBy?: string | null; urls?: string[] }>(request);
          if (!body?.urls?.length) {
            return badRequest("urls is required.");
          }

          const result = await backfillMediumUrls(client, env, {
            requestedBy: body.requestedBy ?? null,
            urls: body.urls,
          });
          return json(result, 201);
        }

        if (segments[2] === "medium" && segments[3] === "sync" && request.method === "POST") {
          const body = (await parseBody<{ limit?: number; offset?: number }>(request)) ?? undefined;
          const result = await syncMediumKnowledgeFeed(client, env, body);
          return json(result, 201);
        }

        if (segments[2] === "documents" && request.method === "GET") {
          const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);
          const documents = await listKnowledgeDocuments(client, Number.isFinite(limit) ? limit : 20);
          return json({ documents });
        }
      }

      if (segments[1] === "public" && segments[2] === "lens" && segments[3] === "manifest" && request.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
        const entries = await listPublicLensManifest(client, env, Number.isFinite(limit) ? limit : 50);
        return json({ entries });
      }

      // Archive endpoint — filterable list of published entries for the archive page
      if (segments[1] === "public" && segments[2] === "lens" && segments[3] === "archive" && request.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
        const keyword = url.searchParams.get("keyword")?.trim() || null;
        const contentType = url.searchParams.get("type")?.trim() || null;

        const entries = await listPublicLensManifest(client, env, Number.isFinite(limit) ? limit : 50);
        let filtered = entries;
        if (contentType) {
          filtered = filtered.filter((e) => e.contentType === contentType);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          filtered = filtered.filter(
            (e) =>
              e.keywords.some((k) => k.toLowerCase().includes(lower)) ||
              e.tags.some((t) => t.toLowerCase().includes(lower)) ||
              e.title.toLowerCase().includes(lower),
          );
        }

        // Build facets
        const typeCounts: Record<string, number> = {};
        const keywordCounts: Record<string, number> = {};
        for (const e of entries) {
          typeCounts[e.contentType] = (typeCounts[e.contentType] ?? 0) + 1;
          for (const k of e.keywords) {
            keywordCounts[k] = (keywordCounts[k] ?? 0) + 1;
          }
        }

        return json({
          entries: filtered.map((e) => ({
            contentType: e.contentType,
            keywords: e.keywords,
            overallScore: e.overallScore,
            publishedAt: e.publishedAt,
            slug: e.slug,
            summaryHook: e.summaryHook,
            thumbnailImageUrl: e.thumbnailImageUrl,
            title: e.title,
            websiteUrl: e.websiteUrl,
          })),
          facets: { keywords: keywordCounts, types: typeCounts },
          total: filtered.length,
        });
      }

      if (segments[1] === "context") {
        if (segments[2] === "events") {
          if (request.method === "GET") {
            const sessionId = url.searchParams.get("sessionId");
            if (!sessionId) {
              return badRequest("sessionId is required.");
            }
            const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);
            const events = await listContextEvents(client, sessionId, Number.isFinite(limit) ? limit : 20);
            return json({ events });
          }

          if (request.method === "POST") {
            const body = await parseBody<{
              sessionId?: string;
              eventType?: string;
              actor?: string | null;
              content?: string;
              payload?: unknown;
            }>(request);
            if (!body?.sessionId || !body?.eventType || !body?.content) {
              return badRequest("sessionId, eventType, and content are required.");
            }
            const event = await createContextEvent(client, {
              sessionId: body.sessionId,
              eventType: body.eventType,
              actor: body.actor ?? null,
              content: body.content,
              payload: body.payload ?? null,
            });
            return json({ event }, 201);
          }
        }

        if (segments[2] === "search" && request.method === "POST") {
          const body = await parseBody<{ query?: string; sessionId?: string | null; limit?: number }>(request);
          if (!body?.query) {
            return badRequest("query is required.");
          }
          const limit = Math.min(Number(body.limit ?? 12), 50);
          const events = await searchContextEvents(client, body.query, body.sessionId ?? null, Number.isFinite(limit) ? limit : 12);
          return json({ events });
        }
      }

      if (segments[1] === "assets") {
        if (segments[2] === "upload" && request.method === "POST") {
          if (!env.CONTENT_R2) {
            return badRequest("CONTENT_R2 is not configured.");
          }
          const formData = await request.formData();
          const draftId = String(formData.get("draftId") ?? "").trim();
          if (!draftId) {
            return badRequest("draftId is required.");
          }
          const kind = String(formData.get("kind") ?? "asset").trim();
          const file = formData.get("file");
          if (!file || !(file instanceof File)) {
            return badRequest("file is required.");
          }
          if (!file.type.startsWith("image/")) {
            return badRequest("Only image uploads are supported.");
          }
          const maxBytes = 12 * 1024 * 1024;
          if (file.size > maxBytes) {
            return badRequest("Image size exceeds 12MB limit.");
          }
          const key = toAssetKey(draftId, kind, file.name || "asset", file.type || null);
          await env.CONTENT_R2.put(key, await file.arrayBuffer(), {
            httpMetadata: {
              contentType: file.type || "application/octet-stream",
            },
            customMetadata: {
              draftId,
              kind,
              originalName: file.name || "asset",
            },
          });
          const origin = new URL(request.url).origin;
          const url = `${origin}/api/assets/${encodeURIComponent(key)}`;
          return json(
            {
              key,
              url,
              contentType: file.type || null,
              size: file.size,
            },
            201,
          );
        }

        if (segments.length >= 3 && request.method === "GET") {
          if (!env.CONTENT_R2) {
            return badRequest("CONTENT_R2 is not configured.");
          }
          const key = decodeURIComponent(segments.slice(2).join("/"));
          const object = await env.CONTENT_R2.get(key);
          if (!object) {
            return json({ error: "Asset not found" }, 404);
          }
          const headers = new Headers({
            ...corsHeaders(),
            "cache-control": "public, max-age=31536000, immutable",
            "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
          });
          return new Response(object.body, { status: 200, headers });
        }
      }

      if (segments[1] === "daily-brief" && segments[2] === "generate" && request.method === "POST") {
        const body = await parseBody<{ force?: boolean; requestedBy?: string | null; timezone?: string | null }>(request);
        const result = await generateDailyBrief(client, env, {
          force: body?.force ?? false,
          requestedBy: body?.requestedBy ?? null,
          timezone: body?.timezone ?? null,
        });
        return json(result, result.status === "generated" ? 201 : 200);
      }

      if (segments[1] === "system" && segments[2] === "status" && request.method === "GET") {
        const geminiKeys = await listAiKeysForProvider(client, "gemini");
        const activeKey = geminiKeys.find((key) => key.isDefault) ?? geminiKeys[0] ?? null;
        return json({
          activeKey: activeKey
            ? {
                id: activeKey.id,
                isDefault: activeKey.isDefault,
                keyHint: activeKey.keyHint,
                lastFailureAt: activeKey.lastFailureAt ?? null,
                lastFailureCode: activeKey.lastFailureCode ?? null,
                lastFailureReason: activeKey.lastFailureReason ?? null,
                lastQuotaExhaustedAt: activeKey.lastQuotaExhaustedAt ?? null,
                lastSuccessAt: activeKey.lastSuccessAt ?? null,
                lastUsedAt: activeKey.lastUsedAt ?? null,
                model: activeKey.model ?? env.GEMINI_MODEL ?? "gemini-2.5-flash",
                ownerEmail: activeKey.ownerEmail ?? null,
                runtimeStatus: activeKey.runtimeStatus ?? "unknown",
              }
            : null,
          backend: {
            apiVersion: env.OMNICHANNEL_API_VERSION ?? "unknown",
            draftStorageMode: env.DRAFT_STORAGE_MODE ?? "turso",
            knowledgeStorageMode: env.KNOWLEDGE_STORAGE_MODE ?? "turso",
            websiteBaseUrl: env.WEBSITE_BASE_URL ?? null,
          },
          dailyBrief: {
            byokKeyCount: geminiKeys.length,
            fallbackModel: env.GEMINI_MODEL ?? "gemini-2.5-flash",
            scheduleEnabled: env.DAILY_BRIEF_ENABLED === "true",
            timezone: env.DAILY_BRIEF_TIMEZONE ?? "Asia/Kolkata",
          },
          gateway: {
            accountIdConfigured: Boolean(env.CF_AI_GATEWAY_ACCOUNT_ID?.trim()),
            enabled: Boolean(env.CF_AI_GATEWAY_ACCOUNT_ID?.trim() && env.CF_AI_GATEWAY_GATEWAY_NAME?.trim()),
            gatewayName: env.CF_AI_GATEWAY_GATEWAY_NAME ?? null,
            tokenConfigured: Boolean(env.CF_AI_GATEWAY_TOKEN?.trim()),
          },
          gemini: {
            serverKeyConfigured: Boolean(env.GEMINI_API_KEY?.trim()),
          },
          workersAi: {
            enabled: Boolean(env.AI),
            fallbackModel: env.WORKERS_AI_FALLBACK_MODEL ?? "@cf/meta/llama-3.1-8b-instruct",
          },
          ok: true,
          timestamp: new Date().toISOString(),
        });
      }

      if (segments[1] === "ai-keys") {
        if (segments.length === 2 && request.method === "GET") {
          const provider = url.searchParams.get("provider") ?? "gemini";
          const keys = await listAiKeysForProvider(client, provider);
          return json({ keys });
        }

        if (segments.length === 2 && request.method === "POST") {
          const body = await parseBody<{ provider?: string; ownerEmail?: string | null; rawKey?: string; isDefault?: boolean; model?: string | null }>(request);
          if (!body?.rawKey) {
            return badRequest("rawKey is required.");
          }
          const record = await saveAiKey(client, env, {
            provider: body.provider ?? "gemini",
            ownerEmail: body.ownerEmail ?? null,
            model: body.model ?? null,
            rawKey: body.rawKey,
            isDefault: body.isDefault ?? true,
          });
          return json({ key: record }, 201);
        }
      }

      if (segments[1] === "social-accounts") {
        if (segments.length === 3 && segments[2] === "discover" && request.method === "POST") {
          const body = await parseBody<{ profileUrl?: string }>(request);
          if (!body?.profileUrl) {
            return badRequest("profileUrl is required.");
          }

          const discovery = discoverSocialAccount(body.profileUrl);
          return json({ discovery });
        }

        if (segments.length === 2) {
          if (request.method === "GET") {
            const socialAccounts = await listSocialAccounts(client);
            return json({ socialAccounts });
          }

          if (request.method === "POST") {
            const body = await parseBody<CreateSocialAccountInput>(request);
            if (!body?.platform || !body?.profileUrl || !body?.normalizedUrl) {
              return badRequest("platform, profileUrl, and normalizedUrl are required.");
            }

            const socialAccount = await createSocialAccount(client, body);
            return json({ socialAccount }, 201);
          }
        }

        if (segments.length === 3) {
          const socialAccountId = segments[2];

          if (request.method === "GET") {
            const socialAccount = await getSocialAccountById(client, socialAccountId);
            return socialAccount ? json({ socialAccount }) : json({ error: "Social account not found" }, 404);
          }

          if (request.method === "PATCH") {
            const body = await parseBody<UpdateSocialAccountInput>(request);
            if (!body) {
              return badRequest("JSON body is required.");
            }

            const socialAccount = await updateSocialAccount(client, socialAccountId, body);
            return socialAccount ? json({ socialAccount }) : json({ error: "Social account not found" }, 404);
          }
        }

        if (segments.length === 4 && segments[3] === "test" && request.method === "POST") {
          const result = await testSocialAccountConnection(client, segments[2]);
          return result ? json(result) : json({ error: "Social account not found" }, 404);
        }

        if (segments.length === 4 && segments[3] === "connect" && request.method === "POST") {
          const result = await startNativeConnection(client, env, segments[2]);
          return json(result);
        }
      }

      if (segments[1] !== "drafts") {
        return json({ error: "Not found" }, 404);
      }

      if (segments.length === 2) {
        if (request.method === "GET") {
          const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);
          const drafts = await listDrafts(client, Number.isFinite(limit) ? limit : 20);
          return json({ drafts });
        }

        if (request.method === "POST") {
          const body = await parseBody<CreateDraftInput>(request);
          if (!body || !body.subjectTitle || !body.version?.blogMarkdown) {
            return badRequest("subjectTitle and version.blogMarkdown are required.");
          }

          const draftId = body.draftId ?? generateEntityId("draft");
          const versionId = body.version.id ?? generateEntityId("version");
          const versionNo = body.version.versionNo ?? 1;
          const artifactResult = await persistDraftArtifacts(env, {
            analysis: body.version.analysis ?? null,
            blogMarkdown: body.version.blogMarkdown,
            draftId,
            socials: body.version.socials ?? null,
            sourcePayload: body.version.sourcePayload ?? body.sourcePayload ?? {},
            versionId,
            versionNo,
            video: body.version.video ?? null,
          });
          const draft = await createDraft(client, {
            ...body,
            draftId,
            version: {
              ...body.version,
              analysisObjectKey: artifactResult.analysisObjectKey,
              id: versionId,
              markdownObjectKey: artifactResult.markdownObjectKey,
              socialsObjectKey: artifactResult.socialsObjectKey,
              sourcePayloadObjectKey: artifactResult.sourcePayloadObjectKey,
              storageBackend: artifactResult.storageBackend,
              versionNo,
              videoObjectKey: artifactResult.videoObjectKey,
            },
          });
          return json({ draft }, 201);
        }
      }

      if (segments.length === 3) {
        const draftId = segments[2];

        if (request.method === "GET") {
          const draft = await getDraftById(client, draftId);
          return draft ? json({ draft }) : json({ error: "Draft not found" }, 404);
        }

        if (request.method === "PATCH") {
          const body = await parseBody<UpdateDraftInput>(request);
          if (!body) {
            return badRequest("JSON body is required.");
          }

          const draft = await updateDraft(client, draftId, body);
          return draft ? json({ draft }) : json({ error: "Draft not found" }, 404);
        }
      }

      if (segments.length === 4 && segments[3] === "versions" && request.method === "POST") {
        const body = await parseBody<DraftVersionInput>(request);
        if (!body || !body.blogMarkdown) {
          return badRequest("blogMarkdown is required.");
        }

        const existingDraft = await getDraftById(client, segments[2]);
        if (!existingDraft) {
          return json({ error: "Draft not found" }, 404);
        }

        const versionId = body.id ?? generateEntityId("version");
        const versionNo = body.versionNo ?? existingDraft.latestVersionNo + 1;
        const artifactResult = await persistDraftArtifacts(env, {
          analysis: body.analysis ?? null,
          blogMarkdown: body.blogMarkdown,
          draftId: segments[2],
          socials: body.socials ?? null,
          sourcePayload: body.sourcePayload ?? {},
          versionId,
          versionNo,
          video: body.video ?? null,
        });
        const draft = await createDraftVersion(client, segments[2], {
          ...body,
          analysisObjectKey: artifactResult.analysisObjectKey,
          id: versionId,
          markdownObjectKey: artifactResult.markdownObjectKey,
          socialsObjectKey: artifactResult.socialsObjectKey,
          sourcePayloadObjectKey: artifactResult.sourcePayloadObjectKey,
          storageBackend: artifactResult.storageBackend,
          versionNo,
          videoObjectKey: artifactResult.videoObjectKey,
        });
        return draft ? json({ draft }, 201) : json({ error: "Draft not found" }, 404);
      }

      if (segments.length === 4 && segments[3] === "versions" && request.method === "GET") {
        const versions = await listDraftVersions(client, segments[2]);
        return versions ? json({ versions }) : json({ error: "Draft not found" }, 404);
      }

      if (segments.length === 4 && segments[3] === "publications") {
        if (request.method === "GET") {
          const draft = await getDraftById(client, segments[2]);
          return draft ? json({ publications: draft.publications }) : json({ error: "Draft not found" }, 404);
        }

        if (request.method === "POST") {
          const body = await parseBody<PublicationInput>(request);
          if (!body || !body.channel || !body.status) {
            return badRequest("channel and status are required.");
          }

          const publications = await upsertPublication(client, segments[2], body);
          return publications ? json({ publications }, 201) : json({ error: "Draft not found" }, 404);
        }
      }

      if (segments.length === 4 && segments[3] === "publish" && request.method === "POST") {
        const body = await parseBody<{ socialAccountIds?: string[] }>(request);
        if (!body?.socialAccountIds?.length) {
          return badRequest("socialAccountIds is required.");
        }

        const result = await publishDraftToSocialAccounts(client, env, segments[2], body.socialAccountIds);
        return json(result, 201);
      }

      if (segments.length === 4 && segments[3] === "publish-website" && request.method === "POST") {
        const body = await parseBody<{ requestedBy?: string | null; versionId?: string | null; websiteUrl?: string | null; skipKnowledge?: boolean }>(
          request,
        );
        const result = await publishDraftToWebsite(client, env, {
          draftId: segments[2],
          requestedBy: body?.requestedBy ?? null,
          versionId: body?.versionId ?? null,
          websiteUrl: body?.websiteUrl ?? null,
          skipKnowledge: body?.skipKnowledge ?? false,
        });
        return json(result, 201);
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected worker error";
      return json({ error: message }, 500);
    } finally {
      client.close();
    }
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const client = createDbClient(env);
    try {
      await syncMediumKnowledgeFeed(client, env);
      if (env.DAILY_BRIEF_ENABLED === "true") {
        await generateDailyBrief(client, env, { requestedBy: "system:daily-brief" });
      }
    } finally {
      client.close();
    }
  },
};
