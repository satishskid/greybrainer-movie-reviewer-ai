# Director Mode Feature

## Overview

The "Director Mode" is a new feature in the Blog Export functionality that transforms standard movie reviews into cinematic, story-driven narratives. It uses a specialized "Hybrid Film Director and Content Strategy Consultant" persona to generate content that is both engaging and strategically designed for audience growth.

## Key Components

### 1. Backend Service (`services/geminiService.ts`)

- **Function**: `generateDirectorModeBlogPost`
- **Prompt Strategy**:
  - **Persona**: Hybrid Film Director + Content Strategy Consultant.
  - **Structure**:
    - **Act 1 (The Hook)**: Sets the scene, introduces the protagonist (audience), and the inciting incident.
    - **Act 2 (The Journey)**: Explores the "Middle Ring" (Conceptualization) and "Outer Ring" (Performance) as plot points.
    - **Act 3 (The Climax & Resolution)**: Delivers the core insight and final verdict.
  - **Visual Anchors**: Requests specific visual descriptions (e.g., "Camera pans to...", "Close up on...").
  - **Content Strategy**: Includes a "Content Ecosystem" section with ideas for:
    - **Twitter/X Thread**: Hook + 3 key insights.
    - **LinkedIn Post**: Professional lesson/industry insight.
    - **Newsletter Subject Lines**: High-open-rate options.

### 2. Frontend UI (`components/BlogExportModal.tsx`)

- **Toggle**: A "Director Mode" checkbox in the Blog Export modal.
- **Generation**: A "Generate Cinematic Cut" button that triggers the AI generation on demand.
- **Preview**: Displays the generated cinematic narrative in the preview window.
- **Export**: Allows copying to clipboard or downloading as a Markdown file (suffixed with `_director_cut.md`).

## Usage

1. Complete a movie analysis.
2. Click "Export Blog/Social".
3. Select "Blog Post Format".
4. Check "🎬 Director Mode (Cinematic Narrative)".
5. Click "Generate Cinematic Cut".
6. Review the generated story and content strategy.
7. Copy or Download.

## Technical Details

- **Input**: Movie Title + Summary Report Text.
- **Output**: Markdown-formatted text containing the cinematic story and content strategy.
- **State Management**: Local state in `BlogExportModal` handles the toggle, loading state, and generated content storage.
