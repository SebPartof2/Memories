import { NextRequest, NextResponse } from "next/server";
import { db, trips } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET /api/trips - List all family trips
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const allTrips = await db.query.trips.findMany({
    orderBy: [desc(trips.createdAt)],
    with: {
      cities: {
        with: {
          photos: true,
        },
      },
    },
  });

  return NextResponse.json(allTrips);
}

// POST /api/trips - Create a new trip
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { title, description, startDate, endDate } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const id = nanoid();
    const newTrip = await db
      .insert(trips)
      .values({
        id,
        userId: auth.session.userId,
        title,
        description: description || null,
        startDate: startDate || null,
        endDate: endDate || null,
      })
      .returning();

    return NextResponse.json(newTrip[0], { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 }
    );
  }
}
