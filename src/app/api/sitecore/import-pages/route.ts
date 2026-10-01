import { NextRequest, NextResponse } from "next/server";
import { processXmlPageImport, testSitecoreConnection } from "@/src/backend/authoring-service";
import { ImportExecutionRequest, SitecoreEndpointConfig } from "@/src/backend/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ImportExecutionRequest;

    if (!body || !body.pages || !Array.isArray(body.pages)) {
      return NextResponse.json(
        { error: "Invalid request payload. 'pages' array is required." },
        { status: 400 }
      );
    }

    const config: SitecoreEndpointConfig = {
      endpoint: body.config?.endpoint || process.env.SITECORE_AUTHORING_ENDPOINT || "https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1/",
      apiKey: body.config?.apiKey || process.env.SITECORE_API_KEY || "",
      token: body.config?.token || process.env.SITECORE_AUTHORING_TOKEN || "",
      database: body.config?.database || "master",
      language: body.config?.language || "en",
      defaultTemplateId: body.config?.defaultTemplateId,
    };

    const startingPoint = body.startingPointPath || "/sitecore/content/Home";
    const result = await processXmlPageImport(config, startingPoint, body.pages);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process authoring import";
    console.error("Error in /api/sitecore/import-pages:", err);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || process.env.SITECORE_AUTHORING_ENDPOINT || "https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1/";
  const token = searchParams.get("token") || process.env.SITECORE_AUTHORING_TOKEN || "";
  const apiKey = searchParams.get("apiKey") || process.env.SITECORE_API_KEY || "";

  const check = await testSitecoreConnection({
    endpoint,
    token,
    apiKey,
  });

  return NextResponse.json(check);
}
