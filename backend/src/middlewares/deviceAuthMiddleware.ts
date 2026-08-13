// backend/src/middlewares/deviceAuthMiddleware.ts
/**
 * Middleware de autenticación para dispositivos móviles (app Conductores).
 *
 * A diferencia de authMiddleware (Web), lee el JWT del header
 * Authorization: Bearer <token>  (no usa cookies HttpOnly).
 *
 * Verifica:
 *  - Firma y expiración del JWT
 *  - Que el tipo sea 'camion'
 *  - Que el jti coincida con la sesión activa en sesiones_camiones
 *  - Que el camión siga en estado 'Activo'
 *
 * Si todo es válido, extiende req con req.camion (DeviceAuthPayload).
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';
import { config } from '../config';

export interface DeviceAuthPayload {
  camion_id: number;
  usuario_dispositivo: string;
  numero_economico: string;
  tipo: 'camion';
  jti: string;
  iat?: number;
  exp?: number;
}

// Extender Express Request para incluir req.camion
declare global {
  namespace Express {
    interface Request {
      camion?: DeviceAuthPayload;
    }
  }
}

export const deviceAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Acceso no autorizado. Token requerido.' });
    return;
  }

  const token = authHeader.substring(7); // Quitar "Bearer "

  try {
    const payload = jwt.verify(token, config.jwt.secret) as DeviceAuthPayload;

    // Verificar que sea un token de dispositivo, no de usuario Web
    if (payload.tipo !== 'camion') {
      res.status(401).json({ message: 'Token inválido para este endpoint.' });
      return;
    }

    // Verificar sesión activa en sesiones_camiones y estado del camión
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT sc.jti, c.estado
       FROM sesiones_camiones sc
       JOIN camiones c ON sc.camion_id = c.id
       WHERE sc.camion_id = ?`,
      [payload.camion_id]
    );

    if (rows.length === 0) {
      res.status(401).json({ message: 'Sesión no encontrada o expirada.' });
      return;
    }

    const { jti, estado } = rows[0];

    if (jti !== payload.jti) {
      res.status(401).json({ message: 'Sesión invalidada. El dispositivo inició sesión en otro lugar.' });
      return;
    }

    if (estado !== 'Activo') {
      res.status(401).json({ message: 'Este dispositivo ha sido desactivado.' });
      return;
    }

    req.camion = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'El token ha expirado. Renueva la sesión.' });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Token inválido.' });
    } else {
      res.status(401).json({ message: 'Error de autenticación.' });
    }
  }
};
