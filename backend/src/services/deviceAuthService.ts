// backend/src/services/deviceAuthService.ts
/**
 * Servicio de autenticación para dispositivos móviles de conductores.
 *
 * Maneja las credenciales de la tabla `camiones` (usuario_dispositivo / password_dispositivo).
 * Las sesiones se almacenan en `sesiones_camiones`, separadas de `sesiones` de usuarios Web.
 *
 * Reutiliza los helpers de JWT y Refresh Token de authService donde es posible,
 * pero opera sobre tablas y entidades completamente distintas.
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';
import { logSecurityEvent } from './securityLogService';
import { config } from '../config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CamionAuth {
  camion_id: number;
  numero_economico: string;
  placa: string;
  usuario_dispositivo: string;
  estado: string;
  gps_instalado: boolean;
}

export interface DeviceLoginResult {
  accessToken: string;
  refreshToken: string;
  camion: CamionAuth;
}

export interface DeviceRequestContext {
  ip: string;
  userAgent: string;
  endpoint: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateDeviceToken(camion: CamionAuth, jti: string): string {
  return jwt.sign(
    {
      camion_id: camion.camion_id,
      usuario_dispositivo: camion.usuario_dispositivo,
      numero_economico: camion.numero_economico,
      tipo: 'camion',
      jti,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );
}

function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Autentica un dispositivo/camión usando usuario_dispositivo + password.
 * Registro de intentos via securityLogService.
 * Solo camiones con estado = 'Activo' pueden iniciar sesión.
 */
export async function loginCamion(
  usuario_dispositivo: string,
  password: string,
  ctx?: DeviceRequestContext
): Promise<DeviceLoginResult> {
  const logCtx = ctx ?? { ip: 'unknown', userAgent: 'unknown', endpoint: '/api/device/auth/login' };

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, numero_economico, placa, usuario_dispositivo, password_dispositivo, estado, gps_instalado
     FROM camiones
     WHERE usuario_dispositivo = ?`,
    [usuario_dispositivo]
  );

  if (rows.length === 0) {
    // No revelar si el usuario existe o no
    logSecurityEvent({
      correo: usuario_dispositivo,
      ip: logCtx.ip,
      userAgent: logCtx.userAgent,
      endpoint: logCtx.endpoint,
      httpStatus: 401,
      descripcion: 'Device login fallido — usuario_dispositivo no encontrado.',
    });
    throw { status: 401, message: 'Credenciales inválidas.' };
  }

  const camionRow = rows[0];

  if (camionRow.estado !== 'Activo') {
    logSecurityEvent({
      correo: usuario_dispositivo,
      ip: logCtx.ip,
      userAgent: logCtx.userAgent,
      endpoint: logCtx.endpoint,
      httpStatus: 403,
      descripcion: `Device login fallido — camión inactivo (estado: ${camionRow.estado}).`,
    });
    throw { status: 403, message: 'Este dispositivo ha sido desactivado. Contacta al administrador.' };
  }

  const isMatch = await bcrypt.compare(password, camionRow.password_dispositivo);

  if (!isMatch) {
    logSecurityEvent({
      correo: usuario_dispositivo,
      ip: logCtx.ip,
      userAgent: logCtx.userAgent,
      endpoint: logCtx.endpoint,
      httpStatus: 401,
      descripcion: 'Device login fallido — contraseña incorrecta.',
    });
    throw { status: 401, message: 'Credenciales inválidas.' };
  }

  const camion: CamionAuth = {
    camion_id: camionRow.id,
    numero_economico: camionRow.numero_economico,
    placa: camionRow.placa,
    usuario_dispositivo: camionRow.usuario_dispositivo,
    estado: camionRow.estado,
    gps_instalado: !!camionRow.gps_instalado,
  };

  const jti = crypto.randomUUID();
  const accessToken = generateDeviceToken(camion, jti);
  const refreshTokenData = generateRefreshToken();

  // Registrar sesión activa (1 por camión — ON DUPLICATE KEY actualiza)
  await pool.execute(
    `INSERT INTO sesiones_camiones (camion_id, jti, refresh_token_hash, ip, user_agent)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       jti = VALUES(jti),
       refresh_token_hash = VALUES(refresh_token_hash),
       ip = VALUES(ip),
       user_agent = VALUES(user_agent)`,
    [camion.camion_id, jti, refreshTokenData.hash, logCtx.ip, logCtx.userAgent]
  );

  logSecurityEvent({
    correo: usuario_dispositivo,
    ip: logCtx.ip,
    userAgent: logCtx.userAgent,
    endpoint: logCtx.endpoint,
    httpStatus: 200,
    descripcion: `Device login exitoso — camión ${camion.numero_economico} (${camion.placa}).`,
  });

  return { accessToken, refreshToken: refreshTokenData.raw, camion };
}

/**
 * Renueva el Access Token usando el Refresh Token.
 * Implementa Refresh Token Rotation: invalida el anterior y emite uno nuevo.
 * Verifica que el camión siga activo.
 */
export async function refreshCamionSession(
  rawRefreshToken: string,
  ip: string,
  userAgent: string
): Promise<DeviceLoginResult> {
  const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sc.id AS session_id, sc.camion_id, sc.jti,
            c.numero_economico, c.placa, c.usuario_dispositivo, c.estado, c.gps_instalado
     FROM sesiones_camiones sc
     JOIN camiones c ON sc.camion_id = c.id
     WHERE sc.refresh_token_hash = ?`,
    [hash]
  );

  if (rows.length === 0) {
    throw { status: 401, message: 'Refresh token inválido o expirado.' };
  }

  const session = rows[0];

  if (session.estado !== 'Activo') {
    // Si el camión fue desactivado, eliminar la sesión
    await pool.execute('DELETE FROM sesiones_camiones WHERE id = ?', [session.session_id]);
    throw { status: 401, message: 'Este dispositivo ha sido desactivado.' };
  }

  const camion: CamionAuth = {
    camion_id: session.camion_id,
    numero_economico: session.numero_economico,
    placa: session.placa,
    usuario_dispositivo: session.usuario_dispositivo,
    estado: session.estado,
    gps_instalado: !!session.gps_instalado,
  };

  // Rotation: nuevo jti + nuevo Refresh Token
  const newJti = crypto.randomUUID();
  const newAccessToken = generateDeviceToken(camion, newJti);
  const newRefreshTokenData = generateRefreshToken();

  await pool.execute(
    'UPDATE sesiones_camiones SET jti = ?, refresh_token_hash = ?, ip = ?, user_agent = ? WHERE id = ?',
    [newJti, newRefreshTokenData.hash, ip, userAgent, session.session_id]
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshTokenData.raw, camion };
}

/**
 * Invalida la sesión activa del camión.
 * Solo elimina la sesión si el jti coincide (seguridad extra).
 */
export async function logoutCamionSession(camionId: number, jti: string): Promise<void> {
  await pool.execute(
    'DELETE FROM sesiones_camiones WHERE camion_id = ? AND jti = ?',
    [camionId, jti]
  );
}

/**
 * Devuelve los datos actuales del camión autenticado.
 * Usado por GET /api/device/auth/me.
 */
export async function getAuthCamion(camionId: number): Promise<CamionAuth> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, numero_economico, placa, usuario_dispositivo, estado, gps_instalado
     FROM camiones
     WHERE id = ? AND estado = 'Activo'`,
    [camionId]
  );

  if (rows.length === 0) {
    throw { status: 404, message: 'Camión no encontrado o inactivo.' };
  }

  return {
    camion_id: rows[0].id,
    numero_economico: rows[0].numero_economico,
    placa: rows[0].placa,
    usuario_dispositivo: rows[0].usuario_dispositivo,
    estado: rows[0].estado,
    gps_instalado: !!rows[0].gps_instalado,
  };
}

/**
 * Obtiene la asignación actual del camión autenticado.
 * "Actual" = asignación de hoy (o próxima pendiente/en progreso) del camión.
 * La identidad del camión proviene del token autenticado, no del cliente.
 */
export async function getAsignacionActual(camionId: number): Promise<RowDataPacket | null> {
  // Mapear el número de día JS (0=Dom, 1=Lun ... 6=Sab) al ENUM de horarios_rutas
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaSemanaActual = diasSemana[new Date().getDay()];

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       ar.id,
       ar.ruta_id,
       ar.camion_id,
       ar.conductor_id,
       ar.fecha_programada,
       ar.horario_inicio,
       ar.horario_fin,
       ar.estatus_recorrido,
       r.nombre        AS ruta_nombre,
       r.color         AS ruta_color,
       c.numero_economico,
       c.placa,
       c.gps_instalado,
       d.nombre_completo AS conductor_nombre,
       hr.hora_inicio_estimada AS horario_ruta_inicio,
       hr.hora_fin_estimada    AS horario_ruta_fin
     FROM asignaciones_rutas ar
     LEFT JOIN rutas r       ON r.id = ar.ruta_id
     LEFT JOIN camiones c    ON c.id = ar.camion_id
     LEFT JOIN conductores d ON d.id = ar.conductor_id
     LEFT JOIN horarios_rutas hr
       ON hr.ruta_id = ar.ruta_id AND hr.dia_semana = ?
     WHERE ar.camion_id = ?
       AND ar.fecha_programada = CURDATE()
       AND ar.estatus_recorrido IN ('Pendiente', 'En progreso')
     ORDER BY ar.horario_inicio ASC
     LIMIT 1`,
    [diaSemanaActual, camionId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Inserta o actualiza un token de Firebase Cloud Messaging para un dispositivo camión.
 */
export async function upsertFcmTokenCamion(
  camionId: number,
  token: string,
  plataforma: 'android' | 'ios' | 'web' = 'android'
): Promise<void> {
  const query = `
    INSERT INTO fcm_tokens_camiones (camion_id, token, plataforma)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      camion_id = VALUES(camion_id),
      plataforma = VALUES(plataforma),
      updated_at = CURRENT_TIMESTAMP
  `;
  await pool.execute(query, [camionId, token, plataforma]);
}
