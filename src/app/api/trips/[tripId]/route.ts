import { NextRequest, NextResponse } from "next/server";
import { db, trips } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { eq } from "drizzle-orm";

// GET /api/trips/[tripId] - Get a single trip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { tripId } = await params;

  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
    with: {
      cities: {
        with: {
          photos: true,
        },
      },
    },
  });

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}

// PATCH /api/trips/[tripId] - Update a trip
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { tripId } = await params;

  try {
    const body = await request.json();
    const { title, description, startDate, endDate, coverPhotoId } = body;

    // Check trip exists
    const existingTrip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });

    if (!existingTrip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const updated = await db
      .update(trips)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        ...(coverPhotoId !== undefined && { coverPhotoId }),
        updatedAt: new Date(),
      })
      .where(eq(trips.id, tripId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

// DELETE /api/trips/[tripId] - Delete a trip
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { tripId } = await params;

  // Check trip exists
  const existingTrip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
  });

  if (!existingTrip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  await db.delete(trips).where(eq(trips.id, tripId));

  return NextResponse.json({ success: true });
}
