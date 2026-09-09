// backend/src/modules/notifications/notification.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// ÚNICO responsable de interactuar con la base de datos para notificaciones.
// No contiene lógica de negocio. Todo SQL está aquí; el Service no toca SQL.
// ─────────────────────────────────────────────────────────────────────────────

import { pool } from '../../db';
import type { PoolConnection } from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type {
  ActualizarPreferenciasDTO,
  CrearNotificacionDTO,
  FiltrosNotificaciones,
  Notificacion,
  NotificacionCategoria,
  NotificacionesResponse,
  PreferenciasNotificaciones,
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
 * Conteo de notificaciones no leídas de un conductor.
 */
export async function obtenerConteoNoLeidasPorConductor(
  conductor_id: number
): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM notificaciones
     WHERE conductor_id = ? AND leida = FALSE`,
    [conductor_id]
  );
  return Number(rows[0].count);
}

/**
 * Marca como leída una notificación que pertenece al conductor indicado.
 */
export async function marcarNotificacionLeidaPorConductor(
  id: number,
  conductor_id: number
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE notificaciones
     SET leida = TRUE, fecha_lectura = NOW()
     WHERE id = ? AND conductor_id = ? AND leida = FALSE`,
    [id, conductor_id]
  );
  return result.affectedRows > 0;
}

/**
 * Marca como leídas TODAS las notificaciones de un conductor.
 */
export async function marcarTodasNotificacionesLeidasPorConductor(
  conductor_id: number
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE notificaciones
     SET leida = TRUE, fecha_lectura = NOW()
     WHERE conductor_id = ? AND leida = FALSE`,
    [conductor_id]
  );
  return result.affectedRows;
}

/**
 * Elimina una notificación perteneciente al conductor indicado.
 */
export async function eliminarNotificacionPorConductor(
  id: number,
  conductor_id: number
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM notificaciones
     WHERE id = ? AND conductor_id = ?`,
    [id, conductor_id]
  );
  return result.affectedRows > 0;
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

/**
 * Obtiene todos los tokens FCM registrados para un dispositivo camión.
 * @param camion_id - ID del camión en la tabla `camiones`.
 * @returns Array de tokens FCM.
 */
export async function getFcmTokensByCamionId(camion_id: number): Promise<string[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT token FROM fcm_tokens_camiones WHERE camion_id = ?`,
    [camion_id]
  );
  return rows.map((row) => row.token as string);
}

/**
 * Elimina un token FCM inválido de la tabla `fcm_tokens_camiones`.
 * @param token - El token FCM inválido a eliminar.
 */
export async function deleteFcmTokenCamion(token: string): Promise<void> {
  await pool.execute(`DELETE FROM fcm_tokens_camiones WHERE token = ?`, [token]);
}

/**
 * Obtiene el camion_id asociado a un conductor_id a través de su asignación de ruta más reciente.
 * @param conductor_id - ID del conductor en la tabla `conductores`.
 * @returns ID del camión o null si no tiene asignación registrada.
 */
export async function getCamionIdByConductorId(conductor_id: number): Promise<number | null> {
  const [hoy] = await pool.execute<RowDataPacket[]>(
    `SELECT camion_id FROM asignaciones_rutas
     WHERE conductor_id = ?
       AND fecha_programada = CURDATE()
       AND estatus_recorrido IN ('Pendiente', 'En progreso')
     ORDER BY id DESC
     LIMIT 1`,
    [conductor_id]
  );
  if (hoy.length > 0 && hoy[0].camion_id) {
    return hoy[0].camion_id as number;
  }

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT camion_id FROM asignaciones_rutas
     WHERE conductor_id = ? AND camion_id IS NOT NULL
     ORDER BY fecha_programada DESC, id DESC
     LIMIT 1`,
    [conductor_id]
  );
  return rows.length > 0 && rows[0].camion_id ? (rows[0].camion_id as number) : null;
}

// ─── Preferencias de Notificaciones ──────────────────────────────────────────

/**
 * Obtiene las preferencias de notificaciones de un ciudadano.
 *
 * Si el ciudadano todavía no tiene un registro en `preferencias_notificaciones`,
 * lo crea con los valores por defecto (todos en TRUE) y devuelve esa fila nueva.
 * Esto garantiza que cualquier ciudadano siempre tenga una configuración válida
 * sin necesidad de que el proceso de registro la cree explícitamente.
 *
 * @param usuario_id - ID del ciudadano en la tabla `usuarios`.
 * @returns Las preferencias completas del ciudadano.
 */
export async function getPreferenciasUsuario(
  usuario_id: number
): Promise<PreferenciasNotificaciones> {
  // 1. Intentar obtener el registro existente
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT usuario_id,
            notificaciones_push_enabled,
            proximidad_enabled,
            retraso_enabled,
            updated_at
     FROM preferencias_notificaciones
     WHERE usuario_id = ?`,
    [usuario_id]
  );

  if (rows.length > 0) {
    const row = rows[0];
    return {
      usuario_id:                  row.usuario_id as number,
      notificaciones_push_enabled: Boolean(row.notificaciones_push_enabled),
      proximidad_enabled:          Boolean(row.proximidad_enabled),
      retraso_enabled:             Boolean(row.retraso_enabled),
      updated_at:                  row.updated_at as Date,
    };
  }

  // 2. No existe — crear con valores por defecto (todos TRUE)
  await pool.execute<ResultSetHeader>(
    `INSERT INTO preferencias_notificaciones
       (usuario_id, notificaciones_push_enabled, proximidad_enabled, retraso_enabled)
     VALUES (?, TRUE, TRUE, TRUE)`,
    [usuario_id]
  );

  // 3. Devolver la fila recién creada
  const [newRows] = await pool.execute<RowDataPacket[]>(
    `SELECT usuario_id,
            notificaciones_push_enabled,
            proximidad_enabled,
            retraso_enabled,
            updated_at
     FROM preferencias_notificaciones
     WHERE usuario_id = ?`,
    [usuario_id]
  );

  const newRow = newRows[0];
  return {
    usuario_id:                  newRow.usuario_id as number,
    notificaciones_push_enabled: Boolean(newRow.notificaciones_push_enabled),
    proximidad_enabled:          Boolean(newRow.proximidad_enabled),
    retraso_enabled:             Boolean(newRow.retraso_enabled),
    updated_at:                  newRow.updated_at as Date,
  };
}

/**
 * Crea o actualiza las preferencias de notificaciones de un ciudadano.
 *
 * Utiliza INSERT … ON DUPLICATE KEY UPDATE para garantizar atomicidad.
 * La clave primaria de `preferencias_notificaciones` es `usuario_id`, por lo que:
 *  - Si NO existe el registro → INSERT con los valores proporcionados y TRUE en los omitidos.
 *  - Si YA existe el registro → UPDATE solo de los campos presentes en el DTO.
 *
 * Solo se modifican los campos explícitamente incluidos en `prefs`.
 * Todos los valores se envían como parámetros (prepared statements), nunca concatenados.
 *
 * @param usuario_id - ID del ciudadano en la tabla `usuarios`.
 * @param prefs      - Campos a actualizar (uno o varios; todos son opcionales).
 * @returns Las preferencias completas tras la operación.
 */
export async function upsertPreferencias(
  usuario_id: number,
  prefs: ActualizarPreferenciasDTO
): Promise<PreferenciasNotificaciones> {
  // Resolver valores para el INSERT inicial (usa el valor recibido o TRUE como default)
  const pushEnabled  = prefs.notificaciones_push_enabled ?? true;
  const proxEnabled  = prefs.proximidad_enabled          ?? true;
  const retrasoEnabled = prefs.retraso_enabled           ?? true;

  // Construir la cláusula SET del ON DUPLICATE KEY UPDATE con solo los campos presentes
  const updates: string[] = [];
  const updateParams: (number | boolean)[] = [];

  if (prefs.notificaciones_push_enabled !== undefined) {
    updates.push('notificaciones_push_enabled = ?');
    updateParams.push(prefs.notificaciones_push_enabled);
  }
  if (prefs.proximidad_enabled !== undefined) {
    updates.push('proximidad_enabled = ?');
    updateParams.push(prefs.proximidad_enabled);
  }
  if (prefs.retraso_enabled !== undefined) {
    updates.push('retraso_enabled = ?');
    updateParams.push(prefs.retraso_enabled);
  }

  if (updates.length === 0) {
    // No hay nada que actualizar; devolver el estado actual (auto-creando si es necesario)
    return getPreferenciasUsuario(usuario_id);
  }

  await pool.execute<ResultSetHeader>(
    `INSERT INTO preferencias_notificaciones
       (usuario_id, notificaciones_push_enabled, proximidad_enabled, retraso_enabled)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       ${updates.join(',\n       ')}`,
    [usuario_id, pushEnabled, proxEnabled, retrasoEnabled, ...updateParams]
  );

  // Devolver el estado final completo
  return getPreferenciasUsuario(usuario_id);
}
