import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.75:5001/api').replace('/api', '');

let socket: Socket | null = null;

export function getMobileSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: {
        client: 'mobile'
      }
    });

    socket.on('connect', () => {
      console.log('[Mobile Socket] Conectado al backend:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[Mobile Socket] Error de conexión:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Mobile Socket] Desconectado:', reason);
    });
  }
  return socket;
}

export function disconnectMobileSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
