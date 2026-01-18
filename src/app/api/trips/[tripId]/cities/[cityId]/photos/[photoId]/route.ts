import { NextRequest, NextResponse } from "next/server";
import { db, photos } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { eq } from "drizzle-orm";
import { deleteFromR2 } from "@/lib/r2/client";

// GET /api/trips/[tripId]/cities/[cityId]/photos/[photoId] - Get a single photo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; cityId: string; photoId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { photoId } = await params;

  const photo = await db.query.photos.findFirst({
    where: eq(photos.id, photoId),
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return NextResponse.json(photo);
}

// PATCH /api/trips/[tripId]/cities/[cityId]/photos/[photoId] - Update a photo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; cityId: string; photoId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { photoId } = await params;

  const existingPhoto = await db.query.photos.findFirst({
    where: eq(photos.id, photoId),
  });

  if (!existingPhoto) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { caption } = body;

    const updated = await db
      .update(photos)
      .set({
        ...(caption !== undefined && { caption }),
        updatedAt: new Date(),
      })
      .where(eq(photos.id, photoId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating photo:", error);
    return NextResponse.json(
      { error: "Failed to update photo" },
      { status: 500 }
    );
  }
}

// DELETE /api/trips/[tripId]/cities/[cityId]/photos/[photoId] - Delete a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; cityId: string; photoId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { photoId } = await params;

  const photo = await db.query.photos.findFirst({
    where: eq(photos.id, photoId),
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Delete from R2
  try {
    await deleteFromR2(photo.r2Key);
  } catch (error) {
    console.error("Error deleting from R2:", error);
    // Continue with database deletion even if R2 fails
  }

  // Delete from database
  await db.delete(photos).where(eq(photos.id, photoId));

  return NextResponse.json({ success: true });
}
