"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import exifr from "exifr";
import { ClientHeader } from "@/components/layout/client-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ExifMetadata {
  takenAt?: string;
  latitude?: number;
  longitude?: number;
  cameraMake?: string;
  cameraModel?: string;
  width?: number;
  height?: number;
}

interface UploadingFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  metadata?: ExifMetadata;
}

async function extractExifData(file: File): Promise<ExifMetadata> {
  const metadata: ExifMetadata = {};

  try {
    const exif = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'Make', 'Model', 'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight'],
      gps: true,
    });

    if (exif) {
      if (exif.DateTimeOriginal) {
        metadata.takenAt = exif.DateTimeOriginal instanceof Date
          ? exif.DateTimeOriginal.toISOString()
          : new Date(exif.DateTimeOriginal).toISOString();
      }
      if (exif.latitude !== undefined) {
        metadata.latitude = exif.latitude;
      }
      if (exif.longitude !== undefined) {
        metadata.longitude = exif.longitude;
      }
      if (exif.Make) {
        metadata.cameraMake = exif.Make;
      }
      if (exif.Model) {
        metadata.cameraModel = exif.Model;
      }
      metadata.width = exif.ExifImageWidth || exif.ImageWidth;
      metadata.height = exif.ExifImageHeight || exif.ImageHeight;
    }
  } catch (error) {
    console.warn('Failed to extract EXIF data:', error);
  }

  // If we couldn't get dimensions from EXIF, try loading as image
  if (!metadata.width || !metadata.height) {
    try {
      const dimensions = await getImageDimensions(file);
      metadata.width = dimensions.width;
      metadata.height = dimensions.height;
    } catch (error) {
      console.warn('Failed to get image dimensions:', error);
    }
  }

  return metadata;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function UploadPhotosPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const cityId = params.cityId as string;

  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);

      // Add files immediately with pending status
      const newFiles: UploadingFile[] = selectedFiles.map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
      }));

      const startIndex = files.length;
      setFiles((prev) => [...prev, ...newFiles]);

      // Extract EXIF data for each file in background
      for (let i = 0; i < selectedFiles.length; i++) {
        const metadata = await extractExifData(selectedFiles[i]);
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === startIndex + i ? { ...f, metadata } : f
          )
        );
      }
    },
    [files.length]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (files.length === 0) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      if (fileData.status !== "pending") continue;

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" } : f
        )
      );

      try {
        // Step 1: Get presigned URL
        const presignResponse = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: fileData.file.name,
            contentType: fileData.file.type,
            fileSize: fileData.file.size,
          }),
        });

        if (!presignResponse.ok) {
          const error = await presignResponse.json();
          throw new Error(error.error || "Failed to get upload URL");
        }

        const { uploadUrl, key } = await presignResponse.json();

        // Step 2: Upload to R2
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": fileData.file.type,
          },
          body: fileData.file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload to storage");
        }

        // Update progress
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, progress: 80 } : f
          )
        );

        // Step 3: Create photo record in database with metadata
        const photoResponse = await fetch(
          `/api/trips/${tripId}/cities/${cityId}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              r2Key: key,
              filename: fileData.file.name,
              sizeBytes: fileData.file.size,
              takenAt: fileData.metadata?.takenAt,
              latitude: fileData.metadata?.latitude,
              longitude: fileData.metadata?.longitude,
              cameraMake: fileData.metadata?.cameraMake,
              cameraModel: fileData.metadata?.cameraModel,
              width: fileData.metadata?.width,
              height: fileData.metadata?.height,
            }),
          }
        );

        if (!photoResponse.ok) {
          throw new Error("Failed to save photo record");
        }

        // Success
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "done", progress: 100 } : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }
    }

    setUploading(false);
  }, [files, tripId, cityId]);

  const completedCount = files.filter((f) => f.status === "done").length;
  const hasErrors = files.some((f) => f.status === "error");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ClientHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/trips/${tripId}/cities/${cityId}`}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            &larr; Back to city
          </Link>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Upload Photos
            </h1>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
                disabled={uploading}
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer block"
              >
                <div className="text-4xl mb-4">📷</div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Click to select photos or drag and drop
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  JPEG, PNG, GIF, WebP, HEIC up to 20MB each
                </p>
              </label>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Selected Files ({completedCount}/{files.length} uploaded)
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((fileData, index) => (
                    <FileItem
                      key={index}
                      fileData={fileData}
                      onRemove={() => removeFile(index)}
                      disabled={uploading}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Link href={`/trips/${tripId}/cities/${cityId}`}>
                <Button variant="secondary" disabled={uploading}>
                  {completedCount > 0 ? "Done" : "Cancel"}
                </Button>
              </Link>
              {files.some((f) => f.status === "pending") && (
                <Button onClick={uploadFiles} disabled={uploading}>
                  {uploading
                    ? "Uploading..."
                    : `Upload ${files.filter((f) => f.status === "pending").length} Photos`}
                </Button>
              )}
            </div>

            {hasErrors && (
              <p className="text-sm text-red-500">
                Some uploads failed. You can try again or continue with the
                successful uploads.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function FileItem({
  fileData,
  onRemove,
  disabled,
}: {
  fileData: UploadingFile;
  onRemove: () => void;
  disabled: boolean;
}) {
  const statusColors = {
    pending: "bg-gray-100 dark:bg-gray-700",
    uploading: "bg-blue-100 dark:bg-blue-900/30",
    done: "bg-green-100 dark:bg-green-900/30",
    error: "bg-red-100 dark:bg-red-900/30",
  };

  const statusIcons = {
    pending: "⏳",
    uploading: "⬆️",
    done: "✅",
    error: "❌",
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${statusColors[fileData.status]}`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <span>{statusIcons[fileData.status]}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {fileData.file.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(fileData.file.size)}
            {fileData.error && (
              <span className="text-red-500 ml-2">{fileData.error}</span>
            )}
          </p>
        </div>
      </div>
      {fileData.status === "pending" && (
        <button
          onClick={onRemove}
          disabled={disabled}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
