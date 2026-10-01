import { NextRequest, NextResponse } from "next/server";
import { fetchContentTreeNode } from "@/src/backend/authoring-service";
import { isMockMode } from "@/src/backend/token-service";
import { SitecoreEndpointConfig } from "@/src/backend/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "/sitecore/content";
  const mockMode = isMockMode() || searchParams.get("mock") === "true";

  if (mockMode) {
    return NextResponse.json({
      success: true,
      mode: "mock",
      path,
      tree: null,
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
    const treeNode = await fetchContentTreeNode(config, path);
    return NextResponse.json({
      success: Boolean(treeNode),
      mode: "real",
      path,
      tree: treeNode,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        mode: "error",
        error: msg,
      },
      { status: 500 }
    );
  }
}
