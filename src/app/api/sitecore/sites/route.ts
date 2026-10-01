import { NextRequest, NextResponse } from "next/server";
import { fetchRealSitecoreApps } from "@/src/backend/authoring-service";
import { isMockMode } from "@/src/backend/token-service";
import { MOCK_SITECORE_APPS } from "@/src/utils/sitecore-data";
import { SitecoreEndpointConfig } from "@/src/backend/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedMock = searchParams.get("mock") === "true";
  const mockMode = isMockMode() || requestedMock;

  if (mockMode) {
    return NextResponse.json({
      success: true,
      mode: "mock",
      message: "Showing mock Sitecore applications (SHOW_MOCK is enabled).",
      apps: MOCK_SITECORE_APPS,
    });
  }

  const config: SitecoreEndpointConfig = {
    endpoint:
      searchParams.get("endpoint") ||
      process.env.SITECORE_AUTHORING_ENDPOINT ||
      "https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1",
    apiKey: searchParams.get("apiKey") || process.env.SITECORE_API_KEY || "",
    token: searchParams.get("token") || process.env.SITECORE_AUTHORING_TOKEN || "",
    database: searchParams.get("database") || process.env.SITECORE_DATABASE || "master",
    language: searchParams.get("language") || process.env.SITECORE_LANGUAGE || "en",
  };

  try {
    const realApps = await fetchRealSitecoreApps(config);

    if (realApps.length === 0) {
      // If endpoint is reachable but no sites returned, provide a default root item tree
      return NextResponse.json({
        success: true,
        mode: "real",
        message: "Connected to Sitecore Authoring API. No custom sites detected under 'sites' query; displaying root content tree.",
        apps: [
          {
            id: "root-content",
            name: "Content-Root",
            displayName: "Sitecore Content Root",
            description: "Default /sitecore/content root tree",
            environment: config.endpoint,
            rootPath: "/sitecore/content",
            contentTree: {
              id: "root-content-node",
              name: "content",
              displayName: "Content",
              path: "/sitecore/content",
              template: "Folder",
              children: [],
            },
          },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      mode: "real",
      message: `Retrieved ${realApps.length} live Sitecore application(s) from Authoring GraphQL API.`,
      apps: realApps,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to load real Sitecore sites:", msg);

    return NextResponse.json(
      {
        success: false,
        mode: "error",
        error: msg,
        message: "Failed to connect to Sitecore Authoring GraphQL API. Check endpoint, credentials, or set SHOW_MOCK=true.",
        fallbackApps: MOCK_SITECORE_APPS,
      },
      { status: 502 }
    );
  }
}
