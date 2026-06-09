import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
};

const apiBase =
  getArg("--api") ??
  "https://greybrainer-omnichannel-api.satish-9f4.workers.dev/api";
const title = getArg("--title");
const blogPath = getArg("--blog");
const reportPath = getArg("--report");
const platform = getArg("--platform");
const year = getArg("--year");
const reviewStage = getArg("--stage") ?? "Full Movie/Series Review";
const imageUrl = getArg("--image");
const heroImageUrl = getArg("--hero") ?? imageUrl;
const posterImageUrl = getArg("--poster") ?? imageUrl;
const thumbnailImageUrl = getArg("--thumb") ?? imageUrl;

if (!title || !blogPath || !reportPath) {
  console.error(
    "Usage: node scripts/publish_report.mjs --title \"Movie\" --blog /path/blog.md --report /path/report.md [--platform \"Netflix\"] [--year 2026] [--image https://... | --hero https://... --poster https://... --thumb https://...]",
  );
  process.exit(1);
}

const readFile = async (filePath) => {
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  return fs.readFile(abs, "utf8");
};

const blogMarkdown = await readFile(blogPath);
const reportMarkdown = await readFile(reportPath);

const extractScore = (pattern) => {
  const match = reportMarkdown.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const overallScore =
  extractScore(/Overall Greybrainer Score:\s*([0-9.]+)/i) ??
  extractScore(/Overall Greybrainer Score:\s*([0-9.]+)\s*\/\s*10/i);

const storyScore =
  extractScore(/Story:\s*([0-9.]+)\s*\/\s*10/i) ??
  extractScore(/Magic of Story\/Script[^0-9]*([0-9.]+)\s*\/\s*10/i);
const conceptScore =
  extractScore(/Concept:\s*([0-9.]+)\s*\/\s*10/i) ??
  extractScore(/Magic of Conceptualization[^0-9]*([0-9.]+)\s*\/\s*10/i);
const performanceScore =
  extractScore(/Performance:\s*([0-9.]+)\s*\/\s*10/i) ??
  extractScore(/Magic of Performance\/Execution[^0-9]*([0-9.]+)\s*\/\s*10/i);

const extractSectionSnippet = (label) => {
  const regex = new RegExp(`###\\s+${label}[\\s\\S]*?\\n\\n([\\s\\S]*?)(?=\\n###|\\n##|\\n#|$)`, "i");
  const match = reportMarkdown.match(regex);
  if (!match) return "";
  const paragraph = match[1].split(/\n{2,}/)[0]?.trim();
  return paragraph?.replace(/\s+/g, " ") ?? "";
};

const storySnippet =
  extractSectionSnippet("Magic of Story/Script") ||
  extractSectionSnippet("Core Ring: Magic of Story/Script");
const conceptSnippet =
  extractSectionSnippet("Magic of Conceptualization") ||
  extractSectionSnippet("Middle Ring: Magic of Conceptualization");
const performanceSnippet =
  extractSectionSnippet("Magic of Performance/Execution") ||
  extractSectionSnippet("Outer Ring: Magic of Performance/Execution");

const summaryMatch = reportMarkdown.match(/## Overall Summary[\s\S]*?\n\n([\s\S]*?)(?=\n##|\n#|$)/i);
const summaryText = summaryMatch ? summaryMatch[1].trim() : reportMarkdown.split(/\n{2,}/)[0]?.trim();

const layerAnalyses = [
  {
    id: "STORY",
    title: "Magic of Story/Script",
    shortTitle: "Story",
    description: storySnippet || "Narrative design, themes, and structural coherence.",
    editedText: storySnippet || "",
    userScore: storyScore ?? undefined,
  },
  {
    id: "CONCEPTUALIZATION",
    title: "Magic of Conceptualization",
    shortTitle: "Concept",
    description: conceptSnippet || "Directorial vision, casting, editing, and formal choices.",
    editedText: conceptSnippet || "",
    userScore: conceptScore ?? undefined,
  },
  {
    id: "PERFORMANCE",
    title: "Magic of Performance/Execution",
    shortTitle: "Performance",
    description: performanceSnippet || "Acting, cinematography, music, and technical execution.",
    editedText: performanceSnippet || "",
    userScore: performanceScore ?? undefined,
  },
].filter((layer) => typeof layer.userScore === "number");

const sourcePayload = {
  title,
  platform: platform ?? null,
  year: year ?? null,
  heroImageUrl: heroImageUrl ?? null,
  posterImageUrl: posterImageUrl ?? null,
  thumbnailImageUrl: thumbnailImageUrl ?? null,
  layerAnalyses,
  summaryReportData: {
    reportText: summaryText ?? "",
    overallScore: overallScore ?? undefined,
  },
  tags: ["movie", "review"],
};

const payload = {
  subjectTitle: title,
  subjectType: "movie",
  reviewStage,
  status: "approved",
  createdBy: "system:archive-import",
  seoTitle: title,
  seoDescription: summaryText?.split(/\n/)[0]?.slice(0, 240) ?? null,
  sourcePayload,
  version: {
    blogMarkdown,
    analysis: {
      layerAnalyses,
      summaryReportData: sourcePayload.summaryReportData,
    },
    sourcePayload,
    createdBy: "system:archive-import",
  },
};

const createDraft = async () => {
  const response = await fetch(`${apiBase}/drafts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Draft create failed: ${response.status} ${text}`);
  }
  const data = await response.json();
  return data.draft;
};

const publishDraft = async (draftId) => {
  const response = await fetch(`${apiBase}/drafts/${draftId}/publish-website`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestedBy: "system:archive-import", skipKnowledge: true }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Publish failed: ${response.status} ${text}`);
  }
  return response.json();
};

const draft = await createDraft();
const published = await publishDraft(draft.id);

console.log(JSON.stringify({ draftId: draft.id, websiteUrl: published.canonicalUrl }, null, 2));
