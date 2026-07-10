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
import { createPortal } from 'react-dom';
import { toast, Toaster } from 'sonner';
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

  // ── InfoWindow ─────────────────────────────────────────────────
  const [openInfoId, setOpenInfoId] = useState<number | null>(null);

  // ── Referencia al contenedor del mapa y estado fullscreen ────────────────────
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [fullscreenEl, setFullscreenEl] = useState<Element | null>(null);

  useEffect(() => {
    const onFsChange = () => {
      setFullscreenEl(document.fullscreenElement ?? null);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

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

  // ── Mostrar toasts cuando cambia el estado de validación ──────────────
  useEffect(() => {
    if (validationError && !isValidating) {
      toast.error(validationError, { id: 'validation-error' });
    }
  }, [validationError, isValidating]);

  useEffect(() => {
    if (resolvedAddress && !validationError && !isValidating) {
      toast.success(`📍 ${resolvedAddress}`, { id: 'resolved-address', duration: 2500 });
    }
  }, [resolvedAddress, validationError, isValidating]);

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

  // ── Botones flotantes (normal + fullscreen) ──────────────────────────
  const floatingBtnStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '1rem',
    right: '4rem',   // separado de los controles nativos de Maps (zoom)
    zIndex: 10,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 1rem',
    height: '2.5rem',
    borderRadius: '0.625rem',
    border: 'none',
    background: 'linear-gradient(135deg, oklch(0.52 0.14 250), oklch(0.42 0.05 170))',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 4px 18px oklch(0.52 0.14 250 / 0.40)',
    transition: 'filter 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease',
    opacity: (isValidating || Boolean(validationError)) ? 0.5 : 1,
    whiteSpace: 'nowrap',
  };

  const FloatingBtn = (
    <button
      id="btn-map-agregar-punto"
      type="button"
      onClick={handleAddCheckpoint}
      disabled={isValidating || Boolean(validationError)}
      title="Agregar punto al recorrido"
      style={floatingBtnStyle}
      onMouseEnter={e => {
        if (!isValidating && !validationError) {
          (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.filter = '';
        (e.currentTarget as HTMLButtonElement).style.transform = '';
      }}
    >
      📍 Agregar punto
    </button>
  );

  // ── Render ────────────────────────────────────────────────────────────────
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
          <label className="form-label" htmlFor="checkpoint-nombre">Nombre del punto</label>
          <input
            id="checkpoint-nombre"
            className="form-input"
            type="text"
            value={nombre}
            placeholder="Ej: Parque Central"
            onChange={(e) => setNombre(e.target.value)}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
            Ingresa un nombre fácil de identificar para este punto de control.
          </p>
        </div>

        {/* Orden */}
        <div className="form-field">
          <label className="form-label" htmlFor="checkpoint-orden">Orden</label>
          <input
            id="checkpoint-orden"
            className="form-input"
            type="number"
            min={1}
            value={orden}
            placeholder="Ej: 1"
            onChange={(e) => setOrden(Number(e.target.value))}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
            Indica el orden en que el camión deberá visitar este punto.
          </p>
        </div>

        {/* Mapa a ancho completo */}
        <div className="form-field map-field">
          <div className="map-container-relative" ref={mapContainerRef}>
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

            {/* Botón flotante — vista normal */}
            {!fullscreenEl && FloatingBtn}
          </div>
        </div>

        {/* Botón flotante y Toasts — vista fullscreen (portal al contenedor de Google Maps) */}
        {fullscreenEl && createPortal(
          <>
            <div style={{ position: 'fixed', bottom: '1.25rem', right: '4.5rem', zIndex: 9999 }}>
              {FloatingBtn}
            </div>
            {/* Se incluye un Toaster en el portal para que los toasts sean visibles en fullscreen */}
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={3000}
              toastOptions={{ style: { fontFamily: 'inherit', zIndex: 9999 } }}
            />
          </>,
          fullscreenEl
        )}

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
