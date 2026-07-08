import React, { useCallback, useEffect, useState, useRef } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Satellite, Truck, User, Clock, MapPin, TrendingUp, Timer, Loader2 } from 'lucide-react';
import type { AsignacionRecord } from '../../types/routes';

import '../../assets/styles/routes.css';
import '../../assets/styles/assignments.css';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const DURATION_MS = 30000; // 30 seconds per segment
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

// ─── Map Simulation Component ────────────────────────────────────────────────
interface LiveMapSimulationProps {
  checkpoints: any[];
  color?: string;
  recorridoId: number;
  onStatsUpdate: (stats: LiveStats) => void;
}

const LiveMapSimulation: React.FC<LiveMapSimulationProps> = React.memo(({ checkpoints, color, recorridoId, onStatsUpdate }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  const camionMarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const globalStartTimeRef = useRef<number | null>(null);
  const progressPolylineRef = useRef<{ traveled: any; remaining: any } | null>(null);

  // Keep a ref of the callback to avoid re-running effects when the callback changes
  const onStatsUpdateRef = useRef(onStatsUpdate);
  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate;
  }, [onStatsUpdate]);

  const iniciarSimulacion = useCallback((cps: any[]) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (!camionMarkerRef.current || cps.length === 0) return;

    const firstCp = cps[0];
    const firstLat = Number(firstCp.latitud);
    const firstLng = Number(firstCp.longitud);
    camionMarkerRef.current.setPosition({ lat: firstLat, lng: firstLng });

    fetch(`/api/recorridos/${recorridoId}/checkpoint`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkpoint_id: firstCp.id,
        latitud: firstLat,
        longitud: firstLng
      })
    }).catch(err => console.error('Error al actualizar checkpoint inicial:', err));

    // Single wall-clock reference for the entire simulation run.
    // All horaEstimada calculations derive from this fixed timestamp so
    // the displayed arrival time never drifts between animation frames.
    const simulationStartWallTime = Date.now();
    const arrivalWallTime = simulationStartWallTime + (cps.length - 1) * ETA_MINUTES_PER_SEGMENT * 60 * 1000;

    globalStartTimeRef.current = null; // Reset animation timer

    const animateSegment = (startIndex: number) => {
      const nextIndex = startIndex + 1;
      const isLast = nextIndex >= cps.length;

      if (isLast) {
        onStatsUpdateRef.current({
          ultimoCheckpoint: 'Fin del Recorrido',
          proximoCheckpoint: '-',
          completados: cps.length,
          pendientes: 0,
          porcentajeAvance: 100,
          etaSegundos: 0,
          horaEstimada: new Date().toLocaleTimeString(),
          estadoDinamico: 'Completado'
        });
        return;
      }

      const cpStart = cps[startIndex];
      const cpEnd = cps[nextIndex];

      const latStart = Number(cpStart.latitud);
      const lngStart = Number(cpStart.longitud);
      const latEnd = Number(cpEnd.latitud);
      const lngEnd = Number(cpEnd.longitud);

      if (isNaN(latStart) || isNaN(lngStart) || isNaN(latEnd) || isNaN(lngEnd)) {
        animateSegment(nextIndex);
        return;
      }

      // Full route as {lat, lng} array — used by the split-polyline logic below
      const path = cps.map(cp => ({ lat: Number(cp.latitud), lng: Number(cp.longitud) }));

      let segmentStartTime: number | null = null;
      let lastUpdateTimestamp = 0;

      const step = (timestamp: number) => {
        if (!globalStartTimeRef.current) globalStartTimeRef.current = timestamp;
        if (!segmentStartTime) segmentStartTime = timestamp;

        const progress = Math.min((timestamp - segmentStartTime) / DURATION_MS, 1);

        const currentLat = latStart + (latEnd - latStart) * progress;
        const currentLng = lngStart + (lngEnd - lngStart) * progress;

        camionMarkerRef.current.setPosition({ lat: currentLat, lng: currentLng });

        // ── Update split polyline (traveled = green, remaining = gray) ──
        if (progressPolylineRef.current) {
          const currentPos = { lat: currentLat, lng: currentLng };
          // Traveled: all fully-completed checkpoint coords + interpolated current position
          const traveledPath = path.slice(0, startIndex + 1).concat(currentPos);
          // Remaining: interpolated current position + all upcoming checkpoint coords
          const remainingPath = [currentPos].concat(path.slice(startIndex + 1));
          progressPolylineRef.current.traveled.setPath(traveledPath);
          progressPolylineRef.current.remaining.setPath(remainingPath);
        }

        // Throttle UI updates to roughly every 500ms to avoid React render churn
        if (timestamp - lastUpdateTimestamp > 500) {
          lastUpdateTimestamp = timestamp;

          const totalElapsedMs = timestamp - globalStartTimeRef.current;
          const expectedCheckpoints = Math.floor(totalElapsedMs / DURATION_MS);
          const TOLERANCIA = 1;
          const isDelayed = (startIndex + TOLERANCIA) < expectedCheckpoints;

          // Segmentos totales = cps.length - 1
          // Segmentos restantes (incluyendo el actual, descontando su progreso)
          const segmentosRestantes = (cps.length - 1 - startIndex) - progress;
          const pendientes = cps.length - 1 - startIndex;
          const etaMsPerSegment = ETA_MINUTES_PER_SEGMENT * 60 * 1000;
          const etaTotalMs = Math.max(0, segmentosRestantes) * etaMsPerSegment;
          const etaSecs = Math.max(0, Math.floor(etaTotalMs / 1000));

          // Smoothed percentage including the current segment progress
          const rawPercentage = ((startIndex + progress) / cps.length) * 100;

          onStatsUpdateRef.current({
            ultimoCheckpoint: cpStart.nombre || `Punto ${cpStart.orden}`,
            proximoCheckpoint: cpEnd.nombre || `Punto ${cpEnd.orden}`,
            completados: startIndex,
            pendientes: pendientes,
            porcentajeAvance: Math.min(rawPercentage, 100),
            etaSegundos: etaSecs,
            horaEstimada: new Date(arrivalWallTime).toLocaleTimeString(),
            estadoDinamico: isDelayed ? 'Retrasado' : 'En Progreso'
          });
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
        } else {
          // Reached the next checkpoint
          fetch(`/api/recorridos/${recorridoId}/checkpoint`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checkpoint_id: cpEnd.id,
              latitud: latEnd,
              longitud: lngEnd
            })
          }).catch(err => console.error('Error al actualizar checkpoint:', err));

          animateSegment(nextIndex);
        }
      };

      animationFrameRef.current = requestAnimationFrame(step);
    };

    if (cps.length > 1) {
      animateSegment(0);
    } else {
      onStatsUpdateRef.current({
        ultimoCheckpoint: 'Fin del Recorrido',
        proximoCheckpoint: '-',
        completados: cps.length,
        pendientes: 0,
        porcentajeAvance: 100,
        etaSegundos: 0,
        horaEstimada: new Date().toLocaleTimeString(),
        estadoDinamico: 'Completado'
      });
    }
  }, [recorridoId]);

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

    // ── Split polyline: traveled (route color, full opacity) + remaining (route color, dimmed) ──
    const routeColor = color || '#6366f1'; // fallback to indigo if no color provided
    const polylineTraveled = new googleMaps.Polyline({
      path: path.slice(0, 1), // starts with just the first point; step() updates it live
      geodesic: true,
      strokeColor: routeColor,
      strokeOpacity: 1.0,
      strokeWeight: 5,
      zIndex: 2,
      map
    });

    const polylineRemaining = new googleMaps.Polyline({
      path,
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

    if (!camionMarkerRef.current) {
      camionMarkerRef.current = new googleMaps.Marker({
        map,
        title: 'Camión',
        icon: {
          url: 'https://maps.google.com/mapfiles/kml/shapes/truck.png',
          scaledSize: new googleMaps.Size(32, 32)
        },
        zIndex: 999
      });
    }

    iniciarSimulacion(checkpoints);

    return () => {
      if (progressPolylineRef.current) {
        progressPolylineRef.current.traveled.setMap(null);
        progressPolylineRef.current.remaining.setMap(null);
        progressPolylineRef.current = null;
      }
      markers.forEach((m: any) => m.setMap(null));

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (camionMarkerRef.current) {
        camionMarkerRef.current.setMap(null);
        camionMarkerRef.current = null;
      }
    };
  }, [map, mapsLib, checkpoints, color, iniciarSimulacion]);

  return null;
});

// ─── Main Component ────────────────────────────────────────────────────────
export const LiveMapPage: React.FC = () => {
  const [asignaciones, setAsignaciones] = useState<AsignacionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeRecorrido, setActiveRecorrido] = useState<any>(null);
  const [isStartingRecorrido, setIsStartingRecorrido] = useState<number | null>(null);
  const [activeAsignacion, setActiveAsignacion] = useState<AsignacionRecord | null>(null);

  const [stats, setStats] = useState<LiveStats | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const fetchAsignaciones = useCallback(async () => {
    try {
      const res = await fetch('/api/asignaciones');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AsignacionRecord[] = await res.json();
      // Filtrar para mostrar solo las que pueden iniciarse o están en curso
      const filtradas = data.filter(a => a.estatus_recorrido === 'Pendiente' || a.estatus_recorrido === 'En Progreso');
      setAsignaciones(filtradas);
    } catch (e) {
      console.error('[LiveMapPage] fetchAsignaciones:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAsignaciones();
  }, [fetchAsignaciones]);

  const handleIniciarRecorrido = async (asignacion: AsignacionRecord) => {
    setIsStartingRecorrido(asignacion.id);
    try {
      const res = await fetch('/api/recorridos/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignacion_id: asignacion.id, ruta_id: asignacion.ruta_id })
      });
      if (!res.ok) throw new Error('Error al iniciar recorrido');
      const data = await res.json();

      setActiveRecorrido(data);
      setActiveAsignacion(asignacion);

      // Pre-calcular ETA inicial usando la hora REAL del momento en que el usuario inicia
      const totalSegmentos = (data.checkpoints?.length || 1) - 1;
      const etaInicialMs = totalSegmentos * ETA_MINUTES_PER_SEGMENT * 60 * 1000;
      const etaInicialSecs = Math.floor(etaInicialMs / 1000);
      const horaLlegadaInicial = new Date(Date.now() + etaInicialMs).toLocaleTimeString();

      setStats({
        ultimoCheckpoint: 'Base / Salida',
        proximoCheckpoint: 'Iniciando...',
        completados: 0,
        pendientes: totalSegmentos,
        porcentajeAvance: 0,
        etaSegundos: etaInicialSecs,
        horaEstimada: horaLlegadaInicial,
        estadoDinamico: 'En Progreso'
      });

      setTimeout(() => {
        if (mapContainerRef.current) {
          mapContainerRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al iniciar el recorrido');
    } finally {
      setIsStartingRecorrido(null);
    }
  };

  const handleStatsUpdate = useCallback((newStats: LiveStats) => {
    setStats(newStats);
  }, []);

  // Format ETA from seconds to MM:SS
  const formatEta = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="assignments-page" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ─── Encabezado y Selector ─── */}
      <section className="routes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, oklch(0.52 0.14 250), oklch(0.42 0.05 170))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 10px oklch(0.52 0.14 250 / 0.35)',
          }}>
            <Satellite size={18} color="white" />
          </div>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Operación en Vivo</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text)', margin: 0 }}>Selecciona un recorrido para monitorear en tiempo real</p>
          </div>
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--text)', fontSize: '0.875rem' }}>Cargando recorridos pendientes...</p>
        ) : asignaciones.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">✅</span>
            <p>No hay recorridos pendientes ni en progreso.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {asignaciones.map(a => (
              <div key={a.id} style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: '0.875rem',
                padding: '1.125rem',
                display: 'flex', flexDirection: 'column', gap: '0.875rem',
                boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06), 0 4px 16px -4px oklch(0.2 0.04 240 / 0.08)',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="ruta-pill"><span className="ruta-pill-dot" style={{ background: a.ruta_color }} />{a.ruta_nombre}</span>
                  <span className={`estatus-badge ${a.estatus_recorrido === 'Pendiente' ? 'estatus-pendiente' : 'estatus-en-progreso'}`}>
                    {a.estatus_recorrido}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8375rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-h)' }}>
                      <Truck size={14} style={{ color: 'oklch(0.52 0.14 250)' }} />
                      {a.numero_economico}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
                      <User size={13} style={{ color: 'var(--text)' }} />
                      {a.conductor_nombre}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} style={{ color: 'var(--text)' }} />
                    <span>{a.horario_inicio.slice(0, 5)} – {a.horario_fin.slice(0, 5)}</span>
                  </div>
                </div>
                <button
                  className="save-button"
                  onClick={() => handleIniciarRecorrido(a)}
                  disabled={isStartingRecorrido === a.id || activeAsignacion?.id === a.id}
                  style={{
                    width: '100%', justifyContent: 'center',
                    background: activeAsignacion?.id === a.id
                      ? 'transparent'
                      : undefined,
                    color: activeAsignacion?.id === a.id ? 'var(--text)' : undefined,
                    border: activeAsignacion?.id === a.id ? '1px solid var(--panel-border)' : undefined,
                    boxShadow: activeAsignacion?.id === a.id ? 'none' : undefined,
                  }}
                >
                  {activeAsignacion?.id === a.id ? (
                    <><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} className="pulse-dot" /> Monitoreando…</>
                  ) : isStartingRecorrido === a.id ? (
                    <><Loader2 size={15} className="spin" /> Iniciando…</>
                  ) : 'Iniciar Monitoreo'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Dashboard y Mapa en Vivo ─── */}
      {activeRecorrido && activeAsignacion && (
        <section ref={mapContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>

          {/* Panel de Estadísticas Dinámicas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>

            {/* Ruta Activa */}
            <div style={{
              background: 'var(--panel-bg)', border: '1px solid var(--border)',
              borderRadius: '0.875rem', padding: '1.125rem 1.25rem',
              boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06), 0 4px 16px -4px oklch(0.2 0.04 240 / 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: 'oklch(0.52 0.14 250 / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={14} style={{ color: 'oklch(0.52 0.14 250)' }} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ruta Activa</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.02em' }}>{activeAsignacion.ruta_nombre}</div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text)', marginTop: '0.35rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Truck size={11} />{activeAsignacion.numero_economico}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><User size={11} />{activeAsignacion.conductor_nombre}</span>
              </div>
            </div>

            {/* Estado del Recorrido */}
            <div style={{
              background: 'var(--panel-bg)', border: '1px solid var(--border)',
              borderRadius: '0.875rem', padding: '1.125rem 1.25rem',
              boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06), 0 4px 16px -4px oklch(0.2 0.04 240 / 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: 'oklch(0.76 0.17 135 / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={14} style={{ color: 'oklch(0.55 0.15 145)' }} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estado</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em',
                color: stats?.estadoDinamico === 'Retrasado' ? 'oklch(0.55 0.22 25)'
                      : stats?.estadoDinamico === 'Completado' ? 'oklch(0.50 0.15 145)'
                      : 'oklch(0.45 0.14 250)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: stats?.estadoDinamico === 'Retrasado' ? 'oklch(0.58 0.22 25)'
                              : stats?.estadoDinamico === 'Completado' ? 'oklch(0.76 0.17 135)'
                              : 'oklch(0.52 0.14 250)',
                  boxShadow: `0 0 0 3px ${
                    stats?.estadoDinamico === 'Retrasado' ? 'oklch(0.58 0.22 25 / 0.25)'
                    : stats?.estadoDinamico === 'Completado' ? 'oklch(0.76 0.17 135 / 0.25)'
                    : 'oklch(0.52 0.14 250 / 0.25)'
                  }`,
                }} className={stats?.estadoDinamico === 'En Progreso' ? 'pulse-dot' : ''} />
                {stats?.estadoDinamico || '—'}
              </div>
            </div>

            {/* Progreso (Checkpoints) */}
            <div style={{
              background: 'var(--panel-bg)', border: '1px solid var(--border)',
              borderRadius: '0.875rem', padding: '1.125rem 1.25rem',
              boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06), 0 4px 16px -4px oklch(0.2 0.04 240 / 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: 'oklch(0.72 0.18 138 / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={14} style={{ color: 'oklch(0.52 0.14 138)' }} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progreso</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-h)' }}>{stats?.completados || 0}</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>/ {(stats?.completados || 0) + (stats?.pendientes || 0)} checkpoints</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: stats?.estadoDinamico === 'Retrasado'
                    ? 'oklch(0.58 0.22 25)'
                    : 'linear-gradient(90deg, oklch(0.52 0.14 250), oklch(0.72 0.18 138))',
                  width: `${stats?.porcentajeAvance || 0}%`,
                  borderRadius: '3px',
                  transition: 'width 0.5s linear, background-color 0.3s'
                }} />
              </div>
              <div style={{ fontSize: '0.72rem', textAlign: 'right', marginTop: '0.25rem', color: 'var(--text)' }}>
                {(stats?.porcentajeAvance || 0).toFixed(1)}%
              </div>
            </div>

            {/* Tiempos Estimados */}
            <div style={{
              background: 'var(--panel-bg)', border: '1px solid var(--border)',
              borderRadius: '0.875rem', padding: '1.125rem 1.25rem',
              boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06), 0 4px 16px -4px oklch(0.2 0.04 240 / 0.08)',
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
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-h)', fontSize: '0.9rem' }}>{formatEta(stats?.etaSegundos || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>Llegada:</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-h)', fontSize: '0.9rem' }}>{stats?.horaEstimada}</span>
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
              <Truck size={14} style={{ color: 'oklch(0.52 0.14 250)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text)' }}>Salió de:</span>
              <strong style={{ color: 'var(--text-h)', letterSpacing: '-0.01em' }}>{stats?.ultimoCheckpoint || '…'}</strong>
            </div>

            <div style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem', padding: '0.6rem 1rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.8375rem',
              boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.05)',
            }}>
              <MapPin size={14} style={{ color: 'oklch(0.52 0.14 250)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text)' }}>Hacia:</span>
              <strong style={{ color: 'var(--text-h)', letterSpacing: '-0.01em' }}>{stats?.proximoCheckpoint || '…'}</strong>
            </div>
          </div>

          <div style={{
            width: '100%', height: '600px',
            borderRadius: '0.875rem',
            border: '1px solid oklch(0.52 0.14 250 / 0.20)',
            overflow: 'hidden',
            boxShadow: '0 4px 24px oklch(0.2 0.04 240 / 0.12), 0 0 0 4px oklch(0.52 0.14 250 / 0.05)',
          }}>
            <APIProvider apiKey={API_KEY}>
              <Map
                defaultCenter={{ lat: 16.9036, lng: -92.1033 }}
                defaultZoom={12}
                mapId="recorrido-map-live"
                gestureHandling="greedy"
                disableDefaultUI={true}
              >
                <LiveMapSimulation
                  checkpoints={activeRecorrido.checkpoints}
                  color={activeRecorrido.color}
                  recorridoId={activeRecorrido.recorrido_id}
                  onStatsUpdate={handleStatsUpdate}
                />
              </Map>
            </APIProvider>
          </div>

        </section>
      )}

    </div>
  );
};
