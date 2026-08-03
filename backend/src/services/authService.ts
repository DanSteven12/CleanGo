// backend/src/services/authService.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool } from '../db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logSecurityEvent } from './securityLogService';
import { config } from '../config';

const SALT_ROUNDS = 12;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
}

export interface LoginResult {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Network context injected by the controller for audit logging.
 * Optional so loginUser can still be called from tests without a full Request.
 */
export interface RequestContext {
  ip: string;
  userAgent: string;
  endpoint: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(user: AuthUser, jti: string): string {
  return jwt.sign(
    { id: user.id, correo: user.correo, rol: user.rol, jti },
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
 * Authenticates a user and returns a signed JWT token.
 * If ctx is provided, all authentication outcomes (success and failure)
 * are recorded in login_logs via securityLogService.
 */
export async function loginUser(
  email: string,
  password: string,
  ctx?: RequestContext,
  rememberMe: boolean = false
): Promise<LoginResult> {
  const logCtx = ctx ?? { ip: 'unknown', userAgent: 'unknown', endpoint: '/api/auth/login' };

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, nombre, correo, password, rol, estado FROM usuarios WHERE correo = ?',
    [email]
  );

  if (rows.length === 0) {
    // Audit: invalid credentials (user not found — same message to prevent enumeration)
    logSecurityEvent({
      correo: email,
      ip: logCtx.ip,
      userAgent: logCtx.userAgent,
      endpoint: logCtx.endpoint,
      httpStatus: 401,
      descripcion: 'Credenciales inválidas — usuario no encontrado.',
    });
    throw { status: 401, message: 'Credenciales inválidas.' };
  }

  const usuario = rows[0];

  if (usuario.estado !== 'Activo') {
    // Audit: account disabled
    logSecurityEvent({
      correo: email,
      ip: logCtx.ip,
      userAgent: logCtx.userAgent,
      endpoint: logCtx.endpoint,
      httpStatus: 403,
      descripcion: `Intento de acceso a cuenta inactiva (estado: ${usuario.estado}).`,
    });
    throw { status: 403, message: 'Tu cuenta ha sido bloqueada. Contacta al administrador.' };
  }

  // Secure bcrypt comparison — all passwords must be hashed (no plaintext fallback)
  const isMatch = await bcrypt.compare(password, usuario.password);

  if (!isMatch) {
    // Audit: wrong password
    logSecurityEvent({
      correo: email,
      ip: logCtx.ip,
      userAgent: logCtx.userAgent,
      endpoint: logCtx.endpoint,
      httpStatus: 401,
      descripcion: 'Credenciales inválidas — contraseña incorrecta.',
    });
    throw { status: 401, message: 'Credenciales inválidas.' };
  }

  // Update last access
  await pool.execute('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [usuario.id]);

  const user: AuthUser = {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
  };

  const jti = crypto.randomUUID();
  const token = generateToken(user, jti);
  const refreshTokenData = generateRefreshToken();

  // Registrar o actualizar la sesión activa (1 por usuario) con el jti y el refresh_token_hash
  await pool.execute(
    `INSERT INTO sesiones (usuario_id, jti, refresh_token_hash, ip, user_agent) 
     VALUES (?, ?, ?, ?, ?) 
     ON DUPLICATE KEY UPDATE jti = VALUES(jti), refresh_token_hash = VALUES(refresh_token_hash), ip = VALUES(ip), user_agent = VALUES(user_agent)`,
    [user.id, jti, refreshTokenData.hash, logCtx.ip, logCtx.userAgent]
  );

  // Audit: successful login
  logSecurityEvent({
    correo: email,
    ip: logCtx.ip,
    userAgent: logCtx.userAgent,
    endpoint: logCtx.endpoint,
    httpStatus: 200,
    descripcion: `Inicio de sesión exitoso (rol: ${user.rol}).`,
  });

  return { token, refreshToken: refreshTokenData.raw, user };
}

/**
 * Registers a new user. Rol defaults to 'Ciudadano'.
 */
export async function registerUser(
  nombre: string,
  correo: string,
  password: string,
  rol: string = 'Ciudadano'
): Promise<AuthUser> {
  // Validate role
  if (rol !== 'Administrador' && rol !== 'Ciudadano') {
    throw { status: 400, message: 'Rol inválido.' };
  }

  // Check if email already exists
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM usuarios WHERE correo = ?',
    [correo]
  );
  if (existing.length > 0) {
    throw { status: 409, message: 'El correo electrónico ya está registrado.' };
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO usuarios (nombre, correo, password, rol, estado) VALUES (?, ?, ?, ?, 'Activo')`,
    [nombre, correo, hashedPassword, rol]
  );

  const [newRows] = await pool.query<RowDataPacket[]>(
    'SELECT id, nombre, correo, rol FROM usuarios WHERE id = ?',
    [result.insertId]
  );

  return newRows[0] as AuthUser;
}

/**
 * Generates a password reset token and stores it in the DB.
 * Sends the reset link via email using Gmail API (OAuth2).
 * Returns the token (for dev fallback if email fails).
 * NOTE: We always respond with a generic message to prevent email enumeration.
 */
export async function forgotPassword(email: string): Promise<{ token: string | null }> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, nombre FROM usuarios WHERE correo = ? AND estado = ?',
    [email, 'Activo']
  );

  // If user not found, return null silently (no email enumeration)
  if (rows.length === 0) {
    return { token: null };
  }

  const userId = rows[0].id;
  const nombre = rows[0].nombre;
  const token = crypto.randomBytes(48).toString('hex'); // 96-char hex string
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  await pool.execute(
    'UPDATE usuarios SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
    [token, expires, userId]
  );

  // Send email with token link
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Soporte CleanGo" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Restablecer contraseña de tu cuenta CleanGo - Acción requerida',
      text: `Hola ${nombre},\n\nHas solicitado restablecer tu contraseña para tu cuenta en CleanGo.\nCopia y pega el siguiente enlace en tu navegador para continuar:\n\n${resetLink}\n\nEste enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #1763A6;">Recuperación de contraseña</h2>
          <p>Hola ${nombre},</p>
          <p>Has solicitado restablecer tu contraseña para tu cuenta en <strong>CleanGo</strong>. Haz clic en el botón de abajo para crear una nueva:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #90BF49; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Restablecer mi contraseña</a>
          </div>
          <p style="font-size: 14px; color: #666;">O copia y pega este enlace en tu navegador:</p>
          <p style="font-size: 12px; word-break: break-all; color: #0066cc;">${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999;">Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('[authService] info.messageId:', info.messageId);
    console.log('[authService] info.accepted:', info.accepted);
    console.log('[authService] info.rejected:', info.rejected);
    console.log('[authService] info.response:', info.response);
    console.log('[authService] info.envelope:', info.envelope);

    if (info.accepted && info.accepted.includes(email) && (!info.rejected || info.rejected.length === 0)) {
      console.log(`[authService] Email de recuperación enviado a: ${email}`);
      console.log(`[authService] Respuesta SMTP: ${info.response}`);
    } else {
      console.log(`[authService] El correo no fue aceptado completamente. accepted: ${info.accepted}, rejected: ${info.rejected}`);
    }
  } catch (err: any) {
    console.error('[authService] Error al enviar email:', err);
    console.error(`[authService] Detalles - Code: ${err.code}, Message: ${err.message}\nStack: ${err.stack}`);
    // As a fallback in development, log the token to the console so the flow can still be tested if the email fails.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[authService] DEV FALLBACK TOKEN: ${token}`);
    }
  }

  // We no longer return the token to prevent exposing it to the client
  return { token: null };
}

/**
 * Validates a reset token and updates the password.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, reset_token_expires FROM usuarios WHERE reset_token = ?',
    [token]
  );

  if (rows.length === 0) {
    throw { status: 400, message: 'El token de recuperación es inválido o ya fue utilizado.' };
  }

  const usuario = rows[0];
  const expires = new Date(usuario.reset_token_expires);

  if (Date.now() > expires.getTime()) {
    // Clean up expired token
    await pool.execute(
      'UPDATE usuarios SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [usuario.id]
    );
    throw { status: 400, message: 'El token de recuperación ha expirado. Solicita uno nuevo.' };
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await pool.execute(
    'UPDATE usuarios SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
    [hashedPassword, usuario.id]
  );
}

/**
 * Returns the authenticated user's profile data.
 */
export async function getAuthUser(userId: number): Promise<AuthUser> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, nombre, correo, rol FROM usuarios WHERE id = ? AND estado = ?',
    [userId, 'Activo']
  );

  if (rows.length === 0) {
    throw { status: 404, message: 'Usuario no encontrado.' };
  }

  return rows[0] as AuthUser;
}

/**
 * Invalida la sesión actual en la base de datos de manera segura,
 * garantizando que el usuario solo cierre su propia sesión activa.
 */
export async function logoutSession(userId: number, jti: string): Promise<void> {
  await pool.execute(
    'DELETE FROM sesiones WHERE usuario_id = ? AND jti = ?',
    [userId, jti]
  );
}

/**
 * Renueva la sesión usando un Refresh Token.
 * Valida estado, implementa Refresh Token Rotation e invalida el anterior.
 */
export async function refreshSession(rawRefreshToken: string, ip: string, userAgent: string): Promise<LoginResult> {
  const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  // Buscar sesión por hash y verificar usuario activo
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id as session_id, s.usuario_id, s.jti, u.nombre, u.correo, u.rol, u.estado 
     FROM sesiones s
     JOIN usuarios u ON s.usuario_id = u.id
     WHERE s.refresh_token_hash = ?`,
    [hash]
  );

  if (rows.length === 0) {
    throw { status: 401, message: 'Refresh token inválido o expirado.' };
  }

  const session = rows[0];

  if (session.estado !== 'Activo') {
    // Si la cuenta fue desactivada, borrar la sesión
    await pool.execute('DELETE FROM sesiones WHERE id = ?', [session.session_id]);
    throw { status: 401, message: 'Tu cuenta ha sido deshabilitada.' };
  }

  const user: AuthUser = {
    id: session.usuario_id,
    nombre: session.nombre,
    correo: session.correo,
    rol: session.rol,
  };

  // Rotation: Generar nuevo jti (invalida el Access Token anterior) y nuevo Refresh Token
  const newJti = crypto.randomUUID();
  const newAccessToken = generateToken(user, newJti);
  const newRefreshTokenData = generateRefreshToken();

  await pool.execute(
    'UPDATE sesiones SET jti = ?, refresh_token_hash = ?, ip = ?, user_agent = ? WHERE id = ?',
    [newJti, newRefreshTokenData.hash, ip, userAgent, session.session_id]
  );

  return { token: newAccessToken, refreshToken: newRefreshTokenData.raw, user };
}

/**
 * Reusable service: Permite a un administrador invalidar una sesión específica.
 */
export async function invalidateSessionByJti(jti: string): Promise<void> {
  await pool.execute('DELETE FROM sesiones WHERE jti = ?', [jti]);
}

/**
 * Reusable service: Permite a un administrador invalidar TODAS las sesiones de un usuario.
 * (Preparado para cuando el sistema permita múltiples sesiones).
 */
export async function invalidateAllUserSessions(userId: number): Promise<void> {
  await pool.execute('DELETE FROM sesiones WHERE usuario_id = ?', [userId]);
}
