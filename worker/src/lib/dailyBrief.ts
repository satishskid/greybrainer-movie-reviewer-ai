import type { Client } from "@libsql/client";
import { createDbClient, type Env } from "./db";
import { persistDraftArtifacts } from "./draftStorage";
import { listKnowledgeBriefs } from "./knowledgeRepository";
import {
  createDraft,
  createDraftVersion,
  getAiKeyEncrypted,
  getDefaultAiKey,
  getDraftBySubjectTypeAndReviewStage,
  updateDraft,
} from "./repository";
import { decryptSecret } from "./tokenCrypto";

interface DailyBriefResult {
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

Output must be valid JSON with this schema:
{
  "blog_markdown": "...full markdown including the LENS_NARRATIVE tag block and an Optimization section...",
  "seo_title": "...",
  "seo_description": "...",
  "socials": {
    "x_thread": ["...","..."],
    "linkedin_post": "..."
  }
}
`.trim();
}

async function callGemini(env: Env, prompt: string) {
  let apiKey = null;
  let selectedModel = env.GEMINI_MODEL ?? DEFAULT_MODEL;
  if (env.SOCIAL_TOKEN_ENCRYPTION_KEY) {
    const client = createDbClient(env);
    try {
      const defaultKey = await getDefaultAiKey(client, "gemini");
      if (defaultKey) {
        const encrypted = await getAiKeyEncrypted(client, defaultKey.id);
        if (encrypted) {
          apiKey = await decryptSecret(encrypted, env.SOCIAL_TOKEN_ENCRYPTION_KEY);
        }
        if (defaultKey.model) {
          selectedModel = defaultKey.model;
        }
      }
    } finally {
      client.close();
    }
  }
  if (!apiKey) {
    apiKey = env.GEMINI_API_KEY ?? null;
  }
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Store GEMINI_API_KEY or save a BYOK key in the daily brief vault.");
  }

  const requestConfig = getGeminiRequestConfig(env, selectedModel, apiKey);

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
    seo_title?: string;
    seo_description?: string;
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

  return parsed;
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
  const generated = await callGemini(env, prompt);
  if (!generated.blog_markdown.includes("[[LENS_NARRATIVE:")) {
    const tagBlock = `[[LENS_NARRATIVE:\n🎬 Today's Morning Brief: ${dateLabel}\n\nTrending Now\n- TBD (Platform): Brief summary.\n\nCritical View\n- TBD (Platform): Why it matters.\n\nThe Social Spark\n- TBD: One or two lines.\n]]\n\n`;
    generated.blog_markdown = `${tagBlock}${generated.blog_markdown}`;
  }
  const subjectTitle = `GreyBrain Intelligence Brief — ${dateLabel}`;

  const draftId = `draft_daily_${dateKey.replace(/-/g, "")}`;
  const versionId = `version_daily_${dateKey.replace(/-/g, "")}_${crypto.randomUUID().replace(/-/g, "")}`;
  const versionNo = existing ? existing.latestVersionNo + 1 : 1;

  const artifacts = await persistDraftArtifacts(env, {
    analysis: { type: "daily-brief", generatedAt: nowIso(), promptVersion: "v1" },
    blogMarkdown: generated.blog_markdown,
    draftId,
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
          reviewStage: dateKey,
          seoDescription: generated.seo_description ?? null,
          seoTitle: generated.seo_title ?? subjectTitle,
          status: "editing",
          subjectTitle,
        });
        return createDraftVersion(client, existing.id, {
          analysis: { type: "daily-brief", generatedAt: nowIso(), refreshed: true },
          analysisObjectKey: artifacts.analysisObjectKey,
          blogMarkdown: generated.blog_markdown,
          createdBy: options?.requestedBy ?? "system:daily-brief",
          id: versionId,
          markdownObjectKey: artifacts.markdownObjectKey,
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
          versionNo,
          video: null,
          videoObjectKey: artifacts.videoObjectKey,
        });
      })()
    : await createDraft(client, {
        createdBy: options?.requestedBy ?? "system:daily-brief",
        draftId,
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
          analysis: { type: "daily-brief", generatedAt: nowIso() },
          analysisObjectKey: artifacts.analysisObjectKey,
          blogMarkdown: generated.blog_markdown,
          createdBy: options?.requestedBy ?? "system:daily-brief",
          id: versionId,
          markdownObjectKey: artifacts.markdownObjectKey,
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
    status: "generated",
    dateKey,
    dateLabel,
    draftId: draft.id,
  };
}
