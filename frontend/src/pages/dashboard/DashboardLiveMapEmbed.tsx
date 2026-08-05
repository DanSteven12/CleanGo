// frontend/src/pages/dashboard/DashboardLiveMapEmbed.tsx
// Componente de mapa en vivo integrado en el Dashboard. Reutiliza la lógica de LiveMapPage.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { Satellite, ExternalLink, Loader2, MapPin } from 'lucide-react';
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
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '3.5rem 2rem', gap: '1rem',
          background: 'var(--muted)',
          borderRadius: '0.875rem',
          border: '1px dashed var(--panel-border)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'oklch(0.92 0.02 240)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MapPin size={26} style={{ color: 'oklch(0.55 0.04 250)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-h)', fontSize: '0.9375rem' }}>
              No hay recorridos activos
            </p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: 'var(--text)' }}>
              El mapa se mostrará cuando inicien nuevas rutas.
            </p>
          </div>
        </div>
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
