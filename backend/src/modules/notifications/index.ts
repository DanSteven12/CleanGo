// backend/src/modules/notifications/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Barrel export del módulo de notificaciones.
// Los consumidores importan desde aquí; nunca directamente de los sub-archivos.
// ─────────────────────────────────────────────────────────────────────────────

export * as NotificationService from './notification.service';
export { default as notificacionesRouter } from './notification.routes';
export type {
  Notificacion,
  CrearNotificacionDTO,
  FiltrosNotificaciones,
  NotificacionTipo,
  NotificacionCategoria,
} from './notification.types';
