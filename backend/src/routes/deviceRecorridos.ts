// backend/src/routes/deviceRecorridos.ts
/**
 * Endpoints de recorridos exclusivos para la app móvil de Conductores.
 *
 * Todos los endpoints requieren deviceAuthMiddleware (Bearer token de dispositivo).
 * El camion_id NUNCA se acepta como parámetro del cliente — siempre se extrae
 * de req.camion.camion_id (payload del JWT verificado).
 *
 * Rutas:
 *   GET /api/device/recorridos/historial   — Historial paginado del camión autenticado
 */
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { deviceAuthMiddleware } from '../middlewares/deviceAuthMiddleware';
import type { DeviceAuthPayload } from '../middlewares/deviceAuthMiddleware';

const router = Router();

// Todas las rutas de este módulo requieren autenticación de dispositivo
router.use(deviceAuthMiddleware);

const HISTORIAL_PAGE_SIZE = 20;

/**
 * GET /api/device/recorridos/historial
 *
 * Devuelve los recorridos con estado "Completado" del camión autenticado,
 * ordenados del más reciente al más antiguo.
 *
 * El camion_id se obtiene exclusivamente del token JWT (req.camion.camion_id).
 * No se acepta ningún parámetro de identidad del cliente.
 *
 * Query params permitidos:
 *   page  number  Página solicitada (default 1, mínimo 1)
 *
 * Respuesta:
 *   {
 *     data: RecorridoHistorial[],
 *     total: number,
 *     page: number,
 *     totalPages: number
 *   }
 */
router.get('/historial', async (req: Request, res: Response): Promise<void> => {
  // La identidad del camión viene del JWT — nunca del cliente
  const camion = req.camion as DeviceAuthPayload;
  const camionId = camion.camion_id;

  const pageRaw = req.query.page;
  const pageNum = Math.max(1, parseInt(String(pageRaw ?? '1'), 10) || 1);
  const offset = (pageNum - 1) * HISTORIAL_PAGE_SIZE;

  // Fragment reutilizado en COUNT y en SELECT de datos.
  // camion_id fijado desde el JWT — sin posibilidad de manipulación desde el cliente.
  const fromJoins = `
    FROM recorridos r
    INNER JOIN asignaciones_rutas ar ON ar.id  = r.asignacion_id
    INNER JOIN rutas               ru ON ru.id  = ar.ruta_id
    INNER JOIN camiones            c  ON c.id   = ar.camion_id
    INNER JOIN conductores         d  ON d.id   = ar.conductor_id
    WHERE r.estado = 'Completado'
      AND ar.camion_id = ?
  `;

  try {
    // ── Conteo total para calcular páginas ────────────────────────────────
    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total ${fromJoins}`,
      [camionId]
    );
    const total = Number(countRows[0].total);
    const totalPages = Math.max(1, Math.ceil(total / HISTORIAL_PAGE_SIZE));

    // ── Registros de la página solicitada ─────────────────────────────────
    const [rows] = await pool.query<any[]>(
      `SELECT
        r.id,
        r.hora_inicio,
        r.hora_fin,
        r.estado,
        r.conductor_real_nombre,
        TIMESTAMPDIFF(MINUTE, r.hora_inicio, r.hora_fin)  AS duracion_minutos,
        ru.id              AS ruta_id,
        ru.nombre          AS ruta_nombre,
        ru.color           AS ruta_color,
        c.id               AS camion_id,
        c.numero_economico,
        c.placa,
        d.id               AS conductor_id,
        d.nombre_completo  AS conductor_nombre,
        ar.fecha_programada,
        ar.horario_inicio,
        ar.horario_fin,
        (SELECT COUNT(*)
         FROM recorrido_checkpoints rc
         WHERE rc.recorrido_id = r.id)                                 AS total_checkpoints,
        (SELECT COUNT(*)
         FROM recorrido_checkpoints rc
         WHERE rc.recorrido_id = r.id AND rc.estado = 'Completado')    AS checkpoints_completados
      ${fromJoins}
      ORDER BY ar.fecha_programada DESC, r.hora_inicio DESC
      LIMIT ? OFFSET ?`,
      [camionId, HISTORIAL_PAGE_SIZE, offset]
    );

    res.json({ data: rows, total, page: pageNum, totalPages });
  } catch (error) {
    console.error(`[device/recorridos] GET /historial camion=${camionId}:`, error);
    res.status(500).json({ error: 'Error interno al obtener el historial de recorridos.' });
  }
});

export default router;
