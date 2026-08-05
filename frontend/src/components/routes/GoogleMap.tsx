/**
 * @file GoogleMap.tsx
 * @description Mapa de Google Maps con checkpoints y polyline de ruta.
 * Reemplaza el antiguo LeafletMap.tsx.
 *
 * Funcionalidades:
 *  - Renderiza el mapa de Google Maps oficial
 *  - Marcadores numerados para cada checkpoint (AdvancedMarker)
 *  - InfoWindow al hacer clic en un marcador
 *  - Polyline conectando los checkpoints en orden
 *  - Clic en el mapa para agregar un nuevo checkpoint
 *  - Estadísticas de ruta (total checkpoints, distancia)
 */

import React, { useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { Checkpoint } from '../../services/mapService';
import { buildCheckpointPinHtml, fetchRouteGeometry } from '../../utils/mapUtils';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const MAP_ID = 'eef27e6e8ddc7ed979e80107';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface GoogleMapProps {
  checkpoints: Checkpoint[];
  selectedId: string | null;
  onSelectCheckpoint: (id: string | null) => void;
  onAddCheckpoint: (checkpoint: Omit<Checkpoint, 'id'>) => void;
}

// ─── Polyline interna ─────────────────────────────────────────────────────────

/**
 * Dibuja la polyline de ruta usando la Maps JavaScript API.
 * Debe vivir dentro de <Map> para acceder al contexto del mapa.
 */
const RoutePolyline: React.FC<{ path: google.maps.LatLngLiteral[] }> = ({ path }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  React.useEffect(() => {
    if (!map || !mapsLib || path.length < 2) return;

    const polyline = new mapsLib.Polyline({
      path,
      strokeColor: '#7a1dff',
      strokeWeight: 4,
      strokeOpacity: 0.85,
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, mapsLib, path]);

  return null;
};

// ─── Componente de eventos de mapa ────────────────────────────────────────────

/**
 * Captura el clic en el mapa y llama al handler del padre.
 */
const MapClickHandler: React.FC<{ onClick: (lat: number, lng: number) => void }> = ({
  onClick,
}) => {
  const map = useMap();

  React.useEffect(() => {
    if (!map) return;

    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onClick(e.latLng.lat(), e.latLng.lng());
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onClick]);

  return null;
};

// ─── Componente principal ─────────────────────────────────────────────────────

const GoogleMapInner: React.FC<GoogleMapProps> = ({
  checkpoints,
  selectedId,
  onSelectCheckpoint,
  onAddCheckpoint,
}) => {
  const [openInfoWindowId, setOpenInfoWindowId] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);

  React.useEffect(() => {
    const coords = checkpoints.map((cp) => ({ lat: cp.lat, lng: cp.lng }));
    fetchRouteGeometry(coords).then(setRoutePath);
  }, [checkpoints]);

  // Calcular distancia total (Haversine simplificado)
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

  const handleMapClick = (lat: number, lng: number) => {
    const defaultName = `Checkpoint ${checkpoints.length + 1}`;
    const name = defaultName;
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

  const handleMarkerClick = (id: string) => {
    const next = selectedId === id ? null : id;
    onSelectCheckpoint(next);
    setOpenInfoWindowId(next);
  };

  return (
    <div className="flex flex-col h-auto">
      <Map
        style={{ height: '300px', width: '100%' }}
        defaultCenter={{ lat: 16.9036, lng: -92.1033 }}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId={MAP_ID}
      >
        <RoutePolyline path={routePath} />
        <MapClickHandler onClick={handleMapClick} />

        {checkpoints.map((cp, idx) => (
          <React.Fragment key={cp.id}>
            <AdvancedMarker
              position={{ lat: cp.lat, lng: cp.lng }}
              onClick={() => handleMarkerClick(cp.id)}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: buildCheckpointPinHtml(idx + 1, '#7a1dff'),
                }}
              />
            </AdvancedMarker>

            {openInfoWindowId === cp.id && (
              <InfoWindow
                position={{ lat: cp.lat, lng: cp.lng }}
                onCloseClick={() => {
                  setOpenInfoWindowId(null);
                  onSelectCheckpoint(null);
                }}
              >
                <div style={{ padding: '4px 2px', lineHeight: '1.5' }}>
                  <strong>Checkpoint {idx + 1}</strong>
                  <div>Lat: {cp.lat.toFixed(5)}</div>
                  <div>Lng: {cp.lng.toFixed(5)}</div>
                  <div>Obligatorio: {cp.obligatorio ? '✅' : '❌'}</div>
                </div>
              </InfoWindow>
            )}
          </React.Fragment>
        ))}
      </Map>

      {/* Stats bar */}
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

/**
 * Componente público que envuelve el mapa con APIProvider.
 * Exportado como GoogleMap para reemplazar LeafletMap.
 */
export const GoogleMap: React.FC<GoogleMapProps> = (props) => (
  <APIProvider apiKey={API_KEY}>
    <GoogleMapInner {...props} />
  </APIProvider>
);
