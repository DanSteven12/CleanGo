// backend/src/modules/notifications/notification.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Router Express del módulo de notificaciones.
// Mapea URLs → controller handlers.
// Se registra en index.ts bajo /api/notificaciones con authMiddleware.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import * as NotificationController from './notification.controller';

const router = Router();

// ── POST /api/notificaciones ────────────────────────────────────────────────
// Crear una nueva notificación (ej. avisos manuales).
router.post('/', NotificationController.create);

// ── GET /api/notificaciones ─────────────────────────────────────────────────
// Todas las notificaciones del sistema (panel admin).
// Filtros opcionales: ?tipo= &categoria= &leida= &usuario_id= &conductor_id=
router.get('/', NotificationController.getAll);

// ── GET /api/notificaciones/usuario/:id ─────────────────────────────────────
// Notificaciones de un ciudadano o administrador específico.
router.get('/usuario/:id', NotificationController.getByUsuario);

// ── GET /api/notificaciones/conductor/:id ───────────────────────────────────
// Notificaciones de un conductor específico.
router.get('/conductor/:id', NotificationController.getByConductor);

// ── PATCH /api/notificaciones/marcar-todas-leidas ───────────────────────────
// Marca todas las notificaciones como leídas.
router.patch('/marcar-todas-leidas', NotificationController.markAllAsRead);

// ── PATCH /api/notificaciones/:id/leida ─────────────────────────────────────
// Marca una notificación individual como leída.
router.patch('/:id/leida', NotificationController.markAsRead);

// ── DELETE /api/notificaciones/limpiar-leidas ───────────────────────────────
// Elimina todas las notificaciones leídas.
router.delete('/limpiar-leidas', NotificationController.removeRead);

// ── DELETE /api/notificaciones/:id ──────────────────────────────────────────
// Elimina una notificación por su ID.
router.delete('/:id', NotificationController.remove);

// ── GET /api/notificaciones/test-dump ───────────────────────────────────────
// Test DB access directly from the running backend.
router.get('/test-dump', async (req, res) => {
  try {
    const { pool } = require('../../../db');
    const [rows] = await pool.query('SELECT * FROM notificaciones');
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

export default router;
