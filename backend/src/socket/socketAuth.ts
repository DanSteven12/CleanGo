import { Server, Socket } from 'socket.io';
// @ts-ignore
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../middlewares/authMiddleware';

export function setupSocketAuth(io: Server) {
  io.use((socket: Socket, next) => {
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

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error('Server configuration error'));
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
