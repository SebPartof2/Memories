import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize R2 client (S3-compatible)
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

// Generate a presigned URL for uploading
export async function generatePresignedUpload(
  userId: string,
  filename: string,
  contentType: string
): Promise<PresignedUploadResult> {
  // Generate a unique key: userId/timestamp-randomId-filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${userId}/${timestamp}-${randomId}-${sanitizedFilename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  // URL expires in 15 minutes
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  return {
    uploadUrl,
    key,
    publicUrl,
  };
}

// Delete a file from R2
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

// Get the public URL for a key
export function getPublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
