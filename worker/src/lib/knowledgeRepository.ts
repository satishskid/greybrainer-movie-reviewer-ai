import type { Client, Row } from "@libsql/client";

export interface KnowledgeDocumentInput {
  articleId: string;
  authorName: string | null;
  canonicalUrl: string;
  chunkManifestObjectKey?: string | null;
  contentHash: string;
  externalId: string;
  htmlContent: string;
  htmlObjectKey?: string | null;
  ingestionStatus: string;
  markdownContent: string;
  markdownObjectKey?: string | null;
  publishedAt: string | null;
  rawPayload: unknown;
  rawPayloadObjectKey?: string | null;
  sourceAccount: string;
  sourceType: string;
  storageBackend?: string;
  summary: string | null;
  tags: string[];
  title: string;
  updatedAt: string | null;
}

export interface KnowledgeChunkInput {
  chunkIndex: number;
  contentMarkdown: string;
  heading: string | null;
  metadata: unknown;
  tokenEstimate: number;
}

export interface KnowledgeImportJobInput {
  canonicalUrl?: string | null;
  documentId?: string | null;
  errorMessage?: string | null;
  requestedBy?: string | null;
  sourceType?: string;
  sourceUrl: string;
  status: string;
  title?: string | null;
}

function rowValue(row: Row, key: string) {
  return row[key] ?? null;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }
  return JSON.parse(value) as T;
}

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function mapKnowledgeDocumentRow(row: Row) {
  return {
    articleId: String(rowValue(row, "article_id")),
    authorName: rowValue(row, "author_name") ? String(rowValue(row, "author_name")) : null,
    canonicalUrl: String(rowValue(row, "canonical_url")),
    chunkManifestObjectKey: rowValue(row, "chunk_manifest_object_key")
      ? String(rowValue(row, "chunk_manifest_object_key"))
      : null,
    chunkCount: Number(rowValue(row, "chunk_count") ?? 0),
    contentHash: String(rowValue(row, "content_hash")),
    createdAt: String(rowValue(row, "created_at")),
    externalId: String(rowValue(row, "external_id")),
    htmlContent: String(rowValue(row, "html_content")),
    htmlObjectKey: rowValue(row, "html_object_key") ? String(rowValue(row, "html_object_key")) : null,
    id: String(rowValue(row, "id")),
    ingestionStatus: String(rowValue(row, "ingestion_status")),
    lastIngestedAt: rowValue(row, "last_ingested_at") ? String(rowValue(row, "last_ingested_at")) : null,
    markdownContent: String(rowValue(row, "markdown_content")),
    markdownObjectKey: rowValue(row, "markdown_object_key") ? String(rowValue(row, "markdown_object_key")) : null,
    publishedAt: rowValue(row, "published_at") ? String(rowValue(row, "published_at")) : null,
    rawPayload: parseJson(rowValue(row, "raw_payload_json") ? String(rowValue(row, "raw_payload_json")) : null),
    rawPayloadObjectKey: rowValue(row, "raw_payload_object_key")
      ? String(rowValue(row, "raw_payload_object_key"))
      : null,
    sourceAccount: String(rowValue(row, "source_account")),
    sourceType: String(rowValue(row, "source_type")),
    storageBackend: rowValue(row, "storage_backend") ? String(rowValue(row, "storage_backend")) : "turso",
    summary: rowValue(row, "summary") ? String(rowValue(row, "summary")) : null,
    tags: parseJson<string[]>(rowValue(row, "tags_json") ? String(rowValue(row, "tags_json")) : null) ?? [],
    title: String(rowValue(row, "title")),
    updatedAt: rowValue(row, "updated_at") ? String(rowValue(row, "updated_at")) : null,
  };
}

function mapKnowledgeChunkRow(row: Row) {
  return {
    chunkIndex: Number(rowValue(row, "chunk_index") ?? 0),
    contentMarkdown: String(rowValue(row, "content_markdown")),
    createdAt: String(rowValue(row, "created_at")),
    documentId: String(rowValue(row, "document_id")),
    heading: rowValue(row, "heading") ? String(rowValue(row, "heading")) : null,
    id: String(rowValue(row, "id")),
    metadata: parseJson(rowValue(row, "metadata_json") ? String(rowValue(row, "metadata_json")) : null),
    tokenEstimate: Number(rowValue(row, "token_estimate") ?? 0),
  };
}

function mapKnowledgeImportJobRow(row: Row) {
  return {
    attemptCount: Number(rowValue(row, "attempt_count") ?? 0),
    canonicalUrl: rowValue(row, "canonical_url") ? String(rowValue(row, "canonical_url")) : null,
    createdAt: String(rowValue(row, "created_at")),
    documentId: rowValue(row, "document_id") ? String(rowValue(row, "document_id")) : null,
    errorMessage: rowValue(row, "error_message") ? String(rowValue(row, "error_message")) : null,
    id: String(rowValue(row, "id")),
    lastAttemptedAt: rowValue(row, "last_attempted_at") ? String(rowValue(row, "last_attempted_at")) : null,
    requestedBy: rowValue(row, "requested_by") ? String(rowValue(row, "requested_by")) : null,
    sourceType: String(rowValue(row, "source_type")),
    sourceUrl: String(rowValue(row, "source_url")),
    status: String(rowValue(row, "status")),
    title: rowValue(row, "title") ? String(rowValue(row, "title")) : null,
    updatedAt: String(rowValue(row, "updated_at")),
  };
}

export async function upsertKnowledgeDocument(client: Client, input: KnowledgeDocumentInput) {
  const existingResult = await client.execute({
    sql: "SELECT id FROM knowledge_documents WHERE external_id = ?",
    args: [input.externalId],
  });

  const existingId = existingResult.rows[0]?.id ? String(existingResult.rows[0].id) : null;
  const timestamp = nowIso();

  if (existingId) {
    await client.execute({
      sql: `
        UPDATE knowledge_documents
        SET article_id = ?, title = ?, canonical_url = ?, author_name = ?, published_at = ?,
            updated_at = ?, summary = ?, tags_json = ?, html_content = ?, markdown_content = ?,
            raw_payload_json = ?, content_hash = ?, ingestion_status = ?, storage_backend = ?,
            raw_payload_object_key = ?, html_object_key = ?, markdown_object_key = ?,
            chunk_manifest_object_key = ?, last_ingested_at = ?
        WHERE id = ?
      `,
      args: [
        input.articleId,
        input.title,
        input.canonicalUrl,
        input.authorName,
        input.publishedAt,
        input.updatedAt,
        input.summary,
        JSON.stringify(input.tags),
        input.htmlContent,
        input.markdownContent,
        JSON.stringify(input.rawPayload),
        input.contentHash,
        input.ingestionStatus,
        input.storageBackend ?? "turso",
        input.rawPayloadObjectKey ?? null,
        input.htmlObjectKey ?? null,
        input.markdownObjectKey ?? null,
        input.chunkManifestObjectKey ?? null,
        timestamp,
        existingId,
      ],
    });

    return getKnowledgeDocumentById(client, existingId);
  }

  const id = generateId("doc");
  await client.execute({
    sql: `
      INSERT INTO knowledge_documents (
        id, source_type, source_account, external_id, article_id, title,
        canonical_url, author_name, published_at, updated_at, summary,
        tags_json, html_content, markdown_content, raw_payload_json,
        content_hash, ingestion_status, storage_backend, raw_payload_object_key,
        html_object_key, markdown_object_key, chunk_manifest_object_key,
        last_ingested_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      input.sourceType,
      input.sourceAccount,
      input.externalId,
      input.articleId,
      input.title,
      input.canonicalUrl,
      input.authorName,
      input.publishedAt,
      input.updatedAt,
      input.summary,
      JSON.stringify(input.tags),
      input.htmlContent,
      input.markdownContent,
      JSON.stringify(input.rawPayload),
      input.contentHash,
      input.ingestionStatus,
      input.storageBackend ?? "turso",
      input.rawPayloadObjectKey ?? null,
      input.htmlObjectKey ?? null,
      input.markdownObjectKey ?? null,
      input.chunkManifestObjectKey ?? null,
      timestamp,
      timestamp,
    ],
  });

  return getKnowledgeDocumentById(client, id);
}

export async function replaceKnowledgeChunks(client: Client, documentId: string, chunks: KnowledgeChunkInput[]) {
  await client.execute({
    sql: "DELETE FROM knowledge_chunks WHERE document_id = ?",
    args: [documentId],
  });

  for (const chunk of chunks) {
    await client.execute({
      sql: `
        INSERT INTO knowledge_chunks (
          id, document_id, chunk_index, heading, content_markdown,
          token_estimate, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        generateId("chunk"),
        documentId,
        chunk.chunkIndex,
        chunk.heading ?? null,
        chunk.contentMarkdown,
        chunk.tokenEstimate,
        JSON.stringify(chunk.metadata ?? null),
        nowIso(),
      ],
    });
  }

  await client.execute({
    sql: "UPDATE knowledge_documents SET chunk_count = ?, last_ingested_at = ? WHERE id = ?",
    args: [chunks.length, nowIso(), documentId],
  });
}

export async function listKnowledgeDocuments(client: Client, limit = 20) {
  const result = await client.execute({
    sql: "SELECT * FROM knowledge_documents ORDER BY published_at DESC, created_at DESC LIMIT ?",
    args: [limit],
  });

  return result.rows.map(mapKnowledgeDocumentRow);
}

export async function listKnowledgeBriefs(client: Client, limit = 5) {
  const result = await client.execute({
    sql: `
      SELECT title, canonical_url, summary
      FROM knowledge_documents
      WHERE source_type = 'medium'
      ORDER BY published_at DESC, created_at DESC
      LIMIT ?
    `,
    args: [limit],
  });

  return result.rows.map((row) => ({
    title: String(rowValue(row, "title")),
    canonicalUrl: String(rowValue(row, "canonical_url")),
    summary: rowValue(row, "summary") ? String(rowValue(row, "summary")) : null,
  }));
}

export async function getKnowledgeDocumentById(client: Client, documentId: string) {
  const docResult = await client.execute({
    sql: "SELECT * FROM knowledge_documents WHERE id = ?",
    args: [documentId],
  });

  const docRow = docResult.rows[0];
  if (!docRow) {
    return null;
  }

  const chunksResult = await client.execute({
    sql: "SELECT * FROM knowledge_chunks WHERE document_id = ? ORDER BY chunk_index ASC",
    args: [documentId],
  });

  return {
    ...mapKnowledgeDocumentRow(docRow),
    chunks: chunksResult.rows.map(mapKnowledgeChunkRow),
  };
}

export async function getKnowledgeDocumentByCanonicalUrl(client: Client, canonicalUrl: string) {
  const result = await client.execute({
    sql: "SELECT id FROM knowledge_documents WHERE canonical_url = ?",
    args: [canonicalUrl],
  });

  const id = result.rows[0]?.id ? String(result.rows[0].id) : null;
  return id ? getKnowledgeDocumentById(client, id) : null;
}

export async function upsertKnowledgeImportJob(client: Client, input: KnowledgeImportJobInput) {
  const existingResult = await client.execute({
    sql: "SELECT id, attempt_count FROM knowledge_import_jobs WHERE source_url = ?",
    args: [input.sourceUrl],
  });

  const existingId = existingResult.rows[0]?.id ? String(existingResult.rows[0].id) : null;
  const attemptCount = Number(existingResult.rows[0]?.attempt_count ?? 0) + 1;
  const timestamp = nowIso();

  if (existingId) {
    await client.execute({
      sql: `
        UPDATE knowledge_import_jobs
        SET source_type = ?, canonical_url = ?, status = ?, requested_by = ?, title = ?,
            document_id = ?, error_message = ?, attempt_count = ?, last_attempted_at = ?, updated_at = ?
        WHERE id = ?
      `,
      args: [
        input.sourceType ?? "medium",
        input.canonicalUrl ?? null,
        input.status,
        input.requestedBy ?? null,
        input.title ?? null,
        input.documentId ?? null,
        input.errorMessage ?? null,
        attemptCount,
        timestamp,
        timestamp,
        existingId,
      ],
    });

    const refreshed = await client.execute({
      sql: "SELECT * FROM knowledge_import_jobs WHERE id = ?",
      args: [existingId],
    });
    return refreshed.rows[0] ? mapKnowledgeImportJobRow(refreshed.rows[0]) : null;
  }

  const id = generateId("import");
  await client.execute({
    sql: `
      INSERT INTO knowledge_import_jobs (
        id, source_type, source_url, canonical_url, status, requested_by, title,
        document_id, error_message, attempt_count, last_attempted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      input.sourceType ?? "medium",
      input.sourceUrl,
      input.canonicalUrl ?? null,
      input.status,
      input.requestedBy ?? null,
      input.title ?? null,
      input.documentId ?? null,
      input.errorMessage ?? null,
      1,
      timestamp,
      timestamp,
      timestamp,
    ],
  });

  const created = await client.execute({
    sql: "SELECT * FROM knowledge_import_jobs WHERE id = ?",
    args: [id],
  });
  return created.rows[0] ? mapKnowledgeImportJobRow(created.rows[0]) : null;
}

export async function listKnowledgeImportJobs(client: Client, limit = 20) {
  const result = await client.execute({
    sql: "SELECT * FROM knowledge_import_jobs ORDER BY updated_at DESC, created_at DESC LIMIT ?",
    args: [limit],
  });

  return result.rows.map(mapKnowledgeImportJobRow);
}
