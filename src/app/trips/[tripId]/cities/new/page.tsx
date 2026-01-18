"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ClientHeader } from "@/components/layout/client-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CitySearch, CityResult } from "@/components/cities/city-search";

export default function NewCityPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedCity) {
      setError("Please select a city from the search results");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      name: selectedCity.name,
      country: selectedCity.country,
      mapboxId: selectedCity.id,
      latitude: selectedCity.latitude.toString(),
      longitude: selectedCity.longitude.toString(),
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
    };

    try {
      const response = await fetch(`/api/trips/${tripId}/cities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create city");
      }

      const city = await response.json();
      router.push(`/trips/${tripId}/cities/${city.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ClientHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/trips/${tripId}`}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            &larr; Back to trip
          </Link>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Add City
            </h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <CitySearch
                onSelect={(city) => setSelectedCity(city)}
              />

              {selectedCity && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Selected: <strong>{selectedCity.name}</strong>
                    {selectedCity.country && `, ${selectedCity.country}`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  name="startDate"
                  id="startDate"
                  type="date"
                />
                <Input
                  label="End Date"
                  name="endDate"
                  id="endDate"
                  type="date"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Link href={`/trips/${tripId}`}>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || !selectedCity}>
                  {loading ? "Adding..." : "Add City"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
