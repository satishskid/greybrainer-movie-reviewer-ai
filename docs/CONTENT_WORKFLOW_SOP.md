# Greybrainer Engine Handoff SOP

Last updated: 2026-06-20

## Live Systems

- Engine: https://greybrainer-movie.netlify.app
- Website: https://movies.greybrain.in
- Writer Hub: https://movies.greybrain.in/hub
- Firebase collection: `published_research`
- Asset storage: Cloudflare R2 through protected upload routes

## Purpose

The Engine produces deep Greybrainer analysis. It is not the daily newsletter editor. The daily newsletter remains writer-led and is uploaded through Writer Hub.

The Engine's job is to create strong review material, diagnostic visuals, and SEO-ready scaffolding for the writer to polish in Hub.

## Jr Dev Deep Review Flow

1. Receive the review topic from the writer.
2. Open the Engine.
3. Search/select the movie or topic.
4. Run the analysis.
5. Confirm the generated report is relevant and complete.
6. Confirm these visuals render in the Engine:
   - Three-Layer Concentric Rings.
   - Morphokinetics Flow, when available.
7. Export/download the output.
8. Confirm the Engine reports the Firebase archive ID.
9. Tell the writer the draft is ready in Writer Hub.

## What the Engine Archives

The Engine creates a draft in Firebase `published_research` with:

- Full report markdown.
- Social snippets when available.
- YouTube script when available.
- Search headline.
- SEO title.
- SEO description.
- 50-word verdict draft.
- Who should watch draft.
- Story/Script score.
- Conceptualization score.
- Performance/Execution score.
- Overall score.
- Morphokinetics teaser.
- Producer/director insight.
- FAQ scaffolding.
- Tags.
- Layer data.
- Morphokinetics data.
- Diagnostic images:
  - `images.rings`
  - `images.morpho`

Diagnostic images are uploaded to R2 when the signed-in user has access. If upload fails, the Engine avoids writing oversized image blobs into Firestore.

## Writer Handoff

After the Jr dev completes the Engine run:

1. Writer opens https://movies.greybrain.in/hub.
2. Writer opens the draft from Inbox.
3. Writer edits the article, SEO, image lane, FAQs, and social copy.
4. Writer publishes to the website.
5. Writer manually posts to Medium, LinkedIn, X, Instagram, and Facebook.

## What Must Not Change Without Approval

- Do not replace the daily newsletter workflow with Engine automation.
- Do not auto-publish to social channels yet.
- Do not reveal internal Morphokinetics scoring details in public copy.
- Do not change the existing Engine report/export format unless explicitly requested.
- Keep R2 as canonical image storage for now.

## Current Asset Strategy

- R2 is the canonical storage for cover images, inline images, and Engine diagnostic visuals.
- Cloudflare Images was reviewed on 2026-06-20.
- Recommendation: use Cloudflare Images later only as an optimization/transformation layer in front of R2.

## Troubleshooting

If a draft does not appear in Hub:

1. Confirm the Engine user is signed in.
2. Confirm the export completed.
3. Check browser console for Firebase write errors.
4. Check that Firestore rules allow authenticated create on `published_research`.
5. Check Writer Hub with an admin/editor account.

If diagnostic images do not appear:

1. Confirm the rings/Morphokinetics visuals rendered in the Engine before export.
2. Confirm the R2 upload function is reachable at `/api/assets/upload`.
3. Confirm the signed-in account is allowed by the upload function.
4. Check the Firestore draft `images` field.
5. In Writer Hub, open the Assets tab.

## Release Notes

Workflow hardening release on 2026-06-20:

- Engine released at commit `cf3fcad`.
- Movies site released at commit `7eae2c4`.
- Engine archives diagnostic visuals through the protected R2 bridge.
- Engine and Hub role allowlists are aligned for the named editor/admin accounts.

