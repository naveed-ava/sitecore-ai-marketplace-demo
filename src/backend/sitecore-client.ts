import { SitecoreEndpointConfig } from "./types";
import { getSitecoreAccessToken } from "./token-service";

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export async function getSitecoreAuthHeaders(config: SitecoreEndpointConfig): Promise<Record<string, string>> {
  let token = config.token;
  if (!token) {
    try {
      token = (await getSitecoreAccessToken()) || undefined;
    } catch (err: unknown) {
      console.warn("Could not dynamically acquire Sitecore OAuth token:", err);
    }
  }

  const apiKey = config.apiKey || process.env.SITECORE_API_KEY;
  if (token) return { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` };
  if (apiKey) return { sc_apikey: apiKey };
  return {};
}

/**
 * Executes a GraphQL query/mutation against the Sitecore Authoring and Management API endpoint
 */
export async function executeSitecoreGraphQL<T = unknown>(
  config: SitecoreEndpointConfig,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<GraphQLResponse<T>> {
  let endpoint = config.endpoint || process.env.SITECORE_AUTHORING_ENDPOINT;

  if (!endpoint) {
    throw new Error(
      "Sitecore Authoring API endpoint is not configured. Please supply an endpoint URL or set SITECORE_AUTHORING_ENDPOINT."
    );
  }

  // Normalize endpoint URL (ensure valid format)
  endpoint = endpoint.trim();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  Object.assign(headers, await getSitecoreAuthHeaders(config));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Sitecore Authoring API HTTP ${response.status} (${response.statusText}): ${errorText.slice(0, 300)}`
      );
    }

    const json = (await response.json()) as GraphQLResponse<T>;
    return json;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to reach Sitecore Authoring GraphQL endpoint: ${msg}`);
  }
}
