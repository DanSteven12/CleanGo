// backend/src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  id: number;
  correo: string;
  rol: string;
}

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const COOKIE_NAME = process.env.COOKIE_NAME || 'cleango_session';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Read JWT from HttpOnly cookie (primary method)
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    res.status(401).json({ message: 'Acceso no autorizado. Token requerido.' });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[authMiddleware] JWT_SECRET no configurado');
    res.status(500).json({ message: 'Error de configuración del servidor.' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'La sesión ha expirado. Inicia sesión nuevamente.' });
    } else {
      res.status(401).json({ message: 'Token inválido.' });
    }
  }
};
