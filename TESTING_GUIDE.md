# Feature Testing Guide

This guide outlines how to verify the new features implemented in the Greybrainer Movie Reviewer AI.

## 1. Automated Verification
We have added a built-in verification tool in the Admin Settings.

1. Open the application in your browser.
2. Click the **Admin Settings** (Gear icon) in the top right.
3. Navigate to the **Debug Tools** tab.
4. Scroll down to **Feature Verification**.
5. Click **Run Verification**.

**What this tests:**
- **Movie Search:** Verifies that the search function returns rich data (Year, Director) to solve ambiguity.
- **Pixar Parsing:** Verifies that the system can correctly extract "Pixar Style Scenes" from the AI's response.

## 2. Manual Testing Plan

### A. Search Ambiguity & Rich Results
**Goal:** Ensure the search distinguishes between movies with similar titles.
1. In the main search bar, type `Avatar`.
2. **Expected Result:** You should see a dropdown with distinct options like:
   - *Avatar (2009) - James Cameron*
   - *Avatar: The Last Airbender (2005) - Michael Dante DiMartino*
3. Select one. The form should auto-fill with the correct Title, Year, and Director.

### B. Date Context & Indian Cinema Priority
**Goal:** Ensure the AI knows the current date (2025) and prioritizes Indian content.
1. Search for a recent Indian movie (e.g., "Pushpa 2" or a 2024/2025 release).
2. Generate a report.
3. **Expected Result:**
   - The report should NOT say "cutoff date 2024".
   - It should acknowledge the movie's release status as of today.

### C. "Nano Banana" Report Features (Pixar Scenes & Blog Export)
**Goal:** Verify the new visual report elements and export functionality.
1. Generate a full report for any movie.
2. Scroll to the bottom of the report.
3. **Expected Result:** You should see a section titled **"Representative Scenes (Pixar Style)"** with 3 distinct scene descriptions.
4. Click the **"Publish Report"** button (top right of the report view).
5. **Expected Result:** A modal should open with a preview of the "Nano Banana" blog post.
6. Click **"Copy HTML to Clipboard"**.
7. Paste the result into a `.html` file or a blog editor to verify the formatting (Concentric Rings, Scenes, etc.).

## 3. Troubleshooting
- If the **Search** fails, check your Google Search API key in Admin Settings.
- If the **Report** is missing sections, check the Gemini API key and ensure you are using a model that supports larger context (e.g., `gemini-1.5-pro`).
