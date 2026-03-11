# Cloudflare Social Channel Plan

## Goal

Make Greybrainer usable by a non-technical content editor who can:

1. paste a social channel URL
2. let Greybrainer detect the platform and handle
3. click `Connect`
4. publish approved content from Greybrainer without touching tokens or platform dashboards

This plan keeps Cloudflare as the control plane.

## Product Rule

Pasting a profile URL is only the first step.

Greybrainer can identify the destination from the URL, but actual publishing still requires platform authorization through an official OAuth or account-linking flow.

The UX should hide this complexity from the editor:

- paste URL
- review detected account
- click `Connect`
- return to Greybrainer
- use `Publish` or `Schedule`

## Recommended Shape

### Editor UX

Add a new `Channels` area inside the Omnichannel admin surface.

Each channel row should have:

- `Profile URL`
- detected `Platform`
- detected `Handle`
- `Connection Status`
- `Last Verified`
- `Default Publish` toggle
- `Connect / Reconnect` action
- `Disable` action

### Core statuses

Use these account states:

- `discovered`
- `pending_connection`
- `connected`
- `expired`
- `failed`
- `disabled`

Use these publication states:

- `pending`
- `approved`
- `scheduled`
- `publishing`
- `published`
- `failed`

## Architecture

### Cloudflare responsibilities

- `Pages`: Greybrainer UI
- `Workers`: channel registration, publish API, status sync
- `Workflows`: approval to publish to retry chains
- `Cron Triggers`: scheduled posts and analytics sync
- `Turso`: channels, publication state, audit history
- `R2`: images, thumbnails, reel assets
- `AI Gateway` + Gemini BYOK: generate channel-specific copy

### Connector strategy

Do not hard-code platform logic into the UI.

Create a backend native-connector abstraction:

```ts
interface SocialChannelConnector {
  discoverProfile(inputUrl: string): Promise<DiscoveredProfile>;
  getConnectUrl(accountId: string, redirectUrl: string): Promise<string>;
  testConnection(accountId: string): Promise<ConnectionTestResult>;
  publish(input: PublishRequest): Promise<PublishResult>;
  getPublicationStatus(remotePostId: string): Promise<PublicationStatus>;
  getAnalytics(remotePostId: string): Promise<PublicationAnalytics>;
}
```

Start with native connector implementations:

- `NativeMediumConnector`
- `NativeLinkedInConnector`

Next connectors:

- `NativeXConnector`
- `NativeInstagramConnector`
- `NativeYouTubeConnector`

This preserves the Cloudflare-first architecture while keeping Greybrainer independent of third-party social middleware.

## Non-Technical Onboarding Flow

### Step 1: Paste URL

Editor pastes one of:

- `https://www.linkedin.com/company/greybrain-ai`
- `https://x.com/greybrainai`
- `https://www.instagram.com/greybrain.ai`
- `https://www.youtube.com/@greybrainai`

### Step 2: Discover

Worker route:

- `POST /api/social-accounts/discover`

Request:

```json
{
  "profileUrl": "https://x.com/greybrainai"
}
```

Response:

```json
{
  "platform": "x",
  "normalizedUrl": "https://x.com/greybrainai",
  "handle": "@greybrainai",
  "displayName": "greybrainai",
  "connectionStatus": "pending_connection"
}
```

### Step 3: Save account

Worker route:

- `POST /api/social-accounts`

This persists the discovered account in Turso and assigns an internal ID.

### Step 4: Connect

Worker route:

- `POST /api/social-accounts/:id/connect`

The Worker returns a connector-generated connect URL.
The UI opens that URL in a new tab or popup.

### Step 5: Callback

Worker routes:

- `GET /api/social-connect/callback`
- `POST /api/social-connect/webhook`

The Worker updates the account record to `connected` or `failed`.

### Step 6: Use in publishing

During publish, the editor chooses one or more connected accounts.

Greybrainer should show:

- channel
- platform
- handle
- selected draft version
- generated copy preview
- media attachment status

## Worker API Plan

### Discovery and account management

- `POST /api/social-accounts/discover`
- `POST /api/social-accounts`
- `GET /api/social-accounts`
- `GET /api/social-accounts/:id`
- `PATCH /api/social-accounts/:id`
- `POST /api/social-accounts/:id/connect`
- `POST /api/social-accounts/:id/disable`

### Publishing

- `POST /api/drafts/:id/publish`
- `POST /api/drafts/:id/schedule`
- `GET /api/drafts/:id/publications`
- `POST /api/publications/:id/retry`

### Webhooks and sync

- `POST /api/social-connect/webhook`
- `POST /api/publications/webhook`
- `POST /api/publications/sync`

## UI Plan

### Omnichannel tab additions

Split the tab into three sections:

1. `Drafts`
2. `Channels`
3. `Publications`

### Channels screen

Needs:

- `Add Channel` button
- URL paste field
- detected platform chip
- status badge
- `Connect` button
- table of connected accounts

### Draft detail screen

Needs:

- `Publish` modal
- account multi-select
- per-platform copy preview
- image/video attachment summary
- publish now / schedule later

### Publications screen

Needs:

- timeline of outgoing posts
- status per account
- external URL
- retry button
- analytics summary

## Turso Schema Plan

Use the SQL draft in `db/social_channels_phase2.sql`.

Key additions:

- `social_accounts`
- more provider metadata in `channel_publications`
- publish audit table

## Suggested Build Order

### Phase 2A

- add schema
- add URL discovery parser
- add `social_accounts` Worker routes
- add `Channels` UI with paste URL and save

### Phase 2B

- add native connector abstraction
- implement `NativeMediumConnector`
- implement `NativeLinkedInConnector`
- add connect flow and callback handling

### Phase 2C

- add publish modal from draft detail
- add schedule and retry routes
- persist provider post IDs and external URLs

### Phase 2D

- add analytics sync into Turso
- use publication performance in future prompt adaptation

## Constraints

- URL paste alone must not be treated as authorization
- every publish action must reference a specific draft version
- publication history must be immutable
- secrets stay in Cloudflare Worker secrets, never in browser storage
- the UI should always show exactly which accounts are connected and usable
- every saved channel should have a native connector key, test status, and publish readiness status

## Definition of Done

This phase is complete when a non-technical editor can:

1. paste a profile URL
2. click one connect button
3. see the account as `connected`
4. open a Greybrainer draft
5. click `Publish`
6. choose the connected social account
7. send the generated content out from Greybrainer
