import { io, Socket } from 'socket.io-client';
import * as SecureStorage from './secureStorage';
import { getBackendBaseUrl } from './api';

// SOCKET_URL se obtiene dinámicamente desde la misma fuente que Axios.
// No se duplica la lógica de detección de IP aquí.

let socket: Socket | null = null;

export function connectMobileSocket(token?: string): Socket {
  if (socket) {
    if (socket.connected) {
      return socket;
    }
    socket.disconnect();
  }

  socket = io(getBackendBaseUrl(), {
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
