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
import Constants from 'expo-constants';

// ─── Detección dinámica de URL del backend ────────────────────────────────────

/**
 * Extrae el hostname/IP de una URI con cualquiera de estos formatos:
 *   "192.168.1.75:8081"       → "192.168.1.75"
 *   "exp://192.168.1.75:8081" → "192.168.1.75"
 *   "http://192.168.1.75:8081" → "192.168.1.75"
 */
function extractHost(uri: string): string | null {
  try {
    // Normalizar URIs sin esquema para que URL() pueda procesarlas
    const normalized = /^[a-z][a-z0-9+\-.]*:\/\//i.test(uri)
      ? uri
      : `http://${uri}`;
    const { hostname } = new URL(normalized);
    return hostname || null;
  } catch {
    // Fallback: quitar esquema y tomar la parte antes del primer ':'
    const withoutScheme = uri.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, '');
    const host = withoutScheme.split(':')[0].trim();
    return host || null;
  }
}

/**
 * Obtiene la URL base de la API del backend CleanGo.
 *
 * PRIORIDAD:
 *
 * En desarrollo (__DEV__ === true):
 *   1. IP detectada automáticamente desde Expo Metro Bundler.
 *      Soporta Expo Go, Dev Client y Metro. No usa localhost como fallback.
 *   2. Si Metro no proporciona IP válida → Error explícito y diagnóstico.
 *
 * En producción (__DEV__ === false):
 *   1. EXPO_PUBLIC_API_URL (variable de entorno de producción/staging).
 *   2. Si no está definida → Error de configuración.
 */
export function getLanHost(): string {
  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = extractHost(hostUri);
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && ip !== '10.0.2.2') {
      return ip;
    }
  }
  return '192.168.100.20';
}

let _activeBaseUrl: string | null = null;

export function getApiUrl(): string {
  if (_activeBaseUrl) {
    return _activeBaseUrl;
  }

  // ── PRODUCCIÓN ──────────────────────────────────────────────────────────────
  if (!__DEV__) {
    const prodUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!prodUrl) {
      throw new Error(
        '[CleanGo] EXPO_PUBLIC_API_URL no está definida para el entorno de producción. ' +
          'Configura esta variable con la URL de la API de producción.',
      );
    }
    return prodUrl;
  }

  // ── DESARROLLO LOCAL: IP de Red Wi-Fi detectada dinámicamente ─────────────
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const lanIp = getLanHost();
  return `http://${lanIp}:5001/api`;
}

/**
 * URL base del backend SIN el sufijo /api.
 * Utilizada por Socket.IO y para construir URLs de recursos estáticos (/uploads/).
 *
 * Ejemplo:
 *   getApiUrl()         → "http://192.168.0.22:5001/api"
 *   getBackendBaseUrl() → "http://192.168.0.22:5001"
 */
export function getBackendBaseUrl(): string {
  return getApiUrl().replace(/\/api\/?$/, '');
}

// ─────────────────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 10000,
  // No se define Content-Type por defecto: Axios lo infiere por request
  // (application/json para objetos, multipart/form-data con boundary para FormData)
});

// ─── Session expired callback ─────────────────────────────────────────────────

/**
 * Registrado por AuthContext. Se llama cuando el refresh falla y la sesión expira.
 * Permite a AuthContext limpiar el estado y navegar al Login sin dependencias circulares.
 */
let _onSessionExpired: ((reason?: string) => void) | null = null;

export function setSessionExpiredCallback(cb: (reason?: string) => void): void {
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

// ─── Response interceptor — fallback bidireccional Wi-Fi / USB y refresh 401 ─

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _fallbackTried?: boolean;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // En desarrollo: simplificado, sin fallback automático agresivo
    if (__DEV__ && !error.response && !originalRequest._fallbackTried) {
      // Opcional: Podríamos reintentar 1 vez en la misma IP para errores transitorios
      originalRequest._fallbackTried = true;
      console.warn(`[API] Error de red en ${originalRequest.baseURL}.`);
    }

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
          { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
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
      } catch (refreshError: any) {
        _refreshSubscribers = [];

        // Distinguir entre sesión realmente invalidada en servidor (401/403/422) vs error de red/timeout
        const isAuthError =
          refreshError?.response?.status === 401 ||
          refreshError?.response?.status === 403 ||
          refreshError?.response?.status === 422;

        if (isAuthError) {
          // El backend rechazó el refresh token explícitamente — limpiar sesión y notificar a AuthContext
          await SecureStorage.clearAllSession();

          if (_onSessionExpired) {
            const reason =
              refreshError?.response?.data?.message ||
              'Por seguridad, tu sesión se cerró después de un período de inactividad. Inicia sesión nuevamente para continuar.';
            _onSessionExpired(reason);
          }
        } else {
          // Error transitorio de red o timeout durante el intento de refresh:
          // NO borrar SecureStore ni forzar logout.
          console.log('[API] Error de red al intentar refresh de token:', refreshError?.message);
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
