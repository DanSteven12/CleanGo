// mobile-conductor/contexts/AuthContext.tsx
/**
 * Contexto de autenticación para la app móvil de Conductores.
 *
 * Gestiona:
 *  - Estado de autenticación (isAuthenticated, camion, isLoading)
 *  - Login: llama al backend, guarda tokens en SecureStore
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
import { disconnectMobileSocket } from '../services/socketService';
import type { CamionAuth } from '../services/authService';
import { getFcmToken, onFcmTokenRefresh } from '../services/fcmService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextData {
  /** true cuando hay sesión válida activa */
  isAuthenticated: boolean;
  /** Datos del camión autenticado */
  camion: CamionAuth | null;
  /** true durante la carga inicial (restauración de sesión) */
  isLoading: boolean;
  /** Inicia sesión con usuario_dispositivo + password */
  login: (usuario_dispositivo: string, password: string) => Promise<void>;
  /** Cierra sesión: revoca en backend + limpia SecureStore + navega a /login */
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [camion, setCamion] = useState<CamionAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback(async (): Promise<void> => {
    // 1. Desconectar sockets y limpiar estado en memoria inmediatamente
    disconnectMobileSocket();
    setCamion(null);

    // 2. Ejecutar revocación en backend y borrado de SecureStore en segundo plano
    authApiService.logoutDevice().catch(() => {});
    SecureStorage.clearAllSession().catch(() => {});

    // 3. Navegar a login inmediatamente
    router.replace('/login');
  }, [router]);

  // ─── Registro del callback de sesión expirada ────────────────────────────────

  useEffect(() => {
    setSessionExpiredCallback(() => {
      // El interceptor de axios llama esto cuando el refresh falla
      setCamion(null);
      router.replace('/login');
    });
  }, [router]);

  // ─── Arranque siempre en Login ───────────────────────────────────────────────
  //
  // Al abrir la app desde cero, siempre se limpia la sesión previa para que
  // el usuario deba autenticarse. El refresh de tokens (interceptor en api.ts)
  // funciona correctamente dentro de la sesión activa porque los tokens se
  // guardan de nuevo en cada login exitoso.

  useEffect(() => {
    async function clearSessionOnStart(): Promise<void> {
      // Limpiar cualquier sesión previa almacenada en SecureStore
      await SecureStorage.clearAllSession();
      // Camion queda null (valor inicial) → el usuario verá el Login
      setIsLoading(false);
    }

    clearSessionOnStart();
  }, []); // Solo al montar (arranque de la app)

  // ─── Listener para renovación de token FCM ────────────────────────────────────

  useEffect(() => {
    if (!camion) return;
    const unsubscribe = onFcmTokenRefresh();
    return () => {
      unsubscribe();
    };
  }, [camion]);

  // ─── Login ───────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (usuario_dispositivo: string, password: string): Promise<void> => {
      const result = await authApiService.loginDevice(usuario_dispositivo, password);

      // Guardar tokens y datos del camión en SecureStore en paralelo
      await Promise.all([
        SecureStorage.saveTokens(result.accessToken, result.refreshToken),
        SecureStorage.saveCamionData(result.camion),
      ]);

      setCamion(result.camion);

      // Esperar a que el interceptor pueda leer el token antes de registrar FCM
      setTimeout(() => {
        getFcmToken().catch(() => {});
      }, 400);
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!camion,
        camion,
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
