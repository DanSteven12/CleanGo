import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { fetchRouteGeometry } from '../services/simulationService';
import { mobileAuthMiddleware } from '../middlewares/mobileAuthMiddleware';

const router = Router();

// Todas las rutas del ciudadano están protegidas con el middleware de móvil
router.use(mobileAuthMiddleware);

/**
 * GET /api/ciudadano/recorridos/activos
 * Devuelve la lista de recorridos que están actualmente "En progreso".
 */
router.get('/activos', async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
         r.id AS recorrido_id,
         r.hora_inicio,
         r.estado,
         ar.ruta_id,
         ru.nombre AS ruta_nombre,
         ru.color,
         ru.descripcion AS colonias,
         c.numero_economico,
         d.nombre_completo AS conductor_nombre
       FROM recorridos r
       INNER JOIN asignaciones_rutas ar ON ar.id = r.asignacion_id
       INNER JOIN rutas ru ON ru.id = ar.ruta_id
       INNER JOIN camiones c ON c.id = ar.camion_id
       INNER JOIN conductores d ON d.id = ar.conductor_id
       WHERE r.estado = 'En progreso'
       ORDER BY r.hora_inicio DESC`
    );

    res.json({ data: rows });
  } catch (error) {
    console.error(`[ciudadano/recorridos] GET /activos:`, error);
    res.status(500).json({ error: 'Error interno al obtener recorridos activos.' });
  }
});

/**
 * GET /api/ciudadano/recorridos/:recorridoId
 * Devuelve el detalle, checkpoints y geometría de un recorrido específico.
 */
router.get('/:recorridoId', async (req: Request, res: Response): Promise<void> => {
  const recorridoId = Number(req.params.recorridoId);

  if (!Number.isFinite(recorridoId) || recorridoId <= 0) {
    res.status(400).json({ error: 'ID de recorrido inválido.' });
    return;
  }

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
         r.id AS recorrido_id,
         r.hora_inicio,
         r.estado,
         ar.ruta_id,
         ru.nombre AS ruta_nombre,
         ru.color,
         ru.descripcion AS colonias,
         c.numero_economico,
         d.nombre_completo AS conductor_nombre
       FROM recorridos r
       INNER JOIN asignaciones_rutas ar ON ar.id = r.asignacion_id
       INNER JOIN rutas ru ON ru.id = ar.ruta_id
       INNER JOIN camiones c ON c.id = ar.camion_id
       INNER JOIN conductores d ON d.id = ar.conductor_id
       WHERE r.id = ? AND r.estado = 'En progreso'
       LIMIT 1`,
      [recorridoId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Recorrido no encontrado o ya finalizado.' });
      return;
    }

    const rec = rows[0];

    const [checkpointsCompletos] = await pool.execute<any[]>(
      `SELECT 
         rc.id, 
         COALESCE(rc.nombre, pc.nombre) AS nombre, 
         COALESCE(rc.latitud, pc.latitud) AS latitud, 
         COALESCE(rc.longitud, pc.longitud) AS longitud, 
         COALESCE(rc.orden, pc.orden) AS orden, 
         rc.estado, 
         rc.hora_llegada 
       FROM recorrido_checkpoints rc 
       LEFT JOIN puntos_control pc ON pc.id = rc.checkpoint_id
       WHERE rc.recorrido_id = ? 
       ORDER BY COALESCE(rc.orden, pc.orden) ASC`,
      [rec.recorrido_id]
    );

    const routeGeom = await fetchRouteGeometry(rec.recorrido_id, checkpointsCompletos);

    res.json({
      ...rec,
      checkpoints: checkpointsCompletos,
      geometria: routeGeom
    });
  } catch (error) {
    console.error(`[ciudadano/recorridos] GET /${recorridoId}:`, error);
    res.status(500).json({ error: 'Error interno al obtener detalle del recorrido.' });
  }
});

export default router;
