// backend/src/routes/auth.ts
import { Router } from 'express';
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from '../middlewares/rateLimiter';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  loginValidators,
  registerValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  fcmTokenValidators,
} from '../validators/authValidators';
import {
  login,
  logout,
  register,
  forgotPassword,
  resetPassword,
  getMe,
  refresh,
  registerFcmToken,
} from '../controllers/authController';

const router = Router();

/**
 * POST /api/auth/login
 * Rate limited (5 req / 60 s per IP) · Input validated
 * On success: sets HttpOnly cookie, returns { message, user }
 */
router.post('/login', loginLimiter, loginValidators, login);

/**
 * POST /api/auth/logout
 * Clears the HttpOnly session cookie.
 * No rate limit needed — cookie is already required to reach this point.
 */
router.post('/logout', logout);

/**
 * POST /api/auth/refresh
 * Renueva el Access Token mediante el Refresh Token
 */
router.post('/refresh', refresh);

/**
 * POST /api/auth/register
 * Rate limited (10 req / 60 min per IP) · Input validated
 */
router.post('/register', registerLimiter, registerValidators, register);

/**
 * POST /api/auth/forgot-password
 * Rate limited (5 req / 15 min per IP) · Input validated
 * Intentionally uses a separate limiter from loginLimiter so a locked-out
 * user can still request a password reset.
 */
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidators, forgotPassword);

/**
 * POST /api/auth/reset-password
 * Input validated · No rate limit (token is already a one-time secret)
 */
router.post('/reset-password', resetPasswordValidators, resetPassword);

/**
 * GET /api/auth/me
 * Requires valid session cookie
 */
router.get('/me', authMiddleware, getMe);

/**
 * POST /api/auth/fcm-token
 * Registra o actualiza el FCM token del dispositivo.
 */
router.post('/fcm-token', authMiddleware, fcmTokenValidators, registerFcmToken);

export default router;
