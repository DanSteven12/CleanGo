import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import * as SecureStorage from './secureStorage';

function getSocketUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:5001`;
    }
  }
  return (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.75:5001/api').replace('/api', '');
}

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

export function getMobileSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: (cb) => {
        (async () => {
          try {
            const currentToken = await SecureStorage.getAccessToken();
            cb({ client: 'mobile', token: currentToken || undefined });
          } catch {
            cb({ client: 'mobile' });
          }
        })();
      },
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
