"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteCityButton({
  tripId,
  cityId,
}: {
  tripId: string;
  cityId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this city? This will also delete all photos.")) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/trips/${tripId}/cities/${cityId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete city");
      }

      router.push(`/trips/${tripId}`);
      router.refresh();
    } catch (error) {
      alert("Failed to delete city");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="danger"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? "Deleting..." : "Delete City"}
    </Button>
  );
}
