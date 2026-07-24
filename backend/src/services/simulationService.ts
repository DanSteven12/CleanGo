import { Server } from 'socket.io';
import { pool } from '../db';
import { ResultSetHeader } from 'mysql2';

const SEGMENT_DURATION_MS = process.env.SIMULATION_SEGMENT_DURATION 
  ? Number(process.env.SIMULATION_SEGMENT_DURATION) 
  : 30000; // 30s por defecto
const TICK_RATE_MS = 1000; // 1 segundo
const ETA_MINUTES_PER_SEGMENT = 5;

// Mantiene los identificadores de los temporizadores activos
const activeSimulations = new Map<number, NodeJS.Timeout>();

export async function startSimulation(recorridoId: number, checkpoints: any[], io: Server) {
  if (checkpoints.length === 0) return;

  // Si ya hay una simulación corriendo para este recorrido, la detenemos
  if (activeSimulations.has(recorridoId)) {
    clearInterval(activeSimulations.get(recorridoId)!);
  }

  const roomName = `recorrido:${recorridoId}`;
  
  const simulationStartWallTime = Date.now();
  const arrivalWallTime = simulationStartWallTime + (checkpoints.length - 1) * ETA_MINUTES_PER_SEGMENT * 60 * 1000;

  let startIndex = 0;
  let segmentStartTime = Date.now();

  const intervalId = setInterval(async () => {
    const nextIndex = startIndex + 1;
    const isLastSegment = nextIndex >= checkpoints.length;

    if (isLastSegment) {
      clearInterval(intervalId);
      activeSimulations.delete(recorridoId);
      
      io.to(roomName).emit('recorrido_finalizado', {
        recorridoId,
        ultimoCheckpoint: 'Fin del Recorrido',
        proximoCheckpoint: '-',
        completados: checkpoints.length,
        pendientes: 0,
        porcentajeAvance: 100,
        etaSegundos: 0,
        horaEstimada: new Date().toLocaleTimeString(),
        estadoDinamico: 'Completado'
      });
      return;
    }

    const cpStart = checkpoints[startIndex];
    const cpEnd = checkpoints[nextIndex];

    const latStart = Number(cpStart.latitud);
    const lngStart = Number(cpStart.longitud);
    const latEnd = Number(cpEnd.latitud);
    const lngEnd = Number(cpEnd.longitud);

    const now = Date.now();
    const progress = Math.min((now - segmentStartTime) / SEGMENT_DURATION_MS, 1);

    const currentLat = latStart + (latEnd - latStart) * progress;
    const currentLng = lngStart + (lngEnd - lngStart) * progress;

    const totalElapsedMs = now - simulationStartWallTime;
    const expectedCheckpoints = Math.floor(totalElapsedMs / SEGMENT_DURATION_MS);
    const isDelayed = (startIndex + 1) < expectedCheckpoints;

    const pendientes = checkpoints.length - 1 - startIndex;
    const segmentosRestantes = pendientes - progress;
    const etaTotalMs = Math.max(0, segmentosRestantes) * ETA_MINUTES_PER_SEGMENT * 60 * 1000;
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
      porcentajeAvance: Math.min(rawPercentage, 100),
      etaSegundos: etaSecs,
      horaEstimada: new Date(arrivalWallTime).toLocaleTimeString(),
      estadoDinamico: isDelayed ? 'Retrasado' : 'En Progreso',
      timestamp: Date.now(),
      rutaId: cpStart.ruta_id // asumiendo que lo podamos necesitar
    };

    // Emitir ubicación en tiempo real
    io.to(roomName).emit('ubicacion_actualizada', stats);

    // Actualizar continuamente en base de datos
    pool.execute(
      'UPDATE recorridos SET latitud_actual = ?, longitud_actual = ? WHERE id = ?',
      [currentLat, currentLng, recorridoId]
    ).catch(err => {
      console.error(`[Simulation SQL] Error actualizando latitud/longitud:`, err);
    });

    // Al llegar al siguiente checkpoint
    if (progress >= 1) {
      segmentStartTime = now;
      startIndex++;
      
      // Actualizar en base de datos de manera asíncrona (no bloquea el tick)
      updateCheckpointReached(recorridoId, cpEnd, currentLat, currentLng)
        .then(() => {
          io.to(roomName).emit('checkpoint_alcanzado', {
            recorridoId,
            checkpointId: cpEnd.id
          });
        })
        .catch(err => console.error('Error DB update checkpoint:', err));
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
      'SELECT id, asignacion_id, hora_inicio FROM recorridos WHERE id = ?',
      [recorridoId]
    );

    if (recorridos.length === 0) throw new Error('Recorrido no encontrado');

    const asignacionId = recorridos[0].asignacion_id;
    const horaInicio = new Date(recorridos[0].hora_inicio);
    const orden = cpEnd.orden;
    const minutosTranscurridos = (orden - 1) * 5;
    const horaLlegada = new Date(horaInicio.getTime() + minutosTranscurridos * 60_000);

    await connection.execute(
      'UPDATE recorridos SET latitud_actual = ?, longitud_actual = ? WHERE id = ?',
      [latitud, longitud, recorridoId]
    );

    // Asegurar que este checkpoint y todos los anteriores estén completados
    await connection.execute(
      `UPDATE recorrido_checkpoints rc
       JOIN puntos_control pc ON pc.id = rc.checkpoint_id
       SET rc.estado = 'Completado', rc.hora_llegada = COALESCE(rc.hora_llegada, ?)
       WHERE rc.recorrido_id = ? AND pc.orden <= ? AND rc.estado = 'Pendiente'`,
      [horaLlegada, recorridoId, orden]
    );

    const [pendientes] = await connection.execute<any[]>(
      'SELECT id FROM recorrido_checkpoints WHERE recorrido_id = ? AND estado = ?',
      [recorridoId, 'Pendiente']
    );

    if (pendientes.length === 0) {
      await connection.execute(
        'UPDATE recorridos SET hora_fin = ?, estado = ? WHERE id = ?',
        [horaLlegada, 'Completado', recorridoId]
      );
      
      await connection.execute(
        'UPDATE asignaciones_rutas SET estatus_recorrido = ? WHERE id = ?',
        ['Completado', asignacionId]
      );
    }

    await connection.commit();
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
}
