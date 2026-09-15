// frontend/src/pages/dashboard/DashboardLiveMapEmbed.tsx
// Componente de mapa en vivo integrado en el Dashboard. Reutiliza la lógica de LiveMapPage.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { Satellite, ExternalLink, Loader2, Radio, Navigation, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLiveMapData } from '../../hooks/useLiveMapData';
import { LiveMapSimulation } from '../../components/routes/LiveMapSimulation';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

interface DashboardLiveMapEmbedProps {
  maxCards?: number;
}

export const DashboardLiveMapEmbed: React.FC<DashboardLiveMapEmbedProps> = ({ maxCards: _maxCards }) => {
  const navigate = useNavigate();
  const { isLoading, activeRecorridos, handleStatsUpdate, activeAsignaciones } = useLiveMapData();

  const activeAsigsValues = Object.values(activeAsignaciones);
  const enProgreso = activeAsigsValues.filter((a) => a.estatus_recorrido === 'En Progreso' || a.estatus_recorrido === 'En progreso');
  const pendientes = activeAsigsValues.filter((a) => a.estatus_recorrido === 'Pendiente');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header interno */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1763A6, #152C40)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 10px #1763A659',
          }}>
            <Satellite size={18} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)' }}>
              Mapa en Vivo
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text)' }}>
              Monitoreo en tiempo real
            </p>
          </div>
        </div>

        <button
          id="dashboard-abrir-mapa-vivo"
          onClick={() => navigate('/mapa-vivo')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem',
            background: 'linear-gradient(135deg, #1763A6, #152C40)',
            color: 'white',
            border: 'none',
            borderRadius: '0.625rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #1763A640',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <ExternalLink size={14} />
          Abrir Mapa
        </button>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: 'var(--text)' }}>
          <Loader2 size={20} style={{ animation: 'spin-loop 0.9s linear infinite' }} />
          <span style={{ fontSize: '0.875rem' }}>Cargando mapa en vivo...</span>
        </div>
      ) : activeRecorridos.length === 0 ? (
        /* Estado vacío */
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-8 sm:p-12 text-center shadow-sm flex flex-col items-center justify-center my-1"
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Indicador de estado */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {enProgreso.length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.3rem 0.75rem',
                background: 'oklch(0.56 0.18 145 / 0.12)',
                border: '1px solid oklch(0.56 0.18 145 / 0.3)',
                borderRadius: '999px',
                fontSize: '0.75rem', fontWeight: 600,
                color: 'oklch(0.42 0.14 145)',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'oklch(0.56 0.18 145)',
                  animation: 'pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite',
                  boxShadow: '0 0 0 0 oklch(0.56 0.18 145)',
                }} />
                {enProgreso.length} En progreso
              </span>
            )}
            {pendientes.length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.3rem 0.75rem',
                background: 'oklch(0.78 0.16 75 / 0.12)',
                border: '1px solid oklch(0.78 0.16 75 / 0.3)',
                borderRadius: '999px',
                fontSize: '0.75rem', fontWeight: 600,
                color: 'oklch(0.50 0.12 75)',
              }}>
                {pendientes.length} Pendientes
              </span>
            )}
          </div>

          {/* Mapa de Monitoreo */}
          <div style={{
            width: '100%', height: '460px',
            borderRadius: '0.875rem',
            border: '1px solid #1763A633',
            overflow: 'hidden',
            boxShadow: '0 4px 24px oklch(0.2 0.04 240 / 0.12), 0 0 0 4px #1763A60D',
          }}>
            <APIProvider apiKey={API_KEY}>
              <Map
                defaultCenter={{ lat: 16.9036, lng: -92.1033 }}
                defaultZoom={12}
                mapId="recorrido-map-dashboard-live"
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

          {/* Enlace al mapa completo */}
          <button
            id="dashboard-ver-mapa-completo-bottom"
            onClick={() => navigate('/mapa-vivo')}
            style={{
              alignSelf: 'flex-start',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              color: '#1763A6',
              border: '1px solid #1763A640',
              borderRadius: '0.625rem',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s ease, border-color 0.15s ease',
              marginTop: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1763A60F';
              e.currentTarget.style.borderColor = '#1763A680';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#1763A640';
            }}
          >
            <ExternalLink size={13} />
            Ver mapa completo
          </button>
        </div>
      )}
    </div>
  );
};
