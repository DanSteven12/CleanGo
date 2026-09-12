import { io, Socket } from 'socket.io-client';
import * as SecureStorage from './secureStorage';
import { getBackendBaseUrl } from './api';

let socket: Socket | null = null;

export function connectMobileSocket(token?: string): Socket {
  if (socket) {
    if (socket.connected) {
      return socket;
    }
    socket.disconnect();
  }

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
          const currentToken = token ?? (await SecureStorage.getAccessToken());
          cb({ client: 'mobile', token: currentToken || undefined });
        } catch {
          cb({ client: 'mobile' });
        }
      })();
    },
  });

  socket.on('connect', () => {
    console.log(`[Ciudadano Socket] Conectado exitosamente (${backendUrl}):`, socket?.id);
    token = undefined;
  });

  socket.on('connect_error', (err) => {
    // Registro limpio sin bucles recursivos
    console.log('[Ciudadano Socket] Esperando reconexión:', err.message);
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io client disconnect') {
      console.log('[Ciudadano Socket] Desconectado por el cliente.');
    } else {
      console.log('[Ciudadano Socket] Desconectado, reintentando automáticamente...');
    }
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
