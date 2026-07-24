import React, { useCallback, useEffect, useState, useRef } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Satellite, Truck, User, Clock, MapPin, TrendingUp, Timer, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { AsignacionRecord } from '../../types/routes';

import '../../assets/styles/routes.css';
import '../../assets/styles/assignments.css';

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
    const polylineTraveled = new googleMaps.Polyline({
      path: path.slice(0, 1), 
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
  const [asignaciones, setAsignaciones] = useState<AsignacionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeRecorridos, setActiveRecorridos] = useState<any[]>([]);
  const [isStartingRecorrido, setIsStartingRecorrido] = useState<number | null>(null);
  const [activeAsignaciones, setActiveAsignaciones] = useState<Record<number, AsignacionRecord>>({});

  const [statsMap, setStatsMap] = useState<Record<number, LiveStats>>({});

  // ── Modal de confirmación de conductor ────────────────────────────────────
  // pendingAsignacion: la asignación que el usuario quiere iniciar
  // confirmStep: 'ask' = pregunta si eres tú; 'capture' = captura nombre del conductor real
  const [pendingAsignacion, setPendingAsignacion] = useState<AsignacionRecord | null>(null);
  const [confirmStep, setConfirmStep] = useState<'ask' | 'capture'>('ask');
  const [conductorRealNombre, setConductorRealNombre] = useState('');
  const [conductorRealError, setConductorRealError] = useState<string | null>(null);

  // Cerrojo para cada recorrido individual: una vez que llega a 'Completado'
  // se congela el estado y se bloquea cualquier actualización adicional.
  const recorridosCompletadosRef = useRef<Set<number>>(new Set());

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

  const handleIniciarRecorrido = async (asignacion: AsignacionRecord, conductorReal?: string) => {
    setIsStartingRecorrido(asignacion.id);
    // Cerrar el modal antes de iniciar
    setPendingAsignacion(null);
    try {
      const body: Record<string, unknown> = { asignacion_id: asignacion.id, ruta_id: asignacion.ruta_id };
      if (conductorReal?.trim()) body.conductorRealNombre = conductorReal.trim();

      const res = await fetch('/api/recorridos/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Error al iniciar recorrido');
      const data = await res.json();
      
      const recorridoId = data.recorrido_id;

      // Asegurar que no agregamos duplicados
      setActiveRecorridos(prev => {
        if (prev.some(r => r.recorrido_id === recorridoId)) return prev;
        return [...prev, data];
      });

      setActiveAsignaciones(prev => ({ ...prev, [recorridoId]: asignacion }));

      // Pre-calcular ETA inicial usando la hora REAL del momento en que el usuario inicia
      const totalSegmentos = (data.checkpoints?.length || 1) - 1;
      const etaInicialMs = totalSegmentos * ETA_MINUTES_PER_SEGMENT * 60 * 1000;
      const etaInicialSecs = Math.floor(etaInicialMs / 1000);
      const horaLlegadaInicial = new Date(Date.now() + etaInicialMs).toLocaleTimeString();

      setStatsMap(prev => ({
        ...prev,
        [recorridoId]: {
          ultimoCheckpoint: 'Base / Salida',
          proximoCheckpoint: 'Iniciando...',
          completados: 0,
          pendientes: totalSegmentos,
          porcentajeAvance: 0,
          etaSegundos: etaInicialSecs,
          horaEstimada: horaLlegadaInicial,
          estadoDinamico: 'En Progreso'
        }
      }));

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

  const handleStatsUpdate = useCallback((recorridoId: number, newStats: LiveStats) => {
    // Si ya está completado, ignorar cualquier update posterior
    if (recorridosCompletadosRef.current.has(recorridoId)) return;

    if (newStats.estadoDinamico === 'Completado') {
      // Activar el cerrojo y fijar el estado final de una vez
      recorridosCompletadosRef.current.add(recorridoId);
      setStatsMap(prev => ({
        ...prev,
        [recorridoId]: {
          ...newStats,
          porcentajeAvance: 100,
          completados: newStats.completados,
          pendientes: 0,
          etaSegundos: 0,
          // Hora de llegada real: el instante exacto en que la simulación cerró
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

  // ── Handlers del modal ────────────────────────────────────────────────────
  const openConfirmModal = (asignacion: AsignacionRecord) => {
    setPendingAsignacion(asignacion);
    setConfirmStep('ask');
    setConductorRealNombre('');
    setConductorRealError(null);
  };

  const handleConfirmSelf = () => {
    if (!pendingAsignacion) return;
    void handleIniciarRecorrido(pendingAsignacion, undefined);
  };

  const handleConfirmOther = () => {
    setConductorRealError(null);
    setConfirmStep('capture');
  };

  const handleConfirmOtherSubmit = () => {
    if (!conductorRealNombre.trim()) {
      setConductorRealError('El nombre del conductor es obligatorio.');
      return;
    }
    if (!pendingAsignacion) return;
    void handleIniciarRecorrido(pendingAsignacion, conductorRealNombre);
  };

  const handleCloseModal = () => {
    setPendingAsignacion(null);
    setConductorRealNombre('');
    setConductorRealError(null);
  };

  // Format ETA from seconds to MM:SS
  const formatEta = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <>
      <div className="assignments-page" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ─── Encabezado y Selector ─── */}
      <section className="routes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1763A6, #152C40)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 10px #1763A659',
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
                {/* Route name + status badge + incident badge (flex-wrap so both fit inside the card) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="ruta-pill" style={{ flexGrow: 1, minWidth: 0 }}>
                    <span className="ruta-pill-dot" style={{ background: a.ruta_color }} />
                    {a.ruta_nombre}
                  </span>
                  <span className={`estatus-badge ${a.estatus_recorrido === 'Pendiente' ? 'estatus-pendiente' : 'estatus-en-progreso'}`}>
                    {a.estatus_recorrido}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8375rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-h)' }}>
                      <Truck size={14} style={{ color: '#1763A6' }} />
                      {a.numero_economico}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
                      <User size={13} style={{ color: 'var(--text)' }} />
                      {a.conductor_nombre}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} style={{ color: 'var(--text)' }} />
                    {(() => {
                      return <span>{a.horario_inicio?.slice(0, 5)} – {a.horario_fin?.slice(0, 5)}</span>;
                    })()}
                  </div>
                </div>
                {/* Iniciar Monitoreo button */}
                {(() => {
                  const isAlreadyMonitoring = !!activeAsignaciones[a.id];
                  const isStarting = isStartingRecorrido === a.id;

                  return (
                    <button
                      className="save-button"
                      onClick={() => !isAlreadyMonitoring && openConfirmModal(a)}
                      disabled={isStarting || isAlreadyMonitoring}
                      style={{
                        width: '100%', justifyContent: 'center',
                        background: isAlreadyMonitoring ? 'transparent' : undefined,
                        color: isAlreadyMonitoring ? 'var(--text)' : undefined,
                        border: isAlreadyMonitoring ? '1px solid var(--panel-border)' : undefined,
                        boxShadow: isAlreadyMonitoring ? 'none' : undefined,
                      }}
                    >
                      {isAlreadyMonitoring ? (
                        <><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} className="pulse-dot" /> Monitoreando…</>
                      ) : isStarting ? (
                        <><Loader2 size={15} className="spin" /> Iniciando…</>
                      ) : 'Iniciar Monitoreo'}
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Dashboard y Mapa en Vivo ─── */}
      {activeRecorridos.length > 0 && (
        <section ref={mapContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>

          {/* Renderizar panel de estadísticas dinámicas por cada recorrido activo */}
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
                        <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: st?.estadoDinamico === 'Retrasado' ? 'oklch(0.58 0.22 25)'
                                      : st?.estadoDinamico === 'Completado' ? '#388C35'
                                      : '#1763A6',
                          boxShadow: `0 0 0 3px ${
                            st?.estadoDinamico === 'Retrasado' ? 'oklch(0.58 0.22 25 / 0.25)'
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
                        {(st?.porcentajeAvance || 0).toFixed(1)}%
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

    </div>

      {/* ─── Modal de Confirmación de Conductor ─── */}
      {pendingAsignacion && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-confirmacion-titulo"
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem'
          }}
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '1.125rem',
            width: '100%', maxWidth: '400px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>

            {/* Header del modal */}
            <div style={{
              padding: '1.25rem 1.5rem 1rem',
              borderBottom: '1px solid var(--panel-border)',
              display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1763A6, #152C40)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <User size={18} color="white" />
              </div>
              <div>
                <h3 id="modal-confirmacion-titulo" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text-h)', fontWeight: 700 }}>
                  {confirmStep === 'ask' ? 'Confirmación del conductor' : 'Ingresa tu nombre'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text)', marginTop: '0.15rem' }}>
                  {pendingAsignacion.ruta_nombre} · {pendingAsignacion.numero_economico}
                </p>
              </div>
            </div>

            {/* Body del modal */}
            <div style={{ padding: '1.5rem' }}>

              {confirmStep === 'ask' ? (
                /* ── Paso 1: ¿Eres tú? ── */
                <>
                  {/* Chip de conductor asignado */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    background: 'oklch(0.30 0.06 250 / 0.18)',
                    border: '1px solid oklch(0.50 0.12 250 / 0.3)',
                    borderRadius: '0.75rem', padding: '0.875rem 1rem',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1763A6, #90BF49)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                        {pendingAsignacion.conductor_nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Conductor asignado</p>
                      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-h)' }}>
                        {pendingAsignacion.conductor_nombre}
                      </p>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500 }}>
                    ¿Eres tú quien realizará este recorrido?
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <button
                      id="btn-confirmar-conductor-si"
                      className="save-button"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={handleConfirmSelf}
                      disabled={isStartingRecorrido === pendingAsignacion.id}
                    >
                      {isStartingRecorrido === pendingAsignacion.id ? (
                        <><Loader2 size={15} className="spin" /> Iniciando…</>
                      ) : (
                        <><CheckCircle2 size={16} /> Sí, iniciar recorrido</>
                      )}
                    </button>
                    <button
                      id="btn-confirmar-conductor-no"
                      className="save-button"
                      style={{
                        width: '100%', justifyContent: 'center',
                        background: 'transparent', color: 'var(--text-h)',
                        border: '1px solid var(--panel-border)', boxShadow: 'none'
                      }}
                      onClick={handleConfirmOther}
                      disabled={isStartingRecorrido === pendingAsignacion.id}
                    >
                      <User size={15} /> No, soy otra persona
                    </button>
                  </div>
                </>
              ) : (
                /* ── Paso 2: Capturar nombre ── */
                <>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text)' }}>
                    Escribe tu nombre completo para registrarlo en este recorrido.
                  </p>

                  <div className="form-field" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" htmlFor="input-conductor-real">
                      Nombre completo *
                    </label>
                    <input
                      id="input-conductor-real"
                      type="text"
                      className="form-input"
                      placeholder="Ej. Leodan Hernández"
                      value={conductorRealNombre}
                      onChange={e => {
                        setConductorRealNombre(e.target.value);
                        if (conductorRealError) setConductorRealError(null);
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleConfirmOtherSubmit()}
                      autoFocus
                    />
                    {conductorRealError && (
                      <div className="validation-error-banner" role="alert" style={{ marginTop: '0.5rem' }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{conductorRealError}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <button
                      id="btn-confirmar-conductor-otro-iniciar"
                      className="save-button"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={handleConfirmOtherSubmit}
                      disabled={isStartingRecorrido === pendingAsignacion.id}
                    >
                      {isStartingRecorrido === pendingAsignacion.id ? (
                        <><Loader2 size={15} className="spin" /> Iniciando…</>
                      ) : (
                        <><CheckCircle2 size={16} /> Iniciar recorrido</>
                      )}
                    </button>
                    <button
                      id="btn-confirmar-conductor-regresar"
                      className="save-button"
                      style={{
                        width: '100%', justifyContent: 'center',
                        background: 'transparent', color: 'var(--text-h)',
                        border: '1px solid var(--panel-border)', boxShadow: 'none'
                      }}
                      onClick={() => { setConfirmStep('ask'); setConductorRealError(null); }}
                    >
                      <ArrowLeft size={15} /> Regresar
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
};
