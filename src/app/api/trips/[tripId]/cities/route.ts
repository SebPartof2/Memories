import { NextRequest, NextResponse } from "next/server";
import { db, trips, cities } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET /api/trips/[tripId]/cities - List all cities for a trip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { tripId } = await params;

  // Check trip exists
  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
  });

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const tripCities = await db.query.cities.findMany({
    where: eq(cities.tripId, tripId),
    orderBy: [desc(cities.startDate), desc(cities.createdAt)],
    with: {
      photos: true,
    },
  });

  return NextResponse.json(tripCities);
}

// POST /api/trips/[tripId]/cities - Create a new city
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { tripId } = await params;

  // Check trip exists
  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
  });

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, country, mapboxId, latitude, longitude, startDate, endDate } = body;

    if (!name) {
      return NextResponse.json(
        { error: "City name is required" },
        { status: 400 }
      );
    }

    const id = nanoid();
    const newCity = await db
      .insert(cities)
      .values({
        id,
        tripId,
        name,
        country: country || null,
        mapboxId: mapboxId || null,
        latitude: latitude || null,
        longitude: longitude || null,
        startDate: startDate || null,
        endDate: endDate || null,
      })
      .returning();

    return NextResponse.json(newCity[0], { status: 201 });
  } catch (error) {
    console.error("Error creating city:", error);
    return NextResponse.json(
      { error: "Failed to create city" },
      { status: 500 }
    );
  }
}
