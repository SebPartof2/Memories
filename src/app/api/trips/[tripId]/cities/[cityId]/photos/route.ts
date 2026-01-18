import { NextRequest, NextResponse } from "next/server";
import { db, cities, photos } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET /api/trips/[tripId]/cities/[cityId]/photos - List all photos for a city
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; cityId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { cityId } = await params;

  // Check city exists
  const city = await db.query.cities.findFirst({
    where: eq(cities.id, cityId),
  });

  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const cityPhotos = await db.query.photos.findMany({
    where: eq(photos.cityId, cityId),
    orderBy: [desc(photos.takenAt), desc(photos.createdAt)],
  });

  return NextResponse.json(cityPhotos);
}

// POST /api/trips/[tripId]/cities/[cityId]/photos - Create a new photo record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; cityId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { cityId } = await params;

  // Check city exists
  const city = await db.query.cities.findFirst({
    where: eq(cities.id, cityId),
  });

  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      r2Key,
      filename,
      caption,
      takenAt,
      width,
      height,
      sizeBytes,
      latitude,
      longitude,
      cameraMake,
      cameraModel,
    } = body;

    if (!r2Key || !filename) {
      return NextResponse.json(
        { error: "r2Key and filename are required" },
        { status: 400 }
      );
    }

    const id = nanoid();
    const newPhoto = await db
      .insert(photos)
      .values({
        id,
        cityId,
        uploadedBy: auth.session.userId,
        r2Key,
        filename,
        caption: caption || null,
        takenAt: takenAt ? new Date(takenAt) : null,
        width: width || null,
        height: height || null,
        sizeBytes: sizeBytes || null,
        latitude: latitude?.toString() || null,
        longitude: longitude?.toString() || null,
        cameraMake: cameraMake || null,
        cameraModel: cameraModel || null,
      })
      .returning();

    return NextResponse.json(newPhoto[0], { status: 201 });
  } catch (error) {
    console.error("Error creating photo:", error);
    return NextResponse.json(
      { error: "Failed to create photo" },
      { status: 500 }
    );
  }
}
