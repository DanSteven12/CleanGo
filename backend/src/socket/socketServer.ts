import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { setupSocketAuth } from './socketAuth';
import { setupSocketEvents } from './socketEvents';
let io: Server;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.1.75:5173',
  'http://192.168.1.75:8081',
  'https://cleangomunicipal.com.mx'
];

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Permitir requests sin origin (como apps móviles nativas) o de orígenes permitidos/desarrollo
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error(`Socket.IO CORS: origin '${origin}' not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    },
    pingTimeout: 20000,
    pingInterval: 25000,
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
