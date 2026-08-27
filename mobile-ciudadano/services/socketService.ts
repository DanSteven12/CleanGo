import { io, Socket } from 'socket.io-client';
import * as SecureStorage from './secureStorage';

const SOCKET_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.75:5001/api').replace('/api', '');

let socket: Socket | null = null;

export function connectMobileSocket(token?: string): Socket {
  if (socket) {
    if (socket.connected) {
      return socket;
    }
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    auth: async (cb) => {
      // Dinámicamente obtener el último token disponible de SecureStore
      const currentToken = await SecureStorage.getAccessToken();
      cb({ client: 'mobile', token: currentToken });
    },
  });

  socket.on('connect', () => {
    console.log('[Ciudadano Socket] Conectado al backend:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Ciudadano Socket] Error de conexión:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Ciudadano Socket] Desconectado:', reason);
  });

  return socket;
}

export function getMobileSocket(): Socket | null {
  return socket;
}

export function disconnectMobileSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
