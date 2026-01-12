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
    ? `\n**Visual Generation (Gemini 2.0 Native Image Creation):**
- Use Gemini's built-in image generation to create visuals for each slide
- Generate images directly instead of using stock photos or search terms
- Style: Modern, cinematic, Bollywood aesthetic, vibrant colors
- Each slide should have a unique, high-quality generated image
- Example: "Generate a cinematic image showing: [description]"
- Aspect ratio: 16:9 for all generated images`
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
- Generated image prompt (for Gemini 2.0 to create the visual directly)

**Style Guidelines:**
- Use bold colors and high-contrast text for readability
- Incorporate Greybrainer branding elements (if applicable)
- Make it shareable - include watermark or branding on each slide
- Design for vertical or square formats if needed (mention aspect ratio preference)

**Example Slide:**
---
**Slide 3: The Morphokinetics Revolution**

Generated Image Prompt: "Generate a cinematic split-screen image: Left side shows traditional Bollywood static camera shot from 1990s with theatrical blocking, right side shows modern dynamic Bollywood cinematography with immersive camera movement, vibrant colors, 16:9 aspect ratio, professional film quality"

Main Text:
• Traditional: Static camera, theatrical blocking
• Modern: Dynamic movement, immersive framing
• Result: Audience feels inside the story

Voiceover Script:
"Let's talk about morphokinetics - that's mor-fo-ki-NEH-tiks - the visual rhythm of movies. Indian cinema has evolved from static, theatrical shots to dynamic, immersive camera work. Think of how Pushpa or Pathaan use motion to pull you into the action. That's morphokinetics at play."
---

Please create the full presentation following this format with generated images for each slide.`;

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

/**
 * Generates a specialized prompt for Research & Trending Engine reports
 * Optimized for data visualization, multi-topic coverage, and trend forecasting
 */
export function generateResearchTrendingVideoPrompt(
  researchContent: string,
  trendingTopics: string,
  targetDuration: number = 90
): string {
  const slideCount = targetDuration === 45 ? 5 : targetDuration === 90 ? 7 : 10;

  return `Create a trend analysis video presentation for Indian cinema with the following requirements:

**Content Focus:**
${researchContent}

**Trending Topics Context:**
${trendingTopics}

**Presentation Specifications:**
- Create exactly ${slideCount} slides (optimized for ${targetDuration}-second video)
- Design for 16:9 aspect ratio (standard video format)
- Data-driven visual style suitable for social media (Instagram Reels, YouTube Shorts, X/Twitter)
- Use Gemini 2.0 native image generation for all visuals

**Presentation Structure (${targetDuration}s format):**

1. **Title Slide (0-${Math.floor(targetDuration/9)}s):** "Greybrainer Research: Indian Cinema Trends"
   - Generated Image: "Generate a dynamic montage of current trending Indian movies and OTT shows, vibrant Bollywood colors, modern design, 16:9"
   - Subtitle: Key trending topics covered
   - Voiceover: Hook the audience with the main trend question

${slideCount >= 5 ? `
2. **The Popular Slide (${Math.floor(targetDuration/9)}-${Math.floor(targetDuration*2/9)}s):** Box Office Hits & Fan Favorites
   - Generated Image: "Generate a cinematic box office chart visualization showing top 3 Indian movies with rupee symbols and upward trending arrows, professional infographic style, vibrant colors, 16:9"
   - Data Points: Top 3 commercial trends with numbers
   - Voiceover: "Let's start with what's winning at the box office..."

3. **The Critiqued Slide (${Math.floor(targetDuration*2/9)}-${Math.floor(targetDuration*3/9)}s):** Controversial Topics & Critical Discourse
   - Generated Image: "Generate a split-screen comparison showing contrasting opinions on a controversial Indian film, debate-style visual with opposing viewpoints, professional news aesthetic, 16:9"
   - Key Points: Major controversies with nuanced perspective
   - Voiceover: "But it's not all box office glory. Here's what critics are questioning..."

4. **The Social Slide (${Math.floor(targetDuration*3/9)}-${Math.floor(targetDuration*4/9)}s):** Cultural Movements & Social Themes
   - Generated Image: "Generate a collage of powerful social justice moments from recent Indian cinema, diverse representation, emotional impact, cinematic quality, 16:9"
   - Impact: How cinema reflects and shapes society
   - Voiceover: "Beyond entertainment, Indian cinema is driving conversations about..."
` : ''}

${slideCount >= 7 ? `
5. **Morphokinetic Trend Forecast (${Math.floor(targetDuration*4/9)}-${Math.floor(targetDuration*6/9)}s):** Visual Language Evolution
   - Generated Image: "Generate a futuristic concept art showing the evolution of Indian cinema visual storytelling, from traditional to cutting-edge, timeline visualization, sci-fi aesthetic, 16:9"
   - Prediction: Where visual storytelling is heading in next 2-3 years
   - Voiceover: "Here's where morphokinetics - mor-fo-ki-NEH-tiks - is taking Indian cinema..."

6. **Thematic Bridges (${Math.floor(targetDuration*6/9)}-${Math.floor(targetDuration*7/9)}s):** Connection to Past Content
   - Generated Image: "Generate a visual network diagram showing connections between current trends and past Greybrainer reviews, interconnected nodes, modern infographic style, 16:9"
   - Links: How current trends relate to previous analyses
   - Voiceover: "These trends aren't isolated. They connect to what we analyzed before..."
` : ''}

${slideCount}. **Social Video Hook (${Math.floor(targetDuration*7/9)}-${targetDuration}s):** Engaging Call-to-Action
   - Generated Image: "Generate an eye-catching graphic with bold text 'WHICH TREND WILL DOMINATE 2026?' in Bollywood style typography, vibrant colors, social media optimized, 16:9"
   - CTA: Provocative question to boost engagement
   - Voiceover: "So here's the big question for you - [engaging question]. Drop your prediction in the comments! 👇"

**Image Generation Requirements (Gemini 2.0):**
- Use Gemini's native image generation for ALL slides
- Style: Modern, data-driven, cinematic Bollywood aesthetic
- Include: Charts, comparisons, montages, futuristic concepts, infographics
- Branding: Add "Greybrainer Research" watermark on each generated image
- Quality: High-resolution, professional, shareable

**Voiceover Script Requirements:**
- Indian English, authoritative yet conversational tone
- Data-driven language (include numbers, percentages, trends)
- Include phonetic hints for complex terms
- Build narrative tension throughout
- End with engaging question to boost comments/shares
- Each segment should be narrated in ${Math.floor(targetDuration/slideCount)}-${Math.ceil(targetDuration/slideCount)} seconds

**Narration Style:**
- Start strong: "The pulse of Indian cinema is changing..."
- Build momentum: "Here's what the numbers tell us..."
- Add nuance: "But there's more beneath the surface..."
- Forecast: "Looking ahead, we're seeing..."
- End with hook: "Which trend do YOU think will define 2026?"

Please create the complete presentation with Gemini-generated images for each slide.`;
}
