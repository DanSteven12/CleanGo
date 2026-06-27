import L from 'leaflet';

const DEFAULT_ROUTE_COLOR = '#6F42C1';

export function createCheckpointIcon(number: number, color = DEFAULT_ROUTE_COLOR): L.DivIcon {
  return L.divIcon({
    html: `<div class="checkpoint-marker" style="background:${color}">${number}</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export function getRouteCoordinates(
  checkpoints: Array<{ latitude: number; longitude: number; route_order: number }>
): [number, number][] {
  return [...checkpoints]
    .sort((a, b) => a.route_order - b.route_order)
    .map((cp) => [cp.latitude, cp.longitude] as [number, number]);
}
