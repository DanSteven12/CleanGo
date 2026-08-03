import { Request, Response, CookieOptions } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as authService from '../services/authService';
import { logSecurityEvent } from '../services/securityLogService';
import type { AuthPayload } from '../middlewares/authMiddleware';
import { config } from '../config';

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

function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: '/',
  };
}

/** Configuración específica para CSRF (no es HttpOnly) */
function getCsrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false, // Debe poder ser leída por JS del lado del cliente
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: '/',
  };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  if (handleValidationErrors(req, res)) return;

  const { email, password, rememberMe = false } = req.body;

  // Network context passed to the service for audit logging
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] ?? 'unknown';
  const endpoint = req.originalUrl;

  try {
    const result = await authService.loginUser(email, password, { ip, userAgent, endpoint }, rememberMe);

    // ── Set JWTs as HttpOnly cookies ────────────────────────────────────────
    const sessionCookie = config.cookie.name;
    const refreshCookie = config.cookie.refreshName;
    const baseCookieOptions = getCookieOptions();

    // Access Token cookie
    res.cookie(sessionCookie, result.token, {
      ...baseCookieOptions,
      maxAge: config.cookie.accessMaxAgeMs,
    });

    // Refresh Token cookie (Largo o de sesión dependiendo de rememberMe)
    const refreshCookieOptions = { ...baseCookieOptions };
    if (rememberMe) {
      refreshCookieOptions.maxAge = config.cookie.rememberMaxAgeMs;
    }
    // Si rememberMe es false, omitimos maxAge. El navegador la tratará como Session Cookie.

    res.cookie(refreshCookie, result.refreshToken, refreshCookieOptions);

    // Generar y enviar CSRF Token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie(config.cookie.csrfName, csrfToken, getCsrfCookieOptions());

    // Token intentionally omitted from body — it travels via cookie only
    res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      user: result.user,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * POST /api/auth/refresh
 * Renueva el Access Token usando el Refresh Token en la cookie.
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshCookieName = config.cookie.refreshName;
  const refreshToken = req.cookies?.[refreshCookieName];

  if (!refreshToken) {
    res.status(401).json({ message: 'No se proporcionó refresh token.' });
    return;
  }

  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] ?? 'unknown';

  try {
    const result = await authService.refreshSession(refreshToken, ip, userAgent);

    const sessionCookie = config.cookie.name;
    const baseCookieOptions = getCookieOptions();

    res.cookie(sessionCookie, result.token, {
      ...baseCookieOptions,
      maxAge: config.cookie.accessMaxAgeMs,
    });

    res.cookie(refreshCookieName, result.refreshToken, baseCookieOptions);
    
    // Rotar CSRF Token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie(config.cookie.csrfName, csrfToken, getCsrfCookieOptions());

    res.status(200).json({ message: 'Token renovado.', user: result.user });
  } catch (err) {
    const baseCookieOptions = getCookieOptions();
    res.clearCookie(config.cookie.name, baseCookieOptions);
    res.clearCookie(refreshCookieName, baseCookieOptions);
    res.clearCookie(config.cookie.csrfName, getCsrfCookieOptions());
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
 * Clears the HttpOnly session cookie and ends the DB session.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const cookieName = config.cookie.name;
  const token = req.cookies?.[cookieName];

  if (token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret, { ignoreExpiration: true }) as AuthPayload;
      if (payload?.id && payload?.jti) {
        await authService.logoutSession(payload.id, payload.jti);

        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] ?? 'unknown';
        logSecurityEvent({
          correo: payload.correo,
          ip,
          userAgent,
          endpoint: req.originalUrl,
          httpStatus: 200,
          descripcion: 'Cierre de sesión manual exitoso (Sesión invalidada en BD).',
        });
      }
    } catch (e) {
      // Ignore decode errors or invalid signature
    }
  }

  const refreshCookieName = config.cookie.refreshName;
  const clearOptions = getCookieOptions();

  res.clearCookie(cookieName, clearOptions);
  res.clearCookie(refreshCookieName, clearOptions);
  res.clearCookie(config.cookie.csrfName, getCsrfCookieOptions());

  res.status(200).json({ message: 'Sesión cerrada correctamente.' });
}
