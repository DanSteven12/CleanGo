// backend/src/middlewares/mobileAuthMiddleware.ts
/**
 * Middleware de autenticación para la app móvil de Ciudadanos.
 *
 * Diferencias con authMiddleware (Web):
 *  - Lee el JWT del header Authorization: Bearer <token> (no usa cookies).
 *  - Verifica que el rol del usuario sea 'Ciudadano'.
 *  - Verifica el jti contra la tabla `sesiones` (igual que authMiddleware).
 *
 * Diferencias con deviceAuthMiddleware (Conductor):
 *  - Verifica la sesión en `sesiones` (tabla de usuarios), no en `sesiones_camiones`.
 *  - El payload del JWT tiene la estructura de AuthPayload (id, correo, rol, jti).
 *  - No verifica campo `tipo` porque los JWT de usuarios no lo incluyen.
 *
 * Si todo es válido, extiende req con req.user (AuthPayload).
 * Es compatible con el tipo req.user ya declarado por authMiddleware.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';
import { config } from '../config';
import type { AuthPayload } from './authMiddleware';

export const mobileAuthMiddleware = async (
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
    const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;

    // Verificar sesión activa en `sesiones` y estado del usuario
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.jti, u.estado, u.rol
       FROM sesiones s
       JOIN usuarios u ON s.usuario_id = u.id
       WHERE s.usuario_id = ?`,
      [payload.id]
    );

    if (rows.length === 0) {
      res.status(401).json({ message: 'Sesión no encontrada o expirada.' });
      return;
    }

    const { jti, estado, rol } = rows[0];

    // Verificar que el jti del token coincida con la sesión activa
    if (jti !== payload.jti) {
      res.status(401).json({ message: 'Sesión invalidada. Has iniciado sesión desde otro dispositivo.' });
      return;
    }

    if (estado !== 'Activo') {
      res.status(401).json({ message: 'Tu cuenta ha sido deshabilitada o bloqueada.' });
      return;
    }

    // Verificar que el token pertenezca a un Ciudadano
    if (rol !== 'Ciudadano') {
      res.status(403).json({ message: 'Acceso no autorizado para este canal.' });
      return;
    }

    // Actualizar el rol con el valor fresco de la base de datos
    payload.rol = rol;

    req.user = payload;
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
