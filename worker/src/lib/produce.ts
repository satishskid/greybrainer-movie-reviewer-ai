import type { GreybrainerReport } from "./reports";

export type PhaseOneChannel = "linkedin" | "x";

export interface VisualSpec {
  chart: {
    concept: number;
    overall: number;
    performance: number;
    story: number;
    type: "greybrainer-three-ring";
  };
  headline: string;
  morphokinetics: {
    summary: string;
  } | null;
  representativeScene: {
    description: string;
    mediaType: "interpretive";
  } | null;
  subtitle: string;
}

export interface ChannelDraft {
  channel: PhaseOneChannel;
  hashtags: string[];
  mediaPrompt: string | null;
  text: string | string[];
  visualSpec: VisualSpec;
}

function score(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function strongestAndWeakest(report: GreybrainerReport) {
  const layers = [
    { label: "Story", value: report.scores.story },
    { label: "Concept", value: report.scores.concept },
    { label: "Performance", value: report.scores.performance },
  ];
  const sorted = [...layers].sort((left, right) => right.value - left.value);
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
}

function buildVisualSpec(report: GreybrainerReport): VisualSpec {
  const { strongest } = strongestAndWeakest(report);
  return {
    chart: {
      concept: report.scores.concept,
      overall: report.scores.overall,
      performance: report.scores.performance,
      story: report.scores.story,
      type: "greybrainer-three-ring",
    },
    headline: `${report.title}: ${score(report.scores.overall)}/10 Greybrainer Signal`,
    morphokinetics: report.morphokinetics
      ? { summary: report.morphokinetics.overallSummary }
      : null,
    representativeScene: report.representativeScenes[0]
      ? {
          description: report.representativeScenes[0],
          mediaType: "interpretive",
        }
      : null,
    subtitle: `${strongest.label} leads the three-layer reading at ${score(strongest.value)}/10.`,
  };
}

function buildMediaPrompt(report: GreybrainerReport, visualSpec: VisualSpec) {
  const scene = visualSpec.representativeScene?.description;
  return [
    `Create a vertical Greybrainer film-analysis signal card for "${report.title}".`,
    `Use only these exact scores: Overall ${score(report.scores.overall)}/10, Story ${score(report.scores.story)}/10, Concept ${score(report.scores.concept)}/10, Performance ${score(report.scores.performance)}/10.`,
    "Show the scores as the Greybrainer three-ring visual and label any generated scene INTERPRETIVE VISUAL.",
    report.morphokinetics?.overallSummary
      ? `Use this stored Morphokinetics summary as the motion-arc reference: ${report.morphokinetics.overallSummary}`
      : "Do not invent a Morphokinetics arc because none is stored in this report.",
    scene ? `Interpretive scene description from the report: ${scene}` : "Use a clean typographic background; do not invent cast imagery.",
    "Do not add names, dates, platforms, quotes, awards, or claims that are absent above.",
  ].join("\n");
}

function buildXDraft(report: GreybrainerReport, visualSpec: VisualSpec): ChannelDraft {
  const { strongest, weakest } = strongestAndWeakest(report);
  const first = `${report.title}: ${score(report.scores.overall)}/10 Greybrainer Signal. ${strongest.label} leads at ${score(strongest.value)}/10; ${weakest.label} is the pressure point at ${score(weakest.value)}/10.`;
  const second = `Story ${score(report.scores.story)}/10 | Concept ${score(report.scores.concept)}/10 | Performance ${score(report.scores.performance)}/10.${report.reportUrl ? ` Full analysis: ${report.reportUrl}` : ""} #Greybrainer #FilmAnalysis`;
  const text = [first, second];
  if (text.some((post) => Array.from(post).length > 280)) {
    throw new Error("The grounded X thread exceeds 280 characters. Shorten the canonical title or report URL.");
  }
  return {
    channel: "x",
    hashtags: ["Greybrainer", "FilmAnalysis"],
    mediaPrompt: buildMediaPrompt(report, visualSpec),
    text,
    visualSpec,
  };
}

function buildLinkedInDraft(report: GreybrainerReport, visualSpec: VisualSpec): ChannelDraft {
  const { strongest, weakest } = strongestAndWeakest(report);
  const text = [
    `Is ${report.title} worth watching?`,
    "",
    `Greybrainer Signal: ${score(report.scores.overall)}/10`,
    `Story / Script: ${score(report.scores.story)}/10`,
    `Concept / Orchestration: ${score(report.scores.concept)}/10`,
    `Performance / Execution: ${score(report.scores.performance)}/10`,
    "",
    `${strongest.label} is the strongest signal at ${score(strongest.value)}/10. ${weakest.label} is the pressure point at ${score(weakest.value)}/10.`,
    report.reportUrl ? `Read the complete evidence-led analysis: ${report.reportUrl}` : "",
    "",
    "#Greybrainer #FilmAnalysis #MovieReview",
  ].join("\n");

  return {
    channel: "linkedin",
    hashtags: ["Greybrainer", "FilmAnalysis", "MovieReview"],
    mediaPrompt: buildMediaPrompt(report, visualSpec),
    text,
    visualSpec,
  };
}

export function producePack(report: GreybrainerReport, channels: PhaseOneChannel[]): ChannelDraft[] {
  const uniqueChannels = [...new Set(channels)];
  const visualSpec = buildVisualSpec(report);
  return uniqueChannels.map((channel) =>
    channel === "x" ? buildXDraft(report, visualSpec) : buildLinkedInDraft(report, visualSpec),
  );
}
