// backend/src/services/delayAlertService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Servicio para notificar a ciudadanos sobre retrasos en recorridos de recolección.
//
// Responsabilidades:
//   1. Recibir la notificación de retraso desde el simulador.
//   2. Obtener la geometría de la ruta desde la caché.
//   3. Obtener zonas de interés activas.
//   4. Filtrar zonas afectadas (<= 300m de la ruta).
//   5. Notificar a cada ciudadano único afectado (una sola alerta por usuario).
// ─────────────────────────────────────────────────────────────────────────────

import { pool } from '../db';
import { haversineMeters } from '../utils/geo';
import { NotificationService } from '../modules/notifications';
import * as NotificationRepository from '../modules/notifications/notification.repository';
import * as NotificationMessages from '../constants/notificationMessages';
import { getRouteGeometry } from './simulationService';

// ─── Configuración ────────────────────────────────────────────────────────────

const DELAY_RADIUS_METERS = 300;

// Caché para evitar re-notificar a los ciudadanos por el mismo recorrido retrasado.
// La BD ya deduplica, pero esto ahorra consultas costosas a BD y geometría en cada tick retrasado.
const delayProcessed = new Set<number>();

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ZonaActiva {
  id: number;
  usuario_id: number;
  alias: string;
  latitud: number;
  longitud: number;
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Notifica a los ciudadanos que tienen una zona de interés cerca de la ruta
 * de un camión que se ha retrasado.
 * 
 * @param recorridoId El ID del recorrido.
 * @param delayMinutes Los minutos estimados de retraso.
 */
export async function notifyCitizensOfDelay(
  recorridoId: number,
  delayMinutes: number
): Promise<void> {
  // Evitar recalcular y re-notificar si ya procesamos este recorrido
  if (delayProcessed.has(recorridoId)) return;

  try {
    const geometry = getRouteGeometry(recorridoId);
    if (!geometry || geometry.length === 0) {
      console.warn(`[DelayAlert] No hay geometría disponible para recorridoId: ${recorridoId}`);
      return;
    }

    // Obtener zonas de interés activas
    const [rows] = await pool.execute<any[]>(
      `SELECT id, usuario_id, alias,
              CAST(latitud AS DECIMAL(10,8)) AS latitud,
              CAST(longitud AS DECIMAL(11,8)) AS longitud
       FROM zonas_interes
       WHERE activo = TRUE`
    );

    if (!rows || rows.length === 0) return;

    const zonas = rows as ZonaActiva[];
    const usuariosNotificados = new Set<number>();

    for (const zona of zonas) {
      // Unificar ciudadanos: si ya le notificamos por otra zona, saltar
      if (usuariosNotificados.has(zona.usuario_id)) continue;

      let afectada = false;

      // Calcular distancia Haversine a la geometría real de la ruta
      for (const point of geometry) {
        const distancia = haversineMeters(
          Number(zona.latitud),
          Number(zona.longitud),
          point.lat,
          point.lng
        );

        if (distancia <= DELAY_RADIUS_METERS) {
          afectada = true;
          break;
        }
      }

      if (afectada) {
        // Consultar preferencias del usuario para la alerta de retraso
        const preferencias = await NotificationRepository.getPreferenciasUsuario(zona.usuario_id);
        
        if (!preferencias.retraso_enabled) {
          // Marcar como procesado localmente para evitar procesar otras zonas del mismo usuario
          usuariosNotificados.add(zona.usuario_id);
          continue;
        }

        // Crear notificación persistente (BD se encarga de la deduplicación final ante reinicios)
        // NOTA: crearSiNoExiste usa `usuario_id` para garantizar que un usuario no reciba duplicados
        // y permitir que otros usuarios sí la reciban.
        const notif = await NotificationService.crearSiNoExiste({
          recorrido_id: recorridoId,
          usuario_id: zona.usuario_id,
          ...NotificationMessages.RETRASO_DETECTADO_CIUDADANO(delayMinutes),
          tipo: 'AUTOMATICA',
          categoria: 'RECORRIDO',
        });

        if (notif) {
          console.log(`[DelayAlert] ✅ Alerta de retraso enviada → usuario:${zona.usuario_id} zona:"${zona.alias}" recorrido:${recorridoId} retraso:${delayMinutes}min`);
        }
        
        usuariosNotificados.add(zona.usuario_id);
      }
    }

    // Marcar como procesado en caché en memoria independientemente del resultado individual
    delayProcessed.add(recorridoId);
  } catch (err) {
    console.error('[DelayAlert] Error al notificar retraso a ciudadanos:', err);
  }
}

// ─── Limpieza de caché ────────────────────────────────────────────────────────

/**
 * Limpia el caché de un recorridoId que ha finalizado o sido cancelado.
 * 
 * @param recorridoId El ID del recorrido.
 */
export function clearDelayCache(recorridoId: number): void {
  if (delayProcessed.has(recorridoId)) {
    delayProcessed.delete(recorridoId);
    console.log(`[DelayAlert] 🧹 Caché limpiado para recorridoId:${recorridoId}`);
  }
}
