// frontend/src/hooks/useRichToast.ts
//
// Manages Rich Toast state and registers Socket.IO listeners for important
// real-time events.
//
// IMPORTANT — listener coexistence with useLiveMapData:
//   useLiveMapData already listens to 'nuevo_recorrido_iniciado' and
//   'recorrido_finalizado' solely to refresh route data (no UI side-effect).
//   Socket.IO dispatches each event to ALL registered handlers independently,
//   so both hooks coexist without conflict: useLiveMapData refreshes data,
//   useRichToast shows the Rich Toast. No visual duplication occurs.
//
// Deduplication: a per-instance Set (ref) prevents double-firing within a
// 2-second window in case the server emits the same event more than once.

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socketService';
import { useAuth } from './useAuth';
import type { RichToastData, RichToastTipo } from '../components/ui/RichToastCard';
import { RICH_TOAST_DURATION_MS } from '../components/ui/RichToastCard';
import type { Notificacion } from '../types/notificaciones';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_VISIBLE_TOASTS = 4;
const DEDUPE_WINDOW_MS = 2_000;

// ─── ID generator ─────────────────────────────────────────────────────────────

let _counter = 0;
const generateId = (): string => `rct-${++_counter}-${Date.now()}`;

// ─── Global Helper to Trigger Rich Toast from Any Component ───────────────────

export function triggerRichToast(data: {
  tipo: RichToastTipo;
  titulo: string;
  mensaje: string;
  ruta?: string;
}) {
  window.dispatchEvent(new CustomEvent('cleango-rich-toast', { detail: data }));
}

// ─── Payload shapes emitted by the backend ────────────────────────────────────

interface RecorridoPayload {
  mensaje?: string;
  camion?: string;
  ruta?: string;
  recorrido_id?: number;
  asignacion_id?: number;
}

interface ReportePayload {
  mensaje?: string;
  id?: number | string;
  descripcion?: string;
}

interface IncidenciaPayload {
  mensaje?: string;
  camion?: string;
  detalle?: string;
}

// ─── useRichToast ─────────────────────────────────────────────────────────────

export function useRichToast() {
  const { user } = useAuth();
  const [toasts, setToasts] = useState<RichToastData[]>([]);

  // Track active auto-dismiss timers so we can clear them on manual dismiss
  // and on unmount.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Per-instance deduplication set
  const recentEventsRef = useRef<Set<string>>(new Set());

  // ── dismissToast ──────────────────────────────────────────────────────────

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── addToast ──────────────────────────────────────────────────────────────

  const addToast = useCallback(
    (data: { tipo: RichToastTipo; titulo: string; mensaje: string; ruta?: string }) => {
      // Deduplication: same tipo+titulo within DEDUPE_WINDOW_MS is ignored.
      const dedupeKey = `${data.tipo}::${data.titulo}::${data.mensaje?.slice(0, 30) || ''}`;
      if (recentEventsRef.current.has(dedupeKey)) return;
      recentEventsRef.current.add(dedupeKey);
      setTimeout(
        () => recentEventsRef.current.delete(dedupeKey),
        DEDUPE_WINDOW_MS
      );

      const id = generateId();
      const newToast: RichToastData = { ...data, id, timestamp: new Date() };

      // Cap at MAX_VISIBLE_TOASTS (newest on top)
      setToasts((prev) => [newToast, ...prev].slice(0, MAX_VISIBLE_TOASTS));

      // Auto-dismiss
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, RICH_TOAST_DURATION_MS);
      timersRef.current.set(id, timer);
    },
    []
  );

  // ── Cleanup timers on unmount ─────────────────────────────────────────────

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // ── Window CustomEvent listener (imperative triggers) ───────────────────────

  useEffect(() => {
    const handleCustomToast = (event: Event) => {
      const customEvent = event as CustomEvent<{
        tipo: RichToastTipo;
        titulo: string;
        mensaje: string;
        ruta?: string;
      }>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };

    window.addEventListener('cleango-rich-toast', handleCustomToast);
    return () => {
      window.removeEventListener('cleango-rich-toast', handleCustomToast);
    };
  }, [addToast]);

  // ── Socket.IO listeners ───────────────────────────────────────────────────
  // Only active when a user is authenticated.

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    // ── notificacion_nueva ───────────────────────────────────────────────────
    // Primary real-time event emitted by backend NotificationService
    const handleNotificacionNueva = (notif?: Partial<Notificacion>) => {
      if (!notif || !notif.titulo) return;

      const tituloLower = (notif.titulo || '').toLowerCase();
      const mensajeLower = (notif.mensaje || '').toLowerCase();
      const cat = (notif.categoria || '').toUpperCase();

      const isIncidencia =
        tituloLower.includes('retraso') ||
        tituloLower.includes('incidencia') ||
        tituloLower.includes('falla') ||
        tituloLower.includes('avería') ||
        tituloLower.includes('alerta') ||
        tituloLower.includes('urgente') ||
        mensajeLower.includes('retraso') ||
        mensajeLower.includes('incidencia');

      let tipo: RichToastTipo = 'RECORRIDO';
      let ruta: string = '/notificaciones';

      if (isIncidencia) {
        tipo = 'INCIDENCIA';
        ruta = '/mapa-vivo';
      } else if (cat === 'REPORTE') {
        tipo = 'REPORTE';
        ruta = '/reportes';
      } else if (cat === 'RECORRIDO') {
        tipo = 'RECORRIDO';
        ruta = notif.recorrido_id ? '/mapa-vivo' : '/mapa-vivo';
      } else if (cat === 'RUTA') {
        tipo = 'RECORRIDO';
        ruta = '/rutas';
      } else if (cat === 'PROXIMIDAD') {
        tipo = 'CAMION';
        ruta = '/mapa-vivo';
      } else {
        tipo = 'CAMION';
        ruta = '/notificaciones';
      }

      addToast({
        tipo,
        titulo: notif.titulo,
        mensaje: notif.mensaje || '',
        ruta,
      });

      // Notify other parts of the UI (like AppSidebar and NotificacionesPage)
      window.dispatchEvent(new CustomEvent('notificacion-recibida', { detail: notif }));
    };

    // ── nuevo_recorrido_iniciado ─────────────────────────────────────────────
    // NOTE: useLiveMapData also listens to this event for data refresh only.
    // There is no visual conflict — see module-level comment.
    const handleNuevoRecorrido = (data?: RecorridoPayload) => {
      const camion = data?.camion;
      const ruta = data?.ruta;
      addToast({
        tipo: 'RECORRIDO',
        titulo: 'Recorrido iniciado',
        mensaje:
          data?.mensaje ??
          (camion
            ? `El camión ${camion} ha iniciado el recorrido${ruta ? ` ${ruta}` : ''}.`
            : 'Un nuevo recorrido ha comenzado en la plataforma.'),
        ruta: '/mapa-vivo',
      });
      window.dispatchEvent(new CustomEvent('notificacion-recibida'));
    };

    // ── recorrido_finalizado ─────────────────────────────────────────────────
    // NOTE: useLiveMapData also listens to this event for data refresh only.
    const handleRecorridoFinalizado = (data?: RecorridoPayload) => {
      const camion = data?.camion;
      addToast({
        tipo: 'RECORRIDO',
        titulo: 'Recorrido finalizado',
        mensaje:
          data?.mensaje ??
          (camion
            ? `El camión ${camion} ha completado su recorrido.`
            : 'Un recorrido ha sido completado exitosamente.'),
        ruta: '/historial',
      });
      window.dispatchEvent(new CustomEvent('notificacion-recibida'));
    };

    // ── nuevo_reporte (fallback) ─────────────────────────────────────────────
    const handleNuevoReporte = (data?: ReportePayload) => {
      const idLabel = data?.id
        ? `#${String(data.id).padStart(4, '0')}`
        : '';
      addToast({
        tipo: 'REPORTE',
        titulo: 'Nuevo reporte ciudadano',
        mensaje:
          data?.mensaje ??
          (idLabel
            ? `Reporte ${idLabel} recibido${data?.descripcion ? `: ${data.descripcion}` : ''}.`
            : 'Se ha recibido un nuevo reporte ciudadano.'),
        ruta: '/reportes',
      });
      window.dispatchEvent(new CustomEvent('notificacion-recibida'));
    };

    // ── incidencia_detectada (fallback) ──────────────────────────────────────
    const handleIncidencia = (data?: IncidenciaPayload) => {
      const camion = data?.camion;
      addToast({
        tipo: 'INCIDENCIA',
        titulo: 'Incidencia detectada',
        mensaje:
          data?.mensaje ??
          (camion
            ? `El camión ${camion} presenta una incidencia${data?.detalle ? `: ${data.detalle}` : ''}.`
            : 'Se ha detectado una incidencia en la operación.'),
        ruta: '/mapa-vivo',
      });
      window.dispatchEvent(new CustomEvent('notificacion-recibida'));
    };

    socket.on('notificacion_nueva', handleNotificacionNueva);
    socket.on('nuevo_recorrido_iniciado', handleNuevoRecorrido);
    socket.on('recorrido_finalizado', handleRecorridoFinalizado);
    socket.on('nuevo_reporte', handleNuevoReporte);
    socket.on('incidencia_detectada', handleIncidencia);

    return () => {
      socket.off('notificacion_nueva', handleNotificacionNueva);
      socket.off('nuevo_recorrido_iniciado', handleNuevoRecorrido);
      socket.off('recorrido_finalizado', handleRecorridoFinalizado);
      socket.off('nuevo_reporte', handleNuevoReporte);
      socket.off('incidencia_detectada', handleIncidencia);
    };
  }, [user, addToast]);

  return { toasts, dismissToast };
}
