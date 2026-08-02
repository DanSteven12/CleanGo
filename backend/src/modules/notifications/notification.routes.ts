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

// ── PATCH /api/notificaciones/:id/leida ─────────────────────────────────────
// Marca una notificación individual como leída.
router.patch('/:id/leida', NotificationController.markAsRead);

export default router;
