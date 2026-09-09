// backend/src/modules/notifications/notification.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tipos e interfaces del módulo de notificaciones.
// Fuente de verdad para todo el sistema de notificaciones.
// ─────────────────────────────────────────────────────────────────────────────

/** Tipo de origen de la notificación. */
export type NotificacionTipo = 'AUTOMATICA' | 'MANUAL';

/** Categoría temática de la notificación. */
export type NotificacionCategoria = 'REPORTE' | 'RECORRIDO' | 'RUTA' | 'AVISO' | 'PROXIMIDAD';

/** Destinatario de los avisos manuales. */
export type NotificacionDestinatario = 'CIUDADANOS' | 'CONDUCTORES' | 'AMBOS';


/**
 * DTO para crear una notificación.
 * Al menos uno de `usuario_id` o `conductor_id` debe estar presente.
 * `recorrido_id` es opcional y se utiliza para deduplicación en eventos de recorrido.
 */
export interface CrearNotificacionDTO {
  /** ID del usuario ciudadano o administrador destinatario. Null si es solo para conductor. */
  usuario_id?: number | null;
  /** ID del conductor destinatario. Null si es solo para usuario. */
  conductor_id?: number | null;
  /** ID del recorrido asociado (para deduplicación y trazabilidad). */
  recorrido_id?: number | null;
  /** Título corto de la notificación. */
  titulo: string;
  /** Cuerpo del mensaje. */
  mensaje: string;
  /** Tipo de origen: automática o manual. */
  tipo: NotificacionTipo;
  /** Categoría temática de la notificación. */
  categoria: NotificacionCategoria;
}

/**
 * DTO para crear un aviso manual desde el panel de administración.
 */
export interface CrearAvisoManualDTO {
  /** Título corto del aviso. */
  titulo: string;
  /** Cuerpo del mensaje. */
  mensaje: string;
  /** Categoría temática del aviso. */
  categoria: NotificacionCategoria;
  /** Público objetivo al que se enviará. */
  destinatario: NotificacionDestinatario;
}

/**
 * Notificación tal como se almacena y devuelve desde la base de datos.
 */
export interface Notificacion {
  id: number;
  usuario_id: number | null;
  conductor_id: number | null;
  recorrido_id: number | null;
  titulo: string;
  mensaje: string;
  tipo: NotificacionTipo;
  categoria: NotificacionCategoria;
  leida: boolean;
  fecha_lectura: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Filtros opcionales para obtener notificaciones en el panel de administración.
 * Extensible para futuros filtros sin cambiar la firma pública.
 */
export interface FiltrosNotificaciones {
  tipo?: NotificacionTipo;
  categoria?: NotificacionCategoria;
  leida?: boolean;
  usuario_id?: number;
  conductor_id?: number;
  page?: number;
  limit?: number;
}

/**
 * Respuesta de listado paginado con resumen.
 */
export interface NotificacionesResponse {
  data: Notificacion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    unread: number;
    thisWeek: number;
  };
}

/**
 * Preferencias de notificaciones de un ciudadano,
 * tal como se almacenan en la tabla `preferencias_notificaciones`.
 */
export interface PreferenciasNotificaciones {
  /** ID del ciudadano. Clave primaria y FK a `usuarios`. */
  usuario_id: number;
  /** Si está en FALSE, no se envía ningún push FCM a este usuario. */
  notificaciones_push_enabled: boolean;
  /** Si está en FALSE, no se genera la alerta C2 (camión cerca). */
  proximidad_enabled: boolean;
  /** Si está en FALSE, no se genera la alerta C1 (retraso del camión). */
  retraso_enabled: boolean;
  /** Última actualización del registro. */
  updated_at: Date;
}

/**
 * DTO para actualizar preferencias de notificaciones.
 * Todos los campos son opcionales; solo los presentes se actualizarán.
 */
export interface ActualizarPreferenciasDTO {
  notificaciones_push_enabled?: boolean;
  proximidad_enabled?: boolean;
  retraso_enabled?: boolean;
}
