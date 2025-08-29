# Greybrainer AI - User Manual

Welcome to Greybrainer AI! This manual will guide you through using the application to analyze movies, generate creative ideas, and gain deeper insights into the art of filmmaking.

**Table of Contents**

1.  [Getting Started](#getting-started)
    *   [Launching the Application](#launching-the-application)
    *   [Interface Overview](#interface-overview)
    *   [API Key Setup (Important for Local Use)](#api-key-setup)
2.  [Core Movie Analysis](#core-movie-analysis)
    *   [Inputting Movie Details](#inputting-movie-details)
    *   [Understanding Layer Analysis Cards](#understanding-layer-analysis-cards)
        *   [Story/Script Layer](#storyscript-layer)
        *   [Conceptualization Layer](#conceptualization-layer)
        *   [Performance/Execution Layer](#performanceexecution-layer)
    *   [Editing AI Analysis](#editing-ai-analysis)
    *   [Assigning Scores](#assigning-scores)
    *   [Understanding Vonnegut Story Shapes](#understanding-vonnegut-story-shapes)
3.  [Generating & Understanding Reports](#generating--understanding-reports)
    *   [Generating the Final Greybrainer Report](#generating-the-final-greybrainer-report)
    *   [Interpreting the Report](#interpreting-the-report)
        *   [Overall Summary & Scores](#overall-summary--scores)
        *   [Concentric Rings Visualization](#concentric-rings-visualization)
        *   [Social Media Snippet](#social-media-snippet)
        *   [Overall Improvement Opportunities](#overall-improvement-opportunities)
    *   [Comparing with Actual Performance](#comparing-with-actual-performance)
4.  [Advanced Creative & Analytical Modules](#advanced-creative--analytical-modules)
    *   [Creative Spark Generator](#creative-spark-generator)
        *   [Generating New Story Ideas](#generating-new-story-ideas)
        *   [Understanding Generated Content (Logline, Synopsis, Characters, Scenes)](#understanding-generated-content)
        *   [Using the Story Mind Map Outline](#using-the-story-mind-map-outline)
        *   [Enhancing Existing Ideas](#enhancing-existing-ideas)
    *   [Script Magic Quotient Analyzer](#script-magic-quotient-analyzer)
        *   [Inputting Your Script Idea](#inputting-your-script-idea)
        *   [Interpreting the Magic Quotient Analysis](#interpreting-the-magic-quotient-analysis)
    *   [AI Morphokinetics Analysis](#ai-morphokinetics-analysis)
        *   [What is Morphokinetics?](#what-is-morphokinetics)
        *   [Running the Analysis](#running-the-analysis)
        *   [Interpreting the Visualization and Key Moments](#interpreting-the-visualization-and-key-moments)
    *   [Personnel "Magic Factor" Insights](#personnel-magic-factor-insights)
        *   [Analyzing Director/Actor Styles](#analyzing-directoractor-styles)
5.  [Other Features](#other-features)
    *   [Monthly Magic Scoreboard](#monthly-magic-scoreboard)
        *   [Browsing Top Releases](#browsing-top-releases)
        *   [Using Filters (Date, Country, Region, Language)](#using-filters)
    *   [Greybrainer Insights & Research](#greybrainer-insights--research)
        *   [Dynamic AI Insight](#dynamic-ai-insight)
        *   [Detailed Research Report Generation](#detailed-research-report-generation)
    *   [Token Usage Estimator](#token-usage-estimator)
        *   [Understanding the Dashboard](#understanding-the-dashboard)
        *   [Important Disclaimers](#important-disclaimers)
6.  [API Usage & Error Handling](#api-usage--error-handling)
7.  [Troubleshooting & FAQ](#troubleshooting--faq)

---

## 1. Getting Started

### Launching the Application
Open the `index.html` file (usually from your `dist` or build folder) in a modern web browser (Chrome, Firefox, Edge, Safari).

### Interface Overview
The Greybrainer AI interface is divided into several key sections:
*   **Header:** Contains the application title and a control for the Token Usage Estimator.
*   **Movie Input Form:** Where you enter the movie/series title and review stage to start an analysis.
*   **Layer Analysis Cards:** Displays AI-generated analysis for Story, Conceptualization, and Performance layers. These are interactive.
*   **Report & Visualization Area:** Shows the final summary report, concentric rings visualization, and other outputs like Morphokinetics.
*   **Advanced Feature Modules:** Dedicated sections for Creative Spark, Magic Quotient, etc.
*   **Monthly Magic Scoreboard:** A dynamic list of recent releases and their scores.
*   **Greybrainer Insights & Research:** Section for AI-generated industry trends and detailed report generation.
*   **Footer:** Copyright information.

### API Key Setup - BYOK (Bring Your Own Key) System
Greybrainer AI uses a secure "Bring Your Own Key" approach for maximum security and control:

**Groq API (Pre-configured)**
*   Primary AI engine for fast analysis
*   No additional setup required
*   Handles most core functionality

**Gemini API (Optional - User Provided)**
*   Enhanced analysis capabilities
*   Deep analysis and advanced features
*   Requires your own Google AI Studio API key

**Setting Up Your Gemini API Key:**
1.  Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2.  Create or copy an existing API key (starts with "AIza")
3.  In Greybrainer AI, you'll be prompted to enter your key after login
4.  Your key is stored securely in your browser's local storage
5.  Keys are validated every 24 hours for security

**Security Features:**
*   Keys never leave your browser except to call the respective AI services
*   Automatic key validation and expiration handling
*   Easy key rotation and management
*   No keys stored on Greybrainer servers

## 2. Core Movie Analysis

This is the primary function of Greybrainer AI.

### Inputting Movie Details
1.  Navigate to the **Movie Input Form** at the top of the page.
2.  **Movie/Series Title:** Enter the full title of the movie or series you want to analyze (e.g., "Inception").
3.  **Review Stage:** Select the current stage of the movie:
    *   `Idea Announcement`: For analyzing a concept before production.
    *   `Trailer Analysis`: For analyzing based on a released trailer.
    *   `Full Movie/Series Review`: For analyzing a completed and released work.
4.  **Est. Production Budget (Optional):** Enter the estimated budget in USD. This is used for qualitative ROI insights.
5.  Click **"Analyze Movie"**.
    *   The app may first check for title suggestions ("Did you mean?"). Confirm your title or select a suggestion to proceed.

### Understanding Layer Analysis Cards
Once analysis begins, cards for each layer (Story, Conceptualization, Performance) will populate.
*   **Loading State:** While AI is working, a spinner will show.
*   **AI Generated Analysis:** The AI's insights for that layer.
*   **Error Display:** If an error occurs, it will be shown on the card.

#### Story/Script Layer
Focuses on: Core idea, narrative structure, themes, character development, dialogue, originality, and world-building.
*   **Vonnegut Story Shape:** See [Understanding Vonnegut Story Shapes](#understanding-vonnegut-story-shapes).

#### Conceptualization Layer
Focuses on: Director's vision, editing, casting choices (and their impact), overall presentation, and visual style.
*   May include AI-found information about the director.

#### Performance/Execution Layer
Focuses on: Acting quality, music and score effectiveness, cinematography, visual/practical effects, and choreography.
*   May include AI-found information about main cast members.

### Editing AI Analysis
1.  On any Layer Analysis Card with generated text, click the **Edit icon** (pencil).
2.  The text area becomes editable. Modify the AI's analysis as you see fit.
3.  Changes are saved automatically as you type. Click the Edit icon again to exit editing mode.

### Assigning Scores
1.  On each Layer Analysis Card, find the "Your Score" input field.
2.  Enter a score from 0 to 10 (decimals like 7.5 are allowed). This is your subjective rating for that layer.
    *   The AI may also provide a `Suggested Score`, which will pre-fill your score input initially. You can override this.

### Understanding Vonnegut Story Shapes
For the **Story/Script Layer**, Greybrainer AI attempts to map the narrative to one of Kurt Vonnegut's story archetypes (e.g., "Man in Hole," "Cinderella").
*   **Visualization:** A graph shows the protagonist's "fortune" (good to ill) over the "time" of the story (beginning to end).
*   **Justification:** The AI explains why it chose that particular shape.
*   **Key Plot Points:** Descriptions of pivotal moments that define the shape.
This is found within a collapsible section on the Story layer card.

## 3. Generating & Understanding Reports

After all layers have been analyzed (or if some have errors but you wish to proceed with available data):

### Generating the Final Greybrainer Report
1.  Once the "Generate Greybrainer Report" button becomes active (below the layer cards), click it.
2.  The AI will synthesize all layer analyses, your scores, and personnel data into a comprehensive report.

### Interpreting the Report

#### Overall Summary & Scores
*   **Main Text:** A cohesive summary discussing the film's overall strengths, weaknesses, originality, and potential impact, drawing from all layers.
*   **Overall Greybrainer Score:** An average of your assigned scores for each layer.

#### Concentric Rings Visualization
This graphic provides a visual summary of your layer scores:
*   **Innermost Ring:** Story/Script score.
*   **Middle Ring:** Conceptualization score.
*   **Outermost Ring:** Performance/Execution score.
The fullness of each ring corresponds to your score for that layer.

#### Social Media Snippet
A brief, engaging teaser suitable for sharing on social media platforms.

#### Overall Improvement Opportunities
A short, bulleted list of high-level suggestions for how the film could have been improved, based on the AI's synthesis.

### Comparing with Actual Performance
1.  In the generated report section, find the "Compare with Actual Performance (User Input)" area. Click "Show Inputs" if it's collapsed.
2.  Enter known metrics:
    *   Rotten Tomatoes (Critics % and Audience %)
    *   Metacritic Score (/100)
    *   Box Office Performance Notes (e.g., "Exceeded expectations," "Underperformed")
3.  Click "Save Actuals." This data is stored locally with your session and will be displayed alongside the Greybrainer score.

## 4. Advanced Creative & Analytical Modules

These modules provide tools for deeper creative development and strategic insight.

### Creative Spark Generator
This tool helps you brainstorm and develop new story ideas.

#### Generating New Story Ideas
1.  Navigate to the "Creative Spark" section.
2.  **Select Genre:** Choose a genre from the dropdown.
3.  **Optional Inspiration (Keywords/Themes):** Enter any initial thoughts, keywords, or themes to guide the AI.
4.  Click **"Generate Story Ideas"**. The AI will produce 3-4 distinct concepts.

#### Understanding Generated Content
Each generated idea includes:
*   **Logline:** A concise, one-sentence summary.
*   **Synopsis:** A brief overview of the story.
*   **Character Ideas:** Names and short descriptions for key characters.
*   **Scene Ideas:** Titles and descriptions for pivotal scenes.
*   **Mind Map Markdown:** A structured markdown text representing the story's hierarchy.

A list of generated ideas (by logline) will appear. Click "View & Enhance this Idea" to see full details.

#### Using the Story Mind Map Outline
When viewing a selected idea, a "Story Structure Outline" is displayed. This is an HTML-based hierarchical list parsed from the `mindMapMarkdown`, visually representing the story's main components (Core Idea, Themes, Plot Flow, Characters, etc.).

#### Enhancing Existing Ideas
1.  After selecting an idea, its details will be displayed.
2.  In the "Enhance this Idea" form, enter your instructions in the "Your Enhancement Instructions" text area (e.g., "Make the protagonist a child," "Add a sci-fi element," "Change the setting to ancient Rome").
3.  Click **"Enhance Idea"**. The AI will refine the selected concept based on your prompt, updating its details and mind map.

### Script Magic Quotient Analyzer
Assess the potential of your script or story idea.

#### Inputting Your Script Idea
1.  Go to the "Script Idea - Magic Quotient Test" section.
2.  **Idea Title (Optional):** Give your project a working title.
3.  **Logline (Required):** Your compelling one-sentence summary.
4.  **Synopsis / Key Details (Required):** Expand on the plot, characters, themes, and unique elements. More detail often yields better analysis.
5.  **Select Genre:** Choose the primary genre.
6.  Click **"Test Magic Quotient"**.

#### Interpreting the Magic Quotient Analysis
The AI will provide:
*   **Overall Assessment:** A qualitative summary of the idea's potential.
*   **Identified Strengths:** Key positive aspects.
*   **Areas for Development:** Potential weaknesses or areas needing more thought.
*   **Actionable Suggestions:** Concrete ideas for improvement.
*   **Subjective Potential Scores:** AI-estimated scores (1-10) for Originality, Audience Appeal, and Critical Reception, visualized with bars.
*   **Disclaimer:** A note on the subjective, AI-generated nature of the feedback.

### AI Morphokinetics Analysis
Analyze the "motion" and dynamic flow of a movie.

#### What is Morphokinetics?
This analysis looks at a film's narrative rhythm, including:
*   Pacing strategy (slow burn, relentless, varied).
*   How tension is built and released.
*   The overall emotional journey for the audience.
*   Timeline structure (linear, non-linear, etc.).

#### Running the Analysis
1.  Ensure a movie title is entered in the main Movie Input Form and basic layer analysis has been attempted (or at least the "Analyze Movie" button has been clicked).
2.  Click the "Analyze Movie Motion" button (it becomes active after the core layer analysis stage).

#### Interpreting the Visualization and Key Moments
*   **Overall Dynamic Flow Summary:** AI's textual summary.
*   **Timeline Structure Notes:** AI's observations on the film's timeline.
*   **Intensity & Emotional Arc Visualization:**
    *   A line graph plotting "Intensity" (0-10) against "Normalized Movie Time" (0.0 to 1.0).
    *   Points on the graph represent **Key Moments**. Hover over points to see details.
        *   **Color of point:** Indicates emotional valence (Green for positive, Red for negative, Grey for neutral).
        *   **Size/Icon:** Larger points or special icons (Sparkles) may indicate plot twists. Arrow icons indicate pacing shifts.
*   **Key Moments & Observations List:** A textual list of these pivotal moments, including their estimated time, intensity score, dominant emotion, event description, and whether they are twists or pacing shifts.

### Personnel "Magic Factor" Insights
Gain AI-driven insights into the signature styles of directors and actors.

#### Analyzing Director/Actor Styles
1.  After a core movie analysis, if the AI identifies a Director or Main Cast members, they will be listed in the "Personnel & Stakeholder Insights" section.
2.  For each listed individual, click the **"Analyze Magic Factor"** button.
3.  The AI will generate a brief analysis of their unique style, recurring themes, notable techniques, and what makes their work impactful, potentially citing examples from their filmography (if found via search).

## 5. Other Features

### Monthly Magic Scoreboard

#### Browsing Top Releases
This section showcases a curated list of recent movie and web series releases, along with their "Greybrainer Score" and rankings. It's a dynamic way to see what's currently making an impact based on AI analysis.

#### Using Filters (Date, Country, Region, Language)
*   **Year & Month:** Select a specific year and month to view scoreboards from that period. Defaults to the current month/year.
*   **Country:** Filter releases by their country of origin.
*   **Region/State:** Further refine by region or state within a selected country (options update based on country selection).
*   **Language:** Filter by the primary language of the release (options update based on country/region).

### Greybrainer Insights & Research

#### Dynamic AI Insight
This section automatically fetches and displays a concise, AI-generated insight about current trends in filmmaking, movie consumption, narrative techniques, or film technology. You can click "Refresh Insight" to get a new one.

#### Detailed Research Report Generation
Based on the currently displayed "Dynamic AI Insight," you can click **"Generate Detailed Report"**. The AI will elaborate on the insight, creating a more comprehensive research report (approx. 400-600 words) with supporting details, potentially using web search. This report can then be copied or downloaded as a Markdown file.

### Token Usage Estimator

#### Understanding the Dashboard
Accessed via the "Estimator" button in the header.
*   Provides a **ROUGH, NON-OFFICIAL ESTIMATION** of API token usage.
*   Shows "Est. Queries Since Last Reset" and "Est. Queries This Minute" against user-defined thresholds (for personal tracking).
*   Logs recent operations and their estimated token counts.

#### Important Disclaimers
*   **This is NOT official billing.** Token counts are estimated based on character length (approx. 4 characters/token).
*   Actual token usage and costs are determined by Google. Always refer to your Google Cloud Console or AI Studio for accurate information.
*   This tool is for general awareness and relative comparison of operations only.

## 6. API Usage & Error Handling

Greybrainer AI uses multiple AI services to provide comprehensive analysis. Here's what you need to know about API usage and error handling.

### API Services Used

**Groq API**
*   Pre-configured with generous limits
*   Handles most core functionality
*   Fast response times for quick analysis
*   Automatic rate limiting and retry logic

**Gemini API**
*   Requires your Google AI Studio API key
*   Used for enhanced analysis and deep insights
*   More comprehensive analysis capabilities
*   Subject to your Google account's usage limits

### Error Handling & Recovery

**When API Limits Are Reached:**
*   Clear, informative error messages
*   Suggested wait times (typically 24 hours for daily limits)
*   Guidance on upgrading API plans
*   Instructions for checking usage in Google AI Studio

**Automatic Recovery Features:**
*   Graceful error handling without crashes
*   Clear user notifications about temporary limitations
*   Suggestions for alternative approaches
*   Automatic retry capabilities where appropriate

**Best Practices:**
*   Monitor your usage in Google AI Studio for official tracking
*   Consider upgrading your API plan for heavy usage
*   Use the application during off-peak hours if experiencing limits
*   Keep your API keys secure and up-to-date

## 7. Troubleshooting & FAQ

**API Key and Authentication Issues:**

*   **Q: I'm prompted to enter a Gemini API key. Is this required?**
    *   A: No, Gemini API key is optional. Greybrainer AI works with Groq API for core functionality. Gemini provides enhanced analysis capabilities. You can skip Gemini setup and use Groq-only features.

*   **Q: My Gemini API key shows as "invalid" or "expired."**
    *   A: Verify your key format (should start with "AIza") and check it's active in Google AI Studio. Keys are re-validated every 24 hours automatically.

*   **Q: How do I update or change my API key?**
    *   A: Go to Settings/API Keys section, clear the existing key, and enter your new one. The system will validate and store the new key securely.

**Analysis and Performance Issues:**

*   **Q: An analysis for a layer failed or shows an error.**
    *   A: This can happen due to API issues, network problems, or processing difficulties. The system automatically tries fallback options and provides clear error messages with suggested actions.

*   **Q: I'm getting "API quota exceeded" errors.**
    *   A: Your daily API usage limit has been reached. Wait for the quota to reset (typically 24 hours) or consider upgrading your API plan in Google AI Studio. The system will provide clear guidance on next steps.

**Data and Storage Questions:**

*   **Q: Are my API keys and data secure?**
    *   A: Yes. API keys are stored only in your browser's local storage and never transmitted to Greybrainer servers. Keys are only sent to the respective AI services (Google, Groq) for analysis.

*   **Q: Can I save my analyses?**
    *   A: Edited text and scores are saved in your browser's local storage for the current session and subsequent visits. For permanent storage, copy generated reports or download Markdown versions where available.

*   **Q: What happens if I clear my browser data?**
    *   A: You'll lose stored API keys and analysis data. You'll need to re-enter your API keys and any custom analyses will be lost.

**Usage and Billing Questions:**

*   **Q: How do I monitor my API usage and costs?**
    *   A: For official usage and billing information, check your Google AI Studio or Google Cloud Console. These provide accurate, real-time usage data and billing details.

**Feature-Specific Issues:**

*   **Q: Some advanced features aren't working.**
    *   A: Advanced features may require Gemini API access. Ensure you have a valid Gemini API key. Some features automatically fall back to basic functionality when Gemini is unavailable.

*   **Q: Movie search isn't finding my title.**
    *   A: Try alternative spellings, include release year, or use the original language title. The search uses multiple databases and may have coverage limitations for very recent or obscure titles.

For further assistance or consultancy inquiries, please refer to contact information provided by the Greybrainer AI team.