// mobile-conductor/services/authService.ts
/**
 * Cliente API para los endpoints de autenticación del dispositivo móvil.
 * Todos los métodos usan el baseURL de api.ts y esperan respuestas JSON.
 *
 * No usa cookies. Los tokens viajan en el body y se almacenan
 * en expo-secure-store via secureStorage.ts.
 */
import { AxiosError } from 'axios';
import api from './api';

export interface CamionAuth {
  camion_id: number;
  numero_economico: string;
  placa: string;
  usuario_dispositivo: string;
  estado: string;
  gps_instalado: boolean;
}

export interface DeviceLoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  camion: CamionAuth;
}

export interface DeviceRefreshResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  camion: CamionAuth;
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  remaining?: number;
  retryAfter?: number;

  constructor(message: string, status: number, remaining?: number, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.remaining = remaining;
    this.retryAfter = retryAfter;
  }
}

/**
 * Helper to process Axios errors and extract rate limit headers
 */
function handleAxiosError(error: any): never {
  if (error.isAxiosError && error.response) {
    const res = error.response;
    const remainingHeader = res.headers['ratelimit-remaining'];
    const retryAfterHeader = res.headers['retry-after'];

    let remaining = remainingHeader ? parseInt(remainingHeader, 10) : undefined;
    let waitSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

    if (res.status === 429 && !waitSeconds) {
      waitSeconds = 60; // Default to 60s if backend doesn't provide Retry-After
    }

    throw new ApiError(
      res.data?.message || `Error ${res.status}`,
      res.status,
      remaining,
      waitSeconds
    );
  }
  
  throw new Error(error.message || 'Error inesperado del servidor.');
}

/**
 * Inicia sesión con las credenciales del dispositivo.
 * POST /api/device/auth/login
 */
export async function loginDevice(
  usuario_dispositivo: string,
  password: string
): Promise<DeviceLoginResponse> {
  try {
    const response = await api.post<DeviceLoginResponse>('/device/auth/login', {
      usuario_dispositivo,
      password,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * Renueva el Access Token usando el Refresh Token.
 * POST /api/device/auth/refresh
 */
export async function refreshDeviceToken(refreshToken: string): Promise<DeviceRefreshResponse> {
  const response = await api.post<DeviceRefreshResponse>('/device/auth/refresh', {
    refreshToken,
  });
  return response.data;
}

/**
 * Cierra la sesión activa en el backend.
 * POST /api/device/auth/logout
 * Requiere que el interceptor de api.ts haya inyectado el Bearer token.
 */
export async function logoutDevice(): Promise<void> {
  await api.post('/device/auth/logout');
}

/**
 * Obtiene los datos actuales del camión autenticado.
 * GET /api/device/auth/me
 */
export async function getMeDevice(): Promise<{ camion: CamionAuth }> {
  const response = await api.get<{ camion: CamionAuth }>('/device/auth/me');
  return response.data;
}

/**
 * Registra o actualiza el FCM Device Token del camión en el backend.
 * POST /api/device/auth/fcm-token
 */
export async function registerFcmTokenInBackend(
  token: string,
  plataforma: 'android' | 'ios' | 'web' = 'android'
): Promise<void> {
  try {
    await api.post('/device/auth/fcm-token', { token, plataforma });
    console.log('[FCM] Token registrado exitosamente en el backend');
  } catch (err: any) {
    console.warn(
      '[FCM] Advertencia: No se pudo registrar token FCM en backend:',
      err?.response?.data?.message || err?.message
    );
  }
}
