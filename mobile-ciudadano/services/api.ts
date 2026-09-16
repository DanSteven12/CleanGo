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
  return 'cleangomunicipal.com.mx';
}

let _activeBaseUrl: string | null = null;

export function getApiUrl(): string {
  if (_activeBaseUrl) {
    return _activeBaseUrl;
  }

  // 1. Variable de entorno explícita (.env o EAS build)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 2. URL del servidor en Hostinger (HTTPS)
  return 'https://cleangomunicipal.com.mx/api';
}

/**
 * URL base del backend SIN el sufijo /api.
 * Utilizada por Socket.IO y para construir URLs de recursos estáticos (/uploads/).
 *
 * Ejemplo:
 *   getApiUrl()         → "https://cleangomunicipal.com.mx/api"
 *   getBackendBaseUrl() → "https://cleangomunicipal.com.mx"
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

let _refreshPromise: Promise<string> | null = null;
let _isRefreshing = false;
let _refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToRefresh(cb: (token: string) => void): void {
  _refreshSubscribers.push(cb);
}

function notifyRefreshSubscribers(newToken: string): void {
  _refreshSubscribers.forEach((cb) => cb(newToken));
  _refreshSubscribers = [];
}

/**
 * Función centralizada y única fuente de verdad para renovar tokens en mobile-ciudadano.
 * Protegida contra concurrencia: si ya existe un refresh en vuelo (por background o por 401),
 * todas las peticiones concurrentes comparten la misma Promise en vuelo.
 */
export async function performTokenRefresh(): Promise<string> {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _isRefreshing = true;
  _refreshPromise = (async () => {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Llamada directa con axios base sin pasar por el interceptor de api.ts
      const refreshResponse = await axios.post(
        `${api.defaults.baseURL}/mobile/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = refreshResponse.data;

      // Guardar nuevos tokens en SecureStore (Refresh Token Rotation)
      await Promise.all([
        SecureStorage.saveTokens(newAccessToken, newRefreshToken),
        user ? SecureStorage.saveUserData(user) : Promise.resolve(),
        SecureStorage.saveLastActiveTimestamp(Date.now()),
      ]);

      // Notificar a otras requests encoladas en el interceptor con el nuevo token
      notifyRefreshSubscribers(newAccessToken);

      return newAccessToken;
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

      throw refreshError;
    } finally {
      _isRefreshing = false;
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
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

    // En desarrollo: fallback si la conexión a localhost falla (Network Error)
    if (__DEV__ && !error.response && !originalRequest._fallbackTried && originalRequest.baseURL) {
      originalRequest._fallbackTried = true;
      const isCurrentlyLocalhost =
        originalRequest.baseURL.includes('localhost') || originalRequest.baseURL.includes('127.0.0.1');

      if (isCurrentlyLocalhost) {
        // Falló localhost -> Conmutar al servidor de producción en Hostinger
        const remoteUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'https://cleangomunicipal.com.mx/api';
        _activeBaseUrl = remoteUrl;
        api.defaults.baseURL = remoteUrl;
        originalRequest.baseURL = remoteUrl;
        console.log(`[API] Desconexión localhost. Conmutando a servidor (${remoteUrl})...`);
        return api(originalRequest);
      }
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

      try {
        const newAccessToken = await performTokenRefresh();

        // Actualizar header de la request original y reintentar
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError: any) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
