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
    auth: (cb) => {
      (async () => {
        try {
          const currentToken = token ?? (await SecureStorage.getAccessToken());
          cb({ client: 'mobile', token: currentToken || undefined });
        } catch (error) {
          cb({ client: 'mobile' });
        }
      })();
    },
  });

  socket.on('connect', () => {
    console.log('[Ciudadano Socket] Conectado al backend:', socket?.id);
    // A partir de aquí las reconexiones deben usar SecureStore (token puede haber rotado)
    // Limpiamos el token capturado para que el closure ya no lo use.
    token = undefined;
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
