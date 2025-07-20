# Greybrainer AI: Deconstruct Cinematic Magic, Craft Compelling Stories

**Greybrainer AI is an advanced analytical suite designed for filmmakers, screenwriters, producers, and students of cinema. It leverages cutting-edge Generative AI to deconstruct the elements of movie magic, offering deep insights into story, conceptualization, and performance. Beyond analysis, Greybrainer AI empowers you to generate and refine creative ideas, assess script potential, and understand narrative dynamics like never before.**

![image](https://storage.googleapis.com/gh-assets/greybrainer-screenshot-dark.png)

Our platform is built upon the **"Greybrainer Movie Magic Theory,"** a systematic approach to understanding the multifaceted art of filmmaking. We believe that by breaking down successful (and unsuccessful) cinematic works into their core components, and by understanding the interplay between these layers, creators can make more informed decisions, enhance their storytelling, and ultimately craft more impactful experiences for their audiences.

## Table of Contents
- [Core Philosophy](#core-philosophy-the-greybrainer-movie-magic-theory)
- [Key Features](#key-features--capabilities)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started (Local Development)](#getting-started-local-development)
- [Deployment Guide](#deployment-guide)
- [API Strategy: Fallbacks & Recommendations](#api-strategy-fallbacks--recommendations)
- [Protecting Your Intellectual Property](#protecting-your-intellectual-property)

## Core Philosophy: The Greybrainer Movie Magic Theory

(Full details in [MOVIE_MAGIC_THEORY.md](./MOVIE_MAGIC_THEORY.md))

The Greybrainer methodology posits that cinematic impact is primarily derived from the harmonious and innovative execution of three fundamental layers:

1.  **The Magic of Story/Script:** The bedrock of any film. This encompasses the core premise, narrative architecture, character depth and arcs, thematic resonance, dialogue quality, and originality within (or subversion of) genre conventions. Includes Vonnegut story shape analysis.
2.  **The Magic of Conceptualization:** How the story is translated into a sensory experience. This layer examines the director's vision, casting choices (and their strategic impact), editing pace and style, cinematography, sound design, and overall presentation.
3.  **The Magic of Performance/Execution:** The final delivery of the cinematic vision. This involves the actors' performances, the power of the musical score, the effectiveness of visual and practical effects, and the impact of choreography or action design.

## Key Features & Capabilities

### Foundational Analysis

*   **Multi-Layer Movie Analysis:** Submit a movie/series title and review stage (Idea, Trailer, Full Release) to receive a detailed breakdown across the three core Greybrainer layers.
    *   AI-generated textual analysis for each layer.
    *   Editable content: Refine the AI's analysis to match your perspective.
    *   Custom Scoring: Assign your own scores (0-10) to each layer.
    *   Vonnegut Story Shape Visualization (for Story Layer).
*   **Comprehensive Report Generation:**
    *   Creates a shareable "Greybrainer Summary Report" synthesizing all layer analyses and scores.
    *   Includes a concentric rings visualization for an at-a-glance overview of layer scores.
    *   Downloadable Markdown report option.
*   **Actual Performance Comparison:** Input real-world metrics (Rotten Tomatoes, Metacritic, Box Office notes) to compare against Greybrainer's analysis.
*   **Financial & ROI Insights (Qualitative):**
    *   Optionally input a production budget or let the AI attempt to fetch an estimate.
    *   The AI generates a qualitative Return on Investment (ROI) analysis based on creative factors and the provided/estimated budget.
*   **Monthly Magic Scoreboard & Greybrainer Insights:**
    *   Explore curated, ranked lists of recent movie and web series releases.
    *   Generate on-demand, AI-powered insights and detailed research reports on film industry trends.

### Advanced Creative & Analytical Modules

*   ✨ **Creative Spark Generator:**
    *   Generate multiple unique story ideas (logline, synopsis, character concepts, key scenes, hierarchical mind map outline) based on genre and optional inspiration.
    *   Select and iteratively enhance ideas with custom prompts.
*   🔬 **Script Magic Quotient Analyzer:**
    *   Submit your script/story idea for an AI-powered "potential" analysis, receiving feedback on strengths, weaknesses, and actionable suggestions.
*   🌊 **AI Morphokinetics Analysis:**
    *   Uncover the dynamic "motion" of a film: its emotional arc, pacing strategy, tension-building, and timeline structure, complete with visualizations.
*   👤 **Personnel "Magic Factor" Insights:**
    *   Provides an AI-generated analysis of the signature style and unique impact of identified directors or key actors.

## Tech Stack

*   **Framework:** React, TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **AI (Primary):** Google Gemini API (`@google/genai` SDK for `gemini-2.5-flash`)
*   **AI (Fallback):** Groq API (`llama3-8b-8192`)

## Project Structure
The project is structured as a standard Vite + React application.

```
/
├── public/                 # Public assets
├── src/                    # Source code
│   ├── components/         # React UI components
│   ├── services/           # API services (e.g., geminiService.ts)
│   ├── types.ts            # TypeScript type definitions
│   ├── constants.ts        # Application-wide constants
│   └── index.tsx           # Main React application entry point
├── .env.example            # Example environment variables
├── index.html              # Main HTML entry point for Vite
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

## Getting Started (Local Development)

### Prerequisites
*   Node.js (version 18.x or newer recommended)
*   npm or yarn package manager

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/greybrainer-ai.git
cd greybrainer-ai
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure API Keys (Crucial)
The application requires API keys to function.

1.  **Create a `.env` file:** Copy the example file.
    ```bash
    cp .env.example .env
    ```
2.  **Edit the `.env` file:** Open the newly created `.env` file and add your API keys.
    ```env
    # Get your Gemini API key from Google AI Studio
    VITE_API_KEY="YOUR_GEMINI_API_KEY_HERE"

    # (Optional) Get your Groq API key from https://console.groq.com/keys
    VITE_GROQ_API_KEY="YOUR_GROQ_API_KEY_HERE"
    ```
    *   **Note:** The `VITE_` prefix is required by Vite to expose these variables to the application.
    *   If the Groq key is omitted, the high-speed fallback functionality will be disabled.

### 4. Run the Development Server
```bash
npm run dev
# or
yarn dev
```
The application will now be running and accessible at `http://localhost:5173`. The server supports Hot Module Replacement (HMR) for a fast development experience.

### 5. Build for Production
To create an optimized static build for deployment:
```bash
npm run build
# or
yarn build
```
This command will generate a `dist` folder containing the compiled and minified assets ready for deployment.

## Deployment Guide

### 🚨 Important Security Notice: Protecting Your API Keys
**Embedding API keys directly in client-side code is a significant security risk.** In a public application, your keys can be easily extracted and misused, leading to unexpected charges.

**For any real-world deployment (beyond personal hobby use), you MUST use a backend proxy.** This means your frontend application should call your own secure backend endpoint, which then makes the call to the Gemini/Groq API using the key stored securely on the server.

*   **Recommended Solution:** Use serverless functions provided by platforms like Vercel or Netlify. Move all logic from `src/services/geminiService.ts` into a serverless function.

### Deploying to Vercel or Netlify (Recommended)
These platforms make deploying frontend applications incredibly simple.

1.  **Push to GitHub:** Ensure your project is on a GitHub repository.
2.  **Import Project:** In your Vercel or Netlify dashboard, import the repository.
3.  **Configure Build Settings:** The platform will likely auto-detect the Vite project. Use these settings:
    *   **Build Command:** `npm run build` (or `yarn build`)
    *   **Output Directory:** `dist`
4.  **Set Environment Variables:** This is the most important step for deployment. In your project's settings on Vercel/Netlify, add the following environment variables:
    *   `VITE_API_KEY`: Your Gemini API Key.
    *   `VITE_GROQ_API_KEY`: Your Groq API Key.
5.  **Deploy:** Trigger a new deployment. The platform will build your project and deploy the contents of the `dist` folder.

## API Strategy: Fallbacks & Recommendations

To ensure reliability and explore different AI capabilities, Greybrainer AI is designed with a fallback strategy.

*   **Primary AI: Google Gemini (`gemini-2.5-flash`)**
    *   **Strengths:** A powerful, fast, and multi-modal model that serves as the main engine for all analytical and creative tasks. It offers a great balance of performance and intelligence.

*   **Integrated Fallback: Groq (`llama3-8b-8192`)**
    *   **How it's used:** If a call to the Gemini API fails for a layer analysis, the application automatically retries the request using the Groq API.
    *   **Strengths:** **Extreme speed.** Groq's LPU™ Inference Engine provides incredibly fast responses, which is excellent for maintaining a smooth user experience during fallback scenarios.
    *   **Considerations:** Llama 3 8B is a smaller model than Gemini 2.5 Flash. While highly capable, its analysis may be less nuanced. It's best suited for the more straightforward textual analysis tasks.

### Recommendations for Future Integration
If you want to expand the AI capabilities, consider these top-tier alternatives:

*   **Best for Quality & Nuance: Anthropic Claude 3.5 Sonnet**
    *   Claude models are widely praised for their sophisticated understanding, detailed and nuanced writing style, and strong performance in creative and analytical tasks. Integrating Claude 3.5 Sonnet would be an excellent choice for offering a premium or alternative analysis engine, especially for the final report generation and script analysis where writing quality is paramount.

*   **Powerful All-Rounder: OpenAI GPT-4o**
    *   Another state-of-the-art model with excellent performance across a wide range of tasks. It's a reliable and powerful option, particularly if you are already in the OpenAI ecosystem. It can be more expensive than other options.

**Conclusion:** The current Gemini+Groq setup provides an excellent blend of top-tier quality and high-speed reliability. For future expansion, **Anthropic's Claude 3.5 Sonnet is highly recommended** as the next integration to offer an alternative high-quality voice for analysis.

## Protecting Your Intellectual Property
*   **Prompts (`src/services/geminiService.ts`):** This file contains the "secret sauce" of Greybrainer AI. For commercial use, it **must** be moved to a secure backend to prevent others from copying your methodology.
*   **Theory (`MOVIE_MAGIC_THEORY.md`):** This document outlines your unique framework. Consider copyright and appropriate sharing strategies.
