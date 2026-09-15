import { Server } from 'socket.io';
import { pool } from '../db';
import { ResultSetHeader } from 'mysql2';
import { getIO } from '../socket/socketServer';
import { NotificationService } from '../modules/notifications';
import * as NotificationMessages from '../constants/notificationMessages';
import { checkProximity, clearProximityCache } from './proximityAlertService';
import { notifyCitizensOfDelay, clearDelayCache } from './delayAlertService';

const SEGMENT_DURATION_MS = process.env.SIMULATION_SEGMENT_DURATION
  ? Number(process.env.SIMULATION_SEGMENT_DURATION)
  : 300000; // 5 minutos por defecto (300000 ms)
const TICK_RATE_MS = 1000; // 1 segundo
const ETA_MINUTES_PER_SEGMENT = 5;

// Mantiene los identificadores de los temporizadores activos
const activeSimulations = new Map<number, NodeJS.Timeout>();

// Velocidad actual de cada simulación (1 = 1x, 2 = 2x, etc.)
const simulationSpeeds = new Map<number, number>();

// Contador de ticks por recorrido para throttling de proximidad (1 tick = 1 segundo)
// La comprobación de proximidad se ejecuta cada PROXIMITY_THROTTLE_TICKS ticks.
const PROXIMITY_THROTTLE_TICKS = 30; // 30 segundos
const proximityTickCounters = new Map<number, number>();

// Último snapshot de estadísticas por recorrido activo (para sincronización inmediata)
const lastSimulationStats = new Map<number, any>();

export function getSimulationStats(recorridoId: number): any | null {
  return lastSimulationStats.get(recorridoId) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes API — Geometry fetching & decoding
// ─────────────────────────────────────────────────────────────────────────────

interface LatLng { lat: number; lng: number; }

/** Caché en memoria: clave = recorridoId, valor = array de puntos de la ruta real */
const routeGeometryCache = new Map<number, LatLng[]>();

export function getRouteGeometry(recorridoId: number): LatLng[] | null {
  return routeGeometryCache.get(recorridoId) || null;
}

/**
 * Decodifica un Google Encoded Polyline en un array de {lat, lng}.
 * Implementación pura, sin dependencias externas.
 */
function decodePolyline(encoded: string): LatLng[] {
  const poly: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b: number, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return poly;
}

/**
 * Llama a la Routes API de Google para obtener la geometría real de calles
 * que une los checkpoints dados. Usa caché por recorridoId para evitar
 * llamadas repetidas. Si la API falla o no hay API Key, retorna null
 * (el llamador hace fallback a interpolación lineal).
 */
export async function fetchRouteGeometry(
  recorridoId: number,
  checkpoints: any[]
): Promise<LatLng[] | null> {
  // Reutilizar caché si ya fue obtenida para este recorrido
  if (routeGeometryCache.has(recorridoId)) {
    return routeGeometryCache.get(recorridoId)!;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[Simulation] GOOGLE_MAPS_API_KEY no configurada — usando interpolación lineal como fallback');
    return null;
  }

  try {
    const validCps = checkpoints.filter(cp => {
      const lat = Number(cp.latitud);
      const lng = Number(cp.longitud);
      return !isNaN(lat) && !isNaN(lng);
    });

    if (validCps.length < 2) return null;

    const origin = validCps[0];
    const destination = validCps[validCps.length - 1];
    const intermediates = validCps.slice(1, -1).map((cp: any) => ({
      location: { latLng: { latitude: Number(cp.latitud), longitude: Number(cp.longitud) } }
    }));

    const body: any = {
      origin: { location: { latLng: { latitude: Number(origin.latitud), longitude: Number(origin.longitud) } } },
      destination: { location: { latLng: { latitude: Number(destination.latitud), longitude: Number(destination.longitud) } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    };

    if (intermediates.length > 0) {
      body.intermediates = intermediates;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos de timeout

    const referer = process.env.FRONTEND_URL || 'http://localhost:5173/';

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
        'Referer': referer,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Simulation] Routes API respondió ${response.status} — fallback a interpolación lineal:`, errText);
      return generateFallbackGeometry(recorridoId, checkpoints);
    }

    const data = await response.json();
    const encodedPolyline = data.routes?.[0]?.polyline?.encodedPolyline;

    if (!encodedPolyline) {
      console.warn('[Simulation] Routes API no devolvió polyline — fallback a interpolación lineal');
      return generateFallbackGeometry(recorridoId, checkpoints);
    }

    const decoded = decodePolyline(encodedPolyline);
    console.log(`[Simulation] Geometría de Routes API cargada para recorridoId ${recorridoId}: ${decoded.length} puntos`);
    routeGeometryCache.set(recorridoId, decoded);
    return decoded;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.warn('[Simulation] Timeout en Routes API — fallback a interpolación lineal.');
    } else {
      console.warn('[Simulation] Error de red al obtener geometría de Routes API — fallback a interpolación lineal:', err);
    }
    return generateFallbackGeometry(recorridoId, checkpoints);
  }
}

/**
 * Genera una geometría de respaldo basada exclusivamente en los checkpoints.
 */
function generateFallbackGeometry(recorridoId: number, checkpoints: any[]): LatLng[] {
  const fallback = checkpoints.map(cp => ({
    lat: Number(cp.latitud),
    lng: Number(cp.longitud)
  }));
  routeGeometryCache.set(recorridoId, fallback);
  return fallback;
}

/**
 * Calcula la distancia acumulada (en grados²) entre todos los puntos
 * del array de geometría. Se usa para distribuir el progreso de la
 * simulación uniformemente a lo largo de la ruta real.
 */
function buildCumulativeDistances(path: LatLng[]): number[] {
  const cumulative: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].lat - path[i - 1].lat;
    const dy = path[i].lng - path[i - 1].lng;
    cumulative.push(cumulative[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return cumulative;
}

/**
 * Dado un progreso global [0..1] sobre la geometría completa,
 * devuelve la coordenada interpolada exacta sobre la polilínea.
 */
function interpolateOnPath(
  path: LatLng[],
  cumulative: number[],
  progress: number
): LatLng {
  if (path.length === 0) return { lat: 0, lng: 0 };
  if (path.length === 1) return path[0];

  const totalDist = cumulative[cumulative.length - 1];
  if (totalDist === 0) return path[0];

  const targetDist = Math.min(progress, 1) * totalDist;

  // Búsqueda binaria del segmento donde cae targetDist
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= targetDist) lo = mid;
    else hi = mid;
  }

  const segLen = cumulative[hi] - cumulative[lo];
  if (segLen === 0) return path[lo];

  const t = (targetDist - cumulative[lo]) / segLen;
  return {
    lat: path[lo].lat + (path[hi].lat - path[lo].lat) * t,
    lng: path[lo].lng + (path[hi].lng - path[lo].lng) * t,
  };
}

/**
 * Mapea cada checkpoint a un porcentaje de avance (0 a 1) sobre la geometría real.
 */
function calculateCheckpointProgress(
  checkpoints: any[],
  routeGeom: LatLng[],
  cumDistances: number[]
): number[] {
  const totalDist = cumDistances[cumDistances.length - 1];
  if (totalDist === 0) return checkpoints.map(() => 0);

  const progressArray: number[] = [];
  let lastIdx = 0;

  for (const cp of checkpoints) {
    const lat = Number(cp.latitud);
    const lng = Number(cp.longitud);
    let bestDist = Infinity;
    let bestIdx = lastIdx;
    
    // Buscar hacia adelante (lookahead limitado) para mantener monotonicidad
    const searchLimit = Math.min(routeGeom.length, lastIdx + 1000);
    
    for (let i = lastIdx; i < searchLimit; i++) {
      const pt = routeGeom[i];
      const dx = pt.lat - lat;
      const dy = pt.lng - lng;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    
    progressArray.push(cumDistances[bestIdx] / totalDist);
    lastIdx = bestIdx;
  }
  
  // Forzar extremos
  progressArray[0] = 0;
  progressArray[progressArray.length - 1] = 1;

  // Garantizar que siempre crezca de manera estricta
  for (let i = 1; i < progressArray.length; i++) {
    if (progressArray[i] <= progressArray[i - 1]) {
      progressArray[i] = Math.min(1, progressArray[i - 1] + 0.0001);
    }
  }

  return progressArray;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation control — sin cambios en la interfaz pública
// ─────────────────────────────────────────────────────────────────────────────

/** Establece la velocidad de simulación para un recorrido y notifica a todos los clientes */
export function setSimulationSpeed(recorridoId: number, speed: number) {
  if (!activeSimulations.has(recorridoId)) return; // No existe simulación activa
  const validSpeed = Math.max(1, Math.min(speed, 20)); // Rango 1x–20x
  simulationSpeeds.set(recorridoId, validSpeed);
  console.log(`[Simulation] Velocidad cambiada a ${validSpeed}x para recorridoId: ${recorridoId}`);
  try {
    const io = getIO();
    io.to(`recorrido:${recorridoId}`).emit('velocidad_simulacion_actualizada', {
      recorridoId,
      velocidad: validSpeed,
    });
  } catch (e) {
    console.error('[Simulation] Error al emitir velocidad_simulacion_actualizada:', e);
  }
}

export function stopSimulation(recorridoId: number) {
  if (activeSimulations.has(recorridoId)) {
    clearInterval(activeSimulations.get(recorridoId)!);
    activeSimulations.delete(recorridoId);
    simulationSpeeds.delete(recorridoId);
    lastSimulationStats.delete(recorridoId);
    // Limpiar geometría cacheada al detener la simulación
    routeGeometryCache.delete(recorridoId);
    // Limpiar caché de alertas de proximidad para este recorrido
    proximityTickCounters.delete(recorridoId);
    clearProximityCache(recorridoId);
    clearDelayCache(recorridoId);
    console.log(`[Simulation] Simulación detenida para recorridoId: ${recorridoId}`);
  }
}

export async function startSimulation(recorridoId: number, checkpoints: any[], io: Server) {
  if (checkpoints.length === 0) return;

  // Si ya hay una simulación corriendo para este recorrido, la detenemos
  stopSimulation(recorridoId);

  // Velocidad inicial = 1x (se puede cambiar luego con setSimulationSpeed)
  simulationSpeeds.set(recorridoId, 1);

  const roomName = `recorrido:${recorridoId}`;
  // Emitir velocidad inicial
  io.to(roomName).emit('velocidad_simulacion_actualizada', { recorridoId, velocidad: 1 });

  // ── NUEVO: Extraemos la hora programada oficial desde el Checkpoint 1 ──
  const horaProgramadaInicio = new Date(checkpoints[0].hora_estimada);
  const simulationStartWallTime = Date.now();
  const arrivalWallTime = simulationStartWallTime + (checkpoints.length - 1) * ETA_MINUTES_PER_SEGMENT * 60 * 1000;

  // ── NUEVO: cargar geometría real de la Routes API ──────────────────────────
  // Si la API falla, routeGeom quedará null y haremos fallback a línea recta.
  const routeGeom = await fetchRouteGeometry(recorridoId, checkpoints);
  const cumDistances = routeGeom ? buildCumulativeDistances(routeGeom) : null;
  const cpProgressArray = (routeGeom && cumDistances) 
    ? calculateCheckpointProgress(checkpoints, routeGeom, cumDistances)
    : checkpoints.map((_, i) => i / (checkpoints.length - 1));

  let globalProgress = 0;
  let nextCheckpointIdx = 1; // El checkpoint 0 ya es el inicio
  const totalDurationMs = (checkpoints.length - 1) * ETA_MINUTES_PER_SEGMENT * 60 * 1000;

  const intervalId = setInterval(async () => {
    if (!activeSimulations.has(recorridoId)) {
      clearInterval(intervalId);
      return;
    }

    const now = Date.now();
    const currentSpeed = simulationSpeeds.get(recorridoId) ?? 1;
    
    // Incrementar el progreso global matemáticamente
    globalProgress += (TICK_RATE_MS * currentSpeed) / totalDurationMs;
    globalProgress = Math.min(globalProgress, 1);

    // ── NUEVO: calcular posición sobre geometría real usando globalProgress ──
    let currentLat: number;
    let currentLng: number;

    if (routeGeom && cumDistances && routeGeom.length >= 2) {
      const pos = interpolateOnPath(routeGeom, cumDistances, globalProgress);
      currentLat = pos.lat;
      currentLng = pos.lng;
    } else {
      // Fallback: interpolación lineal básica si no hay geometría
      // (No recomendado, pero seguro)
      const exactIndex = globalProgress * (checkpoints.length - 1);
      const prevIdx = Math.floor(exactIndex);
      const nextIdx = Math.min(prevIdx + 1, checkpoints.length - 1);
      const t = exactIndex - prevIdx;
      const cpStart = checkpoints[prevIdx];
      const cpEnd = checkpoints[nextIdx];
      currentLat = Number(cpStart.latitud) + (Number(cpEnd.latitud) - Number(cpStart.latitud)) * t;
      currentLng = Number(cpStart.longitud) + (Number(cpEnd.longitud) - Number(cpStart.longitud)) * t;
    }

    // Calcular estadísticas para la UI
    // Completados = cuántos checkpoints ya se pasaron (nextCheckpointIdx - 1)
    const completados = nextCheckpointIdx - 1;
    const cpStart = checkpoints[completados];
    const cpEnd = checkpoints[Math.min(nextCheckpointIdx, checkpoints.length - 1)];

    // ── NUEVO: Cálculo del progreso esperado sobre la base de la hora programada oficial ──
    const totalElapsedMs = now - horaProgramadaInicio.getTime();
    const expectedProgress = Math.max(0, Math.min(totalElapsedMs / totalDurationMs, 1));
    // Si vamos más lento de lo que dice el reloj real (retraso físico/simulado)
    const isDelayed = globalProgress < expectedProgress - 0.05;

    const fractionRemaining = 1 - globalProgress;
    const etaTotalMs = (fractionRemaining * totalDurationMs) / currentSpeed;
    const etaSecs = Math.max(0, Math.floor(etaTotalMs / 1000));

    const porcentajeAvance = globalProgress * 100;

    const stats = {
      recorridoId,
      latitud: currentLat,
      longitud: currentLng,
      ultimoCheckpoint: cpStart.nombre || `Punto ${cpStart.orden}`,
      proximoCheckpoint: cpEnd.nombre || `Punto ${cpEnd.orden}`,
      completados: completados + 1, // La vista móvil espera base 1 para el inicio
      pendientes: checkpoints.length - nextCheckpointIdx,
      porcentajeAvance, // <- Este es el UNICO que debe usar el Frontend para animar
      etaSegundos: etaSecs,
      horaEstimada: new Date(arrivalWallTime).toLocaleTimeString(),
      estadoDinamico: isDelayed ? 'Retrasado' : 'En Progreso',
      timestamp: Date.now(),
      rutaId: cpStart.ruta_id,
      velocidad: currentSpeed,
    };

    lastSimulationStats.set(recorridoId, stats);

    // Emitir ubicación en tiempo real
    io.to(roomName).emit('ubicacion_actualizada', stats);

    // Si el recorrido está retrasado, emitir notificación automática
    if (isDelayed) {
      ; (async () => {
        try {
          const [condRows] = await pool.execute<any[]>(
            `SELECT ar.conductor_id, c.nombre_completo AS conductor_nombre
             FROM recorridos r
             INNER JOIN asignaciones_rutas ar ON ar.id = r.asignacion_id
             INNER JOIN conductores c ON c.id = ar.conductor_id
             WHERE r.id = ?`,
            [recorridoId]
          );

          if (condRows.length > 0) {
            const { conductor_id, conductor_nombre } = condRows[0];
            await NotificationService.crearSiNoExiste({
              conductor_id,
              recorrido_id: recorridoId,
              ...NotificationMessages.RETRASO_DETECTADO_CONDUCTOR,
              tipo: 'AUTOMATICA',
              categoria: 'RECORRIDO',
            });

            const adminId = await NotificationService.obtenerAdminId();
            if (adminId) {
              await NotificationService.crearSiNoExiste({
                usuario_id: adminId,
                recorrido_id: recorridoId,
                ...NotificationMessages.RETRASO_DETECTADO_ADMIN(conductor_nombre),
                tipo: 'AUTOMATICA',
                categoria: 'RECORRIDO',
              });
            }
          }
        } catch (notifErr) {
          console.error('[Simulation] Error al crear notificación de RETRASO_DETECTADO:', notifErr);
        }
      })();

      // Notificar a ciudadanos afectados por la ruta (fire-and-forget)
      const delayFraction = expectedProgress - globalProgress;
      const delayMinutes = Math.max(1, Math.round((delayFraction * totalDurationMs) / 60000));
      notifyCitizensOfDelay(recorridoId, delayMinutes).catch(err => {
        console.error('[Simulation] Error inesperado en notifyCitizensOfDelay:', err);
      });
    }

    // Actualizar continuamente en base de datos la ubicación cruda
    pool.execute(
      'UPDATE recorridos SET latitud_actual = ?, longitud_actual = ? WHERE id = ? AND estado = "En progreso"',
      [currentLat, currentLng, recorridoId]
    ).catch(err => {
      console.error(`[Simulation SQL] Error actualizando latitud/longitud:`, err);
    });

    // ── PROXIMIDAD: Camión Cerca ──────────────────────────────────────────────
    // Throttle: ejecutar solo 1 vez cada PROXIMITY_THROTTLE_TICKS ticks (30s).
    // La llamada es fire-and-forget: no bloquea el tick ni el movimiento del camión.
    const currentTick = (proximityTickCounters.get(recorridoId) ?? 0) + 1;
    proximityTickCounters.set(recorridoId, currentTick);
    if (currentTick % PROXIMITY_THROTTLE_TICKS === 0) {
      checkProximity(recorridoId, currentLat, currentLng).catch(err => {
        console.error('[Simulation] Error inesperado en checkProximity:', err);
      });
    }

    // ── GESTIONAR CHECKPOINTS ALCANZADOS ──
    // Se evalúa en un bucle while por si la velocidad es muy alta y pasa 2 de un tick
    while (nextCheckpointIdx < checkpoints.length && globalProgress >= cpProgressArray[nextCheckpointIdx]) {
      const reachedCp = checkpoints[nextCheckpointIdx];
      const isLastCheckpoint = nextCheckpointIdx === checkpoints.length - 1;

      if (isLastCheckpoint) {
        try {
          await updateCheckpointReached(recorridoId, reachedCp, currentLat, currentLng);
          io.to(roomName).emit('checkpoint_alcanzado', { recorridoId, checkpointId: reachedCp.id });
        } catch (err) {
          console.error('Error DB update last checkpoint:', err);
        }
        stopSimulation(recorridoId);
      } else {
        updateCheckpointReached(recorridoId, reachedCp, currentLat, currentLng)
          .then(() => {
            io.to(roomName).emit('checkpoint_alcanzado', {
              recorridoId,
              checkpointId: reachedCp.id
            });
          })
          .catch(err => console.error('Error DB update checkpoint:', err));
      }
      nextCheckpointIdx++;
    }

  }, TICK_RATE_MS);

  activeSimulations.set(recorridoId, intervalId);
}


// Extraemos la lógica de DB para cuando se alcanza un checkpoint
async function updateCheckpointReached(recorridoId: number, cpEnd: any, latitud: number, longitud: number) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [recorridos] = await connection.execute<any[]>(
      'SELECT id, asignacion_id, hora_inicio, estado FROM recorridos WHERE id = ?',
      [recorridoId]
    );

    if (recorridos.length === 0) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      return;
    }

    const asignacionId = recorridos[0].asignacion_id;
    const orden = cpEnd.orden;
    // La hora real/simulada de llegada al checkpoint es el tiempo actual
    const horaLlegada = new Date();

    await connection.execute(
      'UPDATE recorridos SET latitud_actual = ?, longitud_actual = ? WHERE id = ?',
      [latitud, longitud, recorridoId]
    );

    // Asegurar que este checkpoint y todos los anteriores estén completados (usando snapshot de recorrido_checkpoints)
    await connection.execute(
      `UPDATE recorrido_checkpoints rc
       LEFT JOIN puntos_control pc ON pc.id = rc.checkpoint_id
       SET rc.estado = 'Completado', rc.hora_llegada = COALESCE(rc.hora_llegada, ?)
       WHERE rc.recorrido_id = ? AND COALESCE(rc.orden, pc.orden) <= ? AND rc.estado = 'Pendiente'`,
      [horaLlegada, recorridoId, orden]
    );

    const [pendientes] = await connection.execute<any[]>(
      'SELECT id FROM recorrido_checkpoints WHERE recorrido_id = ? AND estado = ?',
      [recorridoId, 'Pendiente']
    );

    if (pendientes.length === 0) {
      // Cambio 1: NO finalizar el recorrido en base de datos automáticamente.
      // Se mantiene en estado 'En progreso' para que la web siga mostrando el mapa.
      // Solo se emite el evento para que la app móvil habilite el botón de Finalizar.

      try {
        const io = getIO();
        const roomName = `recorrido:${recorridoId}`;
        io.to(roomName).emit('recorrido_finalizado', {
          recorridoId,
          ultimoCheckpoint: 'Fin del Recorrido',
          proximoCheckpoint: '-',
          completados: orden,
          pendientes: 0,
          porcentajeAvance: 100,
          etaSegundos: 0,
          horaEstimada: horaLlegada.toLocaleTimeString(),
          estadoDinamico: 'Completado'
        });
      } catch (e) {
        console.error('Error al emitir recorrido_finalizado:', e);
      }
      stopSimulation(recorridoId);
    }

    await connection.commit();
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function resumeActiveSimulations(io: Server) {
  try {
    const [recorridos] = await pool.execute<any[]>(
      'SELECT r.id, ar.ruta_id FROM recorridos r JOIN asignaciones_rutas ar ON r.asignacion_id = ar.id WHERE r.estado = "En progreso"'
    );
    for (const rec of recorridos) {
      if (!activeSimulations.has(rec.id)) {
        const [checkpointsCompletos] = await pool.execute<any[]>(
          'SELECT id, nombre, latitud, longitud, orden FROM puntos_control WHERE ruta_id = ? ORDER BY orden ASC',
          [rec.ruta_id]
        );
        startSimulation(rec.id, checkpointsCompletos, io);
        console.log(`[Simulation] Simulación reanudada en background para recorridoId: ${rec.id}`);
      }
    }
  } catch (err) {
    console.error('[Simulation] Error en resumeActiveSimulations:', err);
  }
}
