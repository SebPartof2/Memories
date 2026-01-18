import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api";

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [longitude, latitude]
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

interface MapboxResponse {
  features: MapboxFeature[];
}

// GET /api/geocode?q=search_query - Search for places using Mapbox
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  if (!MAPBOX_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Mapbox is not configured" },
      { status: 500 }
    );
  }

  try {
    // Use Mapbox Geocoding API to search for places
    // Filter to only return places (cities, towns, etc.)
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
    );
    url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
    url.searchParams.set("types", "place,locality,neighborhood");
    url.searchParams.set("limit", "5");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("Mapbox API request failed");
    }

    const data: MapboxResponse = await response.json();

    // Transform the response to a simpler format
    const results = data.features.map((feature) => {
      // Extract country from context
      const countryContext = feature.context?.find((c) =>
        c.id.startsWith("country.")
      );

      return {
        id: feature.id,
        name: feature.text,
        fullName: feature.place_name,
        country: countryContext?.text || null,
        countryCode: countryContext?.short_code?.toUpperCase() || null,
        longitude: feature.center[0],
        latitude: feature.center[1],
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { error: "Failed to search for places" },
      { status: 500 }
    );
  }
}
