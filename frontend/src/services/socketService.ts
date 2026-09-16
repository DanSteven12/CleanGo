import { io, Socket } from 'socket.io-client';

// En desarrollo, se usa '' para conectar al mismo origen (https://localhost:5173).
// El proxy de Vite (ws: true) reenvía /socket.io → http://127.0.0.1:5001 internamente,
// evitando Mixed Content al no apuntar directamente a una URL HTTP explícita.
// En producción, VITE_API_URL apunta al backend real (ej: https://cleangomunicipal.com.mx).
const rawSocketUrl: string = import.meta.env.VITE_API_URL ?? '';
const SOCKET_URL: string = rawSocketUrl ? rawSocketUrl.replace(/\/api\/?$/, '').replace(/\/$/, '') : '';

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true, // Importante para enviar cookies HttpOnly
      transports: ['websocket', 'polling'], // Fallback a polling si websocket falla
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Conectado:', socket?.id);
    });

    socket.on('connect_error', (err: Error) => {
      console.error('[Socket.IO] Error de conexión:', err.message);
    });

    socket.on('disconnect', (reason: string) => {
      console.warn('[Socket.IO] Desconectado:', reason);
    });
  }
  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
