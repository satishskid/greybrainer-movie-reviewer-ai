const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyDdWuwH2BAz9nSWVLXyC2uE8qoxl5QU3lY";
const DEFAULT_WORKER_API_BASE = "https://greybrainer-omnichannel-api.satish-9f4.workers.dev/api";
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const ALLOWED_EMAILS = new Set([
  "digi.social@greybrain.ai",
  "dr.satish@greybrain.ai",
  "drpratichi@skids.health",
  "mousamkumarp@gmail.com",
  "mousampatel816@gmail.com",
  "pranitskid@gmail.com",
  "rath.satish@gmail.com",
  "saminamisra@gmail.com",
  "saminamishra@gmail.com",
  "satish.rath@gmail.com",
  "satish@skids.health",
  "satishskid@gmail.com",
  "skids.social01@gmail.com",
  "support@skids.health",
]);

interface FirebaseLookupResponse {
  users?: Array<{
    email?: string;
    disabled?: boolean;
  }>;
}

interface R2UploadResponse {
  key?: string;
  url?: string;
  contentType?: string | null;
  size?: number;
  error?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function getWorkerApiBaseUrl() {
  const configured = process.env.OMNICHANNEL_API_BASE_URL || DEFAULT_WORKER_API_BASE;
  return configured.replace(/\/$/, "");
}

function getWorkerUploadToken() {
  return process.env.OMNICHANNEL_UPLOAD_TOKEN || process.env.ASSET_UPLOAD_TOKEN || "";
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

async function getEmailFromFirebaseToken(idToken: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!response.ok) return null;

  const body = (await response.json()) as FirebaseLookupResponse;
  const user = body.users?.[0];

  if (!user?.email || user.disabled) return null;
  return user.email.trim().toLowerCase();
}

async function readWorkerResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as R2UploadResponse;
  } catch {
    return { error: text };
  }
}

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const uploadToken = getWorkerUploadToken();
  if (!uploadToken) {
    return json({ error: "R2 upload token is not configured." }, 500);
  }

  const token = getBearerToken(request);
  if (!token) {
    return json({ error: "Sign in required." }, 401);
  }

  const email = await getEmailFromFirebaseToken(token);
  if (!email || !ALLOWED_EMAILS.has(email)) {
    return json({ error: "This account is not allowed to upload assets." }, 403);
  }

  const formData = await request.formData();
  const draftId = String(formData.get("draftId") ?? "").trim();
  const kind = String(formData.get("kind") ?? "asset").trim() || "asset";
  const file = formData.get("file");

  if (!draftId) {
    return json({ error: "draftId is required." }, 400);
  }

  if (!file || !(file instanceof File)) {
    return json({ error: "Image file is required." }, 400);
  }

  if (!file.type.startsWith("image/")) {
    return json({ error: "Only image uploads are supported." }, 400);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return json({ error: "Image size exceeds 12MB limit." }, 400);
  }

  const workerFormData = new FormData();
  workerFormData.append("draftId", draftId);
  workerFormData.append("kind", kind);
  workerFormData.append("file", file, file.name || "asset");

  const response = await fetch(`${getWorkerApiBaseUrl()}/assets/upload`, {
    method: "POST",
    headers: { authorization: `Bearer ${uploadToken}` },
    body: workerFormData,
  });
  const payload = await readWorkerResponse(response);

  if (!response.ok || !payload.url) {
    return json({ error: payload.error || "R2 upload failed." }, response.ok ? 502 : response.status);
  }

  return json(payload, 201);
}
