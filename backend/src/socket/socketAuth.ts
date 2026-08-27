import { Server, Socket } from 'socket.io';
// @ts-ignore
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../middlewares/authMiddleware';

export function setupSocketAuth(io: Server) {
  io.use((socket: Socket, next) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error('Server configuration error'));
    }

    // Si la conexión es de la app móvil (conductor o ciudadano)
    if (socket.handshake.auth?.client === 'mobile') {
      const mobileToken = socket.handshake.auth?.token;
      if (mobileToken) {
        try {
          const payload = jwt.verify(mobileToken, secret) as any;
          if (payload.tipo === 'camion') {
            socket.data.camion = payload;
          } else {
            socket.data.user = payload; // Ciudadano
          }
        } catch (error) {
          return next(new Error('Authentication error: Invalid mobile token'));
        }
      }
      // Permitimos que continúe (si no hay token, entra como anónimo para retrocompatibilidad con el conductor)
      return next();
    }

    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error('Authentication error: No cookies found'));
    }

    const parsedCookies = parseCookie(cookieHeader);
    const cookieName = process.env.COOKIE_NAME || 'cleango_session';
    const token = parsedCookies[cookieName];

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const payload = jwt.verify(token, secret) as AuthPayload;
      // Adjuntar el usuario al socket para uso posterior
      socket.data.user = payload;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });
}
