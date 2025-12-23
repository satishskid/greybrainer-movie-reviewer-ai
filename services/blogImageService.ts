/**
 * Blog Image Service
 * Generates SEO-optimized blog posts with AI-generated image descriptions
 * using Gemini's multimodal capabilities for viral, publish-ready content
 */

import { getGeminiAI, getSelectedGeminiModel, LogTokenUsageFn } from './geminiService';

interface ImageSuggestion {
  position: number;
  title: string;
  description: string;
  imagePrompt: string;
  altText: string;
  caption: string;
}

interface EnhancedBlogPost {
  content: string; // Full markdown content with image placeholders
  images: ImageSuggestion[];
  seoMetadata: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogTitle: string;
    ogDescription: string;
    twitterCard: string;
  };
}

/**
 * Generates an enhanced blog post with image suggestions and SEO metadata
 * @param title - Movie title
 * @param blogContent - Original blog post content
 * @param logTokenUsage - Optional token usage logging function
 * @returns Enhanced blog post with images and SEO data
 */
export async function generateEnhancedBlogPost(
  title: string,
  blogContent: string,
  logTokenUsage?: LogTokenUsageFn
): Promise<EnhancedBlogPost> {
  const ai = getGeminiAI();
  const selectedModel = getSelectedGeminiModel();
  const model = ai.getGenerativeModel({ model: selectedModel.name });

  const prompt = `You are an expert content creator specializing in viral movie reviews and SEO-optimized blog posts.

**TASK:** Enhance this movie review blog post with strategic image placements, detailed image generation prompts, and complete SEO metadata.

**MOVIE:** ${title}

**ORIGINAL BLOG CONTENT:**
${blogContent}

**REQUIREMENTS:**

1. **Image Strategy (4-6 images):**
   - Hero/Thumbnail image at the top (eye-catching, shareable)
   - Section-specific images throughout the content
   - Each image should enhance engagement and break up text
   - Images should be viral-worthy for social media sharing

2. **For Each Image, Provide:**
   - **Position:** Where to insert (e.g., "After hero section", "Before Story Layer", etc.)
   - **Title:** Descriptive title for the image
   - **Description:** Why this image enhances the content
   - **Image Prompt:** Detailed prompt for AI image generation (Midjourney/DALL-E style) - be specific about composition, mood, colors, style
   - **Alt Text:** SEO-optimized alt text (under 125 characters)
   - **Caption:** Engaging caption for below the image

3. **Image Prompt Quality:**
   - Include specific visual details (composition, lighting, color palette)
   - Reference cinematic styles when relevant
   - Specify mood and atmosphere
   - Make prompts suitable for AI image generators like Midjourney, DALL-E, or Imagen

4. **SEO Metadata:**
   - Meta Title (50-60 characters, includes movie name)
   - Meta Description (150-160 characters, compelling)
   - Keywords (10-15 relevant keywords)
   - Open Graph Title (for social sharing)
   - Open Graph Description (for social sharing)
   - Twitter Card Description

5. **Content Enhancement:**
   - Insert image placeholders in the content with format: \`![IMAGE_1]\`
   - Ensure images are strategically placed to maximize engagement
   - Optimize content for readability and SEO

**OUTPUT FORMAT (JSON):**
{
  "content": "Full markdown content with ![IMAGE_1], ![IMAGE_2] placeholders",
  "images": [
    {
      "position": 1,
      "title": "Image title",
      "description": "Why this image works",
      "imagePrompt": "Detailed AI image generation prompt",
      "altText": "SEO-optimized alt text",
      "caption": "Engaging caption"
    }
  ],
  "seoMetadata": {
    "metaTitle": "Title here",
    "metaDescription": "Description here",
    "keywords": ["keyword1", "keyword2"],
    "ogTitle": "OG title",
    "ogDescription": "OG description",
    "twitterCard": "Twitter description"
  }
}

**IMPORTANT:**
- Make image prompts HIGHLY detailed and specific
- Focus on viral potential - images should be shareable
- Ensure all SEO elements are optimized for search and social
- The blog should be 100% publish-ready, no edits needed

Generate the enhanced blog post now in valid JSON format:`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (logTokenUsage) {
      const usageMetadata = response.usageMetadata;
      if (usageMetadata) {
        logTokenUsage(
          selectedModel.name,
          usageMetadata.promptTokenCount || 0,
          usageMetadata.candidatesTokenCount || 0,
          usageMetadata.totalTokenCount || 0
        );
      }
    }

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const enhancedData = JSON.parse(jsonMatch[0]) as EnhancedBlogPost;
    return enhancedData;
  } catch (error) {
    console.error('Error generating enhanced blog post:', error);
    throw new Error('Failed to generate enhanced blog post with images');
  }
}

/**
 * Generates a thumbnail/hero image prompt specifically optimized for social sharing
 * @param title - Movie title
 * @param summary - Brief summary of the review
 * @returns Detailed image prompt for hero/thumbnail
 */
export async function generateHeroImagePrompt(
  title: string,
  summary: string,
  logTokenUsage?: LogTokenUsageFn
): Promise<string> {
  const ai = getGeminiAI();
  const selectedModel = getSelectedGeminiModel();
  const model = ai.getGenerativeModel({ model: selectedModel.name });

  const prompt = `Create a detailed AI image generation prompt for a viral hero/thumbnail image for this movie review:

**Movie:** ${title}
**Review Summary:** ${summary}

**Requirements:**
- Eye-catching and shareable on social media
- Cinematic and professional look
- 16:9 aspect ratio (YouTube/blog hero image)
- High contrast, bold colors
- Include subtle text overlay space for title
- Mood should match the movie's tone
- Should stop scrollers and drive clicks

**Output:** Just the detailed image prompt (200-300 words), ready to paste into Midjourney/DALL-E/Imagen.

Prompt:`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (logTokenUsage) {
      const usageMetadata = response.usageMetadata;
      if (usageMetadata) {
        logTokenUsage(
          selectedModel.name,
          usageMetadata.promptTokenCount || 0,
          usageMetadata.candidatesTokenCount || 0,
          usageMetadata.totalTokenCount || 0
        );
      }
    }

    return text.trim();
  } catch (error) {
    console.error('Error generating hero image prompt:', error);
    throw new Error('Failed to generate hero image prompt');
  }
}

/**
 * Formats the enhanced blog post for different platforms
 */
export function formatBlogForPlatform(
  enhancedBlog: EnhancedBlogPost,
  platform: 'markdown' | 'medium' | 'wordpress' | 'html'
): string {
  let content = enhancedBlog.content;

  switch (platform) {
    case 'markdown':
      // Replace placeholders with markdown image syntax with prompts in comments
      enhancedBlog.images.forEach((img, index) => {
        const placeholder = `![IMAGE_${index + 1}]`;
        const replacement = `<!-- Image ${index + 1}: ${img.title}
Image Prompt: ${img.imagePrompt}
Generate this image using Midjourney/DALL-E/Imagen and replace this comment with the actual image URL -->
![${img.altText}](YOUR_IMAGE_URL_HERE "${img.caption}")

*${img.caption}*`;
        content = content.replace(placeholder, replacement);
      });
      break;

    case 'medium':
      // Medium-specific format with image placeholders
      enhancedBlog.images.forEach((img, index) => {
        const placeholder = `![IMAGE_${index + 1}]`;
        const replacement = `
### [Insert Image ${index + 1} Here]
**${img.title}**
_${img.caption}_

<!-- Generate using: ${img.imagePrompt} -->
`;
        content = content.replace(placeholder, replacement);
      });
      break;

    case 'wordpress':
      // WordPress with HTML comments for image blocks
      enhancedBlog.images.forEach((img, index) => {
        const placeholder = `![IMAGE_${index + 1}]`;
        const replacement = `
<!-- wp:image -->
<figure class="wp-block-image">
  <!-- Generate image with: ${img.imagePrompt} -->
  <img src="YOUR_IMAGE_URL_HERE" alt="${img.altText}" />
  <figcaption>${img.caption}</figcaption>
</figure>
<!-- /wp:image -->
`;
        content = content.replace(placeholder, replacement);
      });
      break;

    case 'html':
      // Full HTML with SEO metadata
      const seo = enhancedBlog.seoMetadata;
      let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seo.metaTitle}</title>
  <meta name="description" content="${seo.metaDescription}">
  <meta name="keywords" content="${seo.keywords.join(', ')}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${seo.ogTitle}">
  <meta property="og:description" content="${seo.ogDescription}">
  <meta property="og:type" content="article">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${seo.ogTitle}">
  <meta name="twitter:description" content="${seo.twitterCard}">
</head>
<body>
  <article>
`;

      // Replace image placeholders with HTML
      let htmlContent = content;
      enhancedBlog.images.forEach((img, index) => {
        const placeholder = `![IMAGE_${index + 1}]`;
        const replacement = `
    <figure>
      <!-- Generate with: ${img.imagePrompt} -->
      <img src="YOUR_IMAGE_URL_HERE" alt="${img.altText}" loading="lazy">
      <figcaption>${img.caption}</figcaption>
    </figure>
`;
        htmlContent = htmlContent.replace(placeholder, replacement);
      });

      html += htmlContent;
      html += `
  </article>
</body>
</html>`;
      return html;
  }

  return content;
}
