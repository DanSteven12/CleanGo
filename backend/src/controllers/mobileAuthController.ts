// backend/src/controllers/mobileAuthController.ts
/**
 * Controladores de autenticación para la app móvil de Ciudadanos.
 *
 * Arquitectura:
 *   mobileAuthController
 *         ↓
 *   authService (existente, sin modificar)
 *         ↓
 *   tabla usuarios + tabla sesiones
 *
 * Diferencias con authController (Web):
 *  - No establece cookies HttpOnly.
 *  - No genera ni valida CSRF tokens.
 *  - Devuelve accessToken y refreshToken directamente en el body JSON.
 *  - Verifica explícitamente que el usuario tenga rol = 'Ciudadano'.
 *
 * Diferencias con deviceAuthController (Conductor):
 *  - Opera sobre la tabla `usuarios` y `sesiones` (no `camiones`/`sesiones_camiones`).
 *  - Usa `authService` en lugar de `deviceAuthService`.
 *  - Autentica con email + password (no usuario_dispositivo).
 */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
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
    console.error('[mobileAuthController] Unexpected error:', err);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/mobile/auth/login
 *
 * Autentica un Ciudadano y devuelve tokens en el body JSON.
 * Rechaza con 403 si el usuario existe pero tiene un rol distinto a 'Ciudadano'.
 *
 * Request:  { email, password }
 * Response: { message, user: { id, nombre, correo, rol }, accessToken, refreshToken }
 */
export async function mobileLogin(req: Request, res: Response): Promise<void> {
  if (handleValidationErrors(req, res)) return;

  const { email, password } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] ?? 'unknown';
  const endpoint = req.originalUrl;

  try {
    // Reutilizar authService.loginUser (valida credenciales, crea/actualiza sesión, genera tokens)
    const result = await authService.loginUser(email, password, { ip, userAgent, endpoint });

    // Verificar que el usuario sea un Ciudadano
    // Si el rol es distinto, debemos invalidar la sesión que se acaba de crear para no dejar
    // una sesión huérfana en la base de datos.
    if (result.user.rol !== 'Ciudadano') {
      // Invalidar la sesión recién creada — seguridad: no dejar sesión sin token en el cliente
      try {
        // Decodificar el token para obtener el jti (no necesita verificación de firma aquí,
        // ya que el token lo acabamos de generar nosotros mismos)
        const payload = jwt.decode(result.token) as AuthPayload | null;
        if (payload?.jti) {
          await authService.logoutSession(result.user.id, payload.jti);
        }
      } catch {
        // Si falla la limpieza, no afecta la respuesta de error al cliente
      }

      logSecurityEvent({
        correo: email,
        ip,
        userAgent,
        endpoint,
        httpStatus: 403,
        descripcion: `Mobile login rechazado — rol inválido para este canal (rol: ${result.user.rol}).`,
      });

      res.status(403).json({ message: 'Acceso no autorizado. Este canal es exclusivo para Ciudadanos.' });
      return;
    }

    // Respuesta móvil: tokens en JSON, sin cookies
    res.status(200).json({
      message: 'Login exitoso.',
      user: {
        id: result.user.id,
        nombre: result.user.nombre,
        correo: result.user.correo,
        rol: result.user.rol,
      },
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * POST /api/mobile/auth/refresh
 *
 * Renueva el Access Token usando el Refresh Token enviado en el body JSON.
 * Implementa Refresh Token Rotation reutilizando authService.refreshSession.
 * Verifica que la sesión pertenezca a un Ciudadano antes de emitir nuevos tokens.
 *
 * Request:  { refreshToken }
 * Response: { message, accessToken, refreshToken, user: { id, nombre, correo, rol } }
 */
export async function mobileRefresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    res.status(401).json({ message: 'Refresh token requerido.' });
    return;
  }

  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] ?? 'unknown';

  try {
    // Reutilizar authService.refreshSession (valida RT, implementa rotación, actualiza sesión)
    const result = await authService.refreshSession(refreshToken, ip, userAgent);

    // Verificar que la sesión pertenezca a un Ciudadano
    // (protege contra uso del RT de un Administrador en este endpoint)
    if (result.user.rol !== 'Ciudadano') {
      // No rolar el token de un no-Ciudadano en este canal
      res.status(403).json({ message: 'Acceso no autorizado. Este canal es exclusivo para Ciudadanos.' });
      return;
    }

    res.status(200).json({
      message: 'Token renovado.',
      accessToken: result.token,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        nombre: result.user.nombre,
        correo: result.user.correo,
        rol: result.user.rol,
      },
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * POST /api/mobile/auth/logout
 *
 * Invalida la sesión activa del Ciudadano.
 * Requiere mobileAuthMiddleware (Bearer token válido con rol Ciudadano).
 *
 * La identidad del usuario proviene del token autenticado — nunca del body.
 *
 * Response: { message }
 */
export async function mobileLogout(req: Request, res: Response): Promise<void> {
  // req.user es garantizado por mobileAuthMiddleware
  const user = req.user as AuthPayload;

  try {
    // Reutilizar authService.logoutSession (elimina sesión por userId + jti)
    await authService.logoutSession(user.id, user.jti);

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    logSecurityEvent({
      correo: user.correo,
      ip,
      userAgent,
      endpoint: req.originalUrl,
      httpStatus: 200,
      descripcion: 'Mobile logout exitoso — sesión de ciudadano invalidada.',
    });

    res.status(200).json({ message: 'Sesión cerrada correctamente.' });
  } catch (err) {
    handleServiceError(err, res);
  }
}
