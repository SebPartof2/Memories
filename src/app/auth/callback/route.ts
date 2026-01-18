import { NextRequest, NextResponse } from "next/server";
import {
  retrieveOAuthState,
  exchangeCodeForTokens,
  getUserInfo,
} from "@/lib/auth/oauth";
import { createSession } from "@/lib/auth/session";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    const errorDescription = searchParams.get("error_description") || error;
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorDescription)}`, request.url)
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/?error=Missing+authorization+code+or+state", request.url)
    );
  }

  // Retrieve stored OAuth state
  const { state: storedState, verifier } = await retrieveOAuthState();

  // Validate state parameter (CSRF protection)
  if (state !== storedState) {
    return NextResponse.redirect(
      new URL("/?error=Invalid+state+parameter", request.url)
    );
  }

  if (!verifier) {
    return NextResponse.redirect(
      new URL("/?error=Missing+PKCE+verifier", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, verifier);

    // Get user info from S-Auth
    const userInfo = await getUserInfo(tokens.access_token);

    // Create or update user in database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userInfo.sub),
    });

    const userName = [userInfo.given_name, userInfo.family_name]
      .filter(Boolean)
      .join(" ") || null;

    if (existingUser) {
      // Update existing user
      await db
        .update(users)
        .set({
          email: userInfo.email,
          name: userName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userInfo.sub));
    } else {
      // Create new user
      await db.insert(users).values({
        id: userInfo.sub,
        email: userInfo.email,
        name: userName,
      });
    }

    // Create session
    await createSession({
      userId: userInfo.sub,
      email: userInfo.email,
      name: userName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });

    // Redirect to trips page
    return NextResponse.redirect(new URL("/trips", request.url));
  } catch (err) {
    console.error("Authentication error:", err);
    const message =
      err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
