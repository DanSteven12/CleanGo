// backend/src/routes/deviceAuth.ts
/**
 * Rutas de autenticación para la app móvil de Conductores.
 *
 * Todos los endpoints comienzan con /api/device/auth/
 * y son totalmente independientes de /api/auth/ (Web).
 *
 * Los tokens no viajan en cookies — se devuelven en el body JSON
 * y el cliente los almacena en expo-secure-store.
 */
import { Router } from 'express';
import { deviceLoginLimiter } from '../middlewares/rateLimiter';
import { deviceAuthMiddleware } from '../middlewares/deviceAuthMiddleware';
import { deviceLoginValidators, deviceFcmTokenValidators } from '../validators/deviceAuthValidators';
import {
  deviceLogin,
  deviceRefresh,
  deviceLogout,
  deviceMe,
  deviceAsignacion,
  deviceRegisterFcmToken,
  deviceTestFcmPush,
} from '../controllers/deviceAuthController';

const router = Router();

/**
 * POST /api/device/auth/login
 * Rate limited (5 req / 60s por IP) · Input validado
 * Devuelve: { accessToken, refreshToken, camion }
 */
router.post('/login', deviceLoginLimiter, deviceLoginValidators, deviceLogin);

/**
 * POST /api/device/auth/refresh
 * Renueva el Access Token con el Refresh Token (en body JSON).
 * Implementa rotación de Refresh Token.
 */
router.post('/refresh', deviceRefresh);

/**
 * POST /api/device/auth/logout
 * Requiere Bearer token válido.
 * Elimina la sesión de sesiones_camiones.
 */
router.post('/logout', deviceAuthMiddleware, deviceLogout);

/**
 * GET /api/device/auth/me
 * Requiere Bearer token válido.
 * Devuelve los datos actuales del camión autenticado.
 */
router.get('/me', deviceAuthMiddleware, deviceMe);

/**
 * GET /api/device/auth/asignacion
 * Requiere Bearer token válido.
 * Devuelve la asignación actual del camión autenticado.
 * El camion_id viene del token — nunca del cliente.
 */
router.get('/asignacion', deviceAuthMiddleware, deviceAsignacion);

/**
 * POST /api/device/auth/fcm-token
 * Registra o actualiza el FCM Device Token del camión autenticado.
 * Requiere Bearer token válido.
 */
router.post('/fcm-token', deviceAuthMiddleware, deviceFcmTokenValidators, deviceRegisterFcmToken);

/**
 * POST /api/device/auth/test-push
 * Envía una notificación FCM de prueba al camión autenticado usando su token en BD.
 * Requiere Bearer token válido.
 */
router.post('/test-push', deviceAuthMiddleware, deviceTestFcmPush);

export default router;
