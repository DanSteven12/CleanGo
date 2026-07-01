/**
 * @file MapSelector.tsx
 * @description Selector de punto de control sobre Google Maps con marcador arrastrable,
 * validación de calle urbana via Google Geocoding API, visualización de checkpoints
 * temporales en memoria y polyline de ruta.
 *
 * Los checkpoints ya NO se persisten inmediatamente; se acumulan en estado local
 * y se exponen al padre mediante el callback `onCheckpointsChange`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import '../../assets/styles/routes.css';
import { buildCheckpointPinHtml, buildTearDropPinHtml } from '../../utils/mapUtils';
import { googleGeocodingService } from '../../services/googleGeocodingService';
import type { CheckpointInput } from '../../types/routes';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const MAP_ID = 'eef27e6e8ddc7ed979e80107';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type { CheckpointInput };

// Tipo interno para mostrar en el mapa (sin id de BD)
interface TempCheckpoint extends CheckpointInput {
  _tempId: number;
}

interface MapSelectorProps {
  /** Color de la ruta que se está creando (para el pin y polyline). */
  routeColor: string;
  /** Callback que notifica al padre cada vez que cambia la lista de checkpoints temporales. */
  onCheckpointsChange: (checkpoints: CheckpointInput[]) => void;
}

// ─── Polyline de ruta ─────────────────────────────────────────────────────────

const RoutePolyline: React.FC<{
  path: google.maps.LatLngLiteral[];
  color: string;
}> = ({ path, color }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || path.length < 2) return;

    const polyline = new mapsLib.Polyline({
      path,
      strokeColor: color,
      strokeWeight: 5,
      strokeOpacity: 0.9,
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, mapsLib, path, color]);

  return null;
};

// ─── Contenido interno del mapa ───────────────────────────────────────────────

interface MapInnerProps {
  placementPos: google.maps.LatLngLiteral;
  onPlacementDragEnd: (lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  sortedCheckpoints: TempCheckpoint[];
  routeCoordinates: google.maps.LatLngLiteral[];
  routeColor: string;
  openInfoId: number | null;
  onOpenInfo: (id: number | null) => void;
}

const MapInner: React.FC<MapInnerProps> = ({
  placementPos,
  onPlacementDragEnd,
  onMapClick,
  sortedCheckpoints,
  routeCoordinates,
  routeColor,
  openInfoId,
  onOpenInfo,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onMapClick]);

  return (
    <>
      <RoutePolyline path={routeCoordinates} color={routeColor} />

      {/* Marcador de ubicación arrastrable */}
      <AdvancedMarker
        position={placementPos}
        draggable
        onDragEnd={(e) => {
          if (e.latLng) {
            onPlacementDragEnd(e.latLng.lat(), e.latLng.lng());
          }
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: buildTearDropPinHtml('#7a1dff', 36) }}
          title="Arrastra para seleccionar ubicación"
          style={{ cursor: 'grab', marginBottom: '-2px' }}
        />
      </AdvancedMarker>

      {/* Marcadores de checkpoints temporales */}
      {sortedCheckpoints.map((cp) => (
        <React.Fragment key={cp._tempId}>
          <AdvancedMarker
            position={{ lat: cp.latitude, lng: cp.longitude }}
            onClick={() => onOpenInfo(openInfoId === cp._tempId ? null : cp._tempId)}
          >
            <div
              dangerouslySetInnerHTML={{
                __html: buildCheckpointPinHtml(cp.route_order, routeColor),
              }}
            />
          </AdvancedMarker>

          {openInfoId === cp._tempId && (
            <InfoWindow
              position={{ lat: cp.latitude, lng: cp.longitude }}
              onCloseClick={() => onOpenInfo(null)}
            >
              <div style={{ padding: '2px', lineHeight: '1.6', fontSize: '13px' }}>
                <strong>Checkpoint {cp.route_order}</strong>
                {cp.name && <div>{cp.name}</div>}
                <div>Lat: {cp.latitude.toFixed(5)}</div>
                <div>Lng: {cp.longitude.toFixed(5)}</div>
              </div>
            </InfoWindow>
          )}
        </React.Fragment>
      ))}
    </>
  );
};

// ─── Componente principal (inner) ─────────────────────────────────────────────

const MapSelectorInner: React.FC<MapSelectorProps> = ({
  routeColor,
  onCheckpointsChange,
}) => {
  // ── Estado del formulario de punto de control ─────────────────────────
  const [nombre, setNombre] = useState('');
  const [orden, setOrden] = useState(1);

  // ── Checkpoints temporales (en memoria, aún no en BD) ─────────────────
  const [tempCheckpoints, setTempCheckpoints] = useState<TempCheckpoint[]>([]);
  const tempIdCounter = useRef(0);

  // ── Posición del marcador de colocación ───────────────────────────────
  const CENTER = { lat: 16.9036, lng: -92.1033 };
  const [placementPos, setPlacementPos] = useState<google.maps.LatLngLiteral>(CENTER);
  const [latitud, setLatitud] = useState(CENTER.lat);
  const [longitud, setLongitud] = useState(CENTER.lng);

  // ── Validación ────────────────────────────────────────────────────────
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const lastValidPosRef = useRef<google.maps.LatLngLiteral>(CENTER);

  // ── InfoWindow ────────────────────────────────────────────────────────
  const [openInfoId, setOpenInfoId] = useState<number | null>(null);

  // ── Geocoder ──────────────────────────────────────────────────────────
  const geocodingLib = useMapsLibrary('geocoding');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (geocodingLib && !geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
    }
  }, [geocodingLib]);

  // ── Derived ───────────────────────────────────────────────────────────
  const sortedCheckpoints = useMemo(
    () => [...tempCheckpoints].sort((a, b) => a.route_order - b.route_order),
    [tempCheckpoints]
  );

  const routeCoordinates = useMemo(
    () => sortedCheckpoints.map((cp) => ({ lat: cp.latitude, lng: cp.longitude })),
    [sortedCheckpoints]
  );

  // ── Notificar al padre cuando cambian los checkpoints ──────────────────
  useEffect(() => {
    onCheckpointsChange(
      sortedCheckpoints.map(({ latitude, longitude, route_order, name }) => ({
        latitude,
        longitude,
        route_order,
        name,
      }))
    );
  }, [sortedCheckpoints, onCheckpointsChange]);

  // ── Validación con Google Geocoding API ───────────────────────────────
  const validateAndApply = useCallback(async (lat: number, lng: number) => {
    if (!geocoderRef.current) return;

    setIsValidating(true);
    setValidationError(null);

    const result = await googleGeocodingService.validateUrbanStreet(
      geocoderRef.current,
      lat,
      lng
    );

    setIsValidating(false);

    if (result.isValid) {
      lastValidPosRef.current = { lat, lng };
      setPlacementPos({ lat, lng });
      setLatitud(parseFloat(lat.toFixed(8)));
      setLongitud(parseFloat(lng.toFixed(8)));
      setResolvedAddress(result.displayName);
      setValidationError(null);
    } else {
      setPlacementPos({ ...lastValidPosRef.current });
      setValidationError(result.errorMessage!);
      setResolvedAddress('');
    }
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => { void validateAndApply(lat, lng); },
    [validateAndApply]
  );

  const handlePlacementDragEnd = useCallback(
    (lat: number, lng: number) => { void validateAndApply(lat, lng); },
    [validateAndApply]
  );

  // ── Agregar checkpoint a la lista temporal ────────────────────────────
  const handleAddCheckpoint = () => {
    if (!latitud || !longitud || validationError || isValidating) return;

    const newCp: TempCheckpoint = {
      _tempId: ++tempIdCounter.current,
      latitude: latitud,
      longitude: longitud,
      route_order: orden,
      name: nombre.trim() || undefined,
    };

    setTempCheckpoints((prev) => [...prev, newCp]);
    setNombre('');
    setOrden((prev) => prev + 1);
  };

  const handleRemoveCheckpoint = (tempId: number) => {
    setTempCheckpoints((prev) => {
      const filtered = prev.filter((cp) => cp._tempId !== tempId);
      // Re-numerar órdenes
      return filtered.map((cp, i) => ({ ...cp, route_order: i + 1 }));
    });
    setOrden((prev) => Math.max(1, prev - 1));
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="map-selector-container">
      <h2 className="map-selector-title">Puntos de Control</h2>
      <p className="map-selector-hint">
        Haz clic en el mapa o arrastra el marcador para elegir la ubicación.
        Cada punto es validado automáticamente sobre calles urbanas.
        Los puntos se guardarán junto con la ruta al presionar <strong>Crear Ruta</strong>.
      </p>

      <div className="form-grid">
        {/* Nombre del punto */}
        <div className="form-field">
          <label className="form-label">Nombre del punto</label>
          <input
            className="form-input"
            type="text"
            value={nombre}
            placeholder={`Checkpoint ${orden}`}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        {/* Orden */}
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

        {/* Mapa a ancho completo */}
        <div className="form-field map-field">
          <div className="map-container-relative">
            <Map
              style={{ height: '380px', width: '100%', borderRadius: '0.5rem' }}
              defaultCenter={CENTER}
              defaultZoom={13}
              gestureHandling="greedy"
              mapId={MAP_ID}
            >
              <MapInner
                placementPos={placementPos}
                onPlacementDragEnd={handlePlacementDragEnd}
                onMapClick={handleMapClick}
                sortedCheckpoints={sortedCheckpoints}
                routeCoordinates={routeCoordinates}
                routeColor={routeColor}
                openInfoId={openInfoId}
                onOpenInfo={setOpenInfoId}
              />
            </Map>

            {isValidating && (
              <div className="map-validation-overlay">
                <div className="map-validation-spinner" />
                <span>Validando ubicación…</span>
              </div>
            )}
          </div>
        </div>

        {/* Banner error de validación */}
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

        {/* Banner éxito de validación */}
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

        {/* Coordenadas readonly */}
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

        {/* Botón para agregar punto a la lista */}
        <button
          type="button"
          className="save-button"
          onClick={handleAddCheckpoint}
          disabled={isValidating || Boolean(validationError)}
          style={{ alignSelf: 'flex-start' }}
        >
          <svg className="save-icon" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Agregar punto al recorrido
        </button>

        {/* Lista de checkpoints temporales */}
        {sortedCheckpoints.length > 0 && (
          <div className="checkpoint-list">
            <span className="form-label">
              Puntos añadidos ({sortedCheckpoints.length}) — se guardarán al crear la ruta
            </span>
            <ul>
              {sortedCheckpoints.map((cp) => (
                <li key={cp._tempId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="checkpoint-order-dot" style={{ background: routeColor }}>
                    {cp.route_order}
                  </span>
                  <span style={{ flex: 1 }}>
                    {cp.latitude.toFixed(6)}, {cp.longitude.toFixed(6)}
                    {cp.name ? ` (${cp.name})` : ''}
                  </span>
                  <button
                    type="button"
                    className="action-btn action-btn--delete"
                    title="Quitar punto"
                    onClick={() => handleRemoveCheckpoint(cp._tempId)}
                    style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Export público ───────────────────────────────────────────────────────────

export const MapSelector: React.FC<MapSelectorProps> = (props) => (
  <APIProvider apiKey={API_KEY} libraries={['geocoding']}>
    <MapSelectorInner {...props} />
  </APIProvider>
);
