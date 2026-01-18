import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface Session {
  userId: string;
  email: string;
  name: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

// Simple encryption using Web Crypto API
async function encrypt(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret.padEnd(32, "0").slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(data)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

async function decrypt(encryptedData: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret.padEnd(32, "0").slice(0, 32));

  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

// Create a session
export async function createSession(session: Session): Promise<void> {
  const cookieStore = await cookies();
  const secret = process.env.SESSION_SECRET!;

  const encrypted = await encrypt(JSON.stringify(session), secret);

  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

// Get the current session
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const secret = process.env.SESSION_SECRET!;

  const encrypted = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!encrypted) {
    return null;
  }

  try {
    const decrypted = await decrypt(encrypted, secret);
    const session = JSON.parse(decrypted) as Session;

    // Check if token is expired (with 60 second buffer)
    if (session.expiresAt < Date.now() + 60000) {
      // Token expired, we should refresh it
      // For now, return null and let the middleware handle refresh
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// Update the session (e.g., after token refresh)
export async function updateSession(
  updates: Partial<Session>
): Promise<boolean> {
  const session = await getSession();
  if (!session) {
    return false;
  }

  await createSession({ ...session, ...updates });
  return true;
}

// Destroy the session (logout)
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Get session for client components (without sensitive data)
export async function getClientSession(): Promise<{
  userId: string;
  email: string;
  name: string | null;
} | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
  };
}
