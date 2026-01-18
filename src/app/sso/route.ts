import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizationUrl, storeOAuthState } from "@/lib/auth/oauth";

export async function GET(request: NextRequest) {
  // Build the authorization URL and store state
  const { url, state, verifier } = await buildAuthorizationUrl();
  await storeOAuthState(state, verifier);

  // Redirect to S-Auth
  return NextResponse.redirect(url);
}
