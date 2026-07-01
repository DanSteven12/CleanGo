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
    <div style="
      background: ${color};
      color: #fff;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      cursor: pointer;
    ">${number}</div>
  `;
}
