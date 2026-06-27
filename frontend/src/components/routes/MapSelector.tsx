import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../assets/styles/routes.css';
import { createCheckpointIcon, getRouteCoordinates } from '../../utils/leafletIcons';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

interface RouteOption {
  id: number;
  nombre: string;
  color: string;
}

interface ApiCheckpoint {
  id: number;
  route_id: number;
  latitude: number;
  longitude: number;
  route_order: number;
  name?: string | null;
}

interface MapSelectorProps {
  routes: RouteOption[];
  onSaved?: () => void;
}

export const MapSelector: React.FC<MapSelectorProps> = ({ routes, onSaved }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const placementMarkerRef = useRef<L.Marker | null>(null);
  const checkpointLayerRef = useRef<L.LayerGroup | null>(null);

  const [rutaId, setRutaId] = useState<number>(routes?.[0]?.id || 0);
  const [nombre, setNombre] = useState('');
  const [latitud, setLatitud] = useState(0);
  const [longitud, setLongitud] = useState(0);
  const [orden, setOrden] = useState(1);
  const [checkpoints, setCheckpoints] = useState<ApiCheckpoint[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'saved'>('idle');

  // ── Estado de validación Nominatim ──────────────────────────────────────────
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const lastValidLatLngRef = useRef<L.LatLng | null>(null);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === rutaId),
    [routes, rutaId]
  );

  const routeColor = selectedRoute?.color || '#6F42C1';

  const sortedCheckpoints = useMemo(
    () => [...checkpoints].sort((a, b) => a.route_order - b.route_order),
    [checkpoints]
  );

  const routeCoordinates = useMemo(
    () => getRouteCoordinates(sortedCheckpoints),
    [sortedCheckpoints]
  );

  const updateCoords = useCallback((lat: number, lng: number) => {
    setLatitud(parseFloat(lat.toFixed(8)));
    setLongitud(parseFloat(lng.toFixed(8)));
    placementMarkerRef.current?.setLatLng([lat, lng]);
  }, []);

  const fetchCheckpoints = useCallback(async (routeId: number) => {
    if (!routeId) {
      setCheckpoints([]);
      return;
    }
    try {
      const res = await fetch(`/api/routes/${routeId}/checkpoints`);
      if (!res.ok) throw new Error('Failed to fetch checkpoints');
      const data: ApiCheckpoint[] = await res.json();
      setCheckpoints(data);
      setOrden(data.length + 1);
    } catch (e) {
      console.error(e);
      setCheckpoints([]);
    }
  }, []);

  useEffect(() => {
    if (routes.length > 0 && rutaId === 0) {
      setRutaId(routes[0].id);
    }
  }, [routes, rutaId]);

  useEffect(() => {
    if (rutaId) {
      fetchCheckpoints(rutaId);
    }
  }, [rutaId, fetchCheckpoints]);

  // ── Lógica de validación Nominatim ──────────────────────────────────────────

  const buildNominatimUrl = (lat: number, lng: number): string =>
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

  const URBAN_STREET_KEYS = ['road', 'pedestrian', 'path', 'footway', 'cycleway', 'residential'] as const;
  const URBAN_CONTEXT_KEYS = ['suburb', 'neighbourhood', 'quarter', 'city_block'] as const;

  const FORBIDDEN_TYPES = new Set([
    'motorway', 'motorway_link', 'trunk', 'trunk_link',
    'water', 'bay', 'sea', 'ocean', 'coastline',
    'wetland', 'farmland', 'farmyard', 'forest', 'wood',
    'scrub', 'heath', 'grassland', 'bare_rock', 'sand', 'beach',
  ]);

  const INVALID_MSG =
    'Ubicación inválida. Por favor, marque el punto de control estrictamente sobre ' +
    'una calle o vía urbana transitable (evite carreteras abiertas o áreas no urbanizadas).';

  const isUrbanStreet = (data: Record<string, any>): boolean => {
    const address: Record<string, string> = data.address ?? {};
    const type: string = data.type ?? '';
    const osmClass: string = data.class ?? '';

    if (FORBIDDEN_TYPES.has(type) || FORBIDDEN_TYPES.has(osmClass)) return false;
    if (URBAN_STREET_KEYS.some((k) => Boolean(address[k]))) return true;
    return URBAN_CONTEXT_KEYS.some((k) => Boolean(address[k]));
  };

  const validateAndApply = useCallback(
    async (lat: number, lng: number, markerToRevert?: L.Marker) => {
      setIsValidating(true);
      setValidationError(null);

      try {
        const response = await fetch(buildNominatimUrl(lat, lng), {
          headers: {
            'User-Agent': 'CleanGo-Admin/1.0 (contacto@cleango.mx)',
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          console.error(`[Nominatim] HTTP ${response.status}`);
          setValidationError(INVALID_MSG);
          if (markerToRevert && lastValidLatLngRef.current) {
            markerToRevert.setLatLng(lastValidLatLngRef.current);
          }
          return;
        }

        const data = await response.json();

        if (data.error) {
          setValidationError(INVALID_MSG);
          if (markerToRevert && lastValidLatLngRef.current) {
            markerToRevert.setLatLng(lastValidLatLngRef.current);
          }
          return;
        }

        if (!isUrbanStreet(data)) {
          setValidationError(INVALID_MSG);
          if (markerToRevert && lastValidLatLngRef.current) {
            markerToRevert.setLatLng(lastValidLatLngRef.current);
          }
        } else {
          lastValidLatLngRef.current = L.latLng(lat, lng);
          setResolvedAddress(data.display_name ?? '');
          setValidationError(null);
          updateCoords(lat, lng);
        }
      } catch (err) {
        console.error('[Nominatim] Error de red:', err);
        setValidationError(INVALID_MSG);
        if (markerToRevert && lastValidLatLngRef.current) {
          markerToRevert.setLatLng(lastValidLatLngRef.current);
        }
      } finally {
        setIsValidating(false);
      }
    },
    [updateCoords]
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });

    const initMap = L.map(mapRef.current).setView([16.9036, -92.1033], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(initMap);

    const checkpointLayer = L.layerGroup().addTo(initMap);
    checkpointLayerRef.current = checkpointLayer;

    const placementMarker = L.marker(initMap.getCenter(), { draggable: true }).addTo(initMap);
    placementMarkerRef.current = placementMarker;

    const initialLatLng = initMap.getCenter();
    lastValidLatLngRef.current = initialLatLng;

    placementMarker.on('dragstart', () => {
      lastValidLatLngRef.current = placementMarker.getLatLng();
    });

    placementMarker.on('dragend', () => {
      const { lat, lng } = placementMarker.getLatLng();
      void validateAndApply(lat, lng, placementMarker);
    });

    initMap.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      void validateAndApply(lat, lng);
    });

    const { lat, lng } = placementMarker.getLatLng();
    setLatitud(parseFloat(lat.toFixed(8)));
    setLongitud(parseFloat(lng.toFixed(8)));

    mapInstanceRef.current = initMap;

    return () => {
      initMap.remove();
      mapInstanceRef.current = null;
      placementMarkerRef.current = null;
      checkpointLayerRef.current = null;
    };
  }, [validateAndApply]);

  useEffect(() => {
    const layer = checkpointLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    sortedCheckpoints.forEach((cp) => {
      L.marker([cp.latitude, cp.longitude], {
        icon: createCheckpointIcon(cp.route_order, routeColor),
      })
        .bindPopup(`Checkpoint ${cp.route_order}${cp.name ? `<br>${cp.name}` : ''}`)
        .addTo(layer);
    });

    if (routeCoordinates.length > 1) {
      L.polyline(routeCoordinates, { color: routeColor, weight: 5 }).addTo(layer);
    }
  }, [sortedCheckpoints, routeCoordinates, routeColor]);

  const handleSave = async () => {
    if (!rutaId || !latitud || !longitud) return;
    setStatus('saving');
    try {
      const res = await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: rutaId,
          latitude: latitud,
          longitude: longitud,
          route_order: orden,
          name: nombre.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Network response was not ok');
      setStatus('saved');
      setNombre('');
      await fetchCheckpoints(rutaId);
      onSaved?.();
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div className="map-selector-container">
      <h2 className="map-selector-title">Agregar Punto de Control</h2>
      <p className="map-selector-hint">
        Haz clic en el mapa o arrastra el marcador para elegir la ubicación.
        Cada punto es validado automáticamente sobre calles urbanas.
      </p>

      {selectedRoute && (
        <div className="route-color-badge" style={{ borderColor: routeColor }}>
          <span className="route-color-dot" style={{ background: routeColor }} />
          {selectedRoute.nombre}
        </div>
      )}

      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Ruta</label>
          <select
            className="form-select"
            value={rutaId}
            onChange={(e) => setRutaId(Number(e.target.value))}
          >
            {routes.length === 0 && <option value={0}>Sin rutas — crea una primero</option>}
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Nombre</label>
          <input
            className="form-input"
            type="text"
            value={nombre}
            placeholder={`Checkpoint ${orden}`}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Orden</label>
          <input
            className="form-input"
            type="number"
            min={1}
            value={orden}
            onChange={(e) => setOrden(Number(e.target.value))}
          />
        </div>

        <div className="form-field map-field" style={{ position: 'relative' }}>
          <div ref={mapRef} className="map-container" />

          {isValidating && (
            <div className="map-validation-overlay">
              <div className="map-validation-spinner" />
              <span>Validando ubicación…</span>
            </div>
          )}
        </div>

        {validationError && !isValidating && (
          <div className="validation-error-banner" role="alert">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{validationError}</span>
          </div>
        )}

        {resolvedAddress && !validationError && !isValidating && (
          <div className="validation-success-banner">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M16.704 5.292a1 1 0 010 1.416l-8.5 8.5a1 1 0 01-1.416 0l-4-4a1 1 0 111.416-1.416L8 12.084l7.788-7.788a1 1 0 011.416 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="resolved-address">{resolvedAddress}</span>
          </div>
        )}

        <div className="form-actions">
          <div className="form-field">
            <label className="form-label">Latitud</label>
            <input readOnly className="readonly-input" type="text" value={latitud} />
          </div>
          <div className="form-field">
            <label className="form-label">Longitud</label>
            <input readOnly className="readonly-input" type="text" value={longitud} />
          </div>
        </div>

        {sortedCheckpoints.length > 0 && (
          <div className="checkpoint-list">
            <span className="form-label">
              Checkpoints guardados ({sortedCheckpoints.length})
            </span>
            <ul>
              {sortedCheckpoints.map((cp) => (
                <li key={cp.id}>
                  <span className="checkpoint-order-dot" style={{ background: routeColor }}>
                    {cp.route_order}
                  </span>
                  {cp.latitude.toFixed(6)}, {cp.longitude.toFixed(6)}
                  {cp.name ? ` (${cp.name})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          className="save-button"
          onClick={handleSave}
          disabled={status === 'saving' || !rutaId || isValidating || Boolean(validationError)}
        >
          <svg className="save-icon" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
            <path
              fillRule="evenodd"
              d="M16.704 5.292a1 1 0 010 1.416l-8.5 8.5a1 1 0 01-1.416 0l-4-4a1 1 0 111.416-1.416L8 12.084l7.788-7.788a1 1 0 011.416 0z"
              clipRule="evenodd"
            />
          </svg>
          Guardar
        </button>

        {status === 'error' && <span className="status-error">Error al guardar.</span>}
        {status === 'saved' && <span className="status-success">Guardado exitoso.</span>}
      </div>
    </div>
  );
};
