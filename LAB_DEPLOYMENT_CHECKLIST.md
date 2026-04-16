# Greybrainer Lab Deployment Checklist

Use this checklist to set up the Groq publishing lab safely without touching the live editorial site.

## Goal

Keep these two surfaces fully separate:

- Production website: `cinema.greybrain.ai`
- Lab website: `greybrainer-groq-lab.pages.dev`

This separation matters because editor-driven website publishing also triggers Cloudflare Pages rebuilds through the Worker.

## Required Separation

Keep these pieces independent between production and lab:

- Cloudflare Pages project
- Cloudflare Pages deploy hook
- Worker `WEBSITE_BASE_URL`
- Worker `CF_PAGES_DEPLOY_HOOK`
- Optional Firebase authorized domain entries

## 1. Create the Lab Pages Project

In Cloudflare Dashboard:

- Go to **Workers & Pages**.
- Choose **Create application** → **Pages**.
- Create a project named `greybrainer-groq-lab`.
- Keep the generated hostname `greybrainer-groq-lab.pages.dev`.

For this repo, the public site build output is:

```bash
lens-site/dist
```

## 2. Create a Dedicated Lab Deploy Hook

Inside the `greybrainer-groq-lab` Pages project:

- Create a new deploy hook.
- Name it something obvious, for example `greybrainer-groq-lab-editor-publish`.
- Do not reuse the production deploy hook from `cinema-greybrain`.

## 3. Deploy the Lab Site Once

From the repo root:

```bash
npm run lens:deploy:lab
```

Then verify:

- `https://greybrainer-groq-lab.pages.dev` loads successfully
- the Pages project is serving the Astro site

## 4. Point the Lab Worker to the Lab Website

In the lab Worker environment, set:

```bash
WEBSITE_BASE_URL=https://greybrainer-groq-lab.pages.dev/lens
CF_PAGES_DEPLOY_HOOK=<lab deploy hook url>
```

Do not change the production Worker values.

Production should continue to use:

```bash
WEBSITE_BASE_URL=https://cinema.greybrain.ai/lens
```

## Paste-Ready Worker Env Values

Use these values for the website publishing part of the Worker configuration.

Production:

```bash
WEBSITE_BASE_URL=https://cinema.greybrain.ai/lens
CF_PAGES_DEPLOY_HOOK=<production deploy hook url>
DAILY_BRIEF_ENABLED=true
DAILY_BRIEF_TIMEZONE=Asia/Kolkata
DRAFT_STORAGE_MODE=r2
KNOWLEDGE_STORAGE_MODE=r2
OMNICHANNEL_API_VERSION=2026-03-11
WORKERS_AI_FALLBACK_MODEL=@cf/meta/llama-3.1-8b-instruct
```

Lab:

```bash
WEBSITE_BASE_URL=https://greybrainer-groq-lab.pages.dev/lens
CF_PAGES_DEPLOY_HOOK=<lab deploy hook url>
DAILY_BRIEF_ENABLED=true
DAILY_BRIEF_TIMEZONE=Asia/Kolkata
DRAFT_STORAGE_MODE=r2
KNOWLEDGE_STORAGE_MODE=r2
OMNICHANNEL_API_VERSION=2026-03-11
WORKERS_AI_FALLBACK_MODEL=@cf/meta/llama-3.1-8b-instruct
```

Notes:

- Keep the same non-URL vars unless you intentionally want different behavior between production and lab.
- The only required publishing split is the website URL and deploy hook.
- `CF_PAGES_DEPLOY_HOOK` must come from each Pages project in Cloudflare and should never be shared across environments.

## 5. Keep Production and Lab Hooks Separate

Never share deploy hooks between environments.

Reason:

- editor website publish calls trigger a Pages rebuild automatically
- if the wrong hook is configured, lab publishing can rebuild production or production publishing can rebuild the lab site

## 6. Optional Firebase Auth Update

If the editor UI itself will run from the lab Pages hostname, add this in Firebase Authorized Domains:

- `greybrainer-groq-lab.pages.dev`

If only the public article site is hosted there, this may not be needed.

## 7. Optional Custom Lab Subdomain

After the lab flow is stable, you can map a safer custom domain such as:

- `lab-cinema.greybrain.ai`

Keep `cinema.greybrain.ai` reserved for approved production publishing.

## 8. Smoke Test Click-to-Publish

Publish a non-production draft from the editor and verify all of the following:

- the returned canonical URL uses `greybrainer-groq-lab.pages.dev`
- the Pages rebuild is triggered
- the article appears under `/lens/<slug>` on the lab site
- the production site remains unchanged

## Useful Commands

From the repo root:

```bash
npm run lens:build
npm run lens:deploy:prod
npm run lens:deploy:lab
```

## Related Files

- `package.json`
- `lens-site/package.json`
- `lens-site/README.md`
- `wrangler.jsonc`
