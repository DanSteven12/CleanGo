import { Router, Request, Response } from 'express';
import { deviceAuthMiddleware } from '../middlewares/deviceAuthMiddleware';
import type { DeviceAuthPayload } from '../middlewares/deviceAuthMiddleware';
import { NotificationService } from '../modules/notifications';
import { getAsignacionActual } from '../services/deviceAuthService';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

const router = Router();

router.use(deviceAuthMiddleware);

async function resolverConductorId(camionId: number): Promise<number | null> {
  const asignacionHoy = await getAsignacionActual(camionId);
  if (asignacionHoy?.conductor_id) {
    return Number(asignacionHoy.conductor_id);
  }

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT conductor_id FROM asignaciones_rutas
     WHERE camion_id = ? AND conductor_id IS NOT NULL
     ORDER BY fecha_programada DESC, id DESC
     LIMIT 1`,
    [camionId]
  );

  return rows.length > 0 ? Number(rows[0].conductor_id) : null;
}

/**
 * GET /api/device/notificaciones/unread
 */
router.get('/unread', async (req: Request, res: Response) => {
  try {
    const camion = req.camion as DeviceAuthPayload;
    const conductorId = await resolverConductorId(camion.camion_id);
    if (!conductorId) {
      return res.json({ unreadCount: 0 });
    }
    const unreadCount = await NotificationService.obtenerConteoNoLeidasPorConductor(conductorId);
    res.json({ unreadCount });
  } catch (error) {
    console.error('[deviceNotificaciones] Error en GET /unread:', error);
    res.status(500).json({ error: 'Error interno al obtener el conteo de notificaciones.' });
  }
});

/**
 * GET /api/device/notificaciones
 * Query params:
 *   page?: number (default 1)
 *   limit?: number (default 10)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const camion = req.camion as DeviceAuthPayload;
    const conductorId = await resolverConductorId(camion.camion_id);

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10);

    if (!conductorId) {
      return res.json({
        data: [],
        total: 0,
        page: 1,
        totalPages: 1,
        hasMore: false,
      });
    }

    const resultado = await NotificationService.obtenerPaginadasPorConductor(conductorId, page, limit);
    res.json(resultado);
  } catch (error) {
    console.error('[deviceNotificaciones] Error en GET /:', error);
    res.status(500).json({ error: 'Error interno al obtener notificaciones del dispositivo.' });
  }
});

/**
 * PATCH /api/device/notificaciones/:id/leida
 */
router.patch('/:id/leida', async (req: Request, res: Response) => {
  try {
    const camion = req.camion as DeviceAuthPayload;
    const conductorId = await resolverConductorId(camion.camion_id);
    if (!conductorId) {
      return res.status(404).json({ error: 'No hay conductor asociado a este camión.' });
    }

    const notificacionId = Number(req.params.id);
    if (!Number.isFinite(notificacionId) || notificacionId <= 0) {
      return res.status(400).json({ error: 'ID de notificación inválido.' });
    }

    const actualizada = await NotificationService.marcarLeidaPorConductor(notificacionId, conductorId);
    if (!actualizada) {
      return res.status(404).json({
        error: 'Notificación no encontrada, ya estaba leída o no pertenece a este conductor.',
      });
    }

    res.json({ message: 'Notificación marcada como leída correctamente.' });
  } catch (error) {
    console.error(`[deviceNotificaciones] Error en PATCH /${req.params.id}/leida:`, error);
    res.status(500).json({ error: 'Error interno al actualizar la notificación.' });
  }
});

/**
 * PATCH /api/device/notificaciones/marcar-todas-leidas
 */
router.patch('/marcar-todas-leidas', async (req: Request, res: Response) => {
  try {
    const camion = req.camion as DeviceAuthPayload;
    const conductorId = await resolverConductorId(camion.camion_id);
    if (!conductorId) {
      return res.status(404).json({ error: 'No hay conductor asociado a este camión.' });
    }

    const modificadas = await NotificationService.marcarTodasLeidasPorConductor(conductorId);
    res.json({ message: 'Todas las notificaciones fueron marcadas como leídas.', modificadas });
  } catch (error) {
    console.error('[deviceNotificaciones] Error en PATCH /marcar-todas-leidas:', error);
    res.status(500).json({ error: 'Error interno al marcar notificaciones como leídas.' });
  }
});

/**
 * DELETE /api/device/notificaciones/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const camion = req.camion as DeviceAuthPayload;
    const conductorId = await resolverConductorId(camion.camion_id);
    if (!conductorId) {
      return res.status(404).json({ error: 'No hay conductor asociado a este camión.' });
    }

    const notificacionId = Number(req.params.id);
    if (!Number.isFinite(notificacionId) || notificacionId <= 0) {
      return res.status(400).json({ error: 'ID de notificación inválido.' });
    }

    const eliminada = await NotificationService.eliminarPorConductor(notificacionId, conductorId);
    if (!eliminada) {
      return res.status(404).json({
        error: 'Notificación no encontrada o no pertenece a este conductor.',
      });
    }

    res.json({ message: 'Notificación eliminada correctamente.' });
  } catch (error) {
    console.error(`[deviceNotificaciones] Error en DELETE /${req.params.id}:`, error);
    res.status(500).json({ error: 'Error interno al eliminar la notificación.' });
  }
});

export default router;
