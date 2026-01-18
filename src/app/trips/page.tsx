import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db, trips, Trip } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";

async function getTrips() {
  return db.query.trips.findMany({
    orderBy: [desc(trips.createdAt)],
    with: {
      cities: {
        with: {
          photos: true,
        },
      },
    },
  });
}

export default async function TripsPage() {
  const session = await getSession();
  if (!session) {
    // Redirect to logout to clear invalid session cookie, then to login
    redirect("/logout");
  }

  const allTrips = await getTrips();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Family Trips
          </h1>
          {session.isAdmin && (
            <Link href="/trips/new">
              <Button>New Trip</Button>
            </Link>
          )}
        </div>

        {allTrips.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {session.isAdmin
                  ? "No trips yet. Create your first family trip!"
                  : "No trips yet. Ask an admin to create one!"}
              </p>
              {session.isAdmin && (
                <Link href="/trips/new">
                  <Button>Create Your First Trip</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TripCard({
  trip,
}: {
  trip: Trip & {
    cities: Array<{
      id: string;
      name: string;
      photos: Array<{ id: string }>;
    }>;
  };
}) {
  const totalPhotos = trip.cities.reduce(
    (sum, city) => sum + city.photos.length,
    0
  );
  const dateRange =
    trip.startDate && trip.endDate
      ? `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`
      : trip.startDate
        ? formatDate(trip.startDate)
        : null;

  return (
    <Link href={`/trips/${trip.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <div className="aspect-video bg-gradient-to-br from-blue-400 to-purple-500 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">
              {trip.cities.length > 0 ? "🗺️" : "✈️"}
            </span>
          </div>
        </div>
        <CardContent>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {trip.title}
          </h3>
          {dateRange && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {dateRange}
            </p>
          )}
          {trip.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
              {trip.description}
            </p>
          )}
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
            <span>{trip.cities.length} cities</span>
            <span>{totalPhotos} photos</span>
          </div>
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
