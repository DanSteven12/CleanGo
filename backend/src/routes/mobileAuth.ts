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
import { mobileLoginLimiter, registerLimiter, forgotPasswordLimiter } from '../middlewares/rateLimiter';
import { mobileAuthMiddleware } from '../middlewares/mobileAuthMiddleware';
import { 
  mobileLoginValidators, 
  mobileRegisterValidators, 
  mobileForgotPasswordValidators, 
  mobileResetPasswordValidators,
  mobileFcmTokenValidators,
} from '../validators/mobileAuthValidators';
import {
  mobileLogin,
  mobileRefresh,
  mobileLogout,
  mobileRegister,
  mobileForgotPassword,
  mobileResetPassword,
  mobileRegisterFcmToken,
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
 * POST /api/mobile/auth/register
 * Rate limited (10 req / 1h por IP) · Input validado
 * Registra un Ciudadano nuevo sin auto-login
 */
router.post('/register', registerLimiter, mobileRegisterValidators, mobileRegister);


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

/**
 * POST /api/mobile/auth/forgot-password
 * Solicita restablecimiento enviando enlace deep link al correo
 */
router.post('/forgot-password', forgotPasswordLimiter, mobileForgotPasswordValidators, mobileForgotPassword);

/**
 * POST /api/mobile/auth/reset-password
 * Restablece la contraseña con token de deep link
 */
router.post('/reset-password', mobileResetPasswordValidators, mobileResetPassword);

/**
 * POST /api/mobile/auth/fcm-token
 * Registra o actualiza el FCM Device Token del ciudadano autenticado.
 * Sin CSRF — la autenticación es por Bearer Token (mobileAuthMiddleware).
 */
router.post('/fcm-token', mobileAuthMiddleware, mobileFcmTokenValidators, mobileRegisterFcmToken);

export default router;
