# Greybrainer Lens Astro Site

This is the fresh public Lens frontend.

It is intentionally separate from:

- the internal Greybrainer React console
- the current live `greybrain.ai/lens` site

## Purpose

This Astro app is the new editorial public surface for:

- movie intelligence essays
- deep research features
- future Cloudflare-native published Lens articles

## Commands

From the repo root:

```bash
npm run lens:dev
```

```bash
npm run lens:build
```

## Deployment

Recommended Cloudflare Pages projects:

- Production: `cinema-greybrain` → `cinema.greybrain.ai`
- Lab / Groq experiment: `greybrainer-groq-lab` → `greybrainer-groq-lab.pages.dev`

Deploy commands:

```bash
npm run lens:deploy:prod
```

```bash
npm run lens:deploy:lab
```

## Notes

- `lens:deploy:prod` is the live editorial site path and should remain tied to the approved production branch only.
- `lens:deploy:lab` is the safe experiment target for Groq or other publishing changes before they touch the live domain.
- For click-to-publish from the editor, the Worker environment must also be separated:
  - production `WEBSITE_BASE_URL=https://cinema.greybrain.ai/lens`
  - lab `WEBSITE_BASE_URL=https://greybrainer-groq-lab.pages.dev/lens`
  - production and lab should use different `CF_PAGES_DEPLOY_HOOK` values
- It is designed as the future premium editorial Lens frontend.
- Later, published Cloudflare draft artifacts can replace the sample editorials in `src/data/editorials.ts`.

## Operator Checklist

Use this when setting up the Groq publishing lab without touching production.

- **Create the Pages project**: In Cloudflare Dashboard → Workers & Pages → Create application → Pages, create `greybrainer-groq-lab` and keep the generated hostname `greybrainer-groq-lab.pages.dev`. Manual deploys from this repo use `lens-site/dist`.

- **Create a dedicated deploy hook**: In the `greybrainer-groq-lab` Pages project, create a new deploy hook such as `greybrainer-groq-lab-editor-publish`. Do not reuse the production hook from `cinema-greybrain`.

- **Deploy the lab site once**: From the repo root run `npm run lens:deploy:lab`, then confirm the site loads on `https://greybrainer-groq-lab.pages.dev`.

- **Point the lab worker to the lab site**: Set `WEBSITE_BASE_URL=https://greybrainer-groq-lab.pages.dev/lens` and `CF_PAGES_DEPLOY_HOOK=<lab deploy hook url>` in the lab worker environment. Keep production worker values unchanged.

- **Keep worker environments separate**: Production should continue using `https://cinema.greybrain.ai/lens`, while the lab worker uses only the lab Pages URL. Never share deploy hooks between production and lab because editor publish calls trigger rebuilds automatically.

- **Optional custom subdomain**: After the lab flow is stable, add something like `lab-cinema.greybrain.ai` in Cloudflare. Keep `cinema.greybrain.ai` reserved for approved production publishing.

- **Optional auth allowlist update**: If Firebase auth is used from the lab hostname, add `greybrainer-groq-lab.pages.dev` to Firebase Authorized Domains. This is not required if only the public site is on Pages.

- **Smoke test click-to-publish**: Publish a non-production draft from the editor, verify the returned canonical URL points to the lab hostname, and confirm the article appears under `/lens/<slug>` after the Pages rebuild runs.
