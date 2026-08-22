// mobile-conductor/services/camionService.ts
/**
 * Servicio para obtener la información del camión autenticado y su asignación actual.
 *
 * El camion_id SIEMPRE se obtiene del token JWT en el backend.
 * Ningún endpoint de este servicio acepta un camion_id manual del cliente.
 */
import api from './api';
import type { CamionAuth } from './authService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AsignacionActual {
  id: number;
  ruta_id: number;
  camion_id: number;
  conductor_id: number;
  fecha_programada: string;
  horario_inicio: string;
  horario_fin: string;
  estatus_recorrido: string;
  ruta_nombre: string;
  ruta_color: string;
  numero_economico: string;
  placa: string;
  gps_instalado: boolean;
  conductor_nombre: string;
  horario_ruta_inicio: string | null;
  horario_ruta_fin: string | null;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Obtiene el perfil completo del camión autenticado.
 * GET /api/device/auth/me
 * La identidad viene del JWT — nunca del cliente.
 */
export async function getCamionPerfil(): Promise<CamionAuth> {
  const response = await api.get<{ camion: CamionAuth }>('/device/auth/me');
  return response.data.camion;
}

/**
 * Obtiene la asignación actual del camión autenticado.
 * GET /api/device/auth/asignacion
 * Devuelve null si no hay asignación activa hoy.
 * La identidad viene del JWT — nunca del cliente.
 */
export async function getAsignacionActual(): Promise<AsignacionActual | null> {
  const response = await api.get<{ asignacion: AsignacionActual | null }>(
    '/device/auth/asignacion'
  );
  return response.data.asignacion;
}
