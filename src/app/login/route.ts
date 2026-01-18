import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizationUrl, storeOAuthState } from "@/lib/auth/oauth";
import { getSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  // If already logged in, redirect to trips
  const session = await getSession();
  if (session) {
    return NextResponse.redirect(new URL("/trips", request.url));
  }

  // Build the authorization URL and store state
  const { url, state, verifier } = await buildAuthorizationUrl();
  await storeOAuthState(state, verifier);

  // Redirect to S-Auth
  return NextResponse.redirect(url);
}
