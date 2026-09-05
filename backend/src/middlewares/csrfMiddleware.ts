import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Ignorar métodos seguros que no modifican estado
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const excludedPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/recorridos',
    '/api/device',         // App móvil Conductor — Bearer token, sin riesgo CSRF
    '/api/mobile/auth',   // App móvil Ciudadano — auth endpoints
    '/api/ciudadano',     // App móvil Ciudadano — todas las rutas protegidas con Bearer token
  ];

  if (excludedPaths.some(excludedPath => req.originalUrl.startsWith(excludedPath))) {
    return next();
  }

  // Extraer el token de la cookie (establecida por el servidor)
  const csrfCookie = req.cookies?.[config.cookie.csrfName];

  // Extraer el token de la cabecera (enviada por el cliente)
  const csrfHeader = req.headers['x-xsrf-token'];

  if (!csrfCookie || !csrfHeader) {
    res.status(403).json({ message: 'CSRF token faltante.' });
    return;
  }

  if (csrfCookie !== csrfHeader) {
    res.status(403).json({ message: 'CSRF token inválido.' });
    return;
  }

  // Si coinciden, la petición proviene legítimamente de nuestra SPA
  next();
};
