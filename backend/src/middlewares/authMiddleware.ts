// backend/src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';
import { config } from '../config';

export interface AuthPayload {
  id: number;
  correo: string;
  rol: string;
  jti: string;
}

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Read JWT from HttpOnly cookie (primary method)
  const token = req.cookies?.[config.cookie.name];

  if (!token) {
    res.status(401).json({ message: 'Acceso no autorizado. Token requerido.' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;

    // Consultar sesión registrada y el estado físico del usuario en un solo JOIN
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.jti, u.estado, u.rol 
       FROM sesiones s 
       JOIN usuarios u ON s.usuario_id = u.id 
       WHERE u.id = ?`,
      [payload.id]
    );

    if (rows.length === 0) {
      res.status(401).json({ message: 'Sesión o usuario no encontrado.' });
      return;
    }

    const { jti, estado, rol } = rows[0];

    if (jti !== payload.jti) {
      res.status(401).json({ message: 'Sesión invalidada. Has iniciado sesión desde otro dispositivo.' });
      return;
    }

    if (estado !== 'Activo') {
      res.status(401).json({ message: 'Tu cuenta ha sido deshabilitada o bloqueada.' });
      return;
    }

    // Actualizar el payload con el rol fresco de la base de datos
    payload.rol = rol;

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
