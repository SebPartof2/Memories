const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface MapboxStaticImageOptions {
  longitude: number;
  latitude: number;
  zoom?: number;
  width?: number;
  height?: number;
  style?: "streets-v12" | "outdoors-v12" | "light-v11" | "dark-v11" | "satellite-v9" | "satellite-streets-v12";
  retina?: boolean;
}

/**
 * Generate a Mapbox Static Images API URL for a city location
 */
export function getMapboxStaticImageUrl({
  longitude,
  latitude,
  zoom = 11,
  width = 400,
  height = 300,
  style = "streets-v12",
  retina = true,
}: MapboxStaticImageOptions): string | null {
  if (!MAPBOX_TOKEN) {
    return null;
  }

  const retinaFlag = retina ? "@2x" : "";

  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${longitude},${latitude},${zoom},0/${width}x${height}${retinaFlag}?access_token=${MAPBOX_TOKEN}`;
}

/**
 * Generate a Mapbox Static Images API URL with a marker
 */
export function getMapboxStaticImageWithMarkerUrl({
  longitude,
  latitude,
  zoom = 11,
  width = 400,
  height = 300,
  style = "streets-v12",
  retina = true,
}: MapboxStaticImageOptions): string | null {
  if (!MAPBOX_TOKEN) {
    return null;
  }

  const retinaFlag = retina ? "@2x" : "";
  const marker = `pin-s+ef4444(${longitude},${latitude})`;

  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${marker}/${longitude},${latitude},${zoom},0/${width}x${height}${retinaFlag}?access_token=${MAPBOX_TOKEN}`;
}
