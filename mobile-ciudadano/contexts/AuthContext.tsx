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
import { setSessionExpiredCallback, performTokenRefresh } from '../services/api';
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

  // ─── Restauración de Sesión al Arrancar (Optimista no bloqueante) ───────────
  
  useEffect(() => {
    async function restoreSession() {
      try {
        // Lecturas independientes ejecutadas en paralelo
        const [storedUser, refreshToken, accessToken, lastActive] = await Promise.all([
          getUserData(),
          getRefreshToken(),
          getAccessToken(),
          getLastActiveTimestamp(),
        ]);

        // Si tenemos un usuario y un refresh token en SecureStore:
        if (storedUser && refreshToken) {
          // 1. Verificar si transcurrió el tiempo de inactividad permitido
          if (lastActive && Date.now() - lastActive > SESSION_INACTIVITY_TIMEOUT_MS) {
            console.log('[Auth] Sesión expirada por inactividad al arrancar la app');
            await clearAllSession();
            disconnectMobileSocket();
            setUser(null);
            setSessionExpiredReason('Por seguridad, tu sesión se cerró después de un período de inactividad. Inicia sesión nuevamente para continuar.');
            setIsLoading(false);
            return;
          }

          // 2. DESBLOQUEO INMEDIATO (Autenticación optimista local)
          // Establecer el usuario local y liberar isLoading de inmediato
          // para que la UI principal (ProtectedNavigator / InicioScreen) se renderice sin esperar la red.
          setUser(storedUser);
          setSessionExpiredReason(null);
          setIsLoading(false);

          // Conectar socket inicialmente con el token existente y registrar FCM en segundo plano
          if (accessToken) {
            connectMobileSocket(accessToken);
          }
          getFcmToken().catch(() => {});

          // 3. Ejecutar validación/refresh de tokens en segundo plano utilizando la ÚNICA fuente de verdad (api.ts)
          performTokenRefresh()
            .then(async (newAccessToken) => {
              // Solo actualizar si la sesión sigue activa (no se hizo logout en el interín)
              const [freshUser, currentToken] = await Promise.all([
                getUserData(),
                getAccessToken(),
              ]);
              if (freshUser && currentToken) {
                setUser(freshUser);
                connectMobileSocket(newAccessToken);
              }
            })
            .catch((refreshErr: any) => {
              // Si el error fue 401/403/422, performTokenRefresh ya ejecutó:
              // clearAllSession() y _onSessionExpired(), lo cual desloguea y redirige a login.
              // Si fue error de red/timeout, la sesión local se mantiene activa.
              console.log('[Auth] Validación de sesión en segundo plano completada:', refreshErr?.message || refreshErr);
            });

          return;
        } else {
          // No hay datos previos de sesión
          await clearAllSession();
          setUser(null);
          setIsLoading(false);
        }
      } catch (error) {
        // Fallo general al leer almacenamiento seguro
        console.error('[Auth] Error al leer almacenamiento seguro:', error);
        setUser(null);
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
