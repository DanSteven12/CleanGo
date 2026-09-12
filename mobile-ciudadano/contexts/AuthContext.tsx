// mobile-ciudadano/contexts/AuthContext.tsx
/**
 * Contexto de autenticación para la app móvil de Ciudadanos.
 *
 * Gestiona:
 *  - Estado de autenticación (isAuthenticated, user, isLoading)
 *  - Login: llama al backend, guarda tokens y usuario en SecureStore
 *  - Logout: llama al backend, limpia SecureStore, navega a /login
 *  - Restauración de sesión al arrancar la app
 *  - Registro del callback de sesión expirada en el interceptor de axios
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import * as authApiService from '../services/authService';
import {
  getUserData,
  getRefreshToken,
  getAccessToken,
  saveTokens,
  saveUserData,
  clearAllSession,
  saveLastActiveTimestamp,
  getLastActiveTimestamp,
} from '../services/secureStorage';
import { setSessionExpiredCallback } from '../services/api';
import type { CiudadanoUser } from '../services/authService';
import { connectMobileSocket, disconnectMobileSocket } from '../services/socketService';
import { getFcmToken } from '../services/fcmService';

/**
 * Tiempo de inactividad en segundo plano permitido antes de requerir nuevo inicio de sesión.
 * 5 minutos = 300,000 ms.
 */
export const SESSION_INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextData {
  /** true cuando hay sesión válida activa */
  isAuthenticated: boolean;
  /** Datos del ciudadano autenticado */
  user: CiudadanoUser | null;
  /** true durante la carga inicial (restauración de sesión) */
  isLoading: boolean;
  /** Motivo cuando la sesión fue invalidada por otro dispositivo o expiró */
  sessionExpiredReason: string | null;
  /** Limpia el mensaje de sesión expirada */
  clearSessionExpiredReason: () => void;
  /** Inicia sesión con email + password */
  login: (email: string, password: string) => Promise<void>;
  /** Cierra sesión: revoca en backend + limpia SecureStore + navega a /login */
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CiudadanoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiredReason, setSessionExpiredReason] = useState<string | null>(null);

  const clearSessionExpiredReason = useCallback(() => {
    setSessionExpiredReason(null);
  }, []);

  // ─── Logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback(async (): Promise<void> => {
    // 1. Limpiar estado en memoria inmediatamente
    setUser(null);
    setSessionExpiredReason(null);

    // 2. Ejecutar revocación en backend y borrado de SecureStore en segundo plano
    authApiService.logoutCiudadano().catch(() => {});
    clearAllSession().catch(() => {});
    disconnectMobileSocket();

    // 3. Navegar a login inmediatamente
    router.replace('/login');
  }, [router]);

  // ─── Registro del callback de sesión expirada ────────────────────────────────

  useEffect(() => {
    setSessionExpiredCallback((reason?: string) => {
      // El interceptor de axios llama esto cuando el refresh falla (sesión invalidada en otro dispositivo)
      setUser(null);
      disconnectMobileSocket();
      setSessionExpiredReason(
        reason || 'Por seguridad, tu sesión se cerró después de un período de inactividad. Inicia sesión nuevamente para continuar.'
      );
      router.replace('/login');
    });
  }, [router]);

  // ─── Helper de clasificación de errores ─────────────────────────────────────
  const isAuthInvalidationError = (error: any): boolean => {
    const status = error?.response?.status ?? error?.status;
    return status === 401 || status === 403 || status === 404 || status === 422;
  };

  // ─── Restauración de Sesión al Arrancar ──────────────────────────────────────
  
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedUser = await getUserData();
        const refreshToken = await getRefreshToken();
        const accessToken = await getAccessToken();
        const lastActive = await getLastActiveTimestamp();

        // Si tenemos un usuario y un refresh token en SecureStore:
        if (storedUser && refreshToken) {
          // Verificar si transcurrió el tiempo de inactividad permitido
          if (lastActive && Date.now() - lastActive > SESSION_INACTIVITY_TIMEOUT_MS) {
            console.log('[Auth] Sesión expirada por inactividad al arrancar la app');
            await clearAllSession();
            disconnectMobileSocket();
            setUser(null);
            setSessionExpiredReason('Por seguridad, tu sesión se cerró después de un período de inactividad. Inicia sesión nuevamente para continuar.');
            setIsLoading(false);
            return;
          }

          try {
            // Validar en el backend si la sesión sigue activa con timeout controlado para no retrasar el arranque
            const refreshPromise = authApiService.refreshCiudadanoToken(refreshToken);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => {
                const timeoutErr: any = new Error('Timeout de conexión con el servidor');
                timeoutErr.code = 'ECONNABORTED';
                timeoutErr.isTimeout = true;
                reject(timeoutErr);
              }, 3500)
            );
            const refreshResult = await Promise.race([refreshPromise, timeoutPromise]);

            // Sesión validada con éxito en el servidor
            await Promise.all([
              saveTokens(refreshResult.accessToken, refreshResult.refreshToken),
              saveUserData(refreshResult.user),
              saveLastActiveTimestamp(Date.now()),
            ]);
            setUser(refreshResult.user);
            setSessionExpiredReason(null);
            connectMobileSocket(refreshResult.accessToken);
            getFcmToken().catch(() => {});
          } catch (refreshErr: any) {
            if (isAuthInvalidationError(refreshErr)) {
              // CASO 3: Sesión realmente invalidada en el backend
              console.log('[Auth] Sesión invalidada por el servidor al arrancar:', refreshErr?.message);
              await clearAllSession();
              disconnectMobileSocket();
              setUser(null);
              const reason =
                refreshErr?.response?.data?.message ||
                'Por seguridad, tu sesión se cerró después de un período de inactividad. Inicia sesión nuevamente para continuar.';
              setSessionExpiredReason(reason);
            } else {
              // CASO 4: Error de red / timeout / servidor no disponible
              console.log('[Auth] Error de conectividad al validar sesión al arrancar. Restaurando sesión localmente:', refreshErr?.message);
              await saveLastActiveTimestamp(Date.now());
              setUser(storedUser);
              setSessionExpiredReason(null);
              if (accessToken) {
                connectMobileSocket(accessToken);
              }
              getFcmToken().catch(() => {});
            }
          }
        } else {
          // No hay datos previos de sesión
          await clearAllSession();
          setUser(null);
        }
      } catch (error) {
        // Fallo general al leer almacenamiento seguro
        console.error('[Auth] Error al leer almacenamiento seguro:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // ─── Control de Inactividad en Segundo Plano (AppState) ─────────────────────

  useEffect(() => {
    let lastBackgroundTime = Date.now();

    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        lastBackgroundTime = Date.now();
        await saveLastActiveTimestamp(lastBackgroundTime);
      } else if (nextAppState === 'active') {
        if (!user) return;

        const storedLastActive = await getLastActiveTimestamp();
        const effectiveLastActive = storedLastActive || lastBackgroundTime;
        const elapsed = Date.now() - effectiveLastActive;

        if (elapsed > SESSION_INACTIVITY_TIMEOUT_MS) {
          console.log(`[Auth] Inactividad superada (${Math.round(elapsed / 1000)}s en segundo plano). Cerrando sesión.`);
          await clearAllSession();
          disconnectMobileSocket();
          setUser(null);
          setSessionExpiredReason('Por seguridad, tu sesión se cerró después de un período de inactividad. Inicia sesión nuevamente para continuar.');
          router.replace('/login');
        } else {
          await saveLastActiveTimestamp(Date.now());
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, router]);

  // ─── Login ───────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const result = await authApiService.loginCiudadano(email, password);

      // Guardar tokens, datos del ciudadano y marca de tiempo en SecureStore
      await Promise.all([
        saveTokens(result.accessToken, result.refreshToken),
        saveUserData(result.user),
        saveLastActiveTimestamp(Date.now()),
      ]);

      setSessionExpiredReason(null);
      setUser(result.user);
      connectMobileSocket(result.accessToken);
      getFcmToken().catch(() => {});
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        isLoading,
        sessionExpiredReason,
        clearSessionExpiredReason,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
