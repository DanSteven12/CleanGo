// mobile-ciudadano/services/api.ts
/**
 * Cliente Axios para la app móvil de Ciudadanos.
 *
 * Interceptor de request:
 *   Inyecta el Access Token del SecureStore como Bearer en Authorization.
 *   No inyecta token en endpoints públicos (login, refresh).
 *
 * Interceptor de response:
 *   Ante un 401, intenta renovar el Access Token usando el Refresh Token.
 *   Implementa cola de peticiones para evitar múltiples refreshes simultáneos.
 *   Si la renovación tiene éxito, reintenta la request original con el nuevo token.
 *   Si falla, limpia la sesión y notifica a AuthContext para redirigir al Login.
 *
 * Adaptado de mobile-conductor/services/api.ts:
 *   - Endpoint de refresh: /mobile/auth/refresh (en lugar de /device/auth/refresh)
 *   - Endpoints públicos: /mobile/auth/login y /mobile/auth/refresh
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStorage from './secureStorage';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.75:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Session expired callback ─────────────────────────────────────────────────

/**
 * Registrado por AuthContext. Se llama cuando el refresh falla y la sesión expira.
 * Permite a AuthContext limpiar el estado y navegar al Login sin dependencias circulares.
 */
let _onSessionExpired: (() => void) | null = null;

export function setSessionExpiredCallback(cb: () => void): void {
  _onSessionExpired = cb;
}

// ─── Cola de refresh (anti-loop) ─────────────────────────────────────────────

let _isRefreshing = false;
let _refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToRefresh(cb: (token: string) => void): void {
  _refreshSubscribers.push(cb);
}

function notifyRefreshSubscribers(newToken: string): void {
  _refreshSubscribers.forEach((cb) => cb(newToken));
  _refreshSubscribers = [];
}

// ─── Request interceptor — inyectar Bearer token ──────────────────────────────

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // No inyectar token en endpoints públicos del canal ciudadano
  const isPublicEndpoint =
    config.url?.includes('/mobile/auth/login') ||
    config.url?.includes('/mobile/auth/refresh');

  if (!isPublicEndpoint) {
    const token = await SecureStorage.getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return config;
});

// ─── Response interceptor — refresh automático ante 401 ──────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Solo intentar refresh si es 401 y no es ya un endpoint de auth
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/mobile/auth/login') &&
      !originalRequest.url?.includes('/mobile/auth/refresh')
    ) {
      if (_isRefreshing) {
        // Si ya se está haciendo refresh, encolar la request y esperar el nuevo token
        return new Promise((resolve) => {
          subscribeToRefresh((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        const refreshToken = await SecureStorage.getRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Llamar directamente con axios base para no entrar en el interceptor de nuevo
        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/mobile/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;

        // Guardar nuevos tokens en SecureStore (Refresh Token Rotation)
        await SecureStorage.saveTokens(newAccessToken, newRefreshToken);

        // Actualizar header de la request original y reintentar
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }

        // Notificar a otras requests encoladas con el nuevo token
        notifyRefreshSubscribers(newAccessToken);

        return api(originalRequest);
      } catch (refreshError) {
        // El refresh falló — limpiar sesión y notificar a AuthContext
        await SecureStorage.clearAllSession();
        _refreshSubscribers = [];

        if (_onSessionExpired) {
          _onSessionExpired();
        }

        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
