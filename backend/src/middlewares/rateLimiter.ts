// backend/src/middlewares/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { logSecurityEvent } from '../services/securityLogService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extracts the best available client IP from the request.
 * Falls back to req.ip if no proxy header is present.
 */
function getClientIp(req: import('express').Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

// ─── Login Limiter ────────────────────────────────────────────────────────────

/**
 * Rate limiter for POST /api/auth/login.
 * 5 attempts per 60 seconds per IP.
 * High sensitivity: protects against brute-force password attacks.
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    const ip = getClientIp(req);
    const correo: string | null = typeof req.body?.email === 'string' ? req.body.email : null;

    // Fire-and-forget audit log
    logSecurityEvent({
      correo,
      ip,
      userAgent: req.headers['user-agent'] ?? 'unknown',
      endpoint: req.originalUrl,
      httpStatus: 429,
      descripcion: 'Acceso temporalmente bloqueado por Rate Limit',
    });

    res.status(429).json({
      message: 'Demasiados intentos de inicio de sesión. Por favor espera 60 segundos antes de volver a intentar.',
    });
  },
});

// ─── Register Limiter ─────────────────────────────────────────────────────────

/**
 * Rate limiter for POST /api/auth/register.
 * 10 attempts per 60 minutes per IP.
 * Lower sensitivity: registration is not a brute-force target, but limits
 * spam account creation and scraping.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    const ip = getClientIp(req);
    const correo: string | null = typeof req.body?.correo === 'string' ? req.body.correo : null;

    logSecurityEvent({
      correo,
      ip,
      userAgent: req.headers['user-agent'] ?? 'unknown',
      endpoint: req.originalUrl,
      httpStatus: 429,
      descripcion: 'Acceso temporalmente bloqueado por Rate Limit',
    });

    res.status(429).json({
      message: 'Demasiados intentos de registro. Por favor espera 60 minutos antes de volver a intentar.',
    });
  },
});

// ─── Forgot Password Limiter ──────────────────────────────────────────────────

/**
 * Rate limiter for POST /api/auth/forgot-password.
 * 5 attempts per 15 minutes per IP.
 * Prevents email enumeration, spam, and account disruption via reset flooding.
 * Intentionally independent of loginLimiter so a locked-out user can still
 * request a password reset.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    const ip = getClientIp(req);
    const correo: string | null = typeof req.body?.email === 'string' ? req.body.email : null;

    logSecurityEvent({
      correo,
      ip,
      userAgent: req.headers['user-agent'] ?? 'unknown',
      endpoint: req.originalUrl,
      httpStatus: 429,
      descripcion: 'Acceso temporalmente bloqueado por Rate Limit',
    });

    res.status(429).json({
      message: 'Demasiadas solicitudes de recuperación. Por favor espera 15 minutos antes de volver a intentar.',
    });
  },
});

// ─── Device Login Limiter ─────────────────────────────────────────────────────

/**
 * Rate limiter para POST /api/device/auth/login.
 * 5 intentos por 60 segundos por IP.
 * Idéntico al loginLimiter Web — protege contra fuerza bruta de credenciales
 * de dispositivos.
 */
export const deviceLoginLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 segundos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    const ip = getClientIp(req);
    const usuario: string | null =
      typeof req.body?.usuario_dispositivo === 'string' ? req.body.usuario_dispositivo : null;

    logSecurityEvent({
      correo: usuario,
      ip,
      userAgent: req.headers['user-agent'] ?? 'unknown',
      endpoint: req.originalUrl,
      httpStatus: 429,
      descripcion: 'Device login bloqueado por Rate Limit (brute-force protection)',
    });

    res.status(429).json({
      message: 'Demasiados intentos de inicio de sesión. Por favor espera 60 segundos antes de volver a intentar.',
    });
  },
});

// ─── Mobile Ciudadano Login Limiter ───────────────────────────────────────────

/**
 * Rate limiter para POST /api/mobile/auth/login.
 * 5 intentos por 60 segundos por IP.
 * Idéntico al loginLimiter Web — protege contra fuerza bruta sobre
 * las credenciales de ciudadanos.
 */
export const mobileLoginLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 segundos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    const ip = getClientIp(req);
    const correo: string | null = typeof req.body?.email === 'string' ? req.body.email : null;

    logSecurityEvent({
      correo,
      ip,
      userAgent: req.headers['user-agent'] ?? 'unknown',
      endpoint: req.originalUrl,
      httpStatus: 429,
      descripcion: 'Mobile login bloqueado por Rate Limit (brute-force protection)',
    });

    res.status(429).json({
      message: 'Demasiados intentos de inicio de sesión. Por favor espera 60 segundos antes de volver a intentar.',
    });
  },
});
