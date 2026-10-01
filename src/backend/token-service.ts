/**
 * Sitecore Cloud OAuth2 Token Service
 * Implements client_credentials token generation against https://auth.sitecorecloud.io/oauth/token
 */

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

export function isMockMode(): boolean {
  return process.env.SHOW_MOCK === "true";
}

export function getClientCredentials(): { clientId?: string; clientSecret?: string } {
  const clientId = process.env.SITECORE_CLIENT_ID;
  const clientSecret = process.env.SITECORE_CLIENT_KEY || process.env.SITECORE_CLIENT_SECRET;
  return { clientId, clientSecret };
}

/**
 * Fetches a JWT Bearer token from Sitecore Cloud OAuth2 service
 */
export async function getSitecoreAccessToken(forceRefresh = false): Promise<string | null> {
  // If explicitly in mock mode and credentials not configured, skip
  const { clientId, clientSecret } = getClientCredentials();

  if (!clientId || !clientSecret || clientSecret.includes("your_client_secret")) {
    // Check if legacy manual token exists during transition
    if (process.env.SITECORE_AUTHORING_TOKEN) {
      return process.env.SITECORE_AUTHORING_TOKEN;
    }
    return null;
  }

  // Return cached token if valid (with 60s buffer)
  if (!forceRefresh && tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.accessToken;
  }

  const tokenEndpoint = process.env.SITECORE_AUTH_ENDPOINT || "https://auth.sitecorecloud.io/oauth/token";
  const audience = process.env.SITECORE_AUTH_AUDIENCE || "https://api.sitecorecloud.io";

  const formBody = new URLSearchParams();
  formBody.append("grant_type", "client_credentials");
  formBody.append("client_id", clientId.trim());
  formBody.append("client_secret", clientSecret.trim());
  formBody.append("audience", audience);

  try {
    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OAuth token request failed with status ${res.status} (${res.statusText}): ${errorText}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in?: number; token_type?: string };

    if (!data.access_token) {
      throw new Error("OAuth response did not contain an access_token property.");
    }

    const expiresInSeconds = data.expires_in || 3600;
    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };

    return tokenCache.accessToken;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Sitecore OAuth Token Error]", msg);
    throw err;
  }
}
