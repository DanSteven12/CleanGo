export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const poly: { latitude: number; longitude: number }[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return poly;
}

const geometryCache = new Map<string, { latitude: number; longitude: number }[]>();

export async function fetchRouteGeometry(
  checkpoints: { latitude: number; longitude: number }[]
): Promise<{ latitude: number; longitude: number }[]> {
  if (checkpoints.length < 2) return checkpoints;

  const key = checkpoints.map(c => `${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`).join('|');
  if (geometryCache.has(key)) {
    return geometryCache.get(key)!;
  }

  try {
    const origin = checkpoints[0];
    const destination = checkpoints[checkpoints.length - 1];
    const intermediates = checkpoints.slice(1, -1).map(cp => ({
      location: { latLng: { latitude: cp.latitude, longitude: cp.longitude } }
    }));

    const apiKey = process.env.EXPO_PUBLIC_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('API Key for Routes API not found, falling back to straight lines');
      return checkpoints;
    }

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline"
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
        destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
        intermediates,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE"
      })
    });

    if (!response.ok) {
      console.warn('[Routes API] request failed, falling back to straight lines');
      return checkpoints;
    }

    const data = await response.json();
    const encodedPolyline = data.routes?.[0]?.polyline?.encodedPolyline;
    
    if (!encodedPolyline) {
      return checkpoints;
    }

    const decoded = decodePolyline(encodedPolyline);
    geometryCache.set(key, decoded);
    return decoded;
  } catch (err) {
    console.warn('[Routes API] Network error, falling back to straight lines:', err);
    return checkpoints;
  }
}
