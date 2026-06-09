import type { Client } from "@libsql/client";
import type { Env } from "./db";
import {
  getDraftById,
  getSocialAccountById,
  getSocialAccountByOauthState,
  storeSocialAccountTokens,
  updateSocialAccount,
  upsertPublication,
} from "./repository";
import { decryptSecret, encryptSecret } from "./tokenCrypto";

interface ConnectStartResult {
  connectUrl: string;
  connectorKey: string;
  instructions: string;
}

function formUrlEncoded(body: Record<string, string>) {
  const form = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => form.set(key, value));
  return form.toString();
}

function nowIso() {
  return new Date().toISOString();
}

function buildSuccessHtml(message: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Greybrainer Connect</title>
    <style>
      body { font-family: sans-serif; background:#020617; color:#e2e8f0; display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0; }
      .card { max-width:560px; padding:32px; border:1px solid #334155; border-radius:16px; background:#0f172a; }
      h1 { margin-top:0; font-size:24px; }
      p { line-height:1.5; color:#cbd5e1; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Greybrainer Connection Updated</h1>
      <p>${message}</p>
      <p>You can close this window and return to Greybrainer.</p>
    </div>
  </body>
</html>`;
}

export async function startNativeConnection(client: Client, env: Env, socialAccountId: string): Promise<ConnectStartResult> {
  const socialAccount = await getSocialAccountById(client, socialAccountId);
  if (!socialAccount) {
    throw new Error("Social account not found.");
  }

  const oauthState = crypto.randomUUID();
  await updateSocialAccount(client, socialAccountId, { oauthState, connectionStatus: "pending_connection" });

  if (socialAccount.connectorKey === "native-linkedin") {
    if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_REDIRECT_URI) {
      throw new Error("LinkedIn OAuth is not configured in Cloudflare secrets yet.");
    }

    const scope = env.LINKEDIN_OAUTH_SCOPES ?? "r_liteprofile w_member_social rw_organization_admin w_organization_social";
    const connectUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    connectUrl.searchParams.set("response_type", "code");
    connectUrl.searchParams.set("client_id", env.LINKEDIN_CLIENT_ID);
    connectUrl.searchParams.set("redirect_uri", env.LINKEDIN_REDIRECT_URI);
    connectUrl.searchParams.set("state", oauthState);
    connectUrl.searchParams.set("scope", scope);

    return {
      connectUrl: connectUrl.toString(),
      connectorKey: socialAccount.connectorKey,
      instructions: "Authorize LinkedIn in the new window, then return to Greybrainer and click Test.",
    };
  }

  if (socialAccount.connectorKey === "native-medium") {
    if (!env.MEDIUM_CLIENT_ID || !env.MEDIUM_REDIRECT_URI) {
      throw new Error("Medium OAuth is not configured in Cloudflare secrets yet.");
    }

    const scope = env.MEDIUM_OAUTH_SCOPES ?? "basicProfile,publishPost,listPublications";
    const connectUrl = new URL("https://medium.com/m/oauth/authorize");
    connectUrl.searchParams.set("client_id", env.MEDIUM_CLIENT_ID);
    connectUrl.searchParams.set("scope", scope);
    connectUrl.searchParams.set("state", oauthState);
    connectUrl.searchParams.set("response_type", "code");
    connectUrl.searchParams.set("redirect_uri", env.MEDIUM_REDIRECT_URI);

    return {
      connectUrl: connectUrl.toString(),
      connectorKey: socialAccount.connectorKey,
      instructions: "Authorize Medium in the new window, then return to Greybrainer and click Test.",
    };
  }

  throw new Error(`Connect flow for ${socialAccount.connectorKey} is not implemented yet.`);
}

async function handleLinkedInCallback(client: Client, env: Env, code: string, state: string) {
  if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET || !env.LINKEDIN_REDIRECT_URI || !env.SOCIAL_TOKEN_ENCRYPTION_KEY) {
    throw new Error("LinkedIn callback is not fully configured in Cloudflare secrets.");
  }

  const socialAccount = await getSocialAccountByOauthState(client, state);
  if (!socialAccount) {
    throw new Error("LinkedIn OAuth state could not be matched to a Greybrainer channel.");
  }

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: formUrlEncoded({
      client_id: env.LINKEDIN_CLIENT_ID,
      client_secret: env.LINKEDIN_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.LINKEDIN_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`LinkedIn token exchange failed with ${response.status}.`);
  }

  const tokenBody = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!tokenBody.access_token) {
    throw new Error("LinkedIn token exchange did not return an access token.");
  }

  const encryptedToken = await encryptSecret(tokenBody.access_token, env.SOCIAL_TOKEN_ENCRYPTION_KEY);
  const tokenExpiresAt =
    typeof tokenBody.expires_in === "number" ? new Date(Date.now() + tokenBody.expires_in * 1000).toISOString() : null;

  await storeSocialAccountTokens(client, socialAccount.id, {
    accessTokenEncrypted: encryptedToken,
    connectedAt: nowIso(),
    oauthState: null,
    tokenExpiresAt,
  });

  return socialAccount;
}

async function handleMediumCallback(client: Client, env: Env, code: string, state: string) {
  if (!env.MEDIUM_CLIENT_ID || !env.MEDIUM_CLIENT_SECRET || !env.MEDIUM_REDIRECT_URI || !env.SOCIAL_TOKEN_ENCRYPTION_KEY) {
    throw new Error("Medium callback is not fully configured in Cloudflare secrets.");
  }

  const socialAccount = await getSocialAccountByOauthState(client, state);
  if (!socialAccount) {
    throw new Error("Medium OAuth state could not be matched to a Greybrainer channel.");
  }

  const response = await fetch("https://api.medium.com/v1/tokens", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: formUrlEncoded({
      client_id: env.MEDIUM_CLIENT_ID,
      client_secret: env.MEDIUM_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.MEDIUM_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`Medium token exchange failed with ${response.status}.`);
  }

  const tokenBody = (await response.json()) as { access_token?: string; refresh_token?: string };
  if (!tokenBody.access_token) {
    throw new Error("Medium token exchange did not return an access token.");
  }

  const encryptedToken = await encryptSecret(tokenBody.access_token, env.SOCIAL_TOKEN_ENCRYPTION_KEY);
  const encryptedRefreshToken =
    tokenBody.refresh_token ? await encryptSecret(tokenBody.refresh_token, env.SOCIAL_TOKEN_ENCRYPTION_KEY) : null;

  await storeSocialAccountTokens(client, socialAccount.id, {
    accessTokenEncrypted: encryptedToken,
    connectedAt: nowIso(),
    oauthState: null,
    refreshTokenEncrypted: encryptedRefreshToken,
  });

  return socialAccount;
}

export async function handleNativeCallback(client: Client, env: Env, platform: string, requestUrl: URL) {
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return new Response(buildSuccessHtml(`Connection failed: ${error}`), {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: 400,
    });
  }

  if (!code || !state) {
    return new Response(buildSuccessHtml("The connector callback is missing the required code or state."), {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: 400,
    });
  }

  if (platform === "linkedin") {
    await handleLinkedInCallback(client, env, code, state);
  } else if (platform === "medium") {
    await handleMediumCallback(client, env, code, state);
  } else {
    return new Response(buildSuccessHtml(`Callback for ${platform} is not implemented yet.`), {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: 400,
    });
  }

  const successTarget = env.SOCIAL_CONNECT_SUCCESS_URL ? new URL(env.SOCIAL_CONNECT_SUCCESS_URL) : null;
  if (successTarget) {
    successTarget.searchParams.set("platform", platform);
    return Response.redirect(successTarget.toString(), 302);
  }

  return new Response(buildSuccessHtml(`The ${platform} channel is now connected in Greybrainer.`), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function publishDraftToSocialAccounts(
  client: Client,
  env: Env,
  draftId: string,
  socialAccountIds: string[],
) {
  const draft = await getDraftById(client, draftId);
  if (!draft?.currentVersion) {
    throw new Error("Draft or current version not found.");
  }

  const results = [];
  for (const socialAccountId of socialAccountIds) {
    const socialAccount = await getSocialAccountById(client, socialAccountId);
    if (!socialAccount) {
      results.push({ socialAccountId, status: "failed", error: "Social account not found." });
      continue;
    }

    if (!socialAccount.accessTokenEncrypted || socialAccount.connectionStatus !== "connected") {
      const publications = await upsertPublication(client, draftId, {
        channel: socialAccount.platform,
        errorMessage: "Channel auth is not ready yet.",
        externalUrl: null,
        payload: { socialAccountId },
        status: "failed",
        versionId: draft.currentVersion.id,
      });
      results.push({ socialAccountId, status: "failed", error: "Channel auth is not ready yet.", publications });
      continue;
    }

    if (!env.SOCIAL_TOKEN_ENCRYPTION_KEY) {
      throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY is not configured.");
    }

    const accessToken = await decryptSecret(socialAccount.accessTokenEncrypted, env.SOCIAL_TOKEN_ENCRYPTION_KEY);

    if (socialAccount.connectorKey === "native-medium") {
      const meResponse = await fetch("https://api.medium.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!meResponse.ok) {
        const publications = await upsertPublication(client, draftId, {
          channel: socialAccount.platform,
          errorMessage: `Medium profile lookup failed with ${meResponse.status}.`,
          externalUrl: null,
          payload: { socialAccountId },
          status: "failed",
          versionId: draft.currentVersion.id,
        });
        results.push({ socialAccountId, status: "failed", error: "Medium profile lookup failed.", publications });
        continue;
      }

      const meBody = (await meResponse.json()) as { data?: { id?: string } };
      const userId = meBody.data?.id;
      if (!userId) {
        throw new Error("Medium did not return a user id.");
      }

      const publishResponse = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          content: draft.currentVersion.blogMarkdown,
          contentFormat: "markdown",
          publishStatus: "public",
          title: draft.seoTitle ?? draft.subjectTitle,
        }),
      });

      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        const publications = await upsertPublication(client, draftId, {
          channel: socialAccount.platform,
          errorMessage: `Medium publish failed: ${errorText}`,
          externalUrl: null,
          payload: { socialAccountId },
          status: "failed",
          versionId: draft.currentVersion.id,
        });
        results.push({ socialAccountId, status: "failed", error: errorText, publications });
        continue;
      }

      const publishBody = (await publishResponse.json()) as { data?: { id?: string; url?: string } };
      const publications = await upsertPublication(client, draftId, {
        channel: socialAccount.platform,
        externalId: publishBody.data?.id ?? null,
        externalUrl: publishBody.data?.url ?? null,
        payload: { socialAccountId, response: publishBody },
        publishedAt: nowIso(),
        status: "published",
        versionId: draft.currentVersion.id,
      });
      results.push({
        socialAccountId,
        status: "published",
        externalUrl: publishBody.data?.url ?? null,
        publications,
      });
      continue;
    }

    const publications = await upsertPublication(client, draftId, {
      channel: socialAccount.platform,
      errorMessage: `${socialAccount.connectorKey} publish is not implemented yet.`,
      externalUrl: null,
      payload: { socialAccountId },
      status: "failed",
      versionId: draft.currentVersion.id,
    });
    results.push({
      socialAccountId,
      status: "failed",
      error: `${socialAccount.connectorKey} publish is not implemented yet.`,
      publications,
    });
  }

  return {
    draftId,
    results,
  };
}
