/**
 * @file mapUtils.ts
 * @description Pure utility functions for Google Maps integration.
 * No external map library dependencies.
 */

const DEFAULT_ROUTE_COLOR = '#6F42C1';

/**
 * Returns a sorted list of {lat, lng} coordinates from a list of checkpoints,
 * ordered by route_order. Used to draw the Polyline on Google Maps.
 */
export function getRouteCoordinates(
  checkpoints: Array<{ latitude: number; longitude: number; route_order: number }>
): google.maps.LatLngLiteral[] {
  return [...checkpoints]
    .sort((a, b) => a.route_order - b.route_order)
    .map((cp) => ({ lat: cp.latitude, lng: cp.longitude }));
}

/**
 * Builds a teardrop-shaped SVG map pin — Google Maps style.
 *
 * Visual spec:
 *  - Teardrop body: white fill, 3px purple border
 *  - Central purple dot inside the circle part
 *  - Subtle drop-shadow beneath the pin
 *  - Pointer tip at the bottom center
 *
 * @param color  - Border and dot color (defaults to CleanGo purple)
 * @param size   - Scaling factor in px for pin width (height auto-proportional)
 */
export function buildTearDropPinHtml(
  color = '#7a1dff',
  size = 36
): string {
  const h = Math.round(size * 1.4);
  return `
    <svg
      width="${size}"
      height="${h}"
      viewBox="0 0 36 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style="display:block;overflow:visible;"
    >
      <defs>
        <filter id="pin-drop-shadow" x="-40%" y="-20%" width="180%" height="180%">
          <feDropShadow
            dx="0" dy="3"
            stdDeviation="2.5"
            flood-color="rgba(0,0,0,0.22)"
          />
        </filter>
      </defs>
      <!-- Teardrop body -->
      <path
        d="M18 2C10.268 2 4 8.268 4 16
           C4 26.5 18 48 18 48
           C18 48 32 26.5 32 16
           C32 8.268 25.732 2 18 2Z"
        fill="white"
        stroke="${color}"
        stroke-width="3"
        stroke-linejoin="round"
        filter="url(#pin-drop-shadow)"
      />
      <!-- Central dot -->
      <circle cx="18" cy="16" r="5" fill="${color}" />
    </svg>
  `;
}

/**
 * Builds an inline HTML string for a numbered checkpoint pin.
 * Used as the inner HTML of a Google Maps AdvancedMarkerElement.
 */
export function buildCheckpointPinHtml(number: number, color = DEFAULT_ROUTE_COLOR): string {
  return `
    <svg
      width="32"
      height="44"
      viewBox="0 0 36 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style="display:block;overflow:visible;cursor:pointer;transform: translateY(-50%);"
    >
      <defs>
        <filter id="pin-drop-shadow-${number}" x="-40%" y="-20%" width="180%" height="180%">
          <feDropShadow
            dx="0" dy="3"
            stdDeviation="2.5"
            flood-color="rgba(0,0,0,0.3)"
          />
        </filter>
      </defs>
      <!-- Teardrop body -->
      <path
        d="M18 2C10.268 2 4 8.268 4 16
           C4 26.5 18 48 18 48
           C18 48 32 26.5 32 16
           C32 8.268 25.732 2 18 2Z"
        fill="${color}"
        stroke="#ffffff"
        stroke-width="2.5"
        stroke-linejoin="round"
        filter="url(#pin-drop-shadow-${number})"
      />
      <!-- Checkpoint order number -->
      <text
        x="18"
        y="17"
        fill="#ffffff"
        font-size="13"
        font-weight="700"
        font-family="system-ui, -apple-system, sans-serif"
        text-anchor="middle"
        dominant-baseline="central"
      >${number}</text>
    </svg>
  `;
}

/**
 * Decodes a Google Maps encoded polyline string into an array of LatLng objects.
 * This avoids needing the google.maps.geometry library loaded.
 */
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const poly: { lat: number; lng: number }[] = [];
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

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return poly;
}

const geometryCache = new Map<string, { lat: number; lng: number }[]>();

/**
 * Fetches the real street geometry connecting checkpoints using the modern Routes API.
 * Uses in-memory caching to avoid redundant requests.
 * Falls back to straight lines (returning checkpoints) if the API fails.
 */
export async function fetchRouteGeometry(
  checkpoints: { lat: number; lng: number }[]
): Promise<{ lat: number; lng: number }[]> {
  if (checkpoints.length < 2) return checkpoints;

  // Generate cache key based on coordinates
  const key = checkpoints.map(c => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`).join('|');
  if (geometryCache.has(key)) {
    return geometryCache.get(key)!;
  }

  try {
    const origin = checkpoints[0];
    const destination = checkpoints[checkpoints.length - 1];
    const intermediates = checkpoints.slice(1, -1).map(cp => ({
      location: { latLng: { latitude: cp.lat, longitude: cp.lng } }
    }));

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline"
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        intermediates,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE"
      })
    });

    if (!response.ok) {
      console.warn('[Routes API] request failed, falling back to straight lines', await response.text());
      return checkpoints; // fallback
    }

    const data = await response.json();
    const encodedPolyline = data.routes?.[0]?.polyline?.encodedPolyline;
    
    if (!encodedPolyline) {
      console.warn('[Routes API] no polyline returned, falling back to straight lines');
      return checkpoints; // fallback
    }

    const decoded = decodePolyline(encodedPolyline);
    geometryCache.set(key, decoded);
    return decoded;
  } catch (err) {
    console.error('[Routes API] Network error, falling back to straight lines:', err);
    return checkpoints; // fallback
  }
}

/**
 * Calcula la distancia acumulada sobre una geometría para interpolación
 */
export function buildCumulativeDistances(path: {lat: number, lng: number}[]): number[] {
  const cumulative: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].lat - path[i - 1].lat;
    const dy = path[i].lng - path[i - 1].lng;
    cumulative.push(cumulative[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return cumulative;
}

/**
 * Devuelve la coordenada exacta (lat/lng) correspondiente a un porcentaje [0, 1] de avance
 */
export function interpolateOnPath(
  path: {lat: number, lng: number}[],
  cumulative: number[],
  progress: number
): {lat: number, lng: number} {
  if (path.length === 0) return { lat: 0, lng: 0 };
  if (path.length === 1) return path[0];

  const totalDist = cumulative[cumulative.length - 1];
  if (totalDist === 0) return path[0];

  const targetDist = Math.max(0, Math.min(progress, 1)) * totalDist;

  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= targetDist) lo = mid;
    else hi = mid;
  }

  const segLen = cumulative[hi] - cumulative[lo];
  if (segLen === 0) return path[lo];

  const t = (targetDist - cumulative[lo]) / segLen;
  return {
    lat: path[lo].lat + (path[hi].lat - path[lo].lat) * t,
    lng: path[lo].lng + (path[hi].lng - path[lo].lng) * t,
  };
}
