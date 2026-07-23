// backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as authService from '../services/authService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    res.status(422).json({ message: firstError.msg, errors: errors.array() });
    return true;
  }
  return false;
}

function handleServiceError(err: unknown, res: Response): void {
  if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
    const e = err as { status: number; message: string };
    res.status(e.status).json({ message: e.message });
  } else {
    console.error('[authController] Unexpected error:', err);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/** Extracts the real client IP, respecting X-Forwarded-For from proxies. */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  if (handleValidationErrors(req, res)) return;

  const { email, password } = req.body;

  // Network context passed to the service for audit logging
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] ?? 'unknown';
  const endpoint = req.originalUrl;

  try {
    const result = await authService.loginUser(email, password, { ip, userAgent, endpoint });

    // ── Set JWT as HttpOnly cookie ────────────────────────────────────────
    const cookieName = process.env.COOKIE_NAME || 'cleango_session';
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieSecure = process.env.COOKIE_SECURE === 'true' || isProduction;
    const cookieSameSite = (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax';
    const cookieDomain = process.env.COOKIE_DOMAIN; // Optional

    res.cookie(cookieName, result.token, {
      httpOnly: true,                   // Not accessible via JavaScript
      secure: cookieSecure,             // HTTPS only in production
      sameSite: cookieSameSite,         // Protects against CSRF; compatible con proxy/Vite
      domain: cookieDomain,             // Aplicar a subdominios si está configurado
      maxAge: 8 * 60 * 60 * 1000,      // 8h en ms — matches JWT_EXPIRES_IN
      path: '/',
    });

    // Token intentionally omitted from body — it travels via cookie only
    res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      user: result.user,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}


export async function register(req: Request, res: Response): Promise<void> {
  if (handleValidationErrors(req, res)) return;

  const { nombre, correo, password, rol } = req.body;

  try {
    const user = await authService.registerUser(nombre, correo, password, rol);
    res.status(201).json({
      message: 'Usuario registrado correctamente.',
      user,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  if (handleValidationErrors(req, res)) return;

  const { email } = req.body;

  try {
    const result = await authService.forgotPassword(email);

    // Always respond with a generic message to prevent email enumeration
    res.status(200).json({
      message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * POST /api/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  if (handleValidationErrors(req, res)) return;

  const { token, newPassword } = req.body;

  try {
    await authService.resetPassword(token, newPassword);
    res.status(200).json({ message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile (requires authMiddleware).
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'No autenticado.' });
    return;
  }

  try {
    const user = await authService.getAuthUser(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * POST /api/auth/logout
 * Clears the HttpOnly session cookie and ends the session.
 */
export function logout(req: Request, res: Response): void {
  const cookieName = process.env.COOKIE_NAME || 'cleango_session';
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure = process.env.COOKIE_SECURE === 'true' || isProduction;
  const cookieSameSite = (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax';
  const cookieDomain = process.env.COOKIE_DOMAIN;

  // clearCookie must use the same attributes that were set (path, sameSite, secure, domain)
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    domain: cookieDomain,
    path: '/',
  });

  res.status(200).json({ message: 'Sesión cerrada correctamente.' });
}
