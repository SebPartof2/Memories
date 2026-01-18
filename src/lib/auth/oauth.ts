import { cookies } from "next/headers";

const SAUTH_BASE_URL = "https://auth.sebbyk.net";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  access_level?: string;
}

// Generate a cryptographically secure random string
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Base64URL encode a buffer
function base64URLEncode(buffer: Uint8Array): string {
  let str = "";
  for (let i = 0; i < buffer.length; i++) {
    str += String.fromCharCode(buffer[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Generate SHA-256 hash and base64URL encode it
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64URLEncode(new Uint8Array(hash));
}

// Generate PKCE code verifier and challenge
export async function generatePKCE(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = generateRandomString(32);
  const challenge = await sha256(verifier);
  return { verifier, challenge };
}

// Generate state parameter for CSRF protection
export function generateState(): string {
  return generateRandomString(16);
}

// Build the authorization URL
export async function buildAuthorizationUrl(): Promise<{
  url: string;
  state: string;
  verifier: string;
}> {
  const { verifier, challenge } = await generatePKCE();
  const state = generateState();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SAUTH_CLIENT_ID!,
    redirect_uri: process.env.SAUTH_REDIRECT_URI!,
    scope: "openid profile email",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return {
    url: `${SAUTH_BASE_URL}/authorize?${params.toString()}`,
    state,
    verifier,
  };
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string,
  verifier: string
): Promise<TokenResponse> {
  const response = await fetch(`${SAUTH_BASE_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SAUTH_REDIRECT_URI!,
      client_id: process.env.SAUTH_CLIENT_ID!,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Token exchange failed");
  }

  return response.json();
}

// Get user info from S-Auth
export async function getUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch(`${SAUTH_BASE_URL}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user info");
  }

  return response.json();
}

// Refresh access token
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const response = await fetch(`${SAUTH_BASE_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.SAUTH_CLIENT_ID!,
    }),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  return response.json();
}

// Store PKCE verifier and state in cookies (for the callback)
export async function storeOAuthState(
  state: string,
  verifier: string
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  cookieStore.set("oauth_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });
}

// Retrieve and clear OAuth state from cookies
export async function retrieveOAuthState(): Promise<{
  state: string | null;
  verifier: string | null;
}> {
  const cookieStore = await cookies();

  const state = cookieStore.get("oauth_state")?.value ?? null;
  const verifier = cookieStore.get("oauth_verifier")?.value ?? null;

  // Clear the cookies
  cookieStore.delete("oauth_state");
  cookieStore.delete("oauth_verifier");

  return { state, verifier };
}
