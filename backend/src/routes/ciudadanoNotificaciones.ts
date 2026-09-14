import { Router } from 'express';
import { mobileAuthMiddleware } from '../middlewares/mobileAuthMiddleware';
import { NotificationService } from '../modules/notifications';

const router = Router();

// Todas las rutas están protegidas con mobileAuthMiddleware
// (lee Bearer token de la app móvil de Ciudadanos)
router.use(mobileAuthMiddleware);

// GET /api/ciudadano/notificaciones/unread
// Obtiene el número de notificaciones no leídas del ciudadano
router.get('/unread', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const unreadCount = await NotificationService.obtenerConteoNoLeidasPorUsuario(usuarioId);
    res.json({ unreadCount });
  } catch (error) {
    console.error('[ciudadanoNotificaciones] Error en GET /unread:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener conteo de notificaciones' });
  }
});

// GET /api/ciudadano/notificaciones
// Obtiene las notificaciones del ciudadano autenticado (paginadas o todas)
router.get('/', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (req.query.page !== undefined || req.query.limit !== undefined) {
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
      const limit = Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10);
      const resultado = await NotificationService.obtenerPaginadasPorUsuario(usuarioId, page, limit);
      return res.json(resultado);
    }

    const notificaciones = await NotificationService.obtenerPorUsuario(usuarioId);
    res.json(notificaciones);
  } catch (error) {
    console.error('[ciudadanoNotificaciones] Error en GET /:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener notificaciones' });
  }
});

// PATCH /api/ciudadano/notificaciones/marcar-todas-leidas
// Marca todas las notificaciones del ciudadano autenticado como leídas
router.patch('/marcar-todas-leidas', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const modificadas = await NotificationService.marcarTodasLeidasPorUsuario(usuarioId);
    res.json({ message: 'Todas las notificaciones fueron marcadas como leídas.', modificadas });
  } catch (error) {
    console.error('[ciudadanoNotificaciones] Error en PATCH /marcar-todas-leidas:', error);
    res.status(500).json({ error: 'Error interno al marcar notificaciones como leídas.' });
  }
});

// PATCH /api/ciudadano/notificaciones/:id/leida
// Marca una notificación como leída
router.patch('/:id/leida', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const notificacionId = Number(req.params.id);
    if (!Number.isFinite(notificacionId) || notificacionId <= 0) {
      return res.status(400).json({ error: 'ID de notificación inválido.' });
    }

    // Garantiza que la notificación pertenezca al usuario autenticado y no a otro ciudadano
    const actualizada = await NotificationService.marcarLeidaPorUsuario(notificacionId, usuarioId);
    
    if (!actualizada) {
      return res.status(404).json({ error: 'Notificación no encontrada, ya estaba marcada como leída o no pertenece al usuario.' });
    }

    res.json({ message: 'Notificación marcada como leída correctamente.' });
  } catch (error) {
    console.error(`[ciudadanoNotificaciones] Error en PATCH /${req.params.id}/leida:`, error);
    res.status(500).json({ error: 'Error interno al actualizar la notificación.' });
  }
});

// DELETE /api/ciudadano/notificaciones/:id
// Elimina una notificación del ciudadano autenticado
router.delete('/:id', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const notificacionId = Number(req.params.id);
    if (!Number.isFinite(notificacionId) || notificacionId <= 0) {
      return res.status(400).json({ error: 'ID de notificación inválido.' });
    }

    const eliminada = await NotificationService.eliminarPorUsuario(notificacionId, usuarioId);
    if (!eliminada) {
      return res.status(404).json({ error: 'Notificación no encontrada o no pertenece al usuario.' });
    }

    res.json({ message: 'Notificación eliminada correctamente.' });
  } catch (error) {
    console.error(`[ciudadanoNotificaciones] Error en DELETE /${req.params.id}:`, error);
    res.status(500).json({ error: 'Error interno al eliminar la notificación.' });
  }
});

export default router;
