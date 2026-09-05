// backend/src/modules/notifications/notification.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Lógica de negocio del módulo de notificaciones.
// No contiene SQL directo: toda la persistencia se delega al Repository.
// Este es el único punto de entrada para crear notificaciones desde el resto
// del sistema (controladores, servicios, simulador, etc.).
// ─────────────────────────────────────────────────────────────────────────────

import * as NotificationRepository from './notification.repository';
import { pool } from '../../db';
import type { PoolConnection } from 'mysql2/promise';
import type {
  CrearAvisoManualDTO,
  CrearNotificacionDTO,
  FiltrosNotificaciones,
  Notificacion,
  NotificacionesResponse,
} from './notification.types';

// ─── Creación ─────────────────────────────────────────────────────────────────

/**
 * Crea una nueva notificación.
 *
 * Es el **único método** autorizado para insertar notificaciones en el sistema.
 * Realiza la validación básica de los datos, delega la persistencia al Repository
 * y devuelve la notificación creada.
 *
 * @throws Error si no se especifica al menos un destinatario (usuario_id o conductor_id).
 */
import { getIO } from '../../socket/socketServer';
import { getMessaging } from '../../config/firebase';

export async function crear(
  dto: CrearNotificacionDTO,
  connection?: PoolConnection
): Promise<Notificacion> {
  if (!dto.usuario_id && !dto.conductor_id) {
    throw new Error(
      'NotificationService.crear: debe especificarse al menos usuario_id o conductor_id.'
    );
  }

  if (!dto.titulo?.trim()) {
    throw new Error('NotificationService.crear: el título no puede estar vacío.');
  }

  if (!dto.mensaje?.trim()) {
    throw new Error('NotificationService.crear: el mensaje no puede estar vacío.');
  }

  const notificacion = await NotificationRepository.insertarNotificacion(dto, connection);

  if (notificacion.usuario_id) {
    // ─── 1. Socket.IO (tiempo real, si el usuario está conectado) ──────────────
    try {
      const io = getIO();
      if (io) {
        io.to(`usuario:${notificacion.usuario_id}`).emit('notificacion_nueva', notificacion);
      }
    } catch (err) {
      console.error('[NotificationService] Error al emitir notificacion_nueva:', err);
    }

    // ─── 2. FCM Push a Usuario (fire-and-forget: no bloquea la respuesta HTTP) ─
    //
    // Se ejecuta en background. Si Firebase falla no afecta al flujo principal.
    // Los tokens inválidos se eliminan automáticamente de la BD.
    enviarFcmAUsuario(notificacion.usuario_id, notificacion.titulo, notificacion.mensaje).catch(
      (err) => console.error('[NotificationService] Error inesperado en enviarFcmAUsuario:', err)
    );
  } else if (notificacion.conductor_id) {
    // ─── 3. Socket + FCM Push a Conductor / Camión (fire-and-forget) ───────────
    NotificationRepository.getCamionIdByConductorId(notificacion.conductor_id)
      .then(async (camionId) => {
        if (!camionId) {
          console.warn(
            `[NotificationService] No se encontró camión asignado para el conductor ID ${notificacion.conductor_id}`
          );
          return;
        }

        try {
          const io = getIO();
          if (io) {
            io.to(`camion:${camionId}`).emit('notificacion_nueva', notificacion);
          }
        } catch (err) {
          console.error('[NotificationService] Error al emitir notificacion_nueva al camión:', err);
        }

        await enviarFcmACamion(camionId, notificacion.titulo, notificacion.mensaje);
      })
      .catch((err) => {
        console.error('[NotificationService] Error inesperado en enviarFcmACamion:', err);
      });
  }

  return notificacion;
}

// ─── FCM helper ────────────────────────────────────────────────────────────────

/**
 * Obtiene los tokens FCM del usuario y envía un mensaje push a cada dispositivo.
 * Se ejecuta de forma fire-and-forget desde `crear()`.
 *
 * - Si Firebase está no inicializado (credenciales faltantes), sale silenciosamente.
 * - Si un token es inválido (`messaging/registration-token-not-registered`),
 *   lo elimina de la tabla `fcm_tokens` para evitar acumular tokens muertos.
 * - No expone tokens completos en logs de producción.
 */
async function enviarFcmAUsuario(
  usuario_id: number,
  titulo: string,
  mensaje: string
): Promise<void> {
  let messaging: ReturnType<typeof getMessaging>;
  try {
    messaging = getMessaging();
  } catch {
    // Firebase Admin no inicializado (credenciales ausentes en .env)
    return;
  }

  const tokens = await NotificationRepository.getFcmTokensByUsuarioId(usuario_id);
  if (tokens.length === 0) return;

  const envios = tokens.map(async (token) => {
    try {
      await messaging.send({
        token,
        notification: {
          title: titulo,
          body: mensaje,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'default',
          },
        },
      });
      console.log(`[FCM] Push enviado al usuario ${usuario_id} (token ...${token.slice(-8)})`);
    } catch (err: any) {
      const code: string = err?.code ?? err?.errorInfo?.code ?? '';
      if (code === 'messaging/registration-token-not-registered') {
        console.warn(`[FCM] Token inválido para usuario ${usuario_id}. Eliminando de BD.`);
        await NotificationRepository.deleteFcmToken(token).catch((dbErr) =>
          console.error('[FCM] Error al eliminar token inválido de BD:', dbErr)
        );
      } else {
        console.error(`[FCM] Error al enviar push al usuario ${usuario_id}:`, code || err?.message);
      }
    }
  });

  await Promise.allSettled(envios);
}

/**
 * Obtiene los tokens FCM del camión y envía un mensaje push a cada dispositivo registrado.
 * Maneja auto-limpieza de tokens no registrados o inválidos (`messaging/registration-token-not-registered`).
 */
export async function enviarFcmACamion(
  camion_id: number,
  titulo: string,
  mensaje: string
): Promise<{ enviados: number; fallidos: number; totalTokens: number }> {
  let messaging: ReturnType<typeof getMessaging>;
  try {
    messaging = getMessaging();
  } catch (err: any) {
    console.warn('[FCM Camión] Firebase Admin no está inicializado:', err?.message || err);
    return { enviados: 0, fallidos: 0, totalTokens: 0 };
  }

  const tokens = await NotificationRepository.getFcmTokensByCamionId(camion_id);
  if (tokens.length === 0) {
    console.warn(`[FCM Camión] No se encontraron tokens FCM registrados para el camión ID ${camion_id}`);
    return { enviados: 0, fallidos: 0, totalTokens: 0 };
  }

  let enviados = 0;
  let fallidos = 0;

  const envios = tokens.map(async (token) => {
    try {
      await messaging.send({
        token,
        notification: {
          title: titulo,
          body: mensaje,
        },
        data: {
          tipo: 'notificacion_conductor',
          titulo: String(titulo),
          mensaje: String(mensaje),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'default',
            sound: 'default',
          },
        },
      });
      enviados++;
      console.log(`[FCM Camión] Push enviado exitosamente al camión ${camion_id} (token ...${token.slice(-8)})`);
    } catch (err: any) {
      fallidos++;
      const code: string = err?.code ?? err?.errorInfo?.code ?? '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        console.warn(`[FCM Camión] Token inválido detectado para el camión ${camion_id}. Eliminando de BD.`);
        await NotificationRepository.deleteFcmTokenCamion(token).catch((dbErr) =>
          console.error('[FCM Camión] Error al eliminar token inválido de BD:', dbErr)
        );
      } else {
        console.error(`[FCM Camión] Error al enviar push al camión ${camion_id}:`, code || err?.message);
      }
    }
  });

  await Promise.allSettled(envios);
  return { enviados, fallidos, totalTokens: tokens.length };
}

/**
 * Crea una notificación automática de retraso solo si no existe ya una para
 * el mismo recorrido. Utiliza deduplicación persistente en base de datos.
 *
 * Garantiza que durante los ticks del simulador solo se genere UNA notificación
 * por evento de retraso por recorrido, incluso si el servidor se reinicia.
 *
 * @param dto - DTO completo con recorrido_id obligatorio.
 * @returns La notificación creada, o `null` si ya existía (duplicada).
 */
export async function crearSiNoExiste(
  dto: CrearNotificacionDTO & { recorrido_id: number }
): Promise<Notificacion | null> {
  const yaExiste = await NotificationRepository.existeNotificacionParaRecorrido(
    dto.recorrido_id,
    dto.categoria,
    dto.titulo,
    dto.usuario_id,
    dto.conductor_id
  );

  if (yaExiste) {
    return null;
  }

  return crear(dto);
}

/**
 * Crea un aviso manual y lo distribuye a los destinatarios especificados.
 * Garantiza que la lógica de inserción pase por `crear()`.
 */
export async function enviarAvisoManual(
  dto: CrearAvisoManualDTO
): Promise<number> {
  const { titulo, mensaje, categoria, destinatario } = dto;

  if (!titulo?.trim()) {
    throw new Error('NotificationService.enviarAvisoManual: el título no puede estar vacío.');
  }
  if (!mensaje?.trim()) {
    throw new Error('NotificationService.enviarAvisoManual: el mensaje no puede estar vacío.');
  }
  
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  let count = 0;

  try {
    const idsUsuarios: number[] = [];
    const idsConductores: number[] = [];

    if (destinatario === 'CIUDADANOS' || destinatario === 'AMBOS') {
      const ids = await NotificationRepository.obtenerIdsCiudadanos();
      idsUsuarios.push(...ids);
    }

    if (destinatario === 'CONDUCTORES' || destinatario === 'AMBOS') {
      const ids = await NotificationRepository.obtenerIdsConductores();
      idsConductores.push(...ids);
    }

    for (const id of idsUsuarios) {
      await crear({
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        categoria,
        tipo: 'MANUAL',
        usuario_id: id,
        conductor_id: null,
      }, connection);
      count++;
    }

    for (const id of idsConductores) {
      await crear({
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        categoria,
        tipo: 'MANUAL',
        usuario_id: null,
        conductor_id: id,
      }, connection);
      count++;
    }

    await connection.commit();
    return count;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ─── Consultas ────────────────────────────────────────────────────────────────

/**
 * Obtiene todas las notificaciones de un usuario (ciudadano o administrador).
 */
export async function obtenerPorUsuario(
  usuario_id: number
): Promise<Notificacion[]> {
  return NotificationRepository.obtenerNotificacionesPorUsuario(usuario_id);
}

/**
 * Obtiene el conteo de notificaciones no leídas de un usuario (ciudadano o administrador).
 */
export async function obtenerConteoNoLeidasPorUsuario(
  usuario_id: number
): Promise<number> {
  return NotificationRepository.obtenerConteoNoLeidasPorUsuario(usuario_id);
}

/**
 * Obtiene todas las notificaciones de un conductor.
 */
export async function obtenerPorConductor(
  conductor_id: number
): Promise<Notificacion[]> {
  return NotificationRepository.obtenerNotificacionesPorConductor(conductor_id);
}

/**
 * Obtiene el conteo de notificaciones no leídas de un conductor.
 */
export async function obtenerConteoNoLeidasPorConductor(
  conductor_id: number
): Promise<number> {
  return NotificationRepository.obtenerConteoNoLeidasPorConductor(conductor_id);
}

/**
 * Marca una notificación como leída asegurando pertenencia al conductor.
 */
export async function marcarLeidaPorConductor(
  id: number,
  conductor_id: number
): Promise<boolean> {
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(conductor_id) || conductor_id <= 0) {
    throw new Error('NotificationService.marcarLeidaPorConductor: Parámetros inválidos.');
  }
  return NotificationRepository.marcarNotificacionLeidaPorConductor(id, conductor_id);
}

/**
 * Marca como leídas TODAS las notificaciones del conductor.
 */
export async function marcarTodasLeidasPorConductor(
  conductor_id: number
): Promise<number> {
  if (!Number.isFinite(conductor_id) || conductor_id <= 0) {
    throw new Error('NotificationService.marcarTodasLeidasPorConductor: Parámetros inválidos.');
  }
  return NotificationRepository.marcarTodasNotificacionesLeidasPorConductor(conductor_id);
}

/**
 * Elimina una notificación asegurando pertenencia al conductor.
 */
export async function eliminarPorConductor(
  id: number,
  conductor_id: number
): Promise<boolean> {
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(conductor_id) || conductor_id <= 0) {
    throw new Error('NotificationService.eliminarPorConductor: Parámetros inválidos.');
  }
  return NotificationRepository.eliminarNotificacionPorConductor(id, conductor_id);
}

/**
 * Obtiene todas las notificaciones del sistema, con filtros opcionales.
 * Pensado para el panel de administración.
 */
export async function obtenerTodas(
  filtros?: FiltrosNotificaciones
): Promise<NotificacionesResponse> {
  return NotificationRepository.obtenerTodasLasNotificaciones(filtros);
}

// ─── Estado ───────────────────────────────────────────────────────────────────

/**
 * Marca una notificación como leída.
 * @returns `true` si se actualizó; `false` si no existía o ya estaba leída.
 */
export async function marcarLeida(id: number): Promise<boolean> {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('NotificationService.marcarLeida: ID inválido.');
  }
  return NotificationRepository.marcarNotificacionLeida(id);
}

/**
 * Marca una notificación como leída asegurando pertenencia al usuario.
 * @returns `true` si se actualizó; `false` si no existía, ya estaba leída o no pertenece al usuario.
 */
export async function marcarLeidaPorUsuario(
  id: number,
  usuario_id: number
): Promise<boolean> {
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(usuario_id) || usuario_id <= 0) {
    throw new Error('NotificationService.marcarLeidaPorUsuario: Parámetros inválidos.');
  }
  return NotificationRepository.marcarNotificacionLeidaPorUsuario(id, usuario_id);
}

// ─── Helper de contexto ───────────────────────────────────────────────────────

/**
 * Resuelve el usuario_id del administrador activo del sistema.
 * CleanGo opera con un único administrador; si en el futuro se incorporan más,
 * solo es necesario adaptar `NotificationRepository.obtenerAdminId()`.
 *
 * @returns ID del administrador o `null` si no se encuentra.
 */
export async function obtenerAdminId(): Promise<number | null> {
  return NotificationRepository.obtenerAdminId();
}
