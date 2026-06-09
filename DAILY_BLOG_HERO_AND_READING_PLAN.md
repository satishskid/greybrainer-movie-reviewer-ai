# Daily Blog on Hero + Deep Reading Page — Architecture Plan

> **Goal:** Daily Greybrainer blogs (newsletter-style intelligence briefs) become the **lead story** in the hero carousel, rotating every day. Reviews and research remain in the carousel with colour-coded badges. Clicking any hero card opens a **rich, interlinked reading page** with keyword navigation, section scanning, and an archive sidebar.

---

## 1  What Changes At A Glance

| Layer | Current State | Target State |
|---|---|---|
| **Hero carousel** | Top 5 entries (mixed, no ordering logic) | Slot 1 = today's daily blog; Slots 2-5 = latest reviews/research, colour-coded |
| **Content source** | Worker API `/api/public/lens/manifest` returns published drafts | Same API, but daily briefs get **priority flag** + keyword/tag extraction |
| **Reading page** | Single `EntryArticle.astro` component, static sections | Two-layer page: **top summary card** → on-click expand into full interlinked article |
| **Interlinked keywords** | None | Keywords extracted per article → clickable → highlight + scroll, or cross-link to archive |
| **Archive scanning** | Basic listing pages (`/reviews/`, `/research/`, `/briefs/`) | Unified `/archive` page with faceted search (type, tag, date range, keyword) |
| **Data storage** | Turso (metadata) + R2 (full markdown/artifacts) | Same — add `keywords_json` and `reading_metadata_json` columns |

---

## 2  Data Model Changes

### 2.1  Turso Schema Additions

```sql
-- Phase 11: Daily blog hero + reading enhancements
ALTER TABLE drafts ADD COLUMN is_hero_candidate INTEGER NOT NULL DEFAULT 0;
ALTER TABLE drafts ADD COLUMN hero_priority INTEGER NOT NULL DEFAULT 0;
  -- 100 = daily brief (always highest), 50 = featured review, 0 = normal

ALTER TABLE draft_versions ADD COLUMN keywords_json TEXT;
  -- JSON array: ["OTT", "Pan-Indian", "Netflix", "Institutional Dissent"]
  -- Extracted by AI during generation or post-processing

ALTER TABLE draft_versions ADD COLUMN reading_metadata_json TEXT;
  -- {
  --   "estimatedReadTime": "7 min",
  --   "sectionAnchors": [
  --     { "id": "trending-now", "label": "Trending Now", "wordCount": 320 },
  --     { "id": "critical-view", "label": "Critical View", "wordCount": 280 },
  --     { "id": "social-spark", "label": "The Social Spark", "wordCount": 150 }
  --   ],
  --   "relatedSlugs": ["accused-2026", "the-bluff-2026"],
  --   "keywordCrossLinks": {
  --     "OTT": ["/archive?keyword=OTT"],
  --     "Netflix": ["/archive?keyword=Netflix"]
  --   }
  -- }

ALTER TABLE draft_versions ADD COLUMN summary_hook TEXT;
  -- One-paragraph gist for the hero card overlay (150 chars max)
```

### 2.2  R2 Additions

When `DRAFT_STORAGE_MODE=r2`, these new fields are stored as JSON objects alongside existing artifacts:

```
drafts/{draftId}/versions/{versionId}/keywords.json
drafts/{draftId}/versions/{versionId}/reading-metadata.json
```

### 2.3  Knowledge Documents → Cross-Linking

The existing `knowledge_documents` table already has `tags_json` and `summary`. These are used to build the **archive cross-reference index** — no schema change needed.

---

## 3  Worker API Changes

### 3.1  Enhanced `/api/public/lens/manifest`

The `PublicLensManifestEntry` gains new optional fields:

```typescript
// In publicLensManifest.ts
export interface PublicLensManifestEntry {
  // ... existing fields ...

  // NEW
  heroPriority: number;          // 100 = daily brief, 50 = featured, 0 = normal
  keywords: string[];            // Extracted keywords
  summaryHook: string | null;    // Short gist for hero overlay
  readingMetadata: {
    estimatedReadTime: string;
    sectionAnchors: Array<{
      id: string;
      label: string;
      wordCount: number;
    }>;
    relatedSlugs: string[];
  } | null;
}
```

The `listPublicLensManifest` query adds `ORDER BY hero_priority DESC, updated_at DESC` so daily briefs always float to the top.

### 3.2  Enhanced Daily Brief Generation

In `dailyBrief.ts`, the generation prompt and post-processing are extended to:

1. **Extract keywords** — the AI prompt now asks for a `keywords` array (5-10 terms)
2. **Generate summary_hook** — a one-liner gist (≤150 chars) for the hero card
3. **Compute section anchors** — parse headings from the generated markdown
4. **Set `is_hero_candidate = 1` and `hero_priority = 100`** for all daily briefs

```typescript
// After AI generates the draft:
const keywords = generated.keywords ?? extractKeywordsFromMarkdown(generated.blog_markdown);
const summaryHook = generated.summary_hook ?? generated.blog_markdown.slice(0, 150);
const sectionAnchors = parseSectionAnchors(generated.blog_markdown);
const readingMetadata = {
  estimatedReadTime: estimateReadTime(generated.blog_markdown),
  sectionAnchors,
  relatedSlugs: findRelatedSlugs(keywords, existingDrafts),
};
```

### 3.3  New Endpoint: `/api/public/lens/archive`

Serves the **archive index** for the reading page sidebar and archive page:

```
GET /api/public/lens/archive?keyword=OTT&type=brief&limit=20&offset=0
```

Returns:
```json
{
  "entries": [
    {
      "slug": "...",
      "title": "...",
      "contentType": "brief",
      "publishedAt": "...",
      "keywords": ["OTT", "Netflix"],
      "summaryHook": "...",
      "overallScore": null
    }
  ],
  "total": 42,
  "facets": {
    "types": { "brief": 30, "review": 8, "study": 4 },
    "keywords": { "OTT": 15, "Netflix": 12, "Bollywood": 10 }
  }
}
```

---

## 4  Lens-Site (Astro) Changes

### 4.1  Hero Carousel — Daily Blog as Lead

**File:** `HeroCarousel.astro`

```
┌─────────────────────────────────────────────────────┐
│ HERO SLIDE LAYOUT (Slot 1 — Daily Blog)             │
│                                                     │
│  ┌─ DAILY BRIEF badge (gold/amber accent) ────────┐│
│  │ 🟡 "Today's Intelligence Brief"                ││
│  │                                                 ││
│  │ Title: "As your smart editor on March 13..."    ││
│  │                                                 ││
│  │ THE GIST: One-paragraph hook from summaryHook   ││
│  │                                                 ││
│  │ [Read Full Brief →]  [Browse Archive →]         ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│ HERO SLIDE LAYOUT (Slots 2-5 — Reviews/Research)    │
│                                                     │
│  ┌─ TYPE BADGE (colour-coded) ─────────────────────┐│
│  │ 🔴 REVIEW   or   🔵 RESEARCH                   ││
│  │                                                 ││
│  │ Title + Dek + Score (if review)                 ││
│  │                                                 ││
│  │ THE GIST: First paragraph or summaryHook        ││
│  │                                                 ││
│  │ [Read Full Article →]                           ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Colour code system:**

| Content Type | Badge Colour | CSS Variable | Hex |
|---|---|---|---|
| Daily Brief | Amber/Gold | `--type-brief` | `#d4a017` |
| Review | Crimson | `--type-review` | `#c1432e` (existing accent) |
| Research/Study | Cerulean | `--type-study` | `#2e86c1` |

**Sorting logic** (in `index.astro`):

```typescript
// Sort entries for hero carousel
const heroEntries = allEntries
  .sort((a, b) => {
    // Daily briefs first (heroPriority 100)
    if (a.heroPriority !== b.heroPriority) return b.heroPriority - a.heroPriority;
    // Then by date
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  })
  .slice(0, 5);
```

### 4.2  Reading Page — Two-Layer Architecture

**Layer 1: Top Summary Card (above the fold)**

When a user clicks a hero card, they land on the detail page (`/briefs/[slug]`, `/reviews/[slug]`, or `/research/[slug]`). The page has a **top summary card** that shows:

```
┌──────────────────────────────────────────────────────────────┐
│ TOP LAYER — "The Brief" (always visible)                     │
│                                                              │
│  Type Badge (🟡 Daily Brief)     Date: March 13, 2026       │
│                                                              │
│  TITLE (large)                                               │
│  Dek/subtitle                                                │
│                                                              │
│  ┌─ Quick Scan Bar ──────────────────────────────────────┐   │
│  │ § Trending Now (2 min) │ § Critical View (3 min) │ ...│   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  Summary paragraph (the gist)                                │
│                                                              │
│  ┌─ Keyword Pills ──────────────────────────────────────┐   │
│  │ [OTT] [Netflix] [Pan-Indian] [Institutional Dissent] │   │
│  │  ↑ clicking a pill scrolls to first mention OR       │   │
│  │    opens /archive?keyword=X in a new tab             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [▼ Read Full Article]  ← smooth-scroll trigger             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layer 2: Full Interlinked Article (below)**

```
┌──────────────────────────────────────────────────────────────┐
│ ARTICLE BODY                          │ SIDEBAR RAIL        │
│                                       │                     │
│ ## Trending Now  ←── anchor id        │ 📑 Section Scanner  │
│ Body paragraphs with **bold keywords**│  ├ Trending Now ◄── │
│ that are auto-linked to archive.      │  ├ Critical View    │
│                                       │  └ Social Spark     │
│ ## Critical View                      │                     │
│ More body text...                     │ 🔗 Related Articles │
│                                       │  ├ The Bluff (2026) │
│ ## The Social Spark                   │  └ Accused (2026)   │
│ ...                                   │                     │
│                                       │ 🏷️ Keywords         │
│                                       │  [OTT] [Netflix]    │
│                                       │  [Pan-Indian]       │
│                                       │                     │
│                                       │ 📰 From the Archive │
│                                       │  Latest 5 briefs    │
│                                       │  [Browse all →]     │
└──────────────────────────────────────────────────────────────┘
```

### 4.3  New Component: `ArticleSummaryCard.astro`

Renders the Layer 1 top card with:
- Type badge (colour-coded)
- Title, dek, date
- Quick-scan bar (clickable section anchors with estimated read time)
- Summary/gist paragraph
- Keyword pills (linked to archive)
- "Read Full Article" CTA

### 4.4  Enhanced `EntryArticle.astro`

The existing article component gains:
- **Section anchors** — each `<h2>` gets a stable `id` attribute
- **Keyword highlighting** — keywords from `keywords_json` are wrapped in `<mark>` with a link to `/archive?keyword=X`
- **Sticky section scanner** in the sidebar rail — highlights the current section as you scroll (IntersectionObserver)
- **Related articles** panel in the sidebar — driven by `readingMetadata.relatedSlugs`
- **Archive teaser** — latest 5 entries from the same `contentType`, with a "Browse all →" link to `/archive`

### 4.5  New Page: `/archive` (`lens-site/src/pages/archive/index.astro`)

A faceted archive browsing page:

```
┌──────────────────────────────────────────────────────────────┐
│ ARCHIVE — CineCraft Intelligence                             │
│                                                              │
│ ┌─ Filters ─────────────────────────────────────────────┐   │
│ │ Type: [All] [Briefs] [Reviews] [Research]             │   │
│ │ Keyword: [search input with autocomplete]             │   │
│ │ Date: [Last 7d] [Last 30d] [All time]                 │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌─ Results Grid ────────────────────────────────────────┐   │
│ │ Card Card Card Card                                   │   │
│ │ Card Card Card Card                                   │   │
│ │ [Load more...]                                        │   │
│ └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

This page is **static at build time** (SSG) but uses client-side JS to filter/sort the pre-loaded entry list. No runtime API calls needed for the initial archive — all entries are baked in at build. The keyword filter matches against the `keywords` array in each entry.

---

## 5  Data Flow — End to End

```
                     GENERATION
                     ──────────
  ┌──────────┐      ┌──────────┐      ┌──────┐
  │ Cron Job │─────▶│ dailyBrief│─────▶│Gemini│
  │ 09:00 IST│      │    .ts    │      │ API  │
  └──────────┘      └────┬─────┘      └──────┘
                         │
                         ▼
                   ┌───────────┐
                   │ Generated │
                   │  payload  │
                   │ + keywords│
                   │ + hook    │
                   └────┬──────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
         ┌─────────┐        ┌─────────┐
         │  Turso  │        │   R2    │
         │ metadata│        │  full   │
         │ keywords│        │markdown │
         │ priority│        │keywords │
         └────┬────┘        └────┬────┘
              │                  │
              └────────┬─────────┘
                       │
                     SERVING
                     ───────
                       ▼
          ┌────────────────────────┐
          │ /api/public/lens/      │
          │   manifest             │
          │   archive              │
          └──────────┬─────────────┘
                     │
                     ▼  (build time fetch)
          ┌────────────────────────┐
          │   lens-site (Astro)    │
          │                        │
          │  index.astro           │
          │   └─ HeroCarousel      │
          │       Slot 1: Daily    │
          │       Slots 2-5: Mix   │
          │                        │
          │  /briefs/[slug].astro  │
          │   └─ ArticleSummary    │
          │   └─ EntryArticle      │
          │       + keywords       │
          │       + scanner        │
          │       + related        │
          │                        │
          │  /archive/index.astro  │
          │   └─ Faceted browse    │
          └────────────────────────┘
```

---

## 6  Implementation Phases

### Phase A — Schema + API (Worker side)
**Estimated effort: 1 session**

1. Create `db/phase11_hero_reading.sql` with ALTER TABLE statements
2. Run migration against Turso
3. Update `dailyBrief.ts`:
   - Extend generation prompt to return `keywords[]` and `summary_hook`
   - Add `extractKeywordsFromMarkdown()` fallback
   - Add `parseSectionAnchors()` utility
   - Set `is_hero_candidate = 1`, `hero_priority = 100`
   - Persist `keywords_json`, `reading_metadata_json`, `summary_hook`
4. Update `publicLensManifest.ts`:
   - Add new fields to `PublicLensManifestEntry`
   - Update SQL query: `ORDER BY hero_priority DESC, updated_at DESC`
   - Return `keywords`, `summaryHook`, `readingMetadata`, `heroPriority`
5. Add `/api/public/lens/archive` endpoint in `index.ts`
6. Update R2 storage to persist new artifacts

### Phase B — Lens-Site: Hero Carousel (Frontend)
**Estimated effort: 1 session**

1. Update `manifest.ts` to pass through new fields (`heroPriority`, `keywords`, `summaryHook`, `readingMetadata`)
2. Update `LensEntry` interface in `editorials.ts` with new optional fields
3. Update `index.astro` to sort hero entries by `heroPriority DESC` → date
4. Update `HeroCarousel.astro`:
   - Add colour-coded type badge (brief=amber, review=red, study=blue)
   - Use `summaryHook` for "The Gist" when available
   - Style daily brief slide distinctly (amber accent border)
5. Update `global.css` with type badge colours and hero brief styling

### Phase C — Lens-Site: Reading Page (Frontend)
**Estimated effort: 1-2 sessions**

1. Create `ArticleSummaryCard.astro`:
   - Type badge, title, dek, date
   - Quick-scan bar (section anchors with read time)
   - Keyword pills
   - "Read Full Article" CTA
2. Enhance `EntryArticle.astro`:
   - Add section `id` anchors to all `<h2>` headings
   - Add keyword auto-highlighting with archive links
   - Add sticky section scanner (IntersectionObserver-based)
   - Add related articles sidebar panel
   - Add archive teaser sidebar panel
3. Update detail page templates (`/briefs/[slug]`, `/reviews/[slug]`, `/research/[slug]`):
   - Render `ArticleSummaryCard` above `EntryArticle`
4. Add CSS for summary card, keyword pills, section scanner, related panel

### Phase D — Archive Page
**Estimated effort: 1 session**

1. Create `/archive/index.astro`
2. Build filter UI (content type tabs, keyword search, date range)
3. Pre-load all entries at build time, filter client-side
4. Card grid with type badges and keyword pills
5. "Load more" pagination (client-side, since all data is baked in)

---

## 7  Keyword Extraction Strategy

Keywords are extracted at **generation time** by the AI prompt. Fallback: regex-based extraction.

**AI prompt addition** (in `buildPrompt()`):
```
Also return a "keywords" array of 5-10 key terms/phrases from this brief.
Focus on: movie titles, platform names (Netflix, Prime Video, etc.),
cultural themes, genre tags, and trending topics.

Also return a "summary_hook" string — one sentence (max 150 characters)
that captures the essence of today's brief for a hero card overlay.
```

**Fallback extraction** (for older entries without AI keywords):
```typescript
function extractKeywordsFromMarkdown(md: string): string[] {
  // 1. Extract bold text (**keyword**)
  // 2. Extract proper nouns (Title Case words)
  // 3. Match against known tag vocabulary (OTT, Netflix, etc.)
  // 4. Deduplicate and return top 10
}
```

---

## 8  Design Tokens

```css
/* Content type colour system */
--type-brief: #d4a017;        /* Amber/Gold — daily intelligence */
--type-brief-surface: rgba(212, 160, 23, 0.08);
--type-brief-border: rgba(212, 160, 23, 0.25);

--type-review: #c1432e;       /* Crimson — same as existing accent */
--type-review-surface: rgba(193, 67, 46, 0.08);
--type-review-border: rgba(193, 67, 46, 0.25);

--type-study: #2e86c1;        /* Cerulean — research & essays */
--type-study-surface: rgba(46, 134, 193, 0.08);
--type-study-border: rgba(46, 134, 193, 0.25);

/* Reading page */
--keyword-pill-bg: rgba(255, 255, 255, 0.06);
--keyword-pill-border: rgba(255, 255, 255, 0.15);
--keyword-pill-hover: rgba(255, 255, 255, 0.12);
--scanner-active: var(--accent);
--scanner-inactive: rgba(255, 255, 255, 0.2);
```

---

## 9  File Manifest (New + Modified)

### New Files
| File | Purpose |
|---|---|
| `db/phase11_hero_reading.sql` | Turso schema migration |
| `lens-site/src/components/ArticleSummaryCard.astro` | Top-layer summary card |
| `lens-site/src/components/SectionScanner.astro` | Sticky sidebar section navigator |
| `lens-site/src/components/KeywordPills.astro` | Clickable keyword pills component |
| `lens-site/src/components/RelatedArticles.astro` | Sidebar related articles panel |
| `lens-site/src/components/ArchiveTeaser.astro` | Sidebar archive preview |
| `lens-site/src/pages/archive/index.astro` | Faceted archive browsing page |

### Modified Files
| File | Changes |
|---|---|
| `worker/src/lib/dailyBrief.ts` | Extend prompt for keywords + hook; persist new fields |
| `worker/src/lib/publicLensManifest.ts` | Add `heroPriority`, `keywords`, `summaryHook`, `readingMetadata` to manifest |
| `worker/src/lib/draftStorage.ts` | Persist new artifacts to R2 |
| `worker/src/lib/repository.ts` | New columns in INSERT/UPDATE queries |
| `worker/src/index.ts` | Add `/api/public/lens/archive` route |
| `lens-site/src/data/editorials.ts` | Add optional `heroPriority`, `keywords`, `summaryHook`, `readingMetadata` to `LensEntry` |
| `lens-site/src/data/manifest.ts` | Pass through new manifest fields in `normalizeManifestEntry()` |
| `lens-site/src/pages/index.astro` | Sort hero entries by priority; pass keywords to carousel |
| `lens-site/src/components/HeroCarousel.astro` | Type badges, daily brief styling, summaryHook |
| `lens-site/src/components/EntryArticle.astro` | Section anchors, keyword highlighting, scanner, related |
| `lens-site/src/pages/briefs/[slug].astro` | Render ArticleSummaryCard above article |
| `lens-site/src/pages/reviews/[slug].astro` | Render ArticleSummaryCard above article |
| `lens-site/src/pages/research/[slug].astro` | Render ArticleSummaryCard above article |
| `lens-site/src/styles/global.css` | Type badge colours, summary card, keyword pills, scanner, archive |

---

## 10  Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Daily brief not generated yet → empty hero slot 1 | Fallback: most recent entry of any type takes slot 1 |
| AI fails to extract keywords | `extractKeywordsFromMarkdown()` regex fallback |
| Large keyword vocabulary → slow archive filtering | Client-side filtering on pre-loaded data (100-200 entries max) |
| R2 not enabled in Cloudflare account | Turso-only mode stores keywords inline (no R2 dependency) |
| Build-time fetch fails → stale hero | Static fallback entries in `editorials.ts` include a sample brief |

---

## 11  Success Criteria

- [ ] Today's daily brief is **always slot 1** in the hero carousel
- [ ] Hero slides have **colour-coded type badges** (amber/red/blue)
- [ ] Clicking a hero card opens a **summary card** with keyword pills and section scanner
- [ ] Scrolling past the summary reveals the **full interlinked article**
- [ ] Keywords in the article body are **highlighted and linked** to `/archive?keyword=X`
- [ ] Sidebar has a **sticky section scanner** that tracks scroll position
- [ ] `/archive` page allows **filtering by type, keyword, and date range**
- [ ] Daily brief generation **extracts keywords and summary hook** automatically
- [ ] The system **degrades gracefully** if keywords or daily brief are missing
