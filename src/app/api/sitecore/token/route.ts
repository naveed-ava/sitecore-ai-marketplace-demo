import { NextRequest, NextResponse } from "next/server";
import { getSitecoreAccessToken, getClientCredentials, isMockMode } from "@/src/backend/token-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  const { clientId, clientSecret } = getClientCredentials();
  const mockMode = isMockMode();

  if (mockMode) {
    return NextResponse.json({
      success: true,
      mode: "mock",
      message: "SHOW_MOCK is enabled. Running with mock authentication.",
      token: "mock-jwt-token",
    });
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing SITECORE_CLIENT_ID or SITECORE_CLIENT_KEY in environment variables.",
        clientIdConfigured: Boolean(clientId),
        clientSecretConfigured: Boolean(clientSecret),
      },
      { status: 400 }
    );
  }

  try {
    const token = await getSitecoreAccessToken(forceRefresh);
    return NextResponse.json({
      success: true,
      mode: "real",
      tokenType: "Bearer",
      hasToken: Boolean(token),
      tokenPreview: token ? `${token.substring(0, 15)}...${token.substring(token.length - 10)}` : null,
      message: "Successfully generated/retrieved Sitecore OAuth token on the fly.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { clientId?: string; clientSecret?: string };

    const token = await getSitecoreAccessToken(true);
    return NextResponse.json({
      success: true,
      token,
      tokenType: "Bearer",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
