import api from './api';

export interface Notificacion {
  id: number;
  usuario_id: number | null;
  conductor_id: number | null;
  recorrido_id: number | null;
  titulo: string;
  mensaje: string;
  tipo: 'AUTOMATICA' | 'MANUAL';
  categoria: 'REPORTE' | 'RECORRIDO' | 'RUTA' | 'AVISO';
  destinatario: 'CIUDADANOS' | 'CONDUCTORES' | 'AMBOS';
  leida: 0 | 1; // MySQL devuelve 0 o 1 para boolean
  fecha_lectura: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene todas las notificaciones del ciudadano autenticado
 */
export async function getNotificaciones(): Promise<Notificacion[]> {
  try {
    const response = await api.get('/ciudadano/notificaciones');
    return response.data;
  } catch (error) {
    console.error('[notificacionesService] Error al obtener notificaciones:', error);
    throw error;
  }
}

/**
 * Marca una notificación como leída
 */
export async function marcarComoLeida(id: number): Promise<void> {
  try {
    await api.patch(`/ciudadano/notificaciones/${id}/leida`);
  } catch (error) {
    console.error(`[notificacionesService] Error al marcar notificación ${id} como leída:`, error);
    throw error;
  }
}

/**
 * Marca todas las notificaciones del ciudadano como leídas
 */
export async function marcarTodasComoLeidas(): Promise<void> {
  try {
    await api.patch('/ciudadano/notificaciones/marcar-todas-leidas');
  } catch (error) {
    console.error('[notificacionesService] Error al marcar todas las notificaciones como leídas:', error);
    throw error;
  }
}

/**
 * Elimina una notificación por su ID
 */
export async function eliminarNotificacion(id: number): Promise<void> {
  try {
    await api.delete(`/ciudadano/notificaciones/${id}`);
  } catch (error) {
    console.error(`[notificacionesService] Error al eliminar notificación ${id}:`, error);
    throw error;
  }
}

/**
 * Obtiene el número de notificaciones no leídas del ciudadano
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const response = await api.get('/ciudadano/notificaciones/unread');
    return response.data.unreadCount;
  } catch (error) {
    console.error('[notificacionesService] Error al obtener conteo de no leídas:', error);
    return 0; // Si falla, retorna 0 para no romper la UI
  }
}
