// mobile-conductor/services/api.ts
/**
 * Cliente Axios para la app móvil de Conductores.
 *
 * Interceptor de request:
 *   Inyecta el Access Token del SecureStore como Bearer en Authorization.
 *
 * Interceptor de response:
 *   Ante un 401, intenta renovar el Access Token usando el Refresh Token.
 *   Si la renovación tiene éxito, reintenta la request original con el nuevo token.
 *   Si falla, limpia la sesión y redirige al login.
 *
 * El callback `onSessionExpired` es registrado por AuthContext para manejar
 * el logout cuando el refresh falla.
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
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Session expired callback ─────────────────────────────────────────────────

/** Registrado por AuthContext. Se llama cuando el refresh falla y la sesión expira. */
let _onSessionExpired: ((reason?: string) => void) | null = null;

export function setSessionExpiredCallback(cb: (reason?: string) => void): void {
  _onSessionExpired = cb;
}

// ─── Flag anti-refresh-loop ───────────────────────────────────────────────────

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
  // No inyectar token en login ni refresh (son endpoints públicos)
  const isPublicEndpoint =
    config.url?.includes('/device/auth/login') ||
    config.url?.includes('/device/auth/refresh');

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

    // En desarrollo: fallback bidireccional inteligente si la conexión falla (Network Error)
    if (__DEV__ && !error.response && !originalRequest._fallbackTried && originalRequest.baseURL) {
      originalRequest._fallbackTried = true;
      const isCurrentlyLocalhost =
        originalRequest.baseURL.includes('localhost') || originalRequest.baseURL.includes('127.0.0.1');

      if (isCurrentlyLocalhost) {
        // Falló localhost (desconectó cable USB o nunca estuvo conectado) -> Conmutar a IP Wi-Fi
        const lanUrl = `http://${getLanHost()}:5001/api`;
        _activeBaseUrl = lanUrl;
        api.defaults.baseURL = lanUrl;
        originalRequest.baseURL = lanUrl;
        console.log(`[API] Desconexión USB. Conmutando a Wi-Fi (${lanUrl})...`);
        return api(originalRequest);
      } else {
        // Falló Wi-Fi -> Probar USB (localhost) SOLO como fallback provisional
        const lanUrl = originalRequest.baseURL;
        const usbUrl = 'http://localhost:5001/api';
        originalRequest.baseURL = usbUrl;
        try {
          const res = await api(originalRequest);
          _activeBaseUrl = usbUrl;
          api.defaults.baseURL = usbUrl;
          console.log(`[API] Conmutado exitosamente a USB (${usbUrl}).`);
          return res;
        } catch (usbError) {
          // Si USB también falló, intentar 10.0.2.2 (emulador Android)
          const emuUrl = 'http://10.0.2.2:5001/api';
          originalRequest.baseURL = emuUrl;
          try {
            const res = await api(originalRequest);
            _activeBaseUrl = emuUrl;
            api.defaults.baseURL = emuUrl;
            console.log(`[API] Conmutado exitosamente a Emulador Android (${emuUrl}).`);
            return res;
          } catch (emuError) {
            // Preservar la IP Wi-Fi si todos los fallbacks fallaron
            _activeBaseUrl = lanUrl;
            api.defaults.baseURL = lanUrl;
            return Promise.reject(usbError);
          }
        }
      }
    }

    // Solo intentar refresh si es 401 y no es ya el endpoint de refresh/login
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/device/auth/login') &&
      !originalRequest.url?.includes('/device/auth/refresh')
    ) {
      if (_isRefreshing) {
        // Si ya se está haciendo refresh, encolar la request y esperar
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

        // Llamar directamente con axios para no entrar en el interceptor de nuevo
        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/device/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;

        // Guardar nuevos tokens en SecureStore
        await SecureStorage.saveTokens(newAccessToken, newRefreshToken);

        // Actualizar el header de la request original y reintentar
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }

        // Notificar a otras requests encoladas
        notifyRefreshSubscribers(newAccessToken);

        return api(originalRequest);
      } catch (refreshError) {
        // El refresh falló — limpiar sesión y notificar a AuthContext
        await SecureStorage.clearAllSession();
        _refreshSubscribers = [];

        if (_onSessionExpired) {
          _onSessionExpired(
            'Por seguridad, tu sesión se cerró después de un período de inactividad o cambio de credenciales. Inicia sesión nuevamente para continuar.'
          );
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
