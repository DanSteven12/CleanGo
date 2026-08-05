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
  MapControl,
  ControlPosition,
} from '@vis.gl/react-google-maps';
import '../../assets/styles/routes.css';
import { buildCheckpointPinHtml, buildTearDropPinHtml } from '../../utils/mapUtils';
import { googleGeocodingService } from '../../services/googleGeocodingService';
import type { CheckpointInput } from '../../types/routes';
import { useConfirm } from '../../hooks/useConfirm';

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
  /** Puntos de control iniciales (para modo edición). */
  initialCheckpoints?: CheckpointInput[];
  /** Modo de uso (creación o edición). */
  mode?: 'create' | 'edit';
}

// ─── Polyline de ruta ─────────────────────────────────────────────────────────

const fetchRoutesAPI = async (
  points: google.maps.LatLngLiteral[],
  apiKey: string
): Promise<google.maps.LatLngLiteral[]> => {
  if (points.length < 2) return [];

  const origin = {
    location: { latLng: { latitude: points[0].lat, longitude: points[0].lng } }
  };
  const destination = {
    location: { latLng: { latitude: points[points.length - 1].lat, longitude: points[points.length - 1].lng } }
  };
  const intermediates = points.slice(1, -1).map(p => ({
    location: { latLng: { latitude: p.lat, longitude: p.lng } }
  }));

  const requestBody = {
    origin,
    destination,
    intermediates,
    travelMode: "DRIVE",
  };

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.polyline.encodedPolyline"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const encodedPolyline = data.routes?.[0]?.polyline?.encodedPolyline;

  if (!encodedPolyline) {
    throw new Error("No route polyline returned by Routes API.");
  }

  const decoded = google.maps.geometry.encoding.decodePath(encodedPolyline);
  return decoded.map(p => ({ lat: p.lat(), lng: p.lng() }));
};

const RoutePolyline: React.FC<{
  path: google.maps.LatLngLiteral[];
  color: string;
}> = ({ path, color }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const geometryLib = useMapsLibrary('geometry');

  const [directionsPath, setDirectionsPath] = useState<google.maps.LatLngLiteral[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    if (!geometryLib || path.length < 2) {
      setDirectionsPath(null);
      setHasError(false);
      setIsLoading(false);
      return;
    }

    if (path.length > 27) {
      setHasError(true);
      setDirectionsPath(null);
      toast.error('Demasiados puntos para trazar en calles. Mostrando línea recta.');
      return;
    }

    setIsLoading(true);
    setHasError(false);

    fetchRoutesAPI(path, API_KEY)
      .then(routePath => {
        if (!active) return;
        setDirectionsPath(routePath);
        setHasError(false);
      })
      .catch(error => {
        if (!active) return;
        console.error("[Routes API] Fallo al trazar ruta:", error);
        setHasError(true);
        setDirectionsPath(null);
        toast.error('No se pudo calcular la ruta real. Mostrando línea recta.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [path, geometryLib]);

  useEffect(() => {
    if (!map || !mapsLib || path.length < 2) return;

    const renderPath = (directionsPath && !hasError) ? directionsPath : path;

    const polyline = new mapsLib.Polyline({
      path: renderPath,
      strokeColor: color,
      strokeWeight: 5,
      strokeOpacity: 0.9,
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, mapsLib, path, directionsPath, color, hasError]);

  return isLoading ? (
    <MapControl position={ControlPosition.TOP_CENTER}>
      <div style={{
        marginTop: '12px',
        background: 'rgba(255, 255, 255, 0.95)', padding: '6px 14px', borderRadius: '20px',
        fontSize: '13px', fontWeight: 600, color: 'var(--text-h, #1f2937)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div className="map-validation-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'var(--primary-color, #1763A6)', borderTopColor: 'transparent' }} />
        Trazando ruta...
      </div>
    </MapControl>
  ) : null;
};

// ─── Formulario de Edición de Checkpoint ─────────────────────────────────────

const EditCheckpointForm: React.FC<{
  checkpoint: TempCheckpoint;
  onSave: (name: string) => void;
  onDelete: () => void;
  onCancel: () => void;
  checkpoints: TempCheckpoint[];
}> = ({ checkpoint, onSave, onDelete, onCancel, checkpoints }) => {
  const [name, setName] = useState(checkpoint.name || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError("El nombre es obligatorio.");
    if (trimmed.length > 50) return setError("Máximo 50 caracteres.");

    // Check for duplicates (ignoring itself)
    const isDuplicate = checkpoints.some(
      cp => cp._tempId !== checkpoint._tempId && cp.name && cp.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) return setError("Ya existe un punto con este nombre.");

    onSave(trimmed);
  };

  return (
    <div style={{ padding: '8px', minWidth: '240px', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-h, #1f2937)' }}>
        Editar Punto {checkpoint.route_order}
      </h4>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>
          Nombre del punto *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          style={{ width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid var(--panel-border, #d1d5db)', borderRadius: '4px', background: 'var(--bg-app, #ffffff)', color: 'var(--text-h, #1f2937)', boxSizing: 'border-box' }}
          autoFocus
        />
      </div>
      {error && <div style={{ color: 'var(--danger-color, #ef4444)', fontSize: '12px', marginBottom: '10px', lineHeight: '1.4' }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <button onClick={onDelete} style={{ color: 'var(--danger-color, #ef4444)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '6px 4px', fontWeight: 500 }}>
          Eliminar
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{ padding: '6px 12px', fontSize: '13px', background: 'transparent', border: '1px solid var(--panel-border, #d1d5db)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-h, #1f2937)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--primary-color, #1763A6)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Contenido interno del mapa ───────────────────────────────────────────────

interface MapInnerProps {
  pendingPos: google.maps.LatLngLiteral | null;
  onPendingDragEnd: (lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number) => void;

  // Pending Form State
  pendingNombre: string;
  onPendingNombreChange: (val: string) => void;
  orden: number;
  isValidating: boolean;
  validationError: string | null;
  resolvedAddress: string | null;
  onCancelPending: () => void;
  onSavePending: () => void;

  sortedCheckpoints: TempCheckpoint[];
  routeCoordinates: google.maps.LatLngLiteral[];
  routeColor: string;
  openInfoId: number | null;
  onOpenInfo: (id: number | null) => void;
  onEditCheckpointName: (id: number, newName: string) => void;
  onRemoveCheckpoint: (id: number) => void;
}

const MapInner: React.FC<MapInnerProps> = ({
  pendingPos,
  onPendingDragEnd,
  onMapClick,
  pendingNombre,
  onPendingNombreChange,
  orden,
  isValidating,
  validationError,
  resolvedAddress,
  onCancelPending,
  onSavePending,
  sortedCheckpoints,
  routeCoordinates,
  routeColor,
  openInfoId,
  onOpenInfo,
  onEditCheckpointName,
  onRemoveCheckpoint,
}) => {
  const map = useMap();
  const confirm = useConfirm();

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
      <style>{`
        @keyframes markerEnter {
          0% { opacity: 0; transform: scale(0.7) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .marker-animated {
          animation: markerEnter 200ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          transform-origin: bottom center;
        }
      `}</style>
      <RoutePolyline path={routeCoordinates} color={routeColor} />

      {/* Marcador temporal y su Popover (InfoWindow) */}
      {pendingPos && (
        <>
          <AdvancedMarker
            position={pendingPos}
            draggable
            onDragEnd={(e) => {
              if (e.latLng) {
                onPendingDragEnd(e.latLng.lat(), e.latLng.lng());
              }
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: buildTearDropPinHtml('#f59e0b', 36) }}
              title="Ubicación seleccionada (arrastra para ajustar)"
              style={{ cursor: 'grab', marginBottom: '-2px', opacity: 0.95 }}
            />
          </AdvancedMarker>

          <InfoWindow
            position={pendingPos}
            onCloseClick={onCancelPending}
          >
            <div style={{ padding: '8px', minWidth: '240px', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-h, #1f2937)' }}>
                Nuevo Punto de Control
              </h4>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>
                  Dirección detectada
                </label>
                <div style={{ fontSize: '13px', color: 'var(--text-h, #1f2937)', background: 'var(--bg-app, #f9fafb)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--panel-border, #e5e7eb)' }}>
                  {isValidating ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted, #6b7280)' }}>
                      <div className="map-validation-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />
                      <span>Obteniendo dirección...</span>
                    </div>
                  ) : resolvedAddress ? (
                    <span>{resolvedAddress}</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted, #9ca3af)' }}>Dirección no disponible</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>
                  Nombre del punto *
                </label>
                <input
                  type="text"
                  value={pendingNombre}
                  onChange={(e) => onPendingNombreChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !validationError && !isValidating) onSavePending();
                  }}
                  placeholder="Ej: Parque Central"
                  maxLength={50}
                  autoFocus
                  disabled={isValidating}
                  style={{
                    width: '100%', padding: '6px 8px', fontSize: '13px',
                    border: '1px solid var(--panel-border, #d1d5db)', borderRadius: '4px',
                    background: 'var(--bg-app, #ffffff)', color: 'var(--text-h, #1f2937)', boxSizing: 'border-box',
                    opacity: isValidating ? 0.7 : 1
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>
                  Orden: (autocompletado)
                </label>
                <input
                  type="text"
                  value={orden}
                  readOnly
                  style={{
                    width: '100%', padding: '6px 8px', fontSize: '13px',
                    border: '1px solid var(--panel-border, #d1d5db)', borderRadius: '4px',
                    backgroundColor: 'var(--bg-card, #f3f4f6)', color: 'var(--text-muted, #6b7280)', boxSizing: 'border-box'
                  }}
                />
              </div>

              {validationError && !isValidating && (
                <div style={{ color: 'var(--danger-color, #ef4444)', fontSize: '12px', marginBottom: '10px', lineHeight: '1.4' }}>
                  {validationError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={onCancelPending}
                  style={{
                    padding: '6px 12px', fontSize: '13px', border: '1px solid var(--panel-border, #d1d5db)',
                    borderRadius: '4px', background: 'transparent', color: 'var(--text-h, #1f2937)', cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={onSavePending}
                  disabled={isValidating || !!validationError}
                  style={{
                    padding: '6px 12px', fontSize: '13px', border: 'none', borderRadius: '4px',
                    background: 'var(--primary-color, #1763A6)', color: '#fff',
                    cursor: (isValidating || !!validationError) ? 'not-allowed' : 'pointer',
                    opacity: (isValidating || !!validationError) ? 0.6 : 1, fontWeight: 500
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </InfoWindow>
        </>
      )}

      {/* Marcadores de checkpoints temporales */}
      {sortedCheckpoints.map((cp) => (
        <React.Fragment key={cp._tempId}>
          <AdvancedMarker
            position={{ lat: cp.latitude, lng: cp.longitude }}
            onClick={() => onOpenInfo(openInfoId === cp._tempId ? null : cp._tempId)}
          >
            <div
              className="marker-animated"
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
              <EditCheckpointForm
                checkpoint={cp}
                checkpoints={sortedCheckpoints}
                onSave={(newName) => {
                  onEditCheckpointName(cp._tempId, newName);
                  onOpenInfo(null);
                  toast.success('Punto actualizado correctamente.', { duration: 2500 });
                }}
                onDelete={async () => {
                  const accepted = await confirm({
                    title: 'Eliminar punto de control',
                    message: '¿Deseas eliminar este punto de control?',
                    variant: 'danger',
                    confirmText: 'Eliminar',
                    cancelText: 'Cancelar',
                  });
                  if (accepted) {
                    onRemoveCheckpoint(cp._tempId);
                    onOpenInfo(null);
                  }
                }}
                onCancel={() => onOpenInfo(null)}
              />
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
  initialCheckpoints,
  mode: _mode = 'create',
}) => {
  const confirm = useConfirm();
  const [orden, setOrden] = useState(1);
  const [tempCheckpoints, setTempCheckpoints] = useState<TempCheckpoint[]>([]);
  const tempIdCounter = useRef(0);

  // Inicialización (solo se ejecuta una vez al montar, o cuando initialCheckpoints cambia de vacío a lleno)
  useEffect(() => {
    if (initialCheckpoints && initialCheckpoints.length > 0 && tempCheckpoints.length === 0) {
      const initialized = initialCheckpoints.map((cp, idx) => ({
        ...cp,
        _tempId: idx + 1,
      }));
      setTempCheckpoints(initialized);
      setOrden(initialized.length + 1);
      tempIdCounter.current = initialized.length;
    }
  }, [initialCheckpoints]);

  // ── Estado del marcador pendiente y su formulario ───────────────────────
  const CENTER = { lat: 16.9036, lng: -92.1033 };
  const [pendingPos, setPendingPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [pendingNombre, setPendingNombre] = useState('');

  // ── Validación ────────────────────────────────────────────────────────
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

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
    setResolvedAddress(null);

    const result = await googleGeocodingService.validateUrbanStreet(
      geocoderRef.current,
      lat,
      lng
    );

    setIsValidating(false);

    if (result.isValid) {
      setResolvedAddress(result.displayName);
      setValidationError(null);
    } else {
      setValidationError(result.errorMessage!);
      setResolvedAddress(null);
    }
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setPendingPos({ lat, lng });
      setPendingNombre('');
      setValidationError(null);
      setResolvedAddress(null);
      void validateAndApply(lat, lng);
    },
    [validateAndApply]
  );

  const handlePendingDragEnd = useCallback(
    (lat: number, lng: number) => {
      setPendingPos({ lat, lng });
      setValidationError(null);
      setResolvedAddress(null);
      void validateAndApply(lat, lng);
    },
    [validateAndApply]
  );

  const handleCancelPending = useCallback(() => {
    setPendingPos(null);
    setPendingNombre('');
    setValidationError(null);
    setResolvedAddress(null);
  }, []);

  const handleSavePending = useCallback(() => {
    if (isValidating || validationError || !pendingPos) return;

    const name = pendingNombre.trim();
    if (!name) {
      toast.error('El nombre del punto es obligatorio.');
      return;
    }

    // Validate if it is just spaces (already handled by trim() above, but to be sure)
    if (name.length === 0) {
      toast.error('El nombre del punto no puede estar vacío.');
      return;
    }

    if (name.length > 50) {
      toast.error('El nombre no puede exceder los 50 caracteres.');
      return;
    }

    const isDuplicate = tempCheckpoints.some(
      cp => cp.name && cp.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      toast.error('Ya existe un punto de control con este nombre en la ruta.');
      return;
    }

    const newCp: TempCheckpoint = {
      _tempId: ++tempIdCounter.current,
      latitude: pendingPos.lat,
      longitude: pendingPos.lng,
      route_order: orden,
      name: name,
    };

    setTempCheckpoints((prev) => [...prev, newCp]);
    setOrden((prev) => prev + 1);

    toast.success('✓ Punto de control agregado correctamente.', { duration: 2500 });

    // Convertir a marcador definitivo (cerrar form y quitar temp)
    setPendingPos(null);
    setPendingNombre('');
    setValidationError(null);
    setResolvedAddress(null);

  }, [isValidating, validationError, pendingPos, pendingNombre, tempCheckpoints, orden]);

  const handleRemoveCheckpoint = useCallback((tempId: number) => {
    setTempCheckpoints((prev) => {
      const filtered = prev.filter((cp) => cp._tempId !== tempId);
      // Re-numerar órdenes secuencialmente
      return filtered
        .sort((a, b) => a.route_order - b.route_order)
        .map((cp, i) => ({ ...cp, route_order: i + 1 }));
    });
    setOrden((prev) => Math.max(1, prev - 1));
  }, []);

  const handleEditCheckpointName = useCallback((tempId: number, newName: string) => {
    setTempCheckpoints((prev) =>
      prev.map((cp) => (cp._tempId === tempId ? { ...cp, name: newName } : cp))
    );
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setTempCheckpoints(prev => {
      const sorted = [...prev].sort((a, b) => a.route_order - b.route_order);
      const tempOrder = sorted[index].route_order;
      sorted[index].route_order = sorted[index - 1].route_order;
      sorted[index - 1].route_order = tempOrder;
      return sorted;
    });
  }, []);

  const handleMoveDown = useCallback((index: number, maxIndex: number) => {
    if (index === maxIndex) return;
    setTempCheckpoints(prev => {
      const sorted = [...prev].sort((a, b) => a.route_order - b.route_order);
      const tempOrder = sorted[index].route_order;
      sorted[index].route_order = sorted[index + 1].route_order;
      sorted[index + 1].route_order = tempOrder;
      return sorted;
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="map-selector-container">
      <h2 className="map-selector-title">Puntos de Control</h2>
      <p className="map-selector-hint">
        Haz clic en el mapa para elegir la ubicación. Se validará automáticamente sobre calles urbanas.
      </p>

      <div className="form-grid">
        {/* Mapa a ancho completo */}
        <div className="form-field map-field" style={{ gridColumn: '1 / -1' }}>
          <div className="map-container-relative" ref={mapContainerRef}>
            <Map
              style={{ height: '380px', width: '100%', borderRadius: '0.5rem' }}
              defaultCenter={CENTER}
              defaultZoom={13}
              gestureHandling="greedy"
              mapId={MAP_ID}
            >
              <MapInner
                pendingPos={pendingPos}
                onPendingDragEnd={handlePendingDragEnd}
                onMapClick={handleMapClick}
                pendingNombre={pendingNombre}
                onPendingNombreChange={setPendingNombre}
                orden={orden}
                isValidating={isValidating}
                validationError={validationError}
                resolvedAddress={resolvedAddress}
                onCancelPending={handleCancelPending}
                onSavePending={handleSavePending}
                sortedCheckpoints={sortedCheckpoints}
                routeCoordinates={routeCoordinates}
                routeColor={routeColor}
                openInfoId={openInfoId}
                onOpenInfo={setOpenInfoId}
                onEditCheckpointName={handleEditCheckpointName}
                onRemoveCheckpoint={handleRemoveCheckpoint}
              />
            </Map>

            {/* Toaster en fullscreen mode */}
            {fullscreenEl && createPortal(
              <Toaster
                position="top-right"
                richColors
                closeButton
                duration={3000}
                toastOptions={{ style: { fontFamily: 'inherit', zIndex: 9999 } }}
              />,
              fullscreenEl
            )}
          </div>
        </div>

        {/* Lista de checkpoints temporales */}
        {sortedCheckpoints.length > 0 && (
          <div className="checkpoint-list" style={{ gridColumn: '1 / -1' }}>
            <span className="form-label">
              Puntos añadidos ({sortedCheckpoints.length}) — se guardarán al crear la ruta
            </span>
            <ul>
              {sortedCheckpoints.map((cp, i) => (
                <li key={cp._tempId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-app, #f9fafb)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--panel-border, #e5e7eb)', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px' }}>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => handleMoveUp(i)}
                      style={{ fontSize: '10px', cursor: i === 0 ? 'not-allowed' : 'pointer', background: 'transparent', border: 'none', opacity: i === 0 ? 0.3 : 1, padding: 0 }}
                      title="Mover arriba"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={i === sortedCheckpoints.length - 1}
                      onClick={() => handleMoveDown(i, sortedCheckpoints.length - 1)}
                      style={{ fontSize: '10px', cursor: i === sortedCheckpoints.length - 1 ? 'not-allowed' : 'pointer', background: 'transparent', border: 'none', opacity: i === sortedCheckpoints.length - 1 ? 0.3 : 1, padding: 0 }}
                      title="Mover abajo"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="checkpoint-order-dot" style={{ background: routeColor }}>
                    {cp.route_order}
                  </span>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-h, #1f2937)' }}>
                    <strong>{cp.name ? cp.name : `Lat: ${cp.latitude.toFixed(5)}, Lng: ${cp.longitude.toFixed(5)}`}</strong>
                    {cp.name && <div style={{ fontSize: '11px', color: 'var(--text-muted, #6b7280)' }}>{cp.latitude.toFixed(5)}, {cp.longitude.toFixed(5)}</div>}
                  </span>
                  <button
                    type="button"
                    className="action-btn action-btn--delete"
                    title="Eliminar punto"
                    onClick={async () => {
                      const accepted = await confirm({
                        title: 'Eliminar punto de control',
                        message: '¿Deseas eliminar este punto de control?',
                        variant: 'danger',
                        confirmText: 'Eliminar',
                        cancelText: 'Cancelar',
                      });
                      if (accepted) {
                        handleRemoveCheckpoint(cp._tempId);
                      }
                    }}
                    style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', color: 'var(--danger-color, #ef4444)' }}
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
  <APIProvider apiKey={API_KEY} libraries={['geocoding', 'geometry']}>
    <MapSelectorInner {...props} />
  </APIProvider>
);
