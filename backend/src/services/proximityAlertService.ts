// backend/src/services/proximityAlertService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Servicio de detección de proximidad "Camión Cerca".
//
// Responsabilidades:
//   1. Cargar las zonas de interés activas del ciudadano desde la BD.
//   2. Aplicar Bounding Box en SQL para reducir candidatos eficientemente.
//   3. Confirmar con Haversine si la distancia real ≤ radio configurado.
//   4. Emitir UNA notificación por (recorridoId, usuarioId) usando:
//        a. Caché Set en memoria (rendimiento — se pierde al reiniciar).
//        b. NotificationService.crearSiNoExiste() (persistencia ante reinicios).
//   5. Limpiar el caché cuando un recorrido finaliza.
//
// Punto de entrada para simulationService.ts:
//   await checkProximity(recorridoId, lat, lng);
//
// No modifica: simulationService.ts, notification.service.ts, FCM, rutas, BD.
// ─────────────────────────────────────────────────────────────────────────────

import { pool } from '../db';
import { haversineMeters } from '../utils/geo';
import { NotificationService } from '../modules/notifications';

// ─── Configuración ────────────────────────────────────────────────────────────

/**
 * Radio en metros para considerar "Camión Cerca".
 * Configurable mediante variable de entorno PROXIMITY_RADIUS_METERS.
 * Por defecto: 300 metros.
 */
const PROXIMITY_RADIUS_METERS = process.env.PROXIMITY_RADIUS_METERS
  ? Number(process.env.PROXIMITY_RADIUS_METERS)
  : 300;

/**
 * Margen del Bounding Box en grados decimales para el filtro SQL previo.
 * 0.0045° ≈ 500m en latitud. 0.0055° ≈ 500m en longitud a latitud ~20°N.
 * Se usa un factor 1.2x para garantizar que ningún candidato real quede fuera.
 */
const LAT_MARGIN = (PROXIMITY_RADIUS_METERS / 111_000) * 1.2;
const LNG_MARGIN = (PROXIMITY_RADIUS_METERS / 90_000) * 1.2;

// ─── Caché en memoria ─────────────────────────────────────────────────────────

/**
 * Set de claves `"recorridoId:usuarioId"` para las que ya se envió alerta.
 *
 * - Evita consultar la BD en cada tick para usuarios ya notificados.
 * - Se pierde al reiniciar el servidor, pero NotificationService.crearSiNoExiste()
 *   garantiza la deduplicación definitiva consultando la BD.
 */
const alertasEnviadas = new Set<string>();

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ZonaCandidata {
  id: number;
  usuario_id: number;
  alias: string;
  latitud: number;
  longitud: number;
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Comprueba si el camión en un recorrido activo está dentro del radio de alguna
 * zona de interés activa. Si lo está y no se ha notificado aún, emite la alerta.
 *
 * Diseñado para ser llamado desde simulationService.ts con throttle (~30s).
 * Todos los errores quedan capturados y logueados sin propagar excepciones.
 *
 * @param recorridoId ID del recorrido activo.
 * @param lat         Latitud actual del camión (interpolada en tiempo real).
 * @param lng         Longitud actual del camión (interpolada en tiempo real).
 */
export async function checkProximity(
  recorridoId: number,
  lat: number,
  lng: number
): Promise<void> {
  try {
    // ── 1. Consultar zonas candidatas con Bounding Box en SQL ─────────────────
    //
    // El filtro matemático elimina el 99 % de las zonas antes de llegar a JS.
    // Solo las zonas dentro del cuadrado delimitador pasan a la fase Haversine.
    const [rows] = await pool.execute<any[]>(
      `SELECT zi.id, zi.usuario_id, zi.alias,
              CAST(zi.latitud AS DECIMAL(10,8))  AS latitud,
              CAST(zi.longitud AS DECIMAL(11,8)) AS longitud
       FROM zonas_interes zi
       WHERE zi.activo = TRUE
         AND zi.latitud  BETWEEN ? AND ?
         AND zi.longitud BETWEEN ? AND ?`,
      [
        lat - LAT_MARGIN,
        lat + LAT_MARGIN,
        lng - LNG_MARGIN,
        lng + LNG_MARGIN,
      ]
    );

    if (!rows || rows.length === 0) return;

    // ── 2. Filtrar con Haversine y notificar ──────────────────────────────────

    for (const zona of rows as ZonaCandidata[]) {
      const cacheKey = `${recorridoId}:${zona.usuario_id}`;

      // Saltar si ya está en el caché en memoria (camino rápido)
      if (alertasEnviadas.has(cacheKey)) continue;

      const distanciaMetros = haversineMeters(
        lat,
        lng,
        Number(zona.latitud),
        Number(zona.longitud)
      );

      if (distanciaMetros > PROXIMITY_RADIUS_METERS) continue;

      // ── 3. Intentar crear la notificación (deduplicación por BD) ─────────────
      //
      // crearSiNoExiste() consulta la tabla `notificaciones` antes de insertar.
      // Si ya existe una con (recorrido_id, categoria='PROXIMIDAD', titulo=...),
      // devuelve null sin insertar. Esto garantiza deduplicación tras reinicios.
      const titulo = '🚛 ¡El camión está cerca!';
      const mensaje =
        `El camión de recolección se encuentra a menos de ${Math.round(distanciaMetros)} m de "${zona.alias}". ` +
        '¡Prepara tus residuos!';

      const notif = await NotificationService.crearSiNoExiste({
        recorrido_id: recorridoId,
        usuario_id: zona.usuario_id,
        titulo,
        mensaje,
        tipo: 'AUTOMATICA',
        categoria: 'PROXIMIDAD',
      });

      // Agregar al caché en memoria independientemente del resultado de BD
      // (si notif es null, ya existía → igualmente la marcamos para no repetir
      // la consulta a BD en los próximos ticks)
      alertasEnviadas.add(cacheKey);

      if (notif) {
        console.log(
          `[ProximityAlert] ✅ Alerta enviada → usuario:${zona.usuario_id}` +
          ` zona:"${zona.alias}" dist:${Math.round(distanciaMetros)}m` +
          ` recorrido:${recorridoId}`
        );
      }
    }
  } catch (err) {
    // Capturar cualquier error para no tumbar el setInterval de simulationService
    console.error('[ProximityAlert] Error en checkProximity:', err);
  }
}

// ─── Limpieza de caché ────────────────────────────────────────────────────────

/**
 * Elimina todas las entradas del caché en memoria asociadas a un recorridoId.
 *
 * Debe llamarse desde simulationService.stopSimulation() para liberar memoria
 * y permitir que futuros recorridos del mismo camión puedan disparar alertas.
 *
 * @param recorridoId ID del recorrido que finalizó o fue cancelado.
 */
export function clearProximityCache(recorridoId: number): void {
  const prefix = `${recorridoId}:`;
  for (const key of alertasEnviadas) {
    if (key.startsWith(prefix)) {
      alertasEnviadas.delete(key);
    }
  }
  console.log(`[ProximityAlert] 🧹 Caché limpiado para recorridoId:${recorridoId}`);
}
