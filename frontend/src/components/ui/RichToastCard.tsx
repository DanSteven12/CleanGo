// frontend/src/components/ui/RichToastCard.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ArrowRight,
  Truck,
  Route,
  FileWarning,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RichToastTipo = 'RECORRIDO' | 'CAMION' | 'REPORTE' | 'INCIDENCIA';

export interface RichToastData {
  id: string;
  tipo: RichToastTipo;
  titulo: string;
  mensaje: string;
  timestamp: Date;
  /** If provided, shows a "Ver detalles →" button that navigates here. */
  ruta?: string;
}

// ─── Per-type visual config ───────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  RichToastTipo,
  {
    icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>;
    iconBg: string;
    iconColor: string;
    accentColor: string;
    label: string;
  }
> = {
  RECORRIDO: {
    icon: Route,
    iconBg: 'rgba(56, 140, 53, 0.14)',
    iconColor: '#90BF49',
    accentColor: '#388C35',
    label: 'Recorrido',
  },
  CAMION: {
    icon: Truck,
    iconBg: 'rgba(23, 99, 166, 0.14)',
    iconColor: '#5b9ed6',
    accentColor: '#1763A6',
    label: 'Camión',
  },
  REPORTE: {
    icon: FileWarning,
    iconBg: 'rgba(251, 146, 60, 0.14)',
    iconColor: '#fb923c',
    accentColor: '#f97316',
    label: 'Reporte',
  },
  INCIDENCIA: {
    icon: AlertTriangle,
    iconBg: 'rgba(239, 68, 68, 0.14)',
    iconColor: '#f87171',
    accentColor: '#dc2626',
    label: 'Incidencia',
  },
};

// ─── Auto-dismiss duration (must match CSS var --rich-toast-duration) ─────────

export const RICH_TOAST_DURATION_MS = 8_000;

// ─── Relative time helper ─────────────────────────────────────────────────────

function useRelativeTime(date: Date): string {
  const [text, setText] = useState('Ahora mismo');

  useEffect(() => {
    const update = () => {
      const secs = Math.floor((Date.now() - date.getTime()) / 1000);
      if (secs < 8) setText('Ahora mismo');
      else if (secs < 60) setText(`Hace ${secs} segundos`);
      else if (secs < 120) setText('Hace un minuto');
      else setText(`Hace ${Math.floor(secs / 60)} minutos`);
    };
    update();
    const interval = setInterval(update, 15_000);
    return () => clearInterval(interval);
  }, [date]);

  return text;
}

// ─── RichToastCard ────────────────────────────────────────────────────────────

interface RichToastCardProps {
  toast: RichToastData;
  onClose: (id: string) => void;
}

export const RichToastCard: React.FC<RichToastCardProps> = ({
  toast,
  onClose,
}) => {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[toast.tipo];
  const Icon = config.icon;
  const relativeTime = useRelativeTime(toast.timestamp);

  const handleNavigate = () => {
    onClose(toast.id);
    if (toast.ruta) navigate(toast.ruta);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 48, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 56, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.85 }}
      role="alert"
      aria-atomic="true"
      style={{
        position: 'relative',
        width: '348px',
        background: 'oklch(0.17 0.04 250)',
        border: '1px solid oklch(0.26 0.04 250)',
        borderLeft: `3px solid ${config.accentColor}`,
        borderRadius: '12px',
        padding: '14px 14px 12px',
        boxShadow:
          '0 8px 32px oklch(0.05 0.02 250 / 0.72), 0 2px 8px oklch(0.1 0.03 250 / 0.45)',
        overflow: 'hidden',
        pointerEvents: 'all',
      }}
    >
      {/* Top shimmer line */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent 10%, ${config.accentColor}55, transparent 90%)`,
        }}
      />

      {/* ── Header row ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Icon badge */}
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: config.iconBg,
            border: `1px solid ${config.accentColor}28`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} color={config.iconColor} strokeWidth={2} />
        </div>

        {/* Category chip + title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.675rem',
              fontWeight: 700,
              color: config.iconColor,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              background: config.iconBg,
              padding: '1px 6px',
              borderRadius: '4px',
              marginBottom: '4px',
              lineHeight: 1.6,
            }}
          >
            {config.label}
          </span>
          <h4
            style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#f1f5f9',
              letterSpacing: '-0.015em',
              lineHeight: 1.3,
            }}
          >
            {toast.titulo}
          </h4>
        </div>

        {/* Close button */}
        <button
          id={`rich-toast-close-${toast.id}`}
          onClick={() => onClose(toast.id)}
          aria-label="Cerrar notificación"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '3px',
            borderRadius: '6px',
            color: 'oklch(0.50 0.04 250)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = 'oklch(0.28 0.04 250)';
            btn.style.color = '#f1f5f9';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = 'transparent';
            btn.style.color = 'oklch(0.50 0.04 250)';
          }}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Message ─────────────────────────────────────── */}
      <p
        style={{
          margin: '10px 0 0 54px',
          fontSize: '0.8125rem',
          color: 'oklch(0.70 0.03 250)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {toast.mensaje}
      </p>

      {/* ── Footer: time + action ────────────────────────── */}
      <div
        style={{
          marginTop: '11px',
          marginLeft: '54px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            color: 'oklch(0.46 0.035 250)',
            fontStyle: 'italic',
          }}
        >
          {relativeTime}
        </span>

        {toast.ruta && (
          <button
            id={`rich-toast-action-${toast.id}`}
            onClick={handleNavigate}
            style={{
              background: 'transparent',
              border: `1px solid ${config.accentColor}45`,
              borderRadius: '6px',
              cursor: 'pointer',
              padding: '3px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: config.iconColor,
              transition: 'background 0.15s ease, border-color 0.15s ease',
              letterSpacing: '-0.01em',
              lineHeight: 1.6,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = config.iconBg;
              btn.style.borderColor = config.accentColor;
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = 'transparent';
              btn.style.borderColor = `${config.accentColor}45`;
            }}
          >
            Ver detalles
            <ArrowRight size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── Auto-dismiss progress bar ────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          background: config.accentColor,
          opacity: 0.6,
          borderRadius: '0 0 0 12px',
          animationName: 'cleango-rich-toast-progress',
          animationDuration: `${RICH_TOAST_DURATION_MS}ms`,
          animationTimingFunction: 'linear',
          animationFillMode: 'forwards',
        }}
      />
    </motion.div>
  );
};
