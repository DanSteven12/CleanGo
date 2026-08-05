import { Server } from 'socket.io';
import { pool } from '../db';
import { ResultSetHeader } from 'mysql2';
import { getIO } from '../socket/socketServer';
import { NotificationService } from '../modules/notifications';
import * as NotificationMessages from '../constants/notificationMessages';

const SEGMENT_DURATION_MS = process.env.SIMULATION_SEGMENT_DURATION
  ? Number(process.env.SIMULATION_SEGMENT_DURATION)
  : 300000; // 5 minutos por defecto (300000 ms)
const TICK_RATE_MS = 1000; // 1 segundo
const ETA_MINUTES_PER_SEGMENT = 5;

// Mantiene los identificadores de los temporizadores activos
const activeSimulations = new Map<number, NodeJS.Timeout>();

// Velocidad actual de cada simulación (1 = 1x, 2 = 2x, etc.)
const simulationSpeeds = new Map<number, number>();

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

  const simulationStartWallTime = Date.now();
  const arrivalWallTime = simulationStartWallTime + (checkpoints.length - 1) * ETA_MINUTES_PER_SEGMENT * 60 * 1000;

  let startIndex = 0;
  let segmentStartTime = Date.now();

  const intervalId = setInterval(async () => {
    if (!activeSimulations.has(recorridoId)) {
      clearInterval(intervalId);
      return;
    }

    const nextIndex = startIndex + 1;
    const isLastSegment = nextIndex >= checkpoints.length;

    // Si ya no quedan segmentos que recorrer, la simulaci\u00f3n termina
    if (isLastSegment) {
      // Solo detenemos el ticker sin tocar la BD ni emitir aqu\u00ed.
      // updateCheckpointReached del \u00faltimo tick ya lo habr\u00e1 hecho.
      stopSimulation(recorridoId);
      return;
    }

    const cpStart = checkpoints[startIndex];
    const cpEnd = checkpoints[nextIndex];

    const latStart = Number(cpStart.latitud);
    const lngStart = Number(cpStart.longitud);
    const latEnd = Number(cpEnd.latitud);
    const lngEnd = Number(cpEnd.longitud);

    const now = Date.now();
    const currentSpeed = simulationSpeeds.get(recorridoId) ?? 1;
    const effectiveDuration = SEGMENT_DURATION_MS / currentSpeed;
    const progress = Math.min((now - segmentStartTime) / effectiveDuration, 1);

    const currentLat = latStart + (latEnd - latStart) * progress;
    const currentLng = lngStart + (lngEnd - lngStart) * progress;

    const totalElapsedMs = now - simulationStartWallTime;
    const expectedCheckpoints = Math.floor(totalElapsedMs / effectiveDuration);
    const isDelayed = (startIndex + 1) < expectedCheckpoints;

    const pendientes = checkpoints.length - 1 - startIndex;
    const segmentosRestantes = pendientes - progress;
    const etaTotalMs = Math.max(0, segmentosRestantes) * ETA_MINUTES_PER_SEGMENT * 60 * 1000 / currentSpeed;
    const etaSecs = Math.max(0, Math.floor(etaTotalMs / 1000));

    const rawPercentage = ((startIndex + progress) / checkpoints.length) * 100;

    const stats = {
      recorridoId,
      latitud: currentLat,
      longitud: currentLng,
      ultimoCheckpoint: cpStart.nombre || `Punto ${cpStart.orden}`,
      proximoCheckpoint: cpEnd.nombre || `Punto ${cpEnd.orden}`,
      completados: startIndex,
      pendientes: pendientes,
      porcentajeAvance: Math.min(Math.round(rawPercentage), 100),
      etaSegundos: etaSecs,
      horaEstimada: new Date(arrivalWallTime).toLocaleTimeString(),
      estadoDinamico: isDelayed ? 'Retrasado' : 'En Progreso',
      timestamp: Date.now(),
      rutaId: cpStart.ruta_id,
      velocidad: currentSpeed,
    };

    // Emitir ubicación en tiempo real
    io.to(roomName).emit('ubicacion_actualizada', stats);

    // Si el recorrido está retrasado, emitir notificación automática ──────────────
    // crearSiNoExiste() verifica en BD antes de insertar: deduplicación persistente.
    // Esto garantiza una sola notificación por recorrido aunque haya miles de ticks.
    if (isDelayed) {
      ;(async () => {
        try {
          // Obtener conductor del recorrido para las notificaciones dinámicas
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

            // Notificar al conductor (deduplicada por recorrido_id + titulo en BD)
            await NotificationService.crearSiNoExiste({
              conductor_id,
              recorrido_id: recorridoId,
              ...NotificationMessages.RETRASO_DETECTADO_CONDUCTOR,
              tipo: 'AUTOMATICA',
              categoria: 'RECORRIDO',
            });

            // Notificar al administrador (deduplicada por recorrido_id + titulo en BD)
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
    }

    // Actualizar continuamente en base de datos
    pool.execute(
      'UPDATE recorridos SET latitud_actual = ?, longitud_actual = ? WHERE id = ? AND estado = "En progreso"',
      [currentLat, currentLng, recorridoId]
    ).catch(err => {
      console.error(`[Simulation SQL] Error actualizando latitud/longitud:`, err);
    });

    // Al llegar al siguiente checkpoint
    if (progress >= 1) {
      segmentStartTime = now;
      startIndex++;

      const isLastCheckpoint = startIndex >= checkpoints.length - 1;

      if (isLastCheckpoint) {
        // \u00daltimo checkpoint: esperamos la actualizaci\u00f3n en BD antes de emitir fin
        try {
          await updateCheckpointReached(recorridoId, cpEnd, currentLat, currentLng);
          io.to(roomName).emit('checkpoint_alcanzado', { recorridoId, checkpointId: cpEnd.id });
        } catch (err) {
          console.error('Error DB update last checkpoint:', err);
        }
        // El stopSimulation ocurrir\u00e1 en el pr\u00f3ximo tick (isLastSegment = true)
      } else {
        // Checkpoints intermedios: as\u00edncrono para no bloquear el tick
        updateCheckpointReached(recorridoId, cpEnd, currentLat, currentLng)
          .then(() => {
            io.to(roomName).emit('checkpoint_alcanzado', {
              recorridoId,
              checkpointId: cpEnd.id
            });
          })
          .catch(err => console.error('Error DB update checkpoint:', err));
      }
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
    const horaInicio = new Date(recorridos[0].hora_inicio);
    const orden = cpEnd.orden;
    const minutosTranscurridos = (orden - 1) * 5;
    const horaLlegada = new Date(horaInicio.getTime() + minutosTranscurridos * 60_000);

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
