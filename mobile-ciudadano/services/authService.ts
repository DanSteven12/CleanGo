// mobile-ciudadano/services/authService.ts
/**
 * Cliente API para los endpoints de autenticación del ciudadano móvil.
 * Todos los métodos usan el baseURL de api.ts y esperan respuestas JSON.
 *
 * No usa cookies. Los tokens viajan en el body y se almacenan
 * en expo-secure-store via secureStorage.ts.
 *
 * Adaptado de mobile-conductor/services/authService.ts:
 *   - CamionAuth → CiudadanoUser
 *   - Endpoints: /mobile/auth/* (en lugar de /device/auth/*)
 *   - Credenciales: email + password (en lugar de usuario_dispositivo + password)
 */
import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CiudadanoUser {
  id: number;
  nombre: string;
  correo: string;
  rol: 'Ciudadano';
}

export interface MobileLoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: CiudadanoUser;
}

export interface MobileRefreshResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: CiudadanoUser;
}

export interface MobileRegisterResponse {
  message: string;
  user: CiudadanoUser;
}

export interface GenericResponse {
  message: string;
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

function handleAxiosError(error: unknown): never {
  if (
    error &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as { isAxiosError: boolean }).isAxiosError &&
    'response' in error
  ) {
    const axiosErr = error as {
      response: {
        status: number;
        data?: { message?: string };
        headers: Record<string, string>;
      };
    };
    const res = axiosErr.response;
    const remainingHeader = res.headers['ratelimit-remaining'];
    const retryAfterHeader = res.headers['retry-after'];

    const remaining = remainingHeader ? parseInt(remainingHeader, 10) : undefined;
    let waitSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

    if (res.status === 429 && !waitSeconds) {
      waitSeconds = 60;
    }

    throw new ApiError(
      res.data?.message || `Error ${res.status}`,
      res.status,
      remaining,
      waitSeconds
    );
  }

  const errMsg = error instanceof Error ? error.message : 'Error inesperado del servidor.';
  throw new Error(errMsg);
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Inicia sesión con las credenciales del ciudadano.
 * POST /api/mobile/auth/login
 */
export async function loginCiudadano(
  email: string,
  password: string
): Promise<MobileLoginResponse> {
  try {
    const response = await api.post<MobileLoginResponse>('/mobile/auth/login', {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * Registra a un ciudadano nuevo.
 * POST /api/mobile/auth/register
 */
export async function registerCiudadano(
  nombre: string,
  correo: string,
  password: string,
  confirmPassword: string
): Promise<MobileRegisterResponse> {
  try {
    // Axios call
    const response = await api.post<MobileRegisterResponse>('/mobile/auth/register', {
      nombre,
      correo,
      password,
      confirmPassword,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * Renueva el Access Token usando el Refresh Token.
 * POST /api/mobile/auth/refresh
 * Nota: este endpoint es llamado directamente por el interceptor de api.ts.
 * Esta función existe para uso explícito desde AuthContext (restauración de sesión).
 */
export async function refreshCiudadanoToken(
  refreshToken: string
): Promise<MobileRefreshResponse> {
  // Llamada directa a axios sin pasar por el interceptor de api.ts
  // para evitar loop de refresh sobre refresh.
  const { default: axios } = await import('axios');
  const response = await axios.post<MobileRefreshResponse>(
    `${api.defaults.baseURL}/mobile/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
  );
  return response.data;
}

/**
 * Cierra la sesión activa del ciudadano en el backend.
 * POST /api/mobile/auth/logout
 * El interceptor de api.ts inyecta el Bearer token automáticamente.
 */
export async function logoutCiudadano(): Promise<void> {
  await api.post('/mobile/auth/logout');
}

/**
 * Solicita el restablecimiento de contraseña.
 * El backend enviará un correo con el Deep Link si el correo existe.
 */
export async function requestPasswordReset(email: string): Promise<GenericResponse> {
  try {
    const response = await api.post<GenericResponse>('/mobile/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * Restablece la contraseña utilizando el token proveniente del Deep Link.
 */
export async function resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<GenericResponse> {
  try {
    const response = await api.post<GenericResponse>('/mobile/auth/reset-password', { 
      token, 
      newPassword, 
      confirmPassword 
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * Registra o actualiza el FCM Device Token del ciudadano en el backend.
 * Usa el interceptor de api.ts para inyectar el Bearer Token automáticamente.
 *
 * POST /api/mobile/auth/fcm-token
 *
 * No lanza excepción al caller si falla: los errores se logean internamente.
 * Un fallo aquí NO debe interrumpir el login ni la restauración de sesión.
 */
export async function registerFcmTokenInBackend(
  token: string,
  plataforma: 'android' | 'ios' | 'web' = 'android'
): Promise<void> {
  try {
    await api.post<GenericResponse>('/mobile/auth/fcm-token', { token, plataforma });
    console.log(`[FCM] Token registrado en backend (plataforma: ${plataforma})`);
  } catch (error) {
    // Fallo silencioso: no impide login ni restauración de sesión.
    // Solo log del código de error, sin exponer el token.
    const errMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.warn('[FCM] No se pudo registrar el token en el backend:', errMsg);
  }
}

