import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db, trips, cities } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { DeleteTripButton } from "./delete-button";
import { getMapboxStaticImageUrl } from "@/lib/mapbox";

async function getTrip(tripId: string) {
  return db.query.trips.findFirst({
    where: eq(trips.id, tripId),
    with: {
      cities: {
        with: {
          photos: true,
        },
      },
    },
  });
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/logout");
  }

  const { tripId } = await params;
  const trip = await getTrip(tripId);

  if (!trip) {
    notFound();
  }

  const totalPhotos = trip.cities.reduce(
    (sum, city) => sum + city.photos.length,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/trips"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            &larr; Back to trips
          </Link>
        </div>

        <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl p-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {trip.title}
              </h1>
              {trip.startDate && (
                <p className="text-white/80">
                  {formatDate(trip.startDate)}
                  {trip.endDate && ` - ${formatDate(trip.endDate)}`}
                </p>
              )}
              {trip.description && (
                <p className="text-white/90 mt-4 max-w-2xl">
                  {trip.description}
                </p>
              )}
              <div className="flex items-center mt-4 text-white/80 space-x-4">
                <span>{trip.cities.length} cities</span>
                <span>{totalPhotos} photos</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href={`/trips/${trip.id}/edit`}>
                <Button variant="secondary" size="sm">
                  Edit
                </Button>
              </Link>
              <DeleteTripButton tripId={trip.id} />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cities
          </h2>
          <Link href={`/trips/${trip.id}/cities/new`}>
            <Button>Add City</Button>
          </Link>
        </div>

        {trip.cities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No cities added to this trip yet.
              </p>
              <Link href={`/trips/${trip.id}/cities/new`}>
                <Button>Add Your First City</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trip.cities.map((city) => (
              <CityCard key={city.id} city={city} tripId={trip.id} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CityCard({
  city,
  tripId,
}: {
  city: {
    id: string;
    name: string;
    country: string | null;
    latitude: string | null;
    longitude: string | null;
    startDate: string | null;
    endDate: string | null;
    photos: Array<{ id: string; r2Key: string }>;
  };
  tripId: string;
}) {
  const mapImageUrl =
    city.latitude && city.longitude
      ? getMapboxStaticImageUrl({
          latitude: parseFloat(city.latitude),
          longitude: parseFloat(city.longitude),
          zoom: 12,
          width: 400,
          height: 225,
        })
      : null;

  return (
    <Link href={`/trips/${tripId}/cities/${city.id}`} className="block h-full">
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <div className="aspect-video bg-gradient-to-br from-green-400 to-teal-500 relative overflow-hidden">
          {mapImageUrl ? (
            <Image
              src={mapImageUrl}
              alt={`Map of ${city.name}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl">🏙️</span>
            </div>
          )}
        </div>
        <CardContent>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {city.name}
          </h3>
          {city.country && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {city.country}
            </p>
          )}
          {(city.startDate || city.endDate) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDateRange(city.startDate, city.endDate)}
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {city.photos.length} photos
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  if (startDate) {
    return formatDate(startDate);
  }
  if (endDate) {
    return formatDate(endDate);
  }
  return "";
}
