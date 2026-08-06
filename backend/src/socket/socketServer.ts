import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { setupSocketAuth } from './socketAuth';
import { setupSocketEvents } from './socketEvents';
let io: Server;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'https://cleangomunicipal.com.mx'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  });

  setupSocketAuth(io);
  setupSocketEvents(io);

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
}
