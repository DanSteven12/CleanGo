// frontend/src/hooks/useNotificaciones.ts
import { useState, useEffect, useCallback } from 'react';
import { obtenerNotificacionesAdmin, marcarComoLeida } from '../services/notificacionesService';
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
      setNotificaciones(res.data);
      setTotalRegistros(res.pagination.total);
      setSummary(res.summary);
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
      // Emitimos el evento global para que el AppSidebar reduzca su contador
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
  };
}
