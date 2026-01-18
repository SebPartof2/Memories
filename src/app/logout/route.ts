import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function POST() {
  await destroySession();
  return NextResponse.json({ success: true });
}
