import type { Client } from "@libsql/client";
import type { Env } from "./db";
import { persistDraftArtifacts } from "./draftStorage";
import { listKnowledgeBriefs } from "./knowledgeRepository";
import {
  createDraft,
  createDraftVersion,
  getAiKeyEncrypted,
  getDefaultAiKey,
  getDraftBySubjectTypeAndReviewStage,
  recordAiKeyRuntimeStatus,
  updateDraft,
} from "./repository";
import { decryptSecret } from "./tokenCrypto";

interface DailyBriefResult {
  generationMode?: "gemini" | "workers-ai-fallback";
  status: "generated" | "skipped" | "failed";
  dateKey: string;
  dateLabel: string;
  draftId?: string;
  message?: string;
}

interface DailyBriefOptions {
  force?: boolean;
  requestedBy?: string | null;
  timezone?: string | null;
}

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

function nowIso() {
  return new Date().toISOString();
}

function getGeminiRequestConfig(env: Env, model: string, apiKey: string) {
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
      url: `https://gateway.ai.cloudflare.com/v1/${gatewayAccountId}/${gatewayName}/google-ai-studio/v1beta/models/${model}:generateContent`,
      via: "cloudflare-ai-gateway",
    };
  }

  return {
    headers: {
      "content-type": "application/json",
    },
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    via: "google-ai-studio",
  };
}

function formatDateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function isGeminiQuotaError(status: number, text: string) {
  const lower = text.toLowerCase();
  return status === 429 || lower.includes("resource_exhausted") || lower.includes("quota");
}

async function callWorkersAiFallback(env: Env, prompt: string) {
  if (!env.AI) {
    throw new Error("Workers AI fallback is not configured.");
  }

  const model = env.WORKERS_AI_FALLBACK_MODEL ?? DEFAULT_WORKERS_AI_MODEL;
  const fallbackPrompt = `
You are supporting the Greybrainer editorial desk during a premium-model quota outage.

Produce a useful fallback draft for editors. Be careful, structured, and concise.
Do not fabricate certainty. Use phrases like "signals", "appears", and "editor should verify" where necessary.

Return valid JSON only using this schema:
{
  "blog_markdown": "...full markdown including the LENS_NARRATIVE block and an editor note that this is a fallback draft...",
  "seo_title": "...",
  "seo_description": "...",
  "socials": {
    "x_thread": ["...","..."],
    "linkedin_post": "..."
  }
}

Source prompt:
${prompt}
`.trim();

  const response = (await env.AI.run(model as keyof AiModels, {
    prompt: fallbackPrompt,
  })) as { response?: string } | string;

  const text = typeof response === "string" ? response : response.response ?? "";
  if (!text) {
    throw new Error("Workers AI fallback returned an empty response.");
  }

  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as {
    blog_markdown: string;
    seo_title?: string;
    seo_description?: string;
    socials?: { x_thread?: string[]; linkedin_post?: string };
  };

  if (!parsed.blog_markdown) {
    throw new Error("Workers AI fallback response missing blog_markdown.");
  }

  return parsed;
}

function buildPrompt(input: {
  dateLabel: string;
  pastArticles: Array<{ title: string; canonicalUrl: string; summary: string | null }>;
}) {
  const pastContext = input.pastArticles
    .map((article, index) => `${index + 1}. ${article.title} — ${article.summary ?? "No summary"} (${article.canonicalUrl})`)
    .join("\n");

  return `
You are the Greybrainer daily editor. Produce ONE daily brief draft for ${input.dateLabel}.

Goal:
- Create a Lens daily intelligence brief for Indian movie/OTT audiences.
- Include the required tag block exactly as shown.
- Provide 3 sections: Trending Now, Critical View, Social Spark.
- End with a short optimization note about how this brief should connect to existing GreyBrainer Medium posts.

Constraints:
- This is a draft for editors. Avoid claiming real-world facts you cannot verify.
- Use cautious language ("signals", "appears", "early chatter") when unsure.
- Keep it concise and scannable.
- Start the draft with this exact opening sentence (use the date provided):
  "As your smart editor monitoring the pulse of the Indian audience on ${input.dateLabel}, I see a distinct mid-week pivot. We are moving away from the Action Fatigue of early March toward Institutional Dissent and Moral Anatomy. Following your SEO team’s diagnostic to bridge the gap between Cultural Theorist and Algorithm-Friendly Utility, here is your freshly curated intelligence brief."

Required tag block:
[[LENS_NARRATIVE:
🎬 Today's Morning Brief: ${input.dateLabel}

Trending Now
Movie Name (Platform): Short summary.

Critical View
Movie Name (Platform): Why it matters.

The Social Spark
Topic: One or two lines.
]]

Past GreyBrainer Medium context (use for optimization guidance):
${pastContext || "No past posts provided."}

Also return:
- A "keywords" array of 5-10 key terms from this brief (movie titles, platform names like Netflix/Prime Video, cultural themes, genre tags, trending topics).
- A "summary_hook" string — one punchy sentence (max 150 characters) capturing the essence of today's brief for a hero card overlay.

Output must be valid JSON with this schema:
{
  "blog_markdown": "...full markdown including the LENS_NARRATIVE tag block and an Optimization section...",
  "seo_title": "...",
  "seo_description": "...",
  "keywords": ["OTT", "Netflix", "Pan-Indian", "...up to 10 terms..."],
  "summary_hook": "Short punchy sentence for the hero card (max 150 chars)",
  "socials": {
    "x_thread": ["...","..."],
    "linkedin_post": "..."
  }
}
`.trim();
}

async function callGemini(client: Client, env: Env, prompt: string) {
  let apiKey = null;
  let activeKeyId: string | null = null;
  let selectedModel = env.GEMINI_MODEL ?? DEFAULT_MODEL;
  if (env.SOCIAL_TOKEN_ENCRYPTION_KEY) {
    const defaultKey = await getDefaultAiKey(client, "gemini");
    if (defaultKey) {
      activeKeyId = defaultKey.id;
      const encrypted = await getAiKeyEncrypted(client, defaultKey.id);
      if (encrypted) {
        apiKey = await decryptSecret(encrypted, env.SOCIAL_TOKEN_ENCRYPTION_KEY);
      }
      if (defaultKey.model) {
        selectedModel = defaultKey.model;
      }
    }
  }
  if (!apiKey) {
    apiKey = env.GEMINI_API_KEY ?? null;
  }
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Store GEMINI_API_KEY or save a BYOK key in the daily brief vault.");
  }

  const requestConfig = getGeminiRequestConfig(env, selectedModel, apiKey);
  const usedAt = nowIso();

  const response = await fetch(requestConfig.url, {
    method: "POST",
    headers: requestConfig.headers,
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const quotaExhausted = isGeminiQuotaError(response.status, errorText);
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

    if (quotaExhausted && env.AI) {
      const fallback = await callWorkersAiFallback(env, prompt);
      return {
        ...fallback,
        generationMode: "workers-ai-fallback" as const,
      };
    }

    throw new Error(`Gemini daily brief failed via ${requestConfig.via}: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) {
    throw new Error("Gemini returned an empty daily brief response.");
  }

  let parsed: {
    blog_markdown: string;
    keywords?: string[];
    seo_title?: string;
    seo_description?: string;
    summary_hook?: string;
    socials?: { x_thread?: string[]; linkedin_post?: string };
  };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini response was not valid JSON.");
  }

  if (!parsed.blog_markdown) {
    throw new Error("Gemini response missing blog_markdown.");
  }

  if (activeKeyId) {
    await recordAiKeyRuntimeStatus(client, {
      keyId: activeKeyId,
      lastSuccessAt: usedAt,
      lastUsedAt: usedAt,
      status: "healthy",
    });
  }

  return {
    ...parsed,
    generationMode: "gemini" as const,
  };
}

export async function generateDailyBrief(
  client: Client,
  env: Env,
  options?: DailyBriefOptions,
): Promise<DailyBriefResult> {
  const now = new Date();
  const timeZone = options?.timezone ?? env.DAILY_BRIEF_TIMEZONE ?? DEFAULT_TIMEZONE;
  const dateKey = formatDateKey(now, timeZone);
  const dateLabel = formatDateLabel(now, timeZone);
  const subjectType = "daily-brief";

  const existing = await getDraftBySubjectTypeAndReviewStage(client, subjectType, dateKey);
  if (existing && !options?.force) {
    return {
      status: "skipped",
      dateKey,
      dateLabel,
      draftId: existing.id,
      message: "Daily brief already exists for today.",
    };
  }

  const pastArticles = await listKnowledgeBriefs(client, 6);
  const prompt = buildPrompt({ dateLabel, pastArticles });
  const generated = await callGemini(client, env, prompt);
  if (!generated.blog_markdown.includes("[[LENS_NARRATIVE:")) {
    const tagBlock = `[[LENS_NARRATIVE:\n🎬 Today's Morning Brief: ${dateLabel}\n\nTrending Now\n- TBD (Platform): Brief summary.\n\nCritical View\n- TBD (Platform): Why it matters.\n\nThe Social Spark\n- TBD: One or two lines.\n]]\n\n`;
    generated.blog_markdown = `${tagBlock}${generated.blog_markdown}`;
  }
  if (generated.generationMode === "workers-ai-fallback" && !generated.blog_markdown.includes("Fallback note for editor")) {
    generated.blog_markdown = `${generated.blog_markdown}\n\n> Fallback note for editor: This draft was scaffolded with Workers AI because the current Gemini key hit quota limits. Please run a premium pass when a fresh Gemini key is available.\n`;
  }
  // Extract keywords and summary hook from AI output (with fallbacks)
  const keywords = Array.isArray(generated.keywords) && generated.keywords.length
    ? generated.keywords.slice(0, 10)
    : extractKeywordsFromMarkdown(generated.blog_markdown);
  const summaryHook = (generated.summary_hook ?? "").slice(0, 160) || extractSummaryHook(generated.blog_markdown);
  const sectionAnchors = parseSectionAnchors(generated.blog_markdown);
  const readingMetadata = {
    estimatedReadTime: estimateReadTime(generated.blog_markdown),
    sectionAnchors,
    relatedSlugs: [] as string[],
  };

  const subjectTitle = `GreyBrain Intelligence Brief — ${dateLabel}`;

  const draftId = `draft_daily_${dateKey.replace(/-/g, "")}`;
  const versionId = `version_daily_${dateKey.replace(/-/g, "")}_${crypto.randomUUID().replace(/-/g, "")}`;
  const versionNo = existing ? existing.latestVersionNo + 1 : 1;

  const artifacts = await persistDraftArtifacts(env, {
    analysis: { type: "daily-brief", generatedAt: nowIso(), promptVersion: "v1", generationMode: generated.generationMode },
    blogMarkdown: generated.blog_markdown,
    draftId,
    keywords,
    readingMetadata,
    socials: generated.socials ?? null,
    sourcePayload: {
      dateKey,
      dateLabel,
      type: "daily-brief",
      timezone: timeZone,
    },
    versionId,
    versionNo,
    video: null,
  });

  const draft = existing
    ? await (async () => {
        await updateDraft(client, existing.id, {
          heroPriority: 100,
          isHeroCandidate: true,
          reviewStage: dateKey,
          seoDescription: generated.seo_description ?? null,
          seoTitle: generated.seo_title ?? subjectTitle,
          status: "editing",
          subjectTitle,
        });
        return createDraftVersion(client, existing.id, {
          analysis: { type: "daily-brief", generatedAt: nowIso(), refreshed: true, generationMode: generated.generationMode },
          analysisObjectKey: artifacts.analysisObjectKey,
          blogMarkdown: generated.blog_markdown,
          createdBy: options?.requestedBy ?? "system:daily-brief",
          id: versionId,
          keywordsJson: JSON.stringify(keywords),
          markdownObjectKey: artifacts.markdownObjectKey,
          readingMetadataJson: JSON.stringify(readingMetadata),
          socials: generated.socials ?? null,
          socialsObjectKey: artifacts.socialsObjectKey,
          sourcePayload: {
            dateKey,
            dateLabel,
            type: "daily-brief",
            timezone: timeZone,
          },
          sourcePayloadObjectKey: artifacts.sourcePayloadObjectKey,
          storageBackend: artifacts.storageBackend,
          summaryHook: summaryHook,
          versionNo,
          video: null,
          videoObjectKey: artifacts.videoObjectKey,
        });
      })()
    : await createDraft(client, {
        createdBy: options?.requestedBy ?? "system:daily-brief",
        draftId,
        heroPriority: 100,
        isHeroCandidate: true,
        reviewStage: dateKey,
        seoDescription: generated.seo_description ?? null,
        seoTitle: generated.seo_title ?? subjectTitle,
        sourcePayload: {
          dateKey,
          dateLabel,
          type: "daily-brief",
          timezone: timeZone,
        },
        status: "generated",
        subjectTitle,
        subjectType,
        version: {
          analysis: { type: "daily-brief", generatedAt: nowIso(), generationMode: generated.generationMode },
          analysisObjectKey: artifacts.analysisObjectKey,
          blogMarkdown: generated.blog_markdown,
          createdBy: options?.requestedBy ?? "system:daily-brief",
          id: versionId,
          keywordsJson: JSON.stringify(keywords),
          markdownObjectKey: artifacts.markdownObjectKey,
          readingMetadataJson: JSON.stringify(readingMetadata),
          socials: generated.socials ?? null,
          socialsObjectKey: artifacts.socialsObjectKey,
          sourcePayload: {
            dateKey,
            dateLabel,
            type: "daily-brief",
            timezone: timeZone,
          },
          sourcePayloadObjectKey: artifacts.sourcePayloadObjectKey,
          storageBackend: artifacts.storageBackend,
          summaryHook: summaryHook,
          versionNo,
          video: null,
          videoObjectKey: artifacts.videoObjectKey,
        },
      });

  if (!draft) {
    return {
      status: "failed",
      dateKey,
      dateLabel,
      message: "Failed to persist daily brief draft.",
    };
  }

  return {
    generationMode: generated.generationMode,
    status: "generated",
    dateKey,
    dateLabel,
    draftId: draft.id,
  };
}

/** Fallback: extract keywords from markdown via bold text, proper nouns, and known terms */
function extractKeywordsFromMarkdown(markdown: string): string[] {
  const keywords = new Set<string>();

  // Extract bold text (**keyword**)
  const boldMatches = markdown.matchAll(/\*\*([^*]{2,40})\*\*/g);
  for (const m of boldMatches) {
    const term = m[1].trim();
    if (term.length > 2 && term.length < 40) {
      keywords.add(term);
    }
  }

  // Known platform/industry terms
  const knownTerms = [
    "Netflix", "Prime Video", "Disney+ Hotstar", "JioCinema", "Zee5",
    "SonyLIV", "MX Player", "OTT", "Pan-Indian", "Bollywood", "Tollywood",
    "Kollywood", "Box Office", "IMAX",
  ];
  for (const term of knownTerms) {
    if (markdown.toLowerCase().includes(term.toLowerCase())) {
      keywords.add(term);
    }
  }

  return Array.from(keywords).slice(0, 10);
}

/** Fallback: extract first meaningful sentence as summary hook */
function extractSummaryHook(markdown: string): string {
  const paragraphs = markdown
    .replace(/\[\[LENS_NARRATIVE:[\s\S]*?\]\]/g, "")
    .split(/\n{2,}/)
    .map((p) => p.replace(/^#+\s+/gm, "").replace(/\*\*/g, "").trim())
    .filter((p) => p.length > 40 && !p.startsWith(">"));

  const first = paragraphs[0] ?? "";
  if (first.length <= 160) return first;

  const sentenceEnd = first.indexOf(".", 60);
  return sentenceEnd > 0 ? first.slice(0, sentenceEnd + 1) : first.slice(0, 157) + "...";
}

/** Parse markdown headings into section anchors */
function parseSectionAnchors(markdown: string): Array<{ id: string; label: string; wordCount: number }> {
  const anchors: Array<{ id: string; label: string; wordCount: number }> = [];
  const sections = markdown.split(/^(#{2,3})\s+(.+)$/gm);

  for (let i = 1; i < sections.length; i += 3) {
    const heading = sections[i + 1]?.trim();
    const body = sections[i + 2] ?? "";
    if (!heading) continue;

    const id = heading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    anchors.push({ id, label: heading, wordCount });
  }

  return anchors;
}

/** Estimate read time from markdown content */
function estimateReadTime(markdown: string): string {
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 230));
  return `${minutes} min read`;
}
