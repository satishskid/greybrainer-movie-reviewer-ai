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

Current Cloudflare Pages project:

- `greybrainer-lens-dev`

Deploy command:

```bash
HOME=/tmp npx wrangler pages deploy lens-site/dist --project-name greybrainer-lens-dev --branch main
```

## Notes

- This site does not touch the current `greybrain.ai` domain.
- It is designed as the future premium editorial Lens frontend.
- Later, published Cloudflare draft artifacts can replace the sample editorials in `src/data/editorials.ts`.
