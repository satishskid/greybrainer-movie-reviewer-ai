# Cloudflare Phase 1 Setup

This repo now includes the first Cloudflare-first backend scaffold for Greybrainer:

- Worker API in `worker/src/index.ts`
- Turso schema in `db/schema.sql`
- Turso migrator in `scripts/migrate-turso.mjs`
- Wrangler config in `wrangler.jsonc`
- Frontend draft save client in `services/omnichannelDraftService.ts`

## Purpose

Phase 1 is deliberately narrow:

- preserve the current Greybrainer analysis UX
- add durable draft storage
- introduce a backend API for draft and channel state
- prepare for HITL editing and social publishing

## Local secret setup

Create a local `.dev.vars` file from `.dev.vars.example` and set:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `MEDIUM_FEED_URL`
- `DRAFT_STORAGE_MODE`
- `KNOWLEDGE_STORAGE_MODE`
- `KNOWLEDGE_SYNC_BATCH_SIZE`

Do not commit `.dev.vars`.

## Commands

Install dependencies:

```bash
npm install
```

Apply the Turso schema:

```bash
npm run db:migrate:turso
```

Apply the social channel tables:

```bash
npm run db:migrate:social-channels
```

Apply the native auth columns:

```bash
npm run db:migrate:social-auth
```

Apply the Medium knowledge schema:

```bash
npm run db:migrate:knowledge
npm run db:migrate:knowledge-r2
npm run db:migrate:knowledge-backfill
npm run db:migrate:draft-r2
```

Generate Worker types:

```bash
npm run cf:typegen
```

Run the Worker locally:

```bash
npm run cf:dev
```

Run the frontend locally:

```bash
npm run dev
```

If the frontend should hit a separate local Worker origin, set:

```bash
VITE_OMNICHANNEL_API_BASE_URL=http://127.0.0.1:8787/api
```

## Native channel connect secrets

For live `Connect` and native publish flows, configure these Worker secrets:

- `SOCIAL_TOKEN_ENCRYPTION_KEY`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`
- `LINKEDIN_OAUTH_SCOPES`
- `MEDIUM_CLIENT_ID`
- `MEDIUM_CLIENT_SECRET`
- `MEDIUM_REDIRECT_URI`
- `MEDIUM_OAUTH_SCOPES`
- `SOCIAL_CONNECT_SUCCESS_URL`

## Knowledge storage

The Medium archive seed path is prepared for a split storage model:

- `R2` bucket `greybrainer-content` stores new Greybrainer draft/version artifacts
- `R2` bucket `greybrainer-knowledge` stores raw payloads, HTML, markdown, and chunk manifests
- `Turso` stores document metadata, ingestion status, and chunk rows

At the moment this Cloudflare account has not enabled `R2`, so the Worker falls back to Turso-only storage until `R2` is turned on in the dashboard and the `KNOWLEDGE_R2` binding in `wrangler.jsonc` is uncommented.

## API endpoints

### `GET /api/health`

Health check.

### `GET /api/drafts`

List drafts.

### `POST /api/drafts`

Create a draft and initial version.

### `GET /api/drafts/:id`

Fetch draft details, current version, and publication records.

### `PATCH /api/drafts/:id`

Update draft metadata and status.

### `POST /api/drafts/:id/versions`

Create a new draft version.

### `GET /api/drafts/:id/publications`

List channel publication records for a draft.

### `POST /api/drafts/:id/publications`

Create or update a channel publication state.

### `POST /api/social-accounts/:id/connect`

Start native OAuth for the saved channel.

### `POST /api/social-accounts/:id/test`

Check whether a saved channel is publish-ready.

### `GET /api/connect/callback/:platform`

OAuth callback handler for native connectors.

### `POST /api/drafts/:id/publish`

Publish the current draft version to one or more saved social accounts.

### `POST /api/knowledge/medium/sync`

Fetch the Medium RSS feed, normalize articles, store artifacts, and upsert knowledge metadata.

Optional JSON body:

- `offset`
- `limit`

### `GET /api/knowledge/documents`

List ingested knowledge documents and their storage metadata.

### `GET /api/knowledge/backfill/jobs`

List archive import jobs and their last known status.

### `POST /api/knowledge/backfill/urls`

Attempt archive imports from pasted Medium article URLs.

## Current frontend integration

The report screen now has a `Save Draft` action.

It stores:

- markdown draft
- source payload
- analysis payload
- generated social snippets
- review stage
- editor email

This is the first durable bridge from the existing analysis engine into the new omnichannel backend.

## What this does not do yet

- backend Gemini generation
- BYOK encryption/storage
- Medium/X/LinkedIn publishing
- Vectorize / AutoRAG ingestion
- analytics feedback loop

Those should be built next on top of this draft model, not beside it.
