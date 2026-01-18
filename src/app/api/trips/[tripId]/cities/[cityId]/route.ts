import { NextRequest, NextResponse } from "next/server";
import { db, cities } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { eq } from "drizzle-orm";

// GET /api/trips/[tripId]/cities/[cityId] - Get a single city
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; cityId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { cityId } = await params;

  const city = await db.query.cities.findFirst({
    where: eq(cities.id, cityId),
    with: {
      photos: true,
    },
  });

  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  return NextResponse.json(city);
}

// PATCH /api/trips/[tripId]/cities/[cityId] - Update a city
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; cityId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { cityId } = await params;

  const existingCity = await db.query.cities.findFirst({
    where: eq(cities.id, cityId),
  });

  if (!existingCity) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, country, mapboxId, latitude, longitude, startDate, endDate } = body;

    const updated = await db
      .update(cities)
      .set({
        ...(name !== undefined && { name }),
        ...(country !== undefined && { country }),
        ...(mapboxId !== undefined && { mapboxId }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        updatedAt: new Date(),
      })
      .where(eq(cities.id, cityId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating city:", error);
    return NextResponse.json(
      { error: "Failed to update city" },
      { status: 500 }
    );
  }
}

// DELETE /api/trips/[tripId]/cities/[cityId] - Delete a city
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; cityId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { cityId } = await params;

  const existingCity = await db.query.cities.findFirst({
    where: eq(cities.id, cityId),
  });

  if (!existingCity) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  await db.delete(cities).where(eq(cities.id, cityId));

  return NextResponse.json({ success: true });
}
