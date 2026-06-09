import type { Client, Row } from "@libsql/client";

interface WebsitePublicationRecord {
  createdAt: string;
  draftId: string;
  externalId: string;
  externalUrl: string;
  payload: {
    contentStorage?: {
      htmlObjectKey?: string | null;
      metadataObjectKey?: string | null;
    };
    knowledgeDocumentId?: string | null;
    title?: string | null;
  } | null;
  publishedAt: string | null;
  status: string;
  subjectTitle: string;
  updatedAt: string;
}

function rowValue(row: Row, key: string) {
  return row[key] ?? null;
}

function parseJson<T>(value: string | null) {
  if (!value) {
    return null;
  }
  return JSON.parse(value) as T;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mapWebsitePublicationRow(row: Row): WebsitePublicationRecord {
  return {
    createdAt: String(rowValue(row, "created_at")),
    draftId: String(rowValue(row, "draft_id")),
    externalId: String(rowValue(row, "external_id")),
    externalUrl: String(rowValue(row, "external_url")),
    payload: parseJson(rowValue(row, "payload_json") ? String(rowValue(row, "payload_json")) : null),
    publishedAt: rowValue(row, "published_at") ? String(rowValue(row, "published_at")) : null,
    status: String(rowValue(row, "status")),
    subjectTitle: String(rowValue(row, "subject_title")),
    updatedAt: String(rowValue(row, "updated_at")),
  };
}

async function getWebsitePublicationBySlug(client: Client, slug: string) {
  const result = await client.execute({
    sql: `
      SELECT cp.*, d.subject_title
      FROM channel_publications cp
      JOIN drafts d ON d.id = cp.draft_id
      WHERE cp.channel = 'website' AND cp.external_id = ?
      ORDER BY cp.updated_at DESC
      LIMIT 1
    `,
    args: [slug],
  });

  const row = result.rows[0];
  return row ? mapWebsitePublicationRow(row) : null;
}

async function listRecentWebsitePublications(client: Client, limit = 20) {
  const result = await client.execute({
    sql: `
      SELECT cp.*, d.subject_title
      FROM channel_publications cp
      JOIN drafts d ON d.id = cp.draft_id
      WHERE cp.channel = 'website' AND cp.status = 'published'
      ORDER BY cp.published_at DESC, cp.updated_at DESC
      LIMIT ?
    `,
    args: [limit],
  });

  return result.rows.map(mapWebsitePublicationRow);
}

function extractArticleBody(htmlDocument: string) {
  const match = htmlDocument.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1]?.trim() ?? htmlDocument;
}

function renderPreviewHome(publications: WebsitePublicationRecord[], requestUrl: string) {
  const items = publications
    .map((publication) => {
      const publishedAt = publication.publishedAt ? new Date(publication.publishedAt).toLocaleString("en-IN") : "Draft";
      return `
        <li>
          <a href="/preview/lens/${publication.externalId}">${escapeHtml(publication.subjectTitle)}</a>
          <div class="meta">${escapeHtml(publication.externalUrl)} • ${escapeHtml(publishedAt)}</div>
        </li>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Greybrainer Cloudflare Preview</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f4efe7; color: #17202a; }
      main { max-width: 920px; margin: 0 auto; padding: 48px 24px 72px; }
      .eyebrow { font: 600 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; color: #925d18; }
      h1 { margin: 12px 0 14px; font-size: clamp(2.1rem, 5vw, 4rem); line-height: 1.02; }
      p { max-width: 70ch; font-size: 1.05rem; line-height: 1.7; }
      .frame { margin-top: 28px; border: 1px solid #d8cfc0; background: rgba(255,255,255,0.72); border-radius: 22px; padding: 24px; box-shadow: 0 20px 60px rgba(26, 32, 44, 0.08); }
      ul { list-style: none; padding: 0; margin: 0; }
      li + li { margin-top: 18px; padding-top: 18px; border-top: 1px solid #ebe2d6; }
      a { color: #0a5e73; text-decoration: none; font-weight: 700; }
      a:hover { text-decoration: underline; }
      .meta { margin-top: 6px; color: #6b7280; font: 500 0.9rem/1.5 ui-sans-serif, system-ui, sans-serif; word-break: break-all; }
      .footer { margin-top: 22px; color: #7b6e5b; font: 500 0.95rem/1.5 ui-sans-serif, system-ui, sans-serif; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Cloudflare Preview Site</div>
      <h1>Greybrainer Lens Preview</h1>
      <p>This is the separate Cloudflare-hosted UAT surface for published Lens articles. It does not use the live <code>greybrain.ai</code> website.</p>
      <section class="frame">
        <ul>${items || "<li>No published website articles yet.</li>"}</ul>
      </section>
      <div class="footer">Worker preview root: ${escapeHtml(requestUrl)}</div>
    </main>
  </body>
</html>`;
}

function renderPreviewArticle(publication: WebsitePublicationRecord, articleBody: string, previewRootUrl: string) {
  const title = publication.payload?.title?.trim() || publication.subjectTitle;
  const publishedAt = publication.publishedAt ? new Date(publication.publishedAt).toLocaleString("en-IN") : "Draft";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | Greybrainer Preview</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; background: linear-gradient(180deg, #f6f0e7 0%, #f7f4ee 38%, #ffffff 100%); color: #15202b; font-family: Georgia, "Times New Roman", serif; }
      .banner { position: sticky; top: 0; z-index: 10; background: rgba(21, 32, 43, 0.92); color: #f6ede0; backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.12); }
      .banner-inner { max-width: 1080px; margin: 0 auto; padding: 14px 20px; display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; justify-content: space-between; font: 500 0.95rem/1.4 ui-sans-serif, system-ui, sans-serif; }
      .banner a { color: #9dd6e4; text-decoration: none; font-weight: 700; }
      .banner a:hover { text-decoration: underline; }
      main { max-width: 860px; margin: 0 auto; padding: 48px 24px 80px; }
      article { background: rgba(255,255,255,0.84); border: 1px solid #e5ddd1; border-radius: 24px; padding: 42px 34px; box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08); }
      article h1, article h2, article h3, article h4, article h5, article h6 { line-height: 1.12; margin: 1.4em 0 0.6em; color: #111827; }
      article h1 { font-size: clamp(2rem, 5vw, 3.6rem); margin-top: 0; }
      article p, article li { font-size: 1.08rem; line-height: 1.8; color: #1f2937; }
      article ul { padding-left: 1.35rem; }
      article a { color: #0c6b7d; }
      .article-meta { margin-bottom: 20px; color: #7a5d2d; font: 600 0.85rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .08em; text-transform: uppercase; }
      .source-link { margin-top: 28px; font: 500 0.95rem/1.6 ui-sans-serif, system-ui, sans-serif; color: #6b7280; word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="banner">
      <div class="banner-inner">
        <div>This is the Cloudflare preview article surface for UAT. It is separate from the live Netlify site.</div>
        <div><a href="${escapeHtml(previewRootUrl)}">Preview index</a></div>
      </div>
    </div>
    <main>
      <article>
        <div class="article-meta">Preview publish • ${escapeHtml(publishedAt)}</div>
        ${articleBody}
        <div class="source-link">Canonical preview URL: <a href="${escapeHtml(publication.externalUrl)}">${escapeHtml(publication.externalUrl)}</a></div>
      </article>
    </main>
  </body>
</html>`;
}

export async function handleWebsitePreviewRoute(client: Client, bucket: R2Bucket | undefined, url: URL) {
  if (!bucket) {
    return new Response("CONTENT_R2 is not configured for preview rendering.", { status: 500 });
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (path === "/preview" || path === "/preview/") {
    const publications = await listRecentWebsitePublications(client, 25);
    return new Response(renderPreviewHome(publications, url.toString()), {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  const parts = path.split("/").filter(Boolean);
  if (parts.length === 3 && parts[0] === "preview" && parts[1] === "lens") {
    const slug = parts[2];
    const publication = await getWebsitePublicationBySlug(client, slug);
    if (!publication) {
      return new Response("Preview article not found.", { status: 404 });
    }

    const htmlObjectKey = publication.payload?.contentStorage?.htmlObjectKey;
    if (!htmlObjectKey) {
      return new Response("Preview article is missing its HTML artifact.", { status: 404 });
    }

    const object = await bucket.get(htmlObjectKey);
    if (!object) {
      return new Response("Preview article HTML artifact not found in R2.", { status: 404 });
    }

    const htmlDocument = await object.text();
    const articleBody = extractArticleBody(htmlDocument);
    const previewRootUrl = `${url.origin}/preview`;
    return new Response(renderPreviewArticle(publication, articleBody, previewRootUrl), {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  return null;
}
