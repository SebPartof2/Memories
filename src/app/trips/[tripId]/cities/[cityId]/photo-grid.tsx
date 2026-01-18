"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Photo {
  id: string;
  r2Key: string;
  filename: string;
  caption: string | null;
  takenAt: Date | null;
  latitude: string | null;
  longitude: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  uploadedBy: string | null;
  uploader?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export function PhotoGrid({
  photos,
  tripId,
  cityId,
}: {
  photos: Photo[];
  tripId: string;
  cityId: string;
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onClick={() => setSelectedPhoto(photo)}
          />
        ))}
      </div>

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          tripId={tripId}
          cityId={cityId}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </>
  );
}

function PhotoCard({
  photo,
  onClick,
}: {
  photo: Photo;
  onClick: () => void;
}) {
  const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ""}/${photo.r2Key}`;

  return (
    <div
      className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
      onClick={onClick}
    >
      <img
        src={publicUrl}
        alt={photo.caption || photo.filename}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {photo.caption}
        </div>
      )}
    </div>
  );
}

function PhotoModal({
  photo,
  tripId,
  cityId,
  onClose,
}: {
  photo: Photo;
  tripId: string;
  cityId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ""}/${photo.r2Key}`;

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        `/api/trips/${tripId}/cities/${cityId}/photos/${photo.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete photo");
      }

      onClose();
      router.refresh();
    } catch (error) {
      alert("Failed to delete photo");
      setDeleting(false);
    }
  }

  const hasMetadata =
    photo.takenAt ||
    (photo.latitude && photo.longitude) ||
    photo.cameraMake ||
    photo.cameraModel ||
    photo.uploader;

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getGoogleMapsUrl = (lat: string, lng: string) =>
    `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-5xl max-h-[90vh] relative flex flex-col md:flex-row gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex-shrink-0">
          <img
            src={publicUrl}
            alt={photo.caption || photo.filename}
            className="max-w-full max-h-[70vh] md:max-h-[80vh] object-contain rounded-lg"
          />
          <div className="absolute top-4 right-4 flex space-x-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {hasMetadata && (
          <div className="bg-gray-900/90 rounded-lg p-4 min-w-[200px] md:max-w-[250px] text-white space-y-3">
            <h3 className="font-medium text-lg border-b border-gray-700 pb-2">
              Photo Details
            </h3>

            {photo.uploader && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Uploaded by
                </p>
                <p className="text-sm">
                  {photo.uploader.name || photo.uploader.email}
                </p>
              </div>
            )}

            {photo.takenAt && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Taken
                </p>
                <p className="text-sm">{formatDate(photo.takenAt)}</p>
              </div>
            )}

            {photo.latitude && photo.longitude && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Location
                </p>
                <a
                  href={getGoogleMapsUrl(photo.latitude, photo.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  View on map
                </a>
              </div>
            )}

            {(photo.cameraMake || photo.cameraModel) && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Camera
                </p>
                <p className="text-sm">
                  {[photo.cameraMake, photo.cameraModel]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              </div>
            )}

            {photo.caption && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Caption
                </p>
                <p className="text-sm">{photo.caption}</p>
              </div>
            )}
          </div>
        )}

        {!hasMetadata && photo.caption && (
          <div className="mt-4 text-white text-center">{photo.caption}</div>
        )}
      </div>
    </div>
  );
}
