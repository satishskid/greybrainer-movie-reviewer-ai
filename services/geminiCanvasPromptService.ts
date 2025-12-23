/**
 * Gemini Canvas Prompt Service
 * Generates optimized prompts for Gemini Canvas to create presentation slides
 * that can be converted to videos for social media sharing
 */

interface VideoPromptOptions {
  insightContent: string;
  movieTitle?: string;
  layerFocus?: string;
  includeVisuals?: boolean;
  targetDuration?: number; // in seconds
}

/**
 * Generates a prompt for Gemini Canvas to create a presentation suitable for video conversion
 * @param options - Configuration options for the video prompt
 * @returns Formatted prompt string for Gemini Canvas
 */
export function generateGeminiCanvasPrompt(options: VideoPromptOptions): string {
  const {
    insightContent,
    movieTitle,
    layerFocus,
    includeVisuals = true,
    targetDuration = 60
  } = options;

  // Calculate approximate number of slides based on target duration
  // Assuming ~10-15 seconds per slide for comfortable reading/narration
  const estimatedSlides = Math.ceil(targetDuration / 12);
  const maxSlides = Math.min(estimatedSlides, 8); // Cap at 8 slides for concise content

  const visualGuidance = includeVisuals 
    ? `\n- Include specific image search terms or visual concepts for each slide (e.g., "Indian cinema montage", "Bollywood evolution timeline", "morphokinetics visual representation")`
    : '';

  const movieContext = movieTitle 
    ? `\nMovie Context: ${movieTitle}${layerFocus ? ` (Focus: ${layerFocus})` : ''}`
    : '';

  const prompt = `Create a presentation for Google Slides conversion to video with the following requirements:

**Content Focus:**
${insightContent}
${movieContext}

**Presentation Specifications:**
- Create exactly ${maxSlides} slides (optimized for ${targetDuration}-second video)
- Design for 16:9 aspect ratio (standard video format)
- Use clean, minimal design suitable for social media (Instagram Reels, YouTube Shorts, X/Twitter)
- Include slide numbers for easy reference

**Narration Requirements:**
- Write voiceover script in Indian English (conversational, engaging tone)
- Keep text concise - each slide should be narrated in 10-15 seconds
- Use accessible language suitable for general Indian movie audience
- Include phonetic hints for complex terms (e.g., "morphokinetics" = "mor-fo-ki-NEH-tiks")
${visualGuidance}

**Slide Structure:**
1. Title Slide: Catchy headline + subtitle summarizing the insight
2. Context Slide: Quick background (2-3 points)
3-${maxSlides - 2}. Core Insight Slides: Key observations with supporting examples
${maxSlides - 1}. Impact/Evolution Slide: How this pattern evolved (past 2-3 years in Indian cinema)
${maxSlides}. Conclusion Slide: Takeaway + call-to-action (e.g., "Which movie surprised you with this approach?")

**Output Format:**
For each slide, provide:
- Slide number and title
- Main text content (bullet points or short paragraphs)
- Voiceover script (word-for-word narration)
- Visual suggestion (image search terms or design concept)

**Style Guidelines:**
- Use bold colors and high-contrast text for readability
- Incorporate Greybrainer branding elements (if applicable)
- Make it shareable - include watermark or branding on each slide
- Design for vertical or square formats if needed (mention aspect ratio preference)

**Example Slide:**
---
**Slide 3: The Morphokinetics Revolution**

Visual: Split-screen comparison of old vs new Bollywood cinematography

Main Text:
• Traditional: Static camera, theatrical blocking
• Modern: Dynamic movement, immersive framing
• Result: Audience feels inside the story

Voiceover Script:
"Let's talk about morphokinetics - that's mor-fo-ki-NEH-tiks - the visual rhythm of movies. Indian cinema has evolved from static, theatrical shots to dynamic, immersive camera work. Think of how Pushpa or Pathaan use motion to pull you into the action. That's morphokinetics at play."
---

Please create the full presentation following this format.`;

  return prompt;
}

/**
 * Generates a shorter prompt for quick social media teasers (30-second videos)
 */
export function generateQuickTeaserPrompt(insightContent: string, movieTitle?: string): string {
  return generateGeminiCanvasPrompt({
    insightContent,
    movieTitle,
    targetDuration: 30,
    includeVisuals: true
  });
}

/**
 * Generates a longer prompt for detailed analysis videos (90-120 seconds)
 */
export function generateDetailedAnalysisPrompt(
  insightContent: string, 
  movieTitle?: string, 
  layerFocus?: string
): string {
  return generateGeminiCanvasPrompt({
    insightContent,
    movieTitle,
    layerFocus,
    targetDuration: 120,
    includeVisuals: true
  });
}
