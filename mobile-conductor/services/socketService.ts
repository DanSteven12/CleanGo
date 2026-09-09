import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import * as SecureStorage from './secureStorage';
import { getBackendBaseUrl } from './api';

// SOCKET_URL se obtiene dinámicamente desde la misma fuente que Axios.
// No se duplica la lógica de detección de IP aquí.

const SOCKET_URL = getBackendBaseUrl();

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
