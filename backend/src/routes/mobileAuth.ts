// backend/src/routes/mobileAuth.ts
/**
 * Rutas de autenticación para la app móvil de Ciudadanos.
 *
 * Todos los endpoints comienzan con /api/mobile/auth/
 * y son totalmente independientes de:
 *  - /api/auth/        (Web)
 *  - /api/device/auth/ (Mobile Conductor)
 *
 * Los tokens no viajan en cookies — se devuelven en el body JSON
 * y el cliente los almacena en expo-secure-store.
 *
 * Sin CSRF — la autenticación es por Bearer Token, no por cookies.
 */
import { Router } from 'express';
import { mobileLoginLimiter } from '../middlewares/rateLimiter';
import { mobileAuthMiddleware } from '../middlewares/mobileAuthMiddleware';
import { mobileLoginValidators } from '../validators/mobileAuthValidators';
import {
  mobileLogin,
  mobileRefresh,
  mobileLogout,
} from '../controllers/mobileAuthController';

const router = Router();

/**
 * POST /api/mobile/auth/login
 * Rate limited (5 req / 60s por IP) · Input validado
 * Verifica rol = 'Ciudadano'
 * Devuelve: { message, user, accessToken, refreshToken }
 */
router.post('/login', mobileLoginLimiter, mobileLoginValidators, mobileLogin);

/**
 * POST /api/mobile/auth/refresh
 * Renueva el Access Token con el Refresh Token (en body JSON).
 * Implementa Refresh Token Rotation vía authService.refreshSession.
 * Verifica rol = 'Ciudadano' en la sesión renovada.
 */
router.post('/refresh', mobileRefresh);

/**
 * POST /api/mobile/auth/logout
 * Requiere Bearer token válido (mobileAuthMiddleware).
 * Elimina la sesión del ciudadano de la tabla `sesiones`.
 * La identidad del usuario proviene del token — nunca del body.
 */
router.post('/logout', mobileAuthMiddleware, mobileLogout);

export default router;
