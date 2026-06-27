import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Checkpoint } from '../../services/mapService';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  checkpoints: Checkpoint[];
  selectedId: string | null;
  onSelectCheckpoint: (id: string | null) => void;
  onAddCheckpoint: (checkpoint: Omit<Checkpoint, 'id'>) => void;
}

// Capture clicks on the map and forward lat/lng to the parent
const MapEvents: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  checkpoints,
  selectedId,
  onSelectCheckpoint,
  onAddCheckpoint,
}) => {
  // Helper component to fix map size after initial render
  const ResizeHandler: React.FC = () => {
    const map = useMap();
    React.useEffect(() => {
      // Invalidate size after mounting and when container size may change
      const timer = setTimeout(() => map.invalidateSize(), 100);
      return () => clearTimeout(timer);
    }, [map]);
    return null;
  };
  // Configure default Leaflet icons (once)
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, []);

  // Build polyline coordinates
  const routePolyline = checkpoints.map((cp) => [cp.lat, cp.lng] as [number, number]);

  // Handle map click to add a new checkpoint
  const handleMapClick = (lat: number, lng: number) => {
    const defaultName = `Checkpoint ${checkpoints.length + 1}`;
    const name = window.prompt('Nombre del checkpoint:', defaultName) ?? defaultName;
    onAddCheckpoint({
      name,
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      lat,
      lng,
      status: 'pending',
      notes: `Lat: ${lat.toFixed(6)} / Lng: ${lng.toFixed(6)}`,
      obligatorio: true,
    });
  };

  // Simple Euclidean distance for demo purposes
  const totalDistance = (() => {
    if (checkpoints.length < 2) return '0.00';
    let dist = 0;
    for (let i = 0; i < checkpoints.length - 1; i++) {
      const a = checkpoints[i];
      const b = checkpoints[i + 1];
      const d = Math.hypot(a.lat - b.lat, a.lng - b.lng);
      dist += d;
    }
    return dist.toFixed(2);
  })();

  return (
    <div className="flex flex-col h-auto">
      <MapContainer
        style={{ height: '300px', width: '100%' }}
        center={[16.9036, -92.1033]}
        zoom={13}
        scrollWheelZoom
      >
        <ResizeHandler />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {routePolyline.length > 1 && (
          <Polyline positions={routePolyline} pathOptions={{ color: 'var(--color-primary)', weight: 4 }} />
        )}
        {checkpoints.map((cp, idx) => (
          <Marker
            key={cp.id}
            position={[cp.lat, cp.lng]}
            icon={L.divIcon({
              html: `<div class="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-bold">${idx + 1}</div>`,
              className: '',
              iconSize: [24, 24],
            })}
            eventHandlers={{
              click: () => onSelectCheckpoint(selectedId === cp.id ? null : cp.id),
            }}
          >
            <Popup>
              <div className="space-y-1">
                <strong>Checkpoint {idx + 1}</strong>
                <div>Lat: {cp.lat.toFixed(5)}</div>
                <div>Lng: {cp.lng.toFixed(5)}</div>
                <div>Obligatorio: {cp.obligatorio ? '✅' : '❌'}</div>
              </div>
            </Popup>
          </Marker>
        ))}
        <MapEvents onMapClick={handleMapClick} />
      </MapContainer>
      <div className="bg-card p-3 border-t border-border flex flex-col md:flex-row items-center justify-between text-sm mt-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12h2v2H9v-2zm0-8h2v6H9V4z" />
          </svg>
          <span className="font-medium">Total checkpoints:</span>
          <span>{checkpoints.length}</span>
        </div>
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <span className="font-medium">Distancia total:</span>
          <span>{totalDistance} (≈ km)</span>
        </div>
      </div>
    </div>
  );
};
