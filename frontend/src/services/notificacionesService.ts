// frontend/src/services/notificacionesService.ts
import { ApiError } from './authService';
import type { AvisoManualPayload, FiltrosNotificaciones, Notificacion, NotificacionesResponse } from '../types/notificaciones';

const BASE = '/api/notificaciones';

/**
 * Función auxiliar para manejar la respuesta estándar y lanzar `ApiError`
 * en caso de que la respuesta no sea exitosa, manteniendo compatibilidad
 * con la forma en que `authService` maneja los errores.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    data = { message: 'Error inesperado al parsear respuesta del servidor.' };
  }

  if (!res.ok) {
    throw new ApiError(
      data.error || data.message || `Error ${res.status}`,
      res.status
    );
  }

  return data as T;
}

/**
 * Obtiene todas las notificaciones (orientado al administrador).
 * Soporta filtros opcionales.
 */
export async function obtenerNotificacionesAdmin(
  filtros?: FiltrosNotificaciones
): Promise<NotificacionesResponse> {
  const url = new URL(BASE, window.location.origin);

  if (filtros) {
    if (filtros.tipo && filtros.tipo !== 'ALL') url.searchParams.append('tipo', filtros.tipo);
    if (filtros.categoria && filtros.categoria !== 'ALL') url.searchParams.append('categoria', filtros.categoria);
    if (filtros.leida !== undefined && filtros.leida !== 'ALL') url.searchParams.append('leida', String(filtros.leida));
    if (filtros.usuario_id) url.searchParams.append('usuario_id', String(filtros.usuario_id));
    if (filtros.conductor_id) url.searchParams.append('conductor_id', String(filtros.conductor_id));
    if (filtros.page) url.searchParams.append('page', String(filtros.page));
    if (filtros.limit) url.searchParams.append('limit', String(filtros.limit));
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<NotificacionesResponse>(res);
}

/**
 * Marca una notificación específica como leída.
 */
export async function marcarComoLeida(id: number): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/${id}/leida`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });

  return handleResponse<{ message: string }>(res);
}

/**
 * Crea un aviso manual (dirigido a ciudadanos, conductores o ambos).
 */
export async function crearAvisoManual(payload: AvisoManualPayload): Promise<{ message: string }> {
  const url = new URL(BASE, window.location.origin);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse<{ message: string }>(res);
}
