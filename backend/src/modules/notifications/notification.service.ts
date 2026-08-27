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
    try {
      const io = getIO();
      if (io) {
        io.to(`usuario:${notificacion.usuario_id}`).emit('notificacion_nueva', notificacion);
      }
    } catch (err) {
      console.error('[NotificationService] Error al emitir notificacion_nueva:', err);
    }
  }

  return notificacion;
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
    dto.titulo
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
