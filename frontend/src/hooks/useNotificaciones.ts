// frontend/src/hooks/useNotificaciones.ts
import { useState, useEffect, useCallback } from 'react';
import {
  obtenerNotificacionesAdmin,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
  limpiarNotificacionesLeidas,
} from '../services/notificacionesService';
import type { Notificacion, FiltrosNotificaciones } from '../types/notificaciones';
import { toast } from 'sonner';

export function useNotificaciones(filtrosIniciales?: FiltrosNotificaciones) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [summary, setSummary] = useState({ unread: 0, thisWeek: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de filtrado y paginación
  const [filtros, setFiltros] = useState<FiltrosNotificaciones>({
    page: 1,
    limit: 10,
    ...filtrosIniciales
  });

  const cargarNotificaciones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await obtenerNotificacionesAdmin(filtros);
      // Defensive check in case the backend returns an array or pagination is undefined
      if (Array.isArray(res)) {
        setNotificaciones(res);
        setTotalRegistros(res.length);
        setSummary({ unread: res.filter((n: Notificacion) => !n.leida).length, thisWeek: res.length });
      } else {
        setNotificaciones(res.data || []);
        setTotalRegistros(res.pagination?.total || 0);
        setSummary(res.summary || { unread: 0, thisWeek: 0 });
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar las notificaciones.');
      toast.error('Error al cargar notificaciones', {
        description: err.message || 'Intente nuevamente más tarde.',
      });
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarNotificaciones();
    const handleRecibida = () => {
      cargarNotificaciones();
    };
    window.addEventListener('notificacion-recibida', handleRecibida);
    return () => window.removeEventListener('notificacion-recibida', handleRecibida);
  }, [cargarNotificaciones]);

  const actualizarFiltro = useCallback((nuevoFiltro: Partial<FiltrosNotificaciones>) => {
    setFiltros(prev => ({
      ...prev,
      ...nuevoFiltro,
      page: 1 // Reiniciar a pág 1 siempre que cambie un filtro
    }));
  }, []);

  const cambiarPagina = useCallback((page: number) => {
    setFiltros(prev => ({ ...prev, page }));
  }, []);

  const marcarLeida = useCallback(async (id: number) => {
    const notif = notificaciones.find((n) => n.id === id);
    if (!notif || notif.leida) return;

    // Actualización optimista localmente
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true, fecha_lectura: new Date().toISOString() } : n))
    );
    setSummary((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));

    try {
      await marcarComoLeida(id);
      window.dispatchEvent(new CustomEvent('notificacion-leida'));
    } catch (err: any) {
      // Revertimos en caso de error
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: false, fecha_lectura: null } : n))
      );
      setSummary((prev) => ({ ...prev, unread: prev.unread + 1 }));
      toast.error('Error', {
        description: err.message || 'No se pudo marcar la notificación como leída.',
      });
    }
  }, [notificaciones]);

  const marcarTodasLeidas = useCallback(async () => {
    if (summary.unread === 0) return;

    const prevNotifs = notificaciones;
    const prevSummary = summary;

    // Actualización optimista
    setNotificaciones((prev) =>
      prev.map((n) => ({
        ...n,
        leida: true,
        fecha_lectura: n.fecha_lectura || new Date().toISOString(),
      }))
    );
    setSummary((prev) => ({ ...prev, unread: 0 }));

    try {
      await marcarTodasComoLeidas();
      window.dispatchEvent(new CustomEvent('notificacion-leida'));
      toast.success('Todas las notificaciones fueron marcadas como leídas.');
    } catch (err: any) {
      setNotificaciones(prevNotifs);
      setSummary(prevSummary);
      toast.error('Error', {
        description: err.message || 'No se pudieron marcar las notificaciones como leídas.',
      });
    }
  }, [summary, notificaciones]);

  const eliminarNotif = useCallback(async (id: number) => {
    const notif = notificaciones.find((n) => n.id === id);
    if (!notif) return;

    const prevNotifs = notificaciones;
    const prevSummary = summary;
    const prevTotal = totalRegistros;

    // Optimistic removal
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    setTotalRegistros((prev) => Math.max(0, prev - 1));
    if (!notif.leida) {
      setSummary((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    }

    try {
      await eliminarNotificacion(id);
      window.dispatchEvent(new CustomEvent('notificacion-leida'));
      toast.success('Notificación eliminada.');
    } catch (err: any) {
      setNotificaciones(prevNotifs);
      setSummary(prevSummary);
      setTotalRegistros(prevTotal);
      toast.error('Error', {
        description: err.message || 'No se pudo eliminar la notificación.',
      });
    }
  }, [notificaciones, summary, totalRegistros]);

  const limpiarLeidas = useCallback(async () => {
    const leidasCount = notificaciones.filter((n) => n.leida).length;
    if (leidasCount === 0 && totalRegistros === summary.unread) return;

    const prevNotifs = notificaciones;
    const prevTotal = totalRegistros;

    // Optimistic removal of read notifications
    setNotificaciones((prev) => prev.filter((n) => !n.leida));
    setTotalRegistros((prev) => Math.max(0, prev - leidasCount));

    try {
      const res = await limpiarNotificacionesLeidas();
      window.dispatchEvent(new CustomEvent('notificacion-leida'));
      toast.success(res.message || 'Notificaciones leídas eliminadas.');
      cargarNotificaciones();
    } catch (err: any) {
      setNotificaciones(prevNotifs);
      setTotalRegistros(prevTotal);
      toast.error('Error', {
        description: err.message || 'No se pudieron eliminar las notificaciones leídas.',
      });
    }
  }, [notificaciones, totalRegistros, summary.unread, cargarNotificaciones]);

  return {
    notificaciones,
    totalRegistros,
    summary,
    loading,
    error,
    filtros,
    actualizarFiltro,
    cambiarPagina,
    recargar: cargarNotificaciones,
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotif,
    limpiarLeidas,
  };
}

