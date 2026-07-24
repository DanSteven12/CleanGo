import { io, Socket } from 'socket.io-client';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io(VITE_API_URL, {
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
