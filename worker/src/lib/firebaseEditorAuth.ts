import type { Env } from "./db";

const DEFAULT_FIREBASE_API_KEY = "AIzaSyDdWuwH2BAz9nSWVLXyC2uE8qoxl5QU3lY";

const ALLOWED_EDITOR_EMAILS = new Set([
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
    disabled?: boolean;
    email?: string;
  }>;
}

export async function getAuthorizedEditorEmail(request: Request, env: Env) {
  const authorization = request.headers.get("authorization") || "";
  const idToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!idToken) return null;

  const firebaseApiKey = env.FIREBASE_API_KEY?.trim() || DEFAULT_FIREBASE_API_KEY;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
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
  const email = user?.email?.trim().toLowerCase();
  if (!email || !ALLOWED_EDITOR_EMAILS.has(email)) return null;
  return email;
}
