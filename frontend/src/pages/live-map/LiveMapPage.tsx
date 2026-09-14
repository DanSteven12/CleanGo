import React, { useRef } from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { Truck, MapPin, Timer, User, TrendingUp, Radio, Navigation, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveMapData } from '../../hooks/useLiveMapData';
import { LiveMapSimulation } from '../../components/routes/LiveMapSimulation';
import { Header } from '../../components/layout/Header';
import { PageSectionHeader } from '../../components/layout/PageSectionHeader';
import '../../assets/styles/routes.css';
import '../../assets/styles/assignments.css';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

export const LiveMapPage: React.FC = () => {
  const { isLoading, activeRecorridos, activeAsignaciones, statsMap, handleStatsUpdate } = useLiveMapData();
  const mapContainerRef = useRef<HTMLDivElement>(null);

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
        <motion.section 
          className="routes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        >

          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-center text-sm text-[var(--text)]">
              <Loader2 size={20} className="animate-spin text-[var(--primary)] mr-2" />
              Cargando recorridos activos...
            </div>
          ) : activeRecorridos.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-8 sm:p-12 text-center shadow-sm flex flex-col items-center justify-center my-2"
            >
              {/* Radial gradient glow in background */}
              <div 
                className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
                style={{
                  background: 'radial-gradient(circle at 50% 35%, rgba(23, 99, 166, 0.14) 0%, transparent 65%)'
                }}
              />

              {/* Status pill badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[oklch(0.76_0.17_135_/_0.12)] border border-[oklch(0.76_0.17_135_/_0.3)] text-xs font-semibold text-[oklch(0.38_0.12_145)] dark:text-[oklch(0.76_0.17_135)] mb-6 select-none shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#388C35] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#388C35]" />
                </span>
                <span>GPS & Telemetría en Espera</span>
              </div>

              {/* Icon / Radar Visual Illustration */}
              <div className="relative mb-5">
                {/* Outer animated halo ring */}
                <motion.div 
                  className="absolute -inset-3.5 rounded-3xl border border-[var(--primary)]/20 pointer-events-none"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.65, 0.25] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-[#1763A6]/12 to-[#90BF49]/12 border border-[#1763A6]/30 flex items-center justify-center text-[#1763A6] shadow-sm relative z-10">
                  <Radio size={32} className="animate-pulse text-[var(--primary)]" />
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="font-display text-xl font-bold text-[var(--text-h)] mb-2 tracking-tight">
                No hay recorridos en curso
              </h3>
              <p className="text-sm text-[var(--text)] max-w-md mb-6 leading-relaxed">
                Todas las rutas están al día. Cuando un conductor inicie un recorrido asignado desde la aplicación móvil, se transmitirá su ubicación GPS y avance de checkpoints en tiempo real.
              </p>

              {/* Telemetry metadata cards row */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--muted-foreground)] border-t border-[var(--border)]/70 pt-5 w-full max-w-lg">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)]/60 font-medium">
                  <Navigation size={13} className="text-[var(--primary)]" />
                  <span>Sincronización WebSocket activa</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)]/60 font-medium">
                  <Truck size={13} className="text-[#388C35]" />
                  <span>Flota municipal conectada</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <section ref={mapContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>

              {/* ─── Tarjetas de Monitoreo ─── */}
              <motion.div 
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                initial="hidden" animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
              >
                <AnimatePresence mode="popLayout">
                {activeRecorridos.map(recorrido => {
                  const asig = activeAsignaciones[recorrido.recorrido_id];
                  const st = statsMap[recorrido.recorrido_id];
                  if (!asig) return null;

                  return (
                    <motion.div 
                      key={recorrido.recorrido_id} 
                      layout
                      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.125rem', border: '1px solid var(--border)', borderRadius: '1rem', background: 'var(--panel-bg)', boxShadow: '0 4px 16px -4px oklch(0.2 0.04 240 / 0.08)' }}
                    >

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
                            <AnimatePresence mode="popLayout">
                              <motion.span
                                key={st?.estadoDinamico || 'Pendiente'}
                                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.2 }}
                              >
                                {st?.estadoDinamico || '—'}
                              </motion.span>
                            </AnimatePresence>
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
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {st?.estadoDinamico === 'Completado' ? 'Progreso Completado' : 'Progreso'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                            <AnimatePresence mode="popLayout">
                              <motion.span 
                                key={st?.completados || 0}
                                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-h)' }}
                              >
                                {st?.completados || 0}
                              </motion.span>
                            </AnimatePresence>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>/ {(st?.completados || 0) + (st?.pendientes || 0)} checkpoints</span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              background: st?.estadoDinamico === 'Retrasado'
                                ? 'oklch(0.58 0.22 25)'
                                : st?.estadoDinamico === 'Completado'
                                  ? '#388C35'
                                  : 'linear-gradient(90deg, #1763A6, #90BF49)',
                              width: `${st?.porcentajeAvance || 0}%`,
                              borderRadius: '3px',
                              transition: 'width 0.5s linear, background-color 0.3s'
                            }} />
                          </div>
                          <div style={{ 
                            fontSize: '0.72rem', 
                            textAlign: 'right', 
                            marginTop: '0.25rem', 
                            color: st?.estadoDinamico === 'Completado' ? '#388C35' : 'var(--text)',
                            fontWeight: st?.estadoDinamico === 'Completado' ? 700 : 400
                          }}>
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
                              <AnimatePresence mode="popLayout">
                                <motion.span 
                                  key={formatEta(st?.etaSegundos || 0)}
                                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-h)', fontSize: '0.9rem' }}
                                >
                                  {formatEta(st?.etaSegundos || 0)}
                                </motion.span>
                              </AnimatePresence>
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
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </motion.div>

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
        </motion.section>
      </div>
    </>
  );
};