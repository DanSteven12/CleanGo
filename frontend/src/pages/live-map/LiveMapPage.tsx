import React, { useCallback, useEffect, useState, useRef } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Satellite, Truck, MapPin, Timer, User, TrendingUp } from 'lucide-react';
import type { AsignacionRecord } from '../../types/routes';

import '../../assets/styles/routes.css';
import '../../assets/styles/assignments.css';
import { Header } from '../../components/layout/Header';
import { PageSectionHeader } from '../../components/layout/PageSectionHeader';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const ETA_MINUTES_PER_SEGMENT = 5; // 5 minutos simulados por segmento

interface LiveStats {
  ultimoCheckpoint: string;
  proximoCheckpoint: string;
  completados: number;
  pendientes: number;
  porcentajeAvance: number;
  etaSegundos: number;
  horaEstimada: string;
  estadoDinamico: 'Pendiente' | 'En Progreso' | 'Retrasado' | 'Completado';
}

import { getSocket } from '../../services/socketService';

// ─── Map Simulation Component ────────────────────────────────────────────────
interface LiveMapSimulationProps {
  checkpoints: any[];
  color?: string;
  recorridoId: number;
  onStatsUpdate: (recorridoId: number, stats: LiveStats) => void;
}

const LiveMapSimulation: React.FC<LiveMapSimulationProps> = React.memo(({ checkpoints, color, recorridoId, onStatsUpdate }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  const camionMarkerRef = useRef<any>(null);
  const progressPolylineRef = useRef<{ traveled: any; remaining: any } | null>(null);

  const onStatsUpdateRef = useRef(onStatsUpdate);
  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate;
  }, [onStatsUpdate]);

  // Effect para dibujar el mapa estático y los checkpoints (solo 1 vez)
  useEffect(() => {
    if (!map || !mapsLib || checkpoints.length === 0) return;

    const googleMaps = (window as any).google.maps;
    const bounds = new googleMaps.LatLngBounds();
    const path: any[] = [];
    const markers: any[] = [];

    checkpoints.forEach((cp: any) => {
      const lat = Number(cp.latitud);
      const lng = Number(cp.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const latLng = { lat, lng };
      bounds.extend(latLng);
      path.push(latLng);

      const marker = new googleMaps.Marker({
        position: latLng,
        map,
        title: cp.nombre || `Checkpoint ${cp.orden}`
      });
      markers.push(marker);
    });

    const routeColor = color || '#6366f1';
    const completedCount = checkpoints.filter((cp: any) => cp.estado === 'Completado').length;
    const traveledPath = completedCount > 0 ? path.slice(0, completedCount) : path.slice(0, 1);
    const remainingPath = completedCount > 0 ? path.slice(completedCount - 1) : path;

    const polylineTraveled = new googleMaps.Polyline({
      path: traveledPath,
      geodesic: true,
      strokeColor: routeColor,
      strokeOpacity: 1.0,
      strokeWeight: 5,
      zIndex: 2,
      map
    });

    const polylineRemaining = new googleMaps.Polyline({
      path: remainingPath,
      geodesic: true,
      strokeColor: routeColor,
      strokeOpacity: 0.3,
      strokeWeight: 4,
      zIndex: 1,
      map
    });

    progressPolylineRef.current = { traveled: polylineTraveled, remaining: polylineRemaining };

    if (path.length > 0) {
      map.fitBounds(bounds);
    }

    const lastCompletedCp = completedCount > 0 ? checkpoints[completedCount - 1] : checkpoints[0];
    const initLat = Number(lastCompletedCp?.latitud);
    const initLng = Number(lastCompletedCp?.longitud);
    const initialPos = (!isNaN(initLat) && !isNaN(initLng)) ? { lat: initLat, lng: initLng } : undefined;

    if (!camionMarkerRef.current) {
      camionMarkerRef.current = new googleMaps.Marker({
        position: initialPos,
        map,
        title: 'Camión',
        icon: {
          url: 'https://maps.google.com/mapfiles/kml/shapes/truck.png',
          scaledSize: new googleMaps.Size(32, 32)
        },
        zIndex: 999
      });
    } else if (initialPos) {
      camionMarkerRef.current.setPosition(initialPos);
    }

    return () => {
      if (progressPolylineRef.current) {
        progressPolylineRef.current.traveled.setMap(null);
        progressPolylineRef.current.remaining.setMap(null);
        progressPolylineRef.current = null;
      }
      markers.forEach((m: any) => m.setMap(null));

      if (camionMarkerRef.current) {
        camionMarkerRef.current.setMap(null);
        camionMarkerRef.current = null;
      }
    };
  }, [map, mapsLib, checkpoints, color]);

  // Effect para manejar la conexión WebSocket en tiempo real
  useEffect(() => {
    if (!map || !mapsLib || checkpoints.length === 0) return;

    const socket = getSocket();
    const path = checkpoints.map(cp => ({ lat: Number(cp.latitud), lng: Number(cp.longitud) }));

    // Conectar a la sala específica del recorrido
    socket.emit('unirse_a_recorrido', recorridoId);

    const handleUbicacion = (data: any) => {
      if (data.recorridoId !== recorridoId) return;

      const currentPos = { lat: Number(data.latitud), lng: Number(data.longitud) };

      if (camionMarkerRef.current) {
        camionMarkerRef.current.setPosition(currentPos);
      }

      if (progressPolylineRef.current) {
        const traveledPath = path.slice(0, data.completados + 1).concat(currentPos);
        const remainingPath = [currentPos].concat(path.slice(data.completados + 1));
        progressPolylineRef.current.traveled.setPath(traveledPath);
        progressPolylineRef.current.remaining.setPath(remainingPath);
      }

      onStatsUpdateRef.current(recorridoId, data);
    };

    const handleFinalizado = (data: any) => {
      if (data.recorridoId !== recorridoId) return;
      if (path.length > 0 && camionMarkerRef.current) {
        const lastPos = path[path.length - 1];
        camionMarkerRef.current.setPosition(lastPos);
        if (progressPolylineRef.current) {
          progressPolylineRef.current.traveled.setPath(path);
          progressPolylineRef.current.remaining.setPath([lastPos]);
        }
      }
      onStatsUpdateRef.current(recorridoId, data);
    };

    socket.on('ubicacion_actualizada', handleUbicacion);
    socket.on('recorrido_finalizado', handleFinalizado);

    return () => {
      socket.emit('salir_de_recorrido', recorridoId);
      socket.off('ubicacion_actualizada', handleUbicacion);
      socket.off('recorrido_finalizado', handleFinalizado);
    };
  }, [map, mapsLib, recorridoId, checkpoints]);

  return null;
});

// ─── Main Component ────────────────────────────────────────────────────────
export const LiveMapPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeRecorridos, setActiveRecorridos] = useState<any[]>([]);
  const [activeAsignaciones, setActiveAsignaciones] = useState<Record<number, AsignacionRecord>>({});
  const [statsMap, setStatsMap] = useState<Record<number, LiveStats>>({});
  const recorridosCompletadosRef = useRef<Set<number>>(new Set());
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const fetchActiveRoutes = useCallback(async () => {
    try {
      const res = await fetch('/api/asignaciones');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AsignacionRecord[] = await res.json();

      const activeAsigs = data.filter(a => a.estatus_recorrido === 'En Progreso');

      const loadedRecorridos: any[] = [];
      const asigMap: Record<number, AsignacionRecord> = {};
      const newStatsMap: Record<number, LiveStats> = {};
      const now = Date.now();

      await Promise.all(activeAsigs.map(async (asig) => {
        try {
          const recRes = await fetch(`/api/recorridos/activo/${asig.id}`);
          if (recRes.ok) {
            const recData = await recRes.json();
            const recorridoId = recData.recorrido_id;
            loadedRecorridos.push(recData);
            asigMap[recorridoId] = asig;

            const completadosCount = recData.checkpoints?.filter((c: any) => c.estado === 'Completado').length || (recData.checkpoints?.length > 0 ? 1 : 0);
            const totalCps = recData.checkpoints?.length || 1;
            const pendientesCount = Math.max(0, totalCps - completadosCount);
            const totalSegmentos = Math.max(0, totalCps - 1);
            const etaInicialMs = pendientesCount * ETA_MINUTES_PER_SEGMENT * 60 * 1000;
            const etaInicialSecs = Math.floor(etaInicialMs / 1000);
            const horaLlegadaInicial = new Date(now + etaInicialMs).toLocaleTimeString();

            newStatsMap[recorridoId] = {
              ultimoCheckpoint: recData.checkpoints?.[0]?.nombre || 'Base / Salida',
              proximoCheckpoint: recData.checkpoints?.[1]?.nombre || 'Iniciando...',
              completados: completadosCount,
              pendientes: pendientesCount,
              porcentajeAvance: totalSegmentos > 0 ? Math.min(Math.round(((completadosCount - (totalCps > 0 ? 1 : 0)) / totalSegmentos) * 100), 100) : 0,
              etaSegundos: etaInicialSecs,
              horaEstimada: horaLlegadaInicial,
              estadoDinamico: 'En Progreso'
            };
          }
        } catch (err) {
          console.error(`Error loading active route for asignacion ${asig.id}:`, err);
        }
      }));

      setActiveRecorridos(loadedRecorridos);
      setActiveAsignaciones(asigMap);
      setStatsMap(prev => {
        const merged: Record<number, LiveStats> = { ...prev };
        for (const [id, st] of Object.entries(newStatsMap)) {
          const numId = Number(id);
          if (!merged[numId] || merged[numId].estadoDinamico === 'Completado') {
            merged[numId] = st;
          }
        }
        return merged;
      });
    } catch (e) {
      console.error('[LiveMapPage] fetchActiveRoutes:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveRoutes();
  }, [fetchActiveRoutes]);

  useEffect(() => {
    const socket = getSocket();

    const handleNuevoRecorrido = () => {
      fetchActiveRoutes();
    };

    const handleRecorridoFinalizadoGlobal = () => {
      fetchActiveRoutes();
    };

    const handleCheckpointGlobal = () => {
      fetchActiveRoutes();
    };

    socket.on('nuevo_recorrido_iniciado', handleNuevoRecorrido);
    socket.on('recorrido_finalizado', handleRecorridoFinalizadoGlobal);
    socket.on('checkpoint_actualizado', handleCheckpointGlobal);
    socket.on('checkpoint_alcanzado', handleCheckpointGlobal);

    return () => {
      socket.off('nuevo_recorrido_iniciado', handleNuevoRecorrido);
      socket.off('recorrido_finalizado', handleRecorridoFinalizadoGlobal);
      socket.off('checkpoint_actualizado', handleCheckpointGlobal);
      socket.off('checkpoint_alcanzado', handleCheckpointGlobal);
    };
  }, [fetchActiveRoutes]);

  const handleStatsUpdate = useCallback((recorridoId: number, newStats: LiveStats) => {
    if (recorridosCompletadosRef.current.has(recorridoId)) return;

    if (newStats.estadoDinamico === 'Completado') {
      recorridosCompletadosRef.current.add(recorridoId);
      setStatsMap(prev => ({
        ...prev,
        [recorridoId]: {
          ...newStats,
          porcentajeAvance: 100,
          completados: newStats.completados,
          pendientes: 0,
          etaSegundos: 0,
          horaEstimada: new Date().toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
          }),
          estadoDinamico: 'Completado'
        }
      }));
      return;
    }

    setStatsMap(prev => ({ ...prev, [recorridoId]: newStats }));
  }, []);

  const formatEta = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <>
      <Header
        subtitle="Plataforma de monitoreo en tiempo real de recorridos iniciados desde la app móvil"
        title="Monitoreo en Vivo"
      />
      <PageSectionHeader
        eyebrow="MONITOREO"
        title="Mapa GPS en vivo"
        description="Ubicación y estado de cada camión, rutas activas, checkpoints cumplidos y ETA."
      />
    <div className="assignments-page" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <section className="routes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {isLoading ? (
          <p style={{ color: 'var(--text)', fontSize: '0.875rem' }}>Cargando recorridos activos...</p>
        ) : activeRecorridos.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">✅</span>
            <p>No hay recorridos pendientes ni en progreso.</p>
          </div>
        ) : (
          <section ref={mapContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>

            {/* ─── Tarjetas de Monitoreo (Diseño Integrado del Segundo Código) ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeRecorridos.map(recorrido => {
                const asig = activeAsignaciones[recorrido.recorrido_id];
                const st = statsMap[recorrido.recorrido_id];
                if (!asig) return null;

                return (
                  <div key={recorrido.recorrido_id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.125rem', border: '1px solid var(--border)', borderRadius: '1rem', background: 'var(--panel-bg)', boxShadow: '0 4px 16px -4px oklch(0.2 0.04 240 / 0.08)' }}>

                    {/* Panel de Estadísticas Dinámicas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>

                      {/* Ruta Activa */}
                      <div style={{
                        background: 'var(--panel-bg)', border: '1px solid var(--border)',
                        borderRadius: '0.875rem', padding: '1rem 1.125rem',
                        boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: '#1763A61E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MapPin size={14} style={{ color: '#1763A6' }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ruta Activa</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.02em' }}>{asig.ruta_nombre}</div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text)', marginTop: '0.35rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Truck size={11} />{asig.numero_economico}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><User size={11} />{asig.conductor_nombre}</span>
                        </div>
                      </div>

                      {/* Estado del Recorrido */}
                      <div style={{
                        background: 'var(--panel-bg)', border: '1px solid var(--border)',
                        borderRadius: '0.875rem', padding: '1rem 1.125rem',
                        boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: '#388C351E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={14} style={{ color: '#388C35' }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estado</span>
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em',
                          color: st?.estadoDinamico === 'Retrasado' ? 'oklch(0.55 0.22 25)'
                            : st?.estadoDinamico === 'Completado' ? '#388C35'
                              : '#1763A6',
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                            background: st?.estadoDinamico === 'Retrasado' ? 'oklch(0.58 0.22 25)'
                              : st?.estadoDinamico === 'Completado' ? '#388C35'
                                : '#1763A6',
                            boxShadow: `0 0 0 3px ${st?.estadoDinamico === 'Retrasado' ? 'oklch(0.58 0.22 25 / 0.25)'
                                : st?.estadoDinamico === 'Completado' ? '#388C3540'
                                  : '#1763A640'
                              }`,
                          }} className={st?.estadoDinamico === 'En Progreso' ? 'pulse-dot' : ''} />
                          {st?.estadoDinamico || '—'}
                        </div>
                      </div>

                      {/* Progreso (Checkpoints) */}
                      <div style={{
                        background: 'var(--panel-bg)', border: '1px solid var(--border)',
                        borderRadius: '0.875rem', padding: '1rem 1.125rem',
                        boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: '#90BF491E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MapPin size={14} style={{ color: '#90BF49' }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progreso</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-h)' }}>{st?.completados || 0}</span>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>/ {(st?.completados || 0) + (st?.pendientes || 0)} checkpoints</span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            background: st?.estadoDinamico === 'Retrasado'
                              ? 'oklch(0.58 0.22 25)'
                              : 'linear-gradient(90deg, #1763A6, #90BF49)',
                            width: `${st?.porcentajeAvance || 0}%`,
                            borderRadius: '3px',
                            transition: 'width 0.5s linear, background-color 0.3s'
                          }} />
                        </div>
                        <div style={{ fontSize: '0.72rem', textAlign: 'right', marginTop: '0.25rem', color: 'var(--text)' }}>
                          {Math.round(st?.porcentajeAvance || 0)}%
                        </div>
                      </div>

                      {/* Tiempos Estimados */}
                      <div style={{
                        background: 'var(--panel-bg)', border: '1px solid var(--border)',
                        borderRadius: '0.875rem', padding: '1rem 1.125rem',
                        boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: 'oklch(0.78 0.16 75 / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Timer size={14} style={{ color: 'oklch(0.45 0.12 72)' }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tiempos ETA</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>ETA Restante:</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-h)', fontSize: '0.9rem' }}>{formatEta(st?.etaSegundos || 0)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>Llegada:</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-h)', fontSize: '0.9rem' }}>{st?.horaEstimada}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem', padding: '0.6rem 1rem',
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.8375rem',
                        boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.05)',
                      }}>
                        <Truck size={14} style={{ color: '#1763A6', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text)' }}>Salió de:</span>
                        <strong style={{ color: 'var(--text-h)', letterSpacing: '-0.01em' }}>{st?.ultimoCheckpoint || '…'}</strong>
                      </div>

                      <div style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem', padding: '0.6rem 1rem',
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.8375rem',
                        boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.05)',
                      }}>
                        <MapPin size={14} style={{ color: '#1763A6', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text)' }}>Hacia:</span>
                        <strong style={{ color: 'var(--text-h)', letterSpacing: '-0.01em' }}>{st?.proximoCheckpoint || '…'}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Mapa en Vivo con todos los camiones activos ─── */}
            <div style={{
              width: '100%', height: '600px',
              borderRadius: '0.875rem',
              border: '1px solid #1763A633',
              overflow: 'hidden',
              boxShadow: '0 4px 24px oklch(0.2 0.04 240 / 0.12), 0 0 0 4px #1763A60D',
            }}>
              <APIProvider apiKey={API_KEY}>
                <Map
                  defaultCenter={{ lat: 16.9036, lng: -92.1033 }}
                  defaultZoom={12}
                  mapId="recorrido-map-live"
                  gestureHandling="greedy"
                  disableDefaultUI={true}
                >
                  {activeRecorridos.map(recorrido => (
                    <LiveMapSimulation
                      key={recorrido.recorrido_id}
                      checkpoints={recorrido.checkpoints}
                      color={recorrido.color}
                      recorridoId={recorrido.recorrido_id}
                      onStatsUpdate={handleStatsUpdate}
                    />
                  ))}
                </Map>
              </APIProvider>
            </div>
          </section>
        )}
      </section>
    </div>
    </>
  );
};