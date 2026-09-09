// mobile-ciudadano/services/preferenciasService.ts
/**
 * Servicio de Preferencias de Notificaciones del ciudadano.
 *
 * Reutiliza el cliente Axios (api.ts) que inyecta automáticamente
 * el Bearer Token desde SecureStore en cada petición.
 *
 * Endpoints:
 *   GET  /ciudadano/preferencias  → obtener preferencias del usuario autenticado
 *   PUT  /ciudadano/preferencias  → actualizar una o más preferencias (parcial)
 */
import api from './api';

export interface PreferenciasNotificaciones {
  usuario_id: number;
  notificaciones_push_enabled: boolean;
  proximidad_enabled: boolean;
  retraso_enabled: boolean;
  updated_at?: string;
}

export interface ActualizarPreferenciasPayload {
  notificaciones_push_enabled?: boolean;
  proximidad_enabled?: boolean;
  retraso_enabled?: boolean;
}

/**
 * Obtiene las preferencias de notificaciones del ciudadano autenticado.
 * Si no existe un registro previo, el backend lo crea con todos los valores en true.
 */
export async function getPreferencias(): Promise<PreferenciasNotificaciones> {
  const response = await api.get('/ciudadano/preferencias');
  return response.data;
}

/**
 * Actualiza una o más preferencias del ciudadano autenticado.
 * Solo los campos enviados serán modificados; los demás conservan su valor actual.
 */
export async function updatePreferencias(
  data: ActualizarPreferenciasPayload
): Promise<PreferenciasNotificaciones> {
  const response = await api.put('/ciudadano/preferencias', data);
  return response.data;
}
