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
import type { CamionAuth } from '../services/authService';

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
    // Intentar revocar la sesión en el backend (best-effort)
    try {
      await authApiService.logoutDevice();
    } catch {
      // Si falla (token ya expirado, sin red) igualmente limpiamos localmente
    }

    await SecureStorage.clearAllSession();
    setCamion(null);

    // Navegar a login reemplazando la pila de navegación
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

  // ─── Restauración de sesión al arrancar ──────────────────────────────────────

  useEffect(() => {
    async function restoreSession(): Promise<void> {
      try {
        // Intentar leer datos del camión desde SecureStore
        const storedCamion = await SecureStorage.getCamionData();
        const storedToken = await SecureStorage.getAccessToken();

        if (!storedCamion || !storedToken) {
          // No hay sesión almacenada
          setIsLoading(false);
          return;
        }

        // Verificar que la sesión sigue válida en el backend
        // El interceptor de axios manejará el refresh automático si el token expiró
        const { camion: freshCamion } = await authApiService.getMeDevice();
        setCamion(freshCamion);

        // Actualizar datos en SecureStore si cambiaron
        await SecureStorage.saveCamionData(freshCamion);
      } catch {
        // Sesión no válida — limpiar y dejar que el layout redirigirá a /login
        await SecureStorage.clearAllSession();
        setCamion(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []); // Solo al montar

  // ─── Login ───────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (usuario_dispositivo: string, password: string): Promise<void> => {
      const result = await authApiService.loginDevice(usuario_dispositivo, password);

      // Guardar tokens y datos del camión en SecureStore
      await SecureStorage.saveTokens(result.accessToken, result.refreshToken);
      await SecureStorage.saveCamionData(result.camion);

      setCamion(result.camion);
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
