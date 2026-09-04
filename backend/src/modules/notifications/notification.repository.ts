// backend/src/modules/notifications/notification.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// ÚNICO responsable de interactuar con la base de datos para notificaciones.
// No contiene lógica de negocio. Todo SQL está aquí; el Service no toca SQL.
// ─────────────────────────────────────────────────────────────────────────────

import { pool } from '../../db';
import type { PoolConnection } from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type {
  CrearNotificacionDTO,
  FiltrosNotificaciones,
  Notificacion,
  NotificacionCategoria,
  NotificacionesResponse,
} from './notification.types';

// ─── Inserción ────────────────────────────────────────────────────────────────

/**
 * Inserta una nueva notificación en la base de datos y retorna el registro creado.
 */
export async function insertarNotificacion(
  dto: CrearNotificacionDTO,
  connection?: PoolConnection
): Promise<Notificacion> {
  const db = connection || pool;
  
  let destinatario = 'AMBOS';
  if (dto.usuario_id && !dto.conductor_id) {
    destinatario = 'CIUDADANOS';
  } else if (!dto.usuario_id && dto.conductor_id) {
    destinatario = 'CONDUCTORES';
  }

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO notificaciones
       (usuario_id, conductor_id, recorrido_id, titulo, mensaje, tipo, categoria, destinatario)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dto.usuario_id ?? null,
      dto.conductor_id ?? null,
      dto.recorrido_id ?? null,
      dto.titulo,
      dto.mensaje,
      dto.tipo,
      dto.categoria,
      destinatario,
    ]
  );

  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT * FROM notificaciones WHERE id = ?',
    [result.insertId]
  );

  return rows[0] as Notificacion;
}

// ─── Deduplicación ────────────────────────────────────────────────────────────

/**
 * Verifica si ya existe una notificación automática para un recorrido y categoría dados.
 * Utilizado para prevenir notificaciones duplicadas (ej. "Retraso detectado").
 * La verificación es persistente en BD, funciona correctamente tras reinicios del servidor.
 *
 * @param recorrido_id - ID del recorrido en cuestión.
 * @param categoria    - Categoría de la notificación a verificar.
 * @param titulo       - Título exacto para filtrar el evento específico dentro de la categoría.
 * @returns `true` si ya existe la notificación; `false` si no existe.
 */
export async function existeNotificacionParaRecorrido(
  recorrido_id: number,
  categoria: NotificacionCategoria,
  titulo: string,
  usuario_id?: number | null,
  conductor_id?: number | null
): Promise<boolean> {
  let query = `
    SELECT id FROM notificaciones
    WHERE recorrido_id = ?
      AND categoria = ?
      AND titulo = ?
      AND tipo = 'AUTOMATICA'
  `;
  const params: any[] = [recorrido_id, categoria, titulo];

  if (usuario_id !== undefined) {
    if (usuario_id === null) {
      query += ` AND usuario_id IS NULL`;
    } else {
      query += ` AND usuario_id = ?`;
      params.push(usuario_id);
    }
  }

  if (conductor_id !== undefined) {
    if (conductor_id === null) {
      query += ` AND conductor_id IS NULL`;
    } else {
      query += ` AND conductor_id = ?`;
      params.push(conductor_id);
    }
  }

  query += ` LIMIT 1`;

  const [rows] = await pool.execute<RowDataPacket[]>(query, params);
  return rows.length > 0;
}

// ─── Consultas ────────────────────────────────────────────────────────────────

/**
 * Obtiene todas las notificaciones de un usuario ciudadano/administrador,
 * ordenadas por fecha de creación descendente.
 */
export async function obtenerNotificacionesPorUsuario(
  usuario_id: number
): Promise<Notificacion[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM notificaciones
     WHERE usuario_id = ?
     ORDER BY created_at DESC`,
    [usuario_id]
  );
  return rows as Notificacion[];
}

/**
 * Obtiene el conteo de notificaciones no leídas de un usuario ciudadano/administrador.
 */
export async function obtenerConteoNoLeidasPorUsuario(
  usuario_id: number
): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM notificaciones
     WHERE usuario_id = ? AND leida = FALSE`,
    [usuario_id]
  );
  return Number(rows[0].count);
}

/**
 * Obtiene todas las notificaciones de un conductor,
 * ordenadas por fecha de creación descendente.
 */
export async function obtenerNotificacionesPorConductor(
  conductor_id: number
): Promise<Notificacion[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM notificaciones
     WHERE conductor_id = ?
     ORDER BY created_at DESC`,
    [conductor_id]
  );
  return rows as Notificacion[];
}

/**
 * Obtiene todas las notificaciones del sistema con filtros opcionales.
 * Para uso exclusivo del panel de administración.
 *
 * Diseñado para extenderse fácilmente: agregar nuevos filtros en
 * `FiltrosNotificaciones` sin modificar el contrato del Service.
 */
export async function obtenerTodasLasNotificaciones(
  filtros: FiltrosNotificaciones = {}
): Promise<NotificacionesResponse> {
  const conditions: string[] = [];
  const params: (string | number | boolean)[] = [];

  if (filtros.tipo !== undefined) {
    conditions.push('tipo = ?');
    params.push(filtros.tipo);
  }
  if (filtros.categoria !== undefined) {
    conditions.push('categoria = ?');
    params.push(filtros.categoria);
  }
  if (filtros.leida !== undefined) {
    conditions.push('leida = ?');
    params.push(filtros.leida ? 1 : 0);
  }
  if (filtros.usuario_id !== undefined) {
    conditions.push('usuario_id = ?');
    params.push(filtros.usuario_id);
  }
  if (filtros.conductor_id !== undefined) {
    conditions.push('conductor_id = ?');
    params.push(filtros.conductor_id);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
  const limit = filtros.limit && filtros.limit > 0 ? filtros.limit : 10;
  const offset = (page - 1) * limit;

  // Ejecutar ambas consultas en paralelo para optimizar tiempo
  // Añadimos consultas para el resumen: unread global y thisWeek global.
  const [countResult, rowsResult, unreadResult, thisWeekResult] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM notificaciones ${where}`,
      params
    ),
    pool.query<RowDataPacket[]>(
      `SELECT * FROM notificaciones ${where} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params
    ),
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as unread FROM notificaciones WHERE leida = 0`
    ),
    pool.query<RowDataPacket[]>(
      // Año y semana (Lunes=1), evaluado en base a created_at
      `SELECT COUNT(*) as thisWeek FROM notificaciones WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)`
    ),
  ]);

  const total = Number((countResult[0][0] as any).total);
  const totalPages = Math.ceil(total / limit) || 1;
  
  const unread = Number((unreadResult[0][0] as any).unread);
  const thisWeek = Number((thisWeekResult[0][0] as any).thisWeek);

  return {
    data: rowsResult[0] as Notificacion[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    summary: {
      unread,
      thisWeek,
    }
  };
}

/**
 * Obtiene una única notificación por su ID.
 */
export async function obtenerNotificacionPorId(
  id: number
): Promise<Notificacion | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM notificaciones WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? (rows[0] as Notificacion) : null;
}

// ─── Actualización ────────────────────────────────────────────────────────────

/**
 * Marca una notificación como leída, registrando la fecha y hora de lectura.
 * @returns `true` si se actualizó algún registro; `false` si el ID no existe.
 */
export async function marcarNotificacionLeida(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE notificaciones
     SET leida = TRUE, fecha_lectura = NOW()
     WHERE id = ? AND leida = FALSE`,
    [id]
  );
  return result.affectedRows > 0;
}

/**
 * Marca una notificación como leída asegurando que pertenezca a un usuario_id específico.
 * @returns `true` si se actualizó algún registro; `false` si no existe o no pertenece al usuario.
 */
export async function marcarNotificacionLeidaPorUsuario(
  id: number,
  usuario_id: number
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE notificaciones
     SET leida = TRUE, fecha_lectura = NOW()
     WHERE id = ? AND usuario_id = ? AND leida = FALSE`,
    [id, usuario_id]
  );
  return result.affectedRows > 0;
}

// ─── Helpers de contexto ──────────────────────────────────────────────────────

/**
 * Obtiene el usuario_id del administrador activo del sistema.
 * CleanGo opera con un único administrador; si en el futuro hubiera varios,
 * esta función puede adaptarse para devolver un array sin cambiar el contrato del Service.
 *
 * @returns ID del administrador activo o `null` si no se encuentra.
 */
export async function obtenerAdminId(): Promise<number | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM usuarios
     WHERE rol = 'Administrador' AND estado = 'Activo'
     LIMIT 1`,
    []
  );
  return rows.length > 0 ? (rows[0].id as number) : null;
}

/**
 * Obtiene los IDs de todos los ciudadanos activos.
 * @returns Array de IDs de ciudadanos.
 */
export async function obtenerIdsCiudadanos(): Promise<number[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM usuarios
     WHERE rol = 'Ciudadano' AND estado = 'Activo'`
  );
  return rows.map((row) => row.id as number);
}

/**
 * Obtiene los IDs de todos los conductores activos.
 * @returns Array de IDs de conductores.
 */
export async function obtenerIdsConductores(): Promise<number[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM conductores`
  );
  return rows.map((row) => row.id as number);
}

// ─── FCM Tokens ───────────────────────────────────────────────────────────────

/**
 * Obtiene todos los tokens FCM registrados para un usuario ciudadano.
 * Un usuario puede tener múltiples tokens (varios dispositivos).
 *
 * @param usuario_id - ID del usuario en la tabla `usuarios`.
 * @returns Array de tokens FCM.
 */
export async function getFcmTokensByUsuarioId(usuario_id: number): Promise<string[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT token FROM fcm_tokens WHERE usuario_id = ?`,
    [usuario_id]
  );
  return rows.map((row) => row.token as string);
}

/**
 * Elimina un token FCM de la base de datos.
 * Se llama cuando Firebase informa que el token ya no es válido
 * (app desinstalada, token rotado, etc.) para evitar acumular tokens muertos.
 *
 * @param token - El token FCM inválido a eliminar.
 */
export async function deleteFcmToken(token: string): Promise<void> {
  await pool.execute(`DELETE FROM fcm_tokens WHERE token = ?`, [token]);
}
