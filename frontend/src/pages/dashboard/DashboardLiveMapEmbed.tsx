// frontend/src/pages/dashboard/DashboardLiveMapEmbed.tsx
// Componente liviano de solo lectura para mostrar recorridos activos en el Dashboard.
// No modifica ni duplica la lógica de LiveMapPage.
// Solo consulta /api/asignaciones y muestra estado vacío si no hay recorridos activos.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Satellite,
  Truck,
  User,
  Clock,
  MapPin,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { AsignacionRecord } from '../../types/routes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardLiveMapEmbedProps {
  /** Número máximo de tarjetas a mostrar (por defecto 3) */
  maxCards?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DashboardLiveMapEmbed: React.FC<DashboardLiveMapEmbedProps> = ({ maxCards = 3 }) => {
  const navigate = useNavigate();
  const [asignaciones, setAsignaciones] = useState<AsignacionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchActivos = async () => {
      try {
        const res = await fetch('/api/asignaciones');
        if (!res.ok) throw new Error('Error al obtener asignaciones');
        const data: AsignacionRecord[] = await res.json();
        if (!cancelled) {
          const activos = data.filter(
            (a) => a.estatus_recorrido === 'En progreso' || a.estatus_recorrido === 'Pendiente'
          );
          setAsignaciones(activos.slice(0, maxCards));
        }
      } catch {
        if (!cancelled) setAsignaciones([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchActivos();
    // Refrescar cada 30 segundos para reflejar cambios sin recargar la página
    const interval = setInterval(() => void fetchActivos(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [maxCards]);

  const enProgreso = asignaciones.filter((a) => a.estatus_recorrido === 'En progreso');
  const pendientes = asignaciones.filter((a) => a.estatus_recorrido === 'Pendiente');

  // ── Render ──────────────────────────────────────────────────────────────────
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
          Abrir Mapa en Vivo
        </button>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: 'var(--text)' }}>
          <Loader2 size={20} style={{ animation: 'spin-loop 0.9s linear infinite' }} />
          <span style={{ fontSize: '0.875rem' }}>Cargando recorridos...</span>
        </div>
      ) : asignaciones.length === 0 ? (
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
              No hay recorridos en progreso en este momento
            </p>
          </div>
          <button
            id="dashboard-ir-mapa-vivo-empty"
            onClick={() => navigate('/mapa-vivo')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.625rem 1.25rem',
              background: 'linear-gradient(135deg, #1763A6, #152C40)',
              color: 'white', border: 'none', borderRadius: '0.625rem',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 8px #1763A640',
            }}
          >
            <ExternalLink size={14} />
            Ir al Mapa en Vivo
          </button>
        </div>
      ) : (
        /* Tarjetas de recorridos activos */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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

          {/* Grilla de tarjetas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.875rem' }}>
            {asignaciones.map((a) => {
              const isActive = a.estatus_recorrido === 'En progreso';
              return (
                <div
                  key={a.id}
                  style={{
                    background: 'var(--panel-bg)',
                    border: `1px solid ${isActive ? 'oklch(0.56 0.18 145 / 0.3)' : 'var(--border)'}`,
                    borderRadius: '0.875rem',
                    padding: '1.125rem',
                    display: 'flex', flexDirection: 'column', gap: '0.875rem',
                    boxShadow: isActive
                      ? '0 0 0 1px oklch(0.56 0.18 145 / 0.12), 0 4px 16px -4px oklch(0.2 0.04 240 / 0.08)'
                      : '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06), 0 4px 16px -4px oklch(0.2 0.04 240 / 0.08)',
                  }}
                >
                  {/* Ruta + estado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.25rem 0.6rem',
                      background: `${a.ruta_color}18`,
                      border: `1px solid ${a.ruta_color}40`,
                      borderRadius: '999px',
                      fontSize: '0.75rem', fontWeight: 600,
                      color: a.ruta_color,
                      flexGrow: 1, minWidth: 0,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.ruta_color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.ruta_nombre}
                      </span>
                    </span>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      fontSize: '0.7rem', fontWeight: 700,
                      background: isActive ? 'oklch(0.56 0.18 145 / 0.15)' : 'oklch(0.78 0.16 75 / 0.15)',
                      color: isActive ? 'oklch(0.42 0.14 145)' : 'oklch(0.50 0.12 75)',
                      border: `1px solid ${isActive ? 'oklch(0.56 0.18 145 / 0.3)' : 'oklch(0.78 0.16 75 / 0.3)'}`,
                    }}>
                      {a.estatus_recorrido}
                    </span>
                  </div>

                  {/* Info camión + conductor */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-h)' }}>
                        <Truck size={13} style={{ color: '#1763A6' }} />
                        {a.numero_economico}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
                        <User size={12} style={{ color: 'var(--text)' }} />
                        {a.conductor_nombre}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text)', fontSize: '0.78rem' }}>
                      <Clock size={12} style={{ color: 'var(--text)' }} />
                      {a.horario_inicio?.slice(0, 5)} – {a.horario_fin?.slice(0, 5)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enlace al mapa completo */}
          <button
            id="dashboard-ver-mapa-completo"
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
