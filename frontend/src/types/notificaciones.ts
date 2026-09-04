// frontend/src/types/notificaciones.ts

/** Tipo de origen de la notificación. */
export type NotificacionTipo = 'AUTOMATICA' | 'MANUAL';

/** Categoría temática de la notificación. */
export type NotificacionCategoria = 'REPORTE' | 'RECORRIDO' | 'RUTA' | 'AVISO';

/** Destinatario para los avisos manuales. */
export type NotificacionDestinatario = 'CIUDADANOS' | 'CONDUCTORES' | 'AMBOS';

/**
 * Interfaz que representa una Notificación tal y como la devuelve el backend.
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
  fecha_lectura: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Filtros opcionales para solicitar las notificaciones en el admin.
 */
export interface FiltrosNotificaciones {
  tipo?: NotificacionTipo | 'ALL';
  categoria?: NotificacionCategoria | 'ALL';
  leida?: boolean | 'ALL';
  usuario_id?: number;
  conductor_id?: number;
  page?: number;
  limit?: number;
}

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

/** Payload para enviar un aviso manual desde el cliente. */
export interface AvisoManualPayload {
  titulo: string;
  mensaje: string;
  destinatario: NotificacionDestinatario;
  categoria?: NotificacionCategoria;
  tipo?: NotificacionTipo;
}
