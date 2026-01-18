import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api";
import { generatePresignedUpload } from "@/lib/r2/client";

// Allowed image MIME types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
];

// Max file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// POST /api/upload/presign - Generate a presigned URL for uploading
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { filename, contentType, fileSize } = body;

    // Validate inputs
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType are required" },
        { status: 400 }
      );
    }

    // Validate content type
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC" },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20MB" },
        { status: 400 }
      );
    }

    const result = await generatePresignedUpload(
      auth.session.userId,
      filename,
      contentType
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
