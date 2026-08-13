// backend/src/controllers/deviceAuthController.ts
/**
 * Controladores de autenticación para la app móvil de Conductores.
 *
 * A diferencia de authController (Web):
 *  - No usa cookies HttpOnly
 *  - Devuelve los tokens directamente en el body JSON
 *  - El cliente los almacena en expo-secure-store
 *  - Lee el token de entrada del header Authorization: Bearer
 */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import * as deviceAuthService from '../services/deviceAuthService';
import { logSecurityEvent } from '../services/securityLogService';
import type { DeviceAuthPayload } from '../middlewares/deviceAuthMiddleware';
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
    console.error('[deviceAuthController] Unexpected error:', err);
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
 * POST /api/device/auth/login
 * Autentica un dispositivo/camión y devuelve tokens en el body JSON.
 */
export async function deviceLogin(req: Request, res: Response): Promise<void> {
  if (handleValidationErrors(req, res)) return;

  const { usuario_dispositivo, password } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] ?? 'unknown';
  const endpoint = req.originalUrl;

  try {
    const result = await deviceAuthService.loginCamion(
      usuario_dispositivo,
      password,
      { ip, userAgent, endpoint }
    );

    res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      camion: result.camion,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * POST /api/device/auth/refresh
 * Renueva el Access Token usando el Refresh Token enviado en el body JSON.
 * (No usa cookies — el cliente lo envía desde SecureStore)
 */
export async function deviceRefresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    res.status(401).json({ message: 'Refresh token requerido.' });
    return;
  }

  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] ?? 'unknown';

  try {
    const result = await deviceAuthService.refreshCamionSession(refreshToken, ip, userAgent);

    res.status(200).json({
      message: 'Token renovado.',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      camion: result.camion,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * POST /api/device/auth/logout
 * Invalida la sesión activa del camión. Requiere deviceAuthMiddleware.
 */
export async function deviceLogout(req: Request, res: Response): Promise<void> {
  const camion = req.camion as DeviceAuthPayload;

  try {
    await deviceAuthService.logoutCamionSession(camion.camion_id, camion.jti);

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    logSecurityEvent({
      correo: camion.usuario_dispositivo,
      ip,
      userAgent,
      endpoint: req.originalUrl,
      httpStatus: 200,
      descripcion: `Device logout exitoso — camión ${camion.numero_economico}.`,
    });

    res.status(200).json({ message: 'Sesión cerrada correctamente.' });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * GET /api/device/auth/me
 * Devuelve los datos del camión autenticado. Requiere deviceAuthMiddleware.
 */
export async function deviceMe(req: Request, res: Response): Promise<void> {
  const camion = req.camion as DeviceAuthPayload;

  try {
    const camionData = await deviceAuthService.getAuthCamion(camion.camion_id);
    res.status(200).json({ camion: camionData });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/**
 * GET /api/device/auth/asignacion
 * Devuelve la asignación actual del camión autenticado.
 * La identidad del camión proviene del token — nunca del body/query.
 * Requiere deviceAuthMiddleware.
 */
export async function deviceAsignacion(req: Request, res: Response): Promise<void> {
  const camion = req.camion as DeviceAuthPayload;

  try {
    const asignacion = await deviceAuthService.getAsignacionActual(camion.camion_id);
    res.status(200).json({ asignacion });
  } catch (err) {
    handleServiceError(err, res);
  }
}
