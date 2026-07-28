import type { Env } from "./db";
import type { PhaseOneChannel } from "./produce";
import type { GreybrainerReport } from "./reports";

export interface PublishMedia {
  altText?: string;
  contentType?: string;
  mediaType?: "image" | "video";
  url: string;
}

export interface GroundingDraft {
  channel: PhaseOneChannel;
  hashtags?: string[];
  media?: PublishMedia | null;
  text: string | string[];
}

export interface GroundingResult {
  grounded: boolean;
  judge: "passed" | "failed" | "not-run";
  token?: string;
  violations: string[];
}

interface GroundingTokenPayload {
  accountId: string;
  channel: PhaseOneChannel;
  contentHash: string;
  expiresAt: string;
  issuedAt: string;
  nonce: string;
  reportId: string;
  reportVersionId: string;
  version: 1;
}

export type SecondaryJudge = (
  report: GreybrainerReport,
  draft: GroundingDraft,
) => Promise<string[]>;

const GENERIC_CAPITALIZED_PHRASES = new Set([
  "Concept Orchestration",
  "Film Analysis",
  "Full Analysis",
  "Greybrainer Signal",
  "Movie Review",
  "Performance Execution",
  "Read Full",
  "Story Script",
]);

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

export function normalizeGroundingDraft(draft: GroundingDraft): GroundingDraft {
  const hashtags = [...new Set((draft.hashtags ?? []).map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean))];
  return {
    channel: draft.channel,
    hashtags,
    media: draft.media
      ? {
          altText: draft.media.altText?.trim() || undefined,
          contentType: draft.media.contentType?.trim().toLowerCase() || undefined,
          mediaType: draft.media.mediaType,
          url: draft.media.url.trim(),
        }
      : null,
    text: Array.isArray(draft.text) ? draft.text.map((item) => item.trim()) : draft.text.trim(),
  };
}

export async function groundingContentHash(draft: GroundingDraft) {
  return sha256(canonicalJson(normalizeGroundingDraft(draft)));
}

function reportFactText(report: GreybrainerReport) {
  return [
    report.title,
    report.platform,
    report.releaseDate,
    report.director,
    ...report.creators,
    ...report.cast.flatMap((member) => [member.actor, member.role ?? ""]),
  ]
    .filter(Boolean)
    .join(" ");
}

function reportAllText(report: GreybrainerReport) {
  return canonicalJson(report);
}

function scoreViolations(report: GreybrainerReport, text: string) {
  const checks: Array<{ label: string; pattern: RegExp; value: number }> = [
    { label: "overall", pattern: /(?:greybrainer\s+signal|overall)[^\d]{0,20}(\d+(?:\.\d+)?)/gi, value: report.scores.overall },
    { label: "story", pattern: /story(?:\s*\/\s*script)?[^\d]{0,20}(\d+(?:\.\d+)?)/gi, value: report.scores.story },
    { label: "concept", pattern: /concept(?:\s*\/\s*orchestration)?[^\d]{0,20}(\d+(?:\.\d+)?)/gi, value: report.scores.concept },
    { label: "performance", pattern: /performance(?:\s*\/\s*execution)?[^\d]{0,20}(\d+(?:\.\d+)?)/gi, value: report.scores.performance },
  ];
  const violations: string[] = [];
  for (const check of checks) {
    for (const match of text.matchAll(check.pattern)) {
      const value = Number(match[1]);
      if (!Number.isFinite(value) || value !== check.value) {
        violations.push(`The ${check.label} score ${match[1]} does not equal the stored score ${check.value}.`);
      }
    }
  }
  return violations;
}

function numericViolations(report: GreybrainerReport, text: string) {
  const scrubbed = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\/\s*10\b/g, "")
    .replace(/#\w+/g, "");
  const allowedNumbers = new Set(
    [
      report.scores.overall,
      report.scores.story,
      report.scores.concept,
      report.scores.performance,
      ...(reportFactText(report).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number),
    ].map(String),
  );
  const violations: string[] = [];
  for (const raw of scrubbed.match(/-?\d+(?:\.\d+)?/g) ?? []) {
    if (!allowedNumbers.has(String(Number(raw)))) {
      violations.push(`Number ${raw} is not present in the report fact-lock.`);
    }
  }
  return violations;
}

function dateViolations(report: GreybrainerReport, text: string) {
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  return dates
    .filter((date) => date !== report.releaseDate)
    .map((date) => `Date ${date} does not equal the stored release date ${report.releaseDate || "(missing)"}.`);
}

function namedEntityViolations(report: GreybrainerReport, text: string) {
  const factText = normalizeText(reportFactText(report));
  const violations: string[] = [];
  const phrases = text.match(/\b[A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+)+\b/g) ?? [];
  for (const phrase of phrases) {
    if (GENERIC_CAPITALIZED_PHRASES.has(phrase)) continue;
    const normalized = normalizeText(phrase);
    const withoutSentenceLead = normalizeText(phrase.replace(/^(?:Is|Read)\s+/, ""));
    if (factText.includes(normalized) || factText.includes(withoutSentenceLead)) continue;
    violations.push(`Named entity "${phrase}" is not present in the report fact-lock.`);
  }

  const attributedNames = text.matchAll(/\b(?:starring|featuring|actor|director|creator)\s+([A-Z][A-Za-z.'’-]+)\b/g);
  for (const match of attributedNames) {
    if (!factText.includes(normalizeText(match[1]))) {
      violations.push(`Named person "${match[1]}" is not present in the report fact-lock.`);
    }
  }
  return violations;
}

function quoteViolations(report: GreybrainerReport, text: string) {
  const reportText = normalizeText(reportAllText(report));
  const violations: string[] = [];
  const patterns = [
    /"([^"]{3,})"\s*(?:-|—|–)\s*([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+)*)/g,
    /([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+)*)\s+(?:said|says|wrote|called it)\s+"([^"]{3,})"/g,
  ];
  for (const [index, pattern] of patterns.entries()) {
    for (const match of text.matchAll(pattern)) {
      const quote = index === 0 ? match[1] : match[2];
      if (!reportText.includes(normalizeText(quote))) {
        violations.push(`Attributed quote "${quote}" does not appear verbatim in the canonical report.`);
      }
    }
  }
  return violations;
}

export function verifyGroundingDeterministic(report: GreybrainerReport, draft: GroundingDraft) {
  const normalized = normalizeGroundingDraft(draft);
  const text = Array.isArray(normalized.text) ? normalized.text.join("\n") : normalized.text;
  return [
    ...scoreViolations(report, text),
    ...numericViolations(report, text),
    ...dateViolations(report, text),
    ...namedEntityViolations(report, text),
    ...quoteViolations(report, text),
  ].filter((violation, index, all) => all.indexOf(violation) === index);
}

function parseJudgeResponse(value: unknown, depth = 0): { violations: unknown[] } | null {
  if (depth > 5 || value === null || value === undefined) return null;
  if (typeof value === "string") {
    const cleaned = value
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    if (!cleaned) return null;
    try {
      return parseJudgeResponse(JSON.parse(cleaned), depth + 1);
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = parseJudgeResponse(item, depth + 1);
      if (parsed) return parsed;
    }
    return null;
  }
  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (Array.isArray(record.violations)) {
    return { violations: record.violations };
  }
  for (const candidate of [
    record.response,
    record.result,
    record.output,
    record.output_text,
    record.choices,
    record.message,
    record.content,
    record.text,
  ]) {
    const parsed = parseJudgeResponse(candidate, depth + 1);
    if (parsed) return parsed;
  }
  return null;
}

export async function createWorkersAiGroundingJudge(env: Env): Promise<SecondaryJudge> {
  return async (report, draft) => {
    if (!env.AI) return ["Secondary grounding judge is not configured."];
    const model = env.GROUNDING_JUDGE_MODEL ?? "@cf/google/gemma-4-26b-a4b-it";
    const factLock = {
      cast: report.cast,
      creators: report.creators,
      director: report.director,
      platform: report.platform,
      releaseDate: report.releaseDate,
      reportUrl: report.reportUrl,
      scores: report.scores,
      title: report.title,
    };
    try {
      const response = await env.AI.run(model as keyof AiModels, {
        max_tokens: 512,
        messages: [
          {
            content: [
              "You are a closed-book factual grounding judge.",
              "Use only FACT_LOCK. Do not use outside knowledge and do not rewrite the draft.",
              "Questions, formatting, hashtags, exact arithmetic, and comparisons of stored scores are allowed.",
              "List only unsupported factual assertions, names, dates, numbers, quotes, platforms, cast claims, or creator claims.",
              'Return {"violations":[]} when every claim is supported.',
            ].join(" "),
            role: "system",
          },
          {
            content: canonicalJson({
              DRAFT: normalizeGroundingDraft(draft),
              FACT_LOCK: factLock,
            }),
            role: "user",
          },
        ],
        response_format: {
          json_schema: {
            additionalProperties: false,
            properties: {
              violations: {
                items: { type: "string" },
                type: "array",
              },
            },
            required: ["violations"],
            type: "object",
          },
          type: "json_schema",
        },
        temperature: 0,
      });
      const parsed = parseJudgeResponse(response);
      if (!parsed) {
        return ["Secondary grounding judge returned an invalid response."];
      }
      return parsed.violations.map(String).filter(Boolean);
    } catch {
      return ["Secondary grounding judge failed closed."];
    }
  };
}

export async function issueGroundingToken(input: {
  accountId: string;
  draft: GroundingDraft;
  report: GreybrainerReport;
  secret: string;
  ttlSeconds?: number;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Math.max(input.ttlSeconds ?? 900, 60) * 1000);
  const payload: GroundingTokenPayload = {
    accountId: input.accountId,
    channel: input.draft.channel,
    contentHash: await groundingContentHash(input.draft),
    expiresAt: expiresAt.toISOString(),
    issuedAt: now.toISOString(),
    nonce: crypto.randomUUID(),
    reportId: input.report.id,
    reportVersionId: input.report.versionId,
    version: 1,
  };
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(canonicalJson(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importHmacKey(input.secret),
    new TextEncoder().encode(encodedPayload),
  );
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyGroundingToken(input: {
  accountId: string;
  channel: PhaseOneChannel;
  draft: GroundingDraft;
  secret: string;
  token: string;
}) {
  const [encodedPayload, encodedSignature] = input.token.split(".");
  if (!encodedPayload || !encodedSignature) throw new Error("Grounding token has an invalid format.");
  const validSignature = await crypto.subtle.verify(
    "HMAC",
    await importHmacKey(input.secret),
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(encodedPayload),
  );
  if (!validSignature) throw new Error("Grounding token signature is invalid.");

  let payload: GroundingTokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as GroundingTokenPayload;
  } catch {
    throw new Error("Grounding token payload is invalid.");
  }
  if (payload.version !== 1) throw new Error("Grounding token version is unsupported.");
  if (payload.channel !== input.channel) throw new Error("Grounding token channel does not match.");
  if (payload.accountId !== input.accountId) throw new Error("Grounding token account does not match the brand allowlist.");
  if (Date.parse(payload.expiresAt) <= Date.now()) throw new Error("Grounding token has expired.");
  if (payload.contentHash !== (await groundingContentHash(input.draft))) {
    throw new Error("Grounding token content hash does not match.");
  }
  return payload;
}

export async function verifyGrounding(input: {
  accountId: string;
  draft: GroundingDraft;
  judge: SecondaryJudge;
  report: GreybrainerReport;
  secret: string;
  ttlSeconds?: number;
}): Promise<GroundingResult> {
  const deterministicViolations = verifyGroundingDeterministic(input.report, input.draft);
  if (deterministicViolations.length) {
    return { grounded: false, judge: "not-run", violations: deterministicViolations };
  }

  const judgeViolations = await input.judge(input.report, input.draft);
  if (judgeViolations.length) {
    return { grounded: false, judge: "failed", violations: judgeViolations };
  }

  const token = await issueGroundingToken(input);
  return { grounded: true, judge: "passed", token, violations: [] };
}

export async function tokenFingerprint(token: string) {
  return sha256(token);
}
