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
import { useRouter } from 'expo-router';
import * as authApiService from '../services/authService';
import * as SecureStorage from '../services/secureStorage';
import { setSessionExpiredCallback } from '../services/api';
import type { CiudadanoUser } from '../services/authService';
import { connectMobileSocket, disconnectMobileSocket } from '../services/socketService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextData {
  /** true cuando hay sesión válida activa */
  isAuthenticated: boolean;
  /** Datos del ciudadano autenticado */
  user: CiudadanoUser | null;
  /** true durante la carga inicial (restauración de sesión) */
  isLoading: boolean;
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

  // ─── Logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback(async (): Promise<void> => {
    // 1. Limpiar estado en memoria inmediatamente
    setUser(null);

    // 2. Ejecutar revocación en backend y borrado de SecureStore en segundo plano
    authApiService.logoutCiudadano().catch(() => {});
    SecureStorage.clearAllSession().catch(() => {});
    disconnectMobileSocket();

    // 3. Navegar a login inmediatamente
    router.replace('/login');
  }, [router]);

  // ─── Registro del callback de sesión expirada ────────────────────────────────

  useEffect(() => {
    setSessionExpiredCallback(() => {
      // El interceptor de axios llama esto cuando el refresh falla
      setUser(null);
      disconnectMobileSocket();
      router.replace('/login');
    });
  }, [router]);

  // ─── Restauración de Sesión al Arrancar ──────────────────────────────────────
  
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedUser = await SecureStorage.getUserData();
        const refreshToken = await SecureStorage.getRefreshToken();
        const accessToken = await SecureStorage.getAccessToken();

        // Si tenemos un usuario y un refresh token, intentamos restaurar
        if (storedUser && refreshToken) {
          // Asumimos que la sesión es válida temporalmente para acelerar UI
          // Si el access token ya expiró, la próxima llamada HTTP hará el refresh auto
          setUser(storedUser);
          
          // Opcional: Si no hay accessToken pero sí refreshToken, podríamos forzar
          // un refresh aquí mismo antes de mostrar la app. Para simplificar,
          // confiamos en el interceptor de Axios.
          if (!accessToken) {
             const refreshResult = await authApiService.refreshCiudadanoToken(refreshToken);
             await SecureStorage.saveTokens(refreshResult.accessToken, refreshResult.refreshToken);
             await SecureStorage.saveUserData(refreshResult.user);
             setUser(refreshResult.user);
             connectMobileSocket(refreshResult.accessToken);
          } else {
             connectMobileSocket(accessToken);
          }
        } else {
          // No hay datos suficientes para restaurar sesión
          await SecureStorage.clearAllSession();
          setUser(null);
        }
      } catch (error) {
        // Fallo al restaurar (ej. refresh token inválido)
        await SecureStorage.clearAllSession();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // ─── Login ───────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const result = await authApiService.loginCiudadano(email, password);

      // Guardar tokens y datos del ciudadano en SecureStore en paralelo
      await Promise.all([
        SecureStorage.saveTokens(result.accessToken, result.refreshToken),
        SecureStorage.saveUserData(result.user),
      ]);

      setUser(result.user);
      connectMobileSocket(result.accessToken);
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        isLoading,
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
