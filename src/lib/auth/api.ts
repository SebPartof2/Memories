import { getSession, Session } from "./session";
import { NextResponse } from "next/server";

export async function requireAuth(): Promise<
  { session: Session } | { error: NextResponse }
> {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session };
}
