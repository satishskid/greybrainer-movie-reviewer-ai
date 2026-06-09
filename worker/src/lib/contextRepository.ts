import type { Client } from "@libsql/client";

export interface ContextEventRecord {
  id: string;
  sessionId: string;
  eventType: string;
  actor: string | null;
  content: string;
  payload: unknown | null;
  createdAt: string;
}

export interface CreateContextEventInput {
  sessionId: string;
  eventType: string;
  actor?: string | null;
  content: string;
  payload?: unknown | null;
}

function rowValue(row: any, key: string) {
  return row[key] ?? null;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function createContextEvent(client: Client, input: CreateContextEventInput): Promise<ContextEventRecord> {
  const id = `ctx_${crypto.randomUUID().replace(/-/g, "")}`;
  const payloadJson = input.payload ? JSON.stringify(input.payload) : null;
  await client.execute({
    sql: `
      INSERT INTO context_events (id, session_id, event_type, actor, content, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [id, input.sessionId, input.eventType, input.actor ?? null, input.content, payloadJson],
  });

  await client.execute({
    sql: `
      INSERT INTO context_events_fts (event_id, session_id, content)
      VALUES (?, ?, ?)
    `,
    args: [id, input.sessionId, input.content],
  });

  const row = {
    id,
    session_id: input.sessionId,
    event_type: input.eventType,
    actor: input.actor ?? null,
    content: input.content,
    payload_json: payloadJson,
    created_at: new Date().toISOString(),
  };

  return {
    id: String(rowValue(row, "id")),
    sessionId: String(rowValue(row, "session_id")),
    eventType: String(rowValue(row, "event_type")),
    actor: rowValue(row, "actor") ? String(rowValue(row, "actor")) : null,
    content: String(rowValue(row, "content")),
    payload: parseJson(rowValue(row, "payload_json") ? String(rowValue(row, "payload_json")) : null),
    createdAt: String(rowValue(row, "created_at")),
  };
}

export async function listContextEvents(client: Client, sessionId: string, limit = 20): Promise<ContextEventRecord[]> {
  const result = await client.execute({
    sql: `
      SELECT * FROM context_events
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    args: [sessionId, limit],
  });

  return result.rows.map((row) => ({
    id: String(rowValue(row, "id")),
    sessionId: String(rowValue(row, "session_id")),
    eventType: String(rowValue(row, "event_type")),
    actor: rowValue(row, "actor") ? String(rowValue(row, "actor")) : null,
    content: String(rowValue(row, "content")),
    payload: parseJson(rowValue(row, "payload_json") ? String(rowValue(row, "payload_json")) : null),
    createdAt: String(rowValue(row, "created_at")),
  }));
}

export async function searchContextEvents(
  client: Client,
  query: string,
  sessionId: string | null,
  limit = 12,
): Promise<ContextEventRecord[]> {
  const args = sessionId ? [query, sessionId, limit] : [query, limit];
  const sql = sessionId
    ? `
      SELECT ce.*
      FROM context_events_fts fts
      JOIN context_events ce ON ce.id = fts.event_id
      WHERE context_events_fts MATCH ? AND fts.session_id = ?
      ORDER BY bm25(context_events_fts)
      LIMIT ?
    `
    : `
      SELECT ce.*
      FROM context_events_fts fts
      JOIN context_events ce ON ce.id = fts.event_id
      WHERE context_events_fts MATCH ?
      ORDER BY bm25(context_events_fts)
      LIMIT ?
    `;

  const result = await client.execute({ sql, args });
  return result.rows.map((row) => ({
    id: String(rowValue(row, "id")),
    sessionId: String(rowValue(row, "session_id")),
    eventType: String(rowValue(row, "event_type")),
    actor: rowValue(row, "actor") ? String(rowValue(row, "actor")) : null,
    content: String(rowValue(row, "content")),
    payload: parseJson(rowValue(row, "payload_json") ? String(rowValue(row, "payload_json")) : null),
    createdAt: String(rowValue(row, "created_at")),
  }));
}
