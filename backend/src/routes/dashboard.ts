// backend/src/routes/dashboard.ts
// Endpoints exclusivos para el Dashboard Principal.
// No modifica ni reutiliza la lógica de ningún otro módulo.

import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
// Devuelve todos los contadores del Dashboard en una sola consulta eficiente.
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    // Ejecutar todas las consultas en paralelo para mínima latencia
    const [
      [camionesRows],
      [rutasRows],
      [asignacionesHoyRows],
      [recorridosActivosRows],
      [recorridosCompletadosHoyRows],
      [reportesRows],
    ] = await Promise.all([
      pool.query<any[]>('SELECT COUNT(*) AS total FROM camiones'),
      pool.query<any[]>('SELECT COUNT(*) AS total FROM rutas'),
      pool.query<any[]>(
        "SELECT COUNT(*) AS total FROM asignaciones_rutas WHERE fecha_programada = ?",
        [today]
      ),
      pool.query<any[]>(
        "SELECT COUNT(*) AS total FROM recorridos WHERE estado = 'En progreso'"
      ),
      pool.query<any[]>(
        "SELECT COUNT(*) AS total FROM recorridos WHERE estado = 'Completado' AND DATE(hora_fin) = ?",
        [today]
      ),
      pool.query<any[]>(`
        SELECT
          SUM(estado = 'Pendiente')  AS pendientes,
          SUM(estado = 'En proceso') AS en_proceso,
          SUM(estado = 'Cerrado')    AS cerrados
        FROM reportes_ciudadanos
      `),
    ]);

    res.json({
      camiones_total:              Number((camionesRows as any[])[0]?.total ?? 0),
      rutas_total:                 Number((rutasRows as any[])[0]?.total ?? 0),
      asignaciones_hoy:            Number((asignacionesHoyRows as any[])[0]?.total ?? 0),
      recorridos_activos:          Number((recorridosActivosRows as any[])[0]?.total ?? 0),
      recorridos_completados_hoy:  Number((recorridosCompletadosHoyRows as any[])[0]?.total ?? 0),
      reportes_pendientes:         Number((reportesRows as any[])[0]?.pendientes ?? 0),
      reportes_en_proceso:         Number((reportesRows as any[])[0]?.en_proceso ?? 0),
      reportes_cerrados:           Number((reportesRows as any[])[0]?.cerrados ?? 0),
    });
  } catch (error) {
    console.error('[dashboard] GET /stats:', error);
    res.status(500).json({ error: 'Error interno al obtener estadísticas del dashboard.' });
  }
});

// ─── GET /api/dashboard/actividad-reciente ────────────────────────────────────
// Devuelve los últimos 5 registros de cada categoría de actividad.
router.get('/actividad-reciente', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [asignacionesRows, recorridosRows, reportesRows] = await Promise.all([
      // Últimas 5 asignaciones
      pool.query<any[]>(`
        SELECT
          ar.id,
          ar.fecha_programada,
          ar.horario_inicio,
          ar.horario_fin,
          ar.estatus_recorrido,
          r.nombre   AS ruta_nombre,
          r.color    AS ruta_color,
          c.numero_economico,
          c.placa,
          d.nombre_completo AS conductor_nombre
        FROM asignaciones_rutas ar
        INNER JOIN rutas       r ON r.id = ar.ruta_id
        INNER JOIN camiones    c ON c.id = ar.camion_id
        INNER JOIN conductores d ON d.id = ar.conductor_id
        ORDER BY ar.id DESC
        LIMIT 5
      `),

      // Últimos 5 recorridos completados
      pool.query<any[]>(`
        SELECT
          rec.id,
          rec.hora_inicio,
          rec.hora_fin,
          rec.estado,
          ru.nombre  AS ruta_nombre,
          ru.color   AS ruta_color,
          c.numero_economico,
          ar.fecha_programada
        FROM recorridos rec
        INNER JOIN asignaciones_rutas ar ON ar.id  = rec.asignacion_id
        INNER JOIN rutas              ru ON ru.id  = ar.ruta_id
        INNER JOIN camiones           c  ON c.id   = ar.camion_id
        WHERE rec.estado = 'Completado'
        ORDER BY rec.hora_fin DESC
        LIMIT 5
      `),

      // Últimos 5 reportes ciudadanos
      pool.query<any[]>(`
        SELECT
          r.id,
          r.tipo_reporte,
          r.descripcion,
          r.estado,
          r.fecha_reporte,
          r.direccion_referencia,
          u.nombre AS ciudadano_nombre
        FROM reportes_ciudadanos r
        LEFT JOIN usuarios u ON u.id = r.usuario_id
        ORDER BY r.fecha_reporte DESC
        LIMIT 5
      `),
    ]);

    res.json({
      asignaciones: (asignacionesRows as any[][])[0] ?? [],
      recorridos:   (recorridosRows   as any[][])[0] ?? [],
      reportes:     (reportesRows     as any[][])[0] ?? [],
    });
  } catch (error) {
    console.error('[dashboard] GET /actividad-reciente:', error);
    res.status(500).json({ error: 'Error interno al obtener la actividad reciente.' });
  }
});

export default router;
