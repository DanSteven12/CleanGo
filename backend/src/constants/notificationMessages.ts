// backend/src/constants/notificationMessages.ts
// ─────────────────────────────────────────────────────────────────────────────
// Centraliza TODOS los títulos y mensajes del sistema de notificaciones.
// Las constantes estáticas se usan con spread: ...NotificationMessages.CLAVE
// Las funciones generadoras se invocan con el contexto dinámico necesario.
// ─────────────────────────────────────────────────────────────────────────────

// ── Ciudadanos ────────────────────────────────────────────────────────────────

/** Notificar al ciudadano cuando su reporte es recibido por el sistema. */
export const REPORTE_RECIBIDO = {
  titulo: 'Reporte recibido',
  mensaje:
    'Tu reporte ha sido recibido correctamente. Nuestro equipo lo revisará a la brevedad.',
} as const;

/** Notificar al ciudadano cuando el administrador cambia el estado a "En proceso". */
export const REPORTE_EN_REVISION = {
  titulo: 'Reporte en revisión',
  mensaje:
    'Tu reporte está siendo revisado por nuestro equipo. Te notificaremos cuando haya una actualización.',
} as const;

/** Notificar al ciudadano cuando el estado cambia a "Atendido". */
export const REPORTE_ATENDIDO = {
  titulo: 'Reporte atendido',
  mensaje:
    'Tu reporte ha sido atendido. El equipo de limpieza ya está trabajando en la zona reportada.',
} as const;

/** Notificar al ciudadano cuando el estado cambia a "Cerrado" / Resuelto. */
export const REPORTE_RESUELTO = {
  titulo: 'Reporte resuelto',
  mensaje:
    'Tu reporte ha sido resuelto satisfactoriamente. Gracias por contribuir a mantener limpia tu ciudad.',
} as const;

// ── Conductores ───────────────────────────────────────────────────────────────

/** Notificar al conductor cuando se le asigna una nueva ruta. */
export const RUTA_ASIGNADA = {
  titulo: 'Nueva ruta asignada',
  mensaje:
    'Se te ha asignado una nueva ruta de recolección. Revisa los detalles en la aplicación antes de iniciar.',
} as const;

/** Notificar al conductor cuando inicia su recorrido. */
export const RECORRIDO_INICIADO_CONDUCTOR = {
  titulo: 'Recorrido iniciado',
  mensaje:
    'Tu recorrido ha iniciado correctamente. Sigue las indicaciones de la ruta asignada.',
} as const;

/** Notificar al conductor cuando el sistema detecta un retraso en su recorrido. */
export const RETRASO_DETECTADO_CONDUCTOR = {
  titulo: 'Retraso detectado',
  mensaje:
    'Se ha detectado un retraso en tu recorrido actual. Por favor, notifica al supervisor si necesitas asistencia.',
} as const;

/** Notificar al conductor cuando su recorrido ha finalizado. */
export const RECORRIDO_FINALIZADO_CONDUCTOR = {
  titulo: 'Recorrido finalizado',
  mensaje:
    'Tu recorrido ha finalizado correctamente. Gracias por tu trabajo.',
} as const;

// ── Administradores (dinámicos) ───────────────────────────────────────────────

/** Notificar al administrador cuando un ciudadano crea un nuevo reporte. */
export const NUEVO_REPORTE_CIUDADANO = {
  titulo: 'Nuevo reporte ciudadano',
  mensaje:
    'Un ciudadano ha enviado un nuevo reporte. Revisa el panel de reportes para atenderlo.',
} as const;

/**
 * Notificar al administrador cuando un conductor inicia un recorrido.
 * @param nombre - Nombre completo del conductor.
 */
export const RECORRIDO_INICIADO_ADMIN = (nombre: string) =>
  ({
    titulo: 'Recorrido iniciado',
    mensaje: `${nombre} ha iniciado el recorrido asignado.`,
  } as const);

/**
 * Notificar al administrador cuando se detecta un retraso en un recorrido.
 * @param nombre - Nombre completo del conductor.
 */
export const RETRASO_DETECTADO_ADMIN = (nombre: string) =>
  ({
    titulo: 'Retraso detectado',
    mensaje: `Se ha detectado un retraso en el recorrido de ${nombre}.`,
  } as const);

/**
 * Notificar al administrador cuando un conductor finaliza su recorrido.
 * @param nombre - Nombre completo del conductor.
 */
export const RECORRIDO_FINALIZADO_ADMIN = (nombre: string) =>
  ({
    titulo: 'Recorrido finalizado',
    mensaje: `${nombre} finalizó el recorrido asignado correctamente.`,
  } as const);

/**
 * Notificar al ciudadano cuando se detecta un retraso en la ruta cercana a su zona.
 * @param minutos - Minutos estimados de retraso.
 */
export const RETRASO_DETECTADO_CIUDADANO = (minutos: number) =>
  ({
    titulo: '⚠️ Retraso en la recolección',
    mensaje: `El camión de tu ruta presenta un retraso estimado de ${minutos} minuto${minutos !== 1 ? 's' : ''}.`,
  } as const);
