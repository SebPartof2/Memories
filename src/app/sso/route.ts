import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizationUrl, storeOAuthState } from "@/lib/auth/oauth";

export async function GET(request: NextRequest) {
  // Build the authorization URL and store state
  const { url, state, verifier } = await buildAuthorizationUrl();
  await storeOAuthState(state, verifier);

  // Check if this is an RSC request - if so, return HTML that does client-side redirect
  // This avoids CORS issues when RSC tries to follow redirects to external domains
  const isRscRequest = request.headers.get("RSC") || request.headers.get("Next-Router-State-Tree");
  if (isRscRequest) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${url}"></head><body>Redirecting...</body></html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Redirect to S-Auth
  return NextResponse.redirect(url);
}
