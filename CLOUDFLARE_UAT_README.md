# Greybrainer Cloudflare UAT README

This branch contains the Cloudflare-first omnichannel backend, Pages UAT frontend, and the daily Lens brief generator.

## UAT URLs

Editor UI (Cloudflare Pages):
- https://greybrainer-dev.pages.dev/

Lens preview route:
- https://greybrainer-dev.pages.dev/lens/<slug>

Example article:
- https://greybrainer-dev.pages.dev/lens/cloudflare-storage-validation-draft

Backend API (Cloudflare Worker):
- https://greybrainer-omnichannel-api.satish-9f4.workers.dev/api/health

## What Is Automated

- Daily Lens brief is auto-generated once per day.
- All other analysis remains manual, editor-driven.

## Product Flows

Greybrainer now exposes two explicit editorial workflows:

1. Daily Adaptive Brief
- One scheduled draft per day.
- Uses the Lens newsletter format and `[[LENS_NARRATIVE: ...]]` tag.
- Draft is reviewed by editor in the Omnichannel workspace before publishing.

2. Deep Research Studio
- Human-initiated only.
- Editor enters a movie title, angle, or research prompt.
- Generates movie-anchored insight, research/trending output, or Grey Verdict editorial.
- Output can then be refined and published from the same platform.

Cron schedule (UTC):
- 30 3 * * * (09:00 IST)

Manual trigger:
- POST /api/daily-brief/generate

## Daily Brief Format

Daily draft includes the tag block:

```
[[LENS_NARRATIVE:
🎬 Today's Morning Brief: <DATE>
...
]]
```

The generation prompt starts with the fixed opening sentence provided by product.

## BYOK (Gemini)

There are two options:

1. Cloudflare Worker secret:
- GEMINI_API_KEY (server-side, for daily brief)

2. BYOK stored from UI (preferred for editors):
- Admin Settings -> API Keys -> Cloudflare Daily Brief BYOK
- Stores encrypted key in Turso under ai_keys with model name.

If both exist, the Worker uses the BYOK default first, then falls back to GEMINI_API_KEY.

## Required Migrations

Run once:

```
npm run db:migrate:ai-keys
```

## Required Secrets and Vars

Worker secrets:
- GEMINI_API_KEY (optional if BYOK saved in UI)
- SOCIAL_TOKEN_ENCRYPTION_KEY (required for BYOK encryption)
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN

Worker vars (already in wrangler.jsonc):
- DAILY_BRIEF_ENABLED=true
- DAILY_BRIEF_TIMEZONE=Asia/Kolkata
- GEMINI_MODEL=gemini-2.5-flash (default fallback)
- WEBSITE_BASE_URL=https://greybrainer-dev.pages.dev/lens

## Firebase Auth

Add the Pages domain to Firebase Authorized domains:
- greybrainer-dev.pages.dev

## Deploy Commands

Worker:

```
HOME=/tmp node ./node_modules/wrangler/bin/wrangler.js deploy
```

Pages:

```
HOME=/tmp node ./node_modules/wrangler/bin/wrangler.js pages deploy dist --project-name greybrainer-dev
```

## Known Limitations

- Gemini free-tier quota can return 429. The daily generator will fail until quota resets or the key is upgraded.
- The Lens preview is for UAT only and does not affect the live Netlify site.
