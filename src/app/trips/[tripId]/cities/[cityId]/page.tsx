import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db, cities, photos } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { DeleteCityButton } from "./delete-button";
import { PhotoGrid } from "./photo-grid";
import { getMapboxStaticImageUrl } from "@/lib/mapbox";

async function getCity(cityId: string) {
  return db.query.cities.findFirst({
    where: eq(cities.id, cityId),
    with: {
      trip: true,
      photos: {
        with: {
          uploader: true,
        },
      },
    },
  });
}

export default async function CityDetailPage({
  params,
}: {
  params: Promise<{ tripId: string; cityId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/logout");
  }

  const { tripId, cityId } = await params;
  const city = await getCity(cityId);

  if (!city) {
    notFound();
  }

  const mapImageUrl =
    city.latitude && city.longitude
      ? getMapboxStaticImageUrl({
          latitude: parseFloat(city.latitude),
          longitude: parseFloat(city.longitude),
          zoom: 12,
          width: 1200,
          height: 400,
        })
      : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/trips" className="hover:text-gray-700 dark:hover:text-gray-200">
            Trips
          </Link>
          <span>/</span>
          <Link href={`/trips/${tripId}`} className="hover:text-gray-700 dark:hover:text-gray-200">
            {city.trip.title}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{city.name}</span>
        </div>

        <div className="rounded-xl overflow-hidden mb-8 relative">
          {mapImageUrl ? (
            <div className="relative h-64 md:h-80">
              <Image
                src={mapImageUrl}
                alt={`Map of ${city.name}`}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                      {city.name}
                    </h1>
                    {city.country && (
                      <p className="text-white/90 text-lg">{city.country}</p>
                    )}
                    {(city.startDate || city.endDate) && (
                      <p className="text-white/80 mt-2">
                        {formatDateRange(city.startDate, city.endDate)}
                      </p>
                    )}
                    <p className="text-white/80 mt-2">
                      {city.photos.length} photos
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/trips/${tripId}/cities/${cityId}/upload`}>
                      <Button variant="secondary" size="sm">
                        Upload Photos
                      </Button>
                    </Link>
                    <DeleteCityButton tripId={tripId} cityId={cityId} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-green-400 to-teal-500 p-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">
                    {city.name}
                  </h1>
                  {city.country && (
                    <p className="text-white/80 text-lg">{city.country}</p>
                  )}
                  {(city.startDate || city.endDate) && (
                    <p className="text-white/80 mt-2">
                      {formatDateRange(city.startDate, city.endDate)}
                    </p>
                  )}
                  <p className="text-white/80 mt-4">
                    {city.photos.length} photos
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Link href={`/trips/${tripId}/cities/${cityId}/upload`}>
                    <Button variant="secondary" size="sm">
                      Upload Photos
                    </Button>
                  </Link>
                  <DeleteCityButton tripId={tripId} cityId={cityId} />
                </div>
              </div>
            </div>
          )}
        </div>

        {city.photos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No photos uploaded yet.
              </p>
              <Link href={`/trips/${tripId}/cities/${cityId}/upload`}>
                <Button>Upload Your First Photos</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <PhotoGrid
            photos={city.photos}
            tripId={tripId}
            cityId={cityId}
          />
        )}
      </main>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  if (startDate) {
    return `From ${formatDate(startDate)}`;
  }
  if (endDate) {
    return `Until ${formatDate(endDate)}`;
  }
  return "";
}
