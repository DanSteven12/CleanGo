import { io, Socket } from 'socket.io-client';
import * as SecureStorage from './secureStorage';
import { getBackendBaseUrl } from './api';

let socket: Socket | null = null;

export function getMobileSocket(): Socket {
  if (!socket) {
    const backendUrl = getBackendBaseUrl();

    socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      timeout: 8000,
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
      console.log(`[Mobile Socket] Conectado exitosamente (${backendUrl}):`, socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.log('[Mobile Socket] Esperando reconexión:', err.message);
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') {
        console.log('[Mobile Socket] Desconectado por el cliente.');
      } else {
        console.log('[Mobile Socket] Desconectado, reintentando automáticamente...');
      }
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
