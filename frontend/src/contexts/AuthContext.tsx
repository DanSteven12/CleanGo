// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { AuthUser } from '../services/authService';
import { getMe, logoutUser, refreshTokenApi } from '../services/authService';
import { isPublicRoute } from '../utils/routeUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

// ─── Constantes de Control de Sesión e Inactividad ─────────────────────────────

// Límite de inactividad (sin interacción): 15 minutos
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
// Intervalo de revisión proactiva (heartbeat): cada 2.5 minutos
const HEARTBEAT_INTERVAL_MS = 2.5 * 60 * 1000;
// Intervalo mínimo entre refrescos proactivos mientras se interactúa: 4 minutos
const MIN_REFRESH_INTERVAL_MS = 4 * 60 * 1000;

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isCheckingSession = useRef(false);
  const lastActiveRef = useRef<number>(Date.now());
  const lastRefreshRef = useRef<number>(Date.now());

  /**
   * Registra la interacción del usuario en la plataforma.
   */
  const recordActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
  }, []);

  /**
   * Llamado tras un inicio de sesión exitoso.
   */
  const login = useCallback((newUser: AuthUser) => {
    lastActiveRef.current = Date.now();
    lastRefreshRef.current = Date.now();
    setUser(newUser);
  }, []);

  /**
   * Cierra la sesión: limpia la cookie HttpOnly en el servidor y borra el estado local.
   */
  const logout = useCallback(() => {
    logoutUser(); // Fire-and-forget
    setUser(null);
  }, []);

  /**
   * Al montar: valida cualquier sesión existente llamando a GET /api/auth/me.
   */
  useEffect(() => {
    getMe()
      .then((data) => {
        setUser(data.user);
        lastActiveRef.current = Date.now();
        lastRefreshRef.current = Date.now();
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  /**
   * Escucha eventos de interacción global (mouse, teclado, scroll, clics, touch)
   * con un throttling ligero para registrar la actividad del usuario sin degradar rendimiento.
   */
  useEffect(() => {
    let lastThrottleTime = 0;
    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastThrottleTime > 3000) {
        lastThrottleTime = now;
        recordActivity();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
    };
  }, [recordActivity]);

  /**
   * Heartbeat proactivo: mientras el usuario esté autenticado, con la pestaña activa
   * y haya interactuado recientemente (< 15 min), renueva silenciosamente el token
   * en segundo plano para que NUNCA sea expulsado mientras esté trabajando en la web.
   */
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(async () => {
      const now = Date.now();
      const inactiveDuration = now - lastActiveRef.current;
      const timeSinceLastRefresh = now - lastRefreshRef.current;

      // Si la pestaña está visible y el usuario estuvo activo dentro del límite permitido
      if (document.visibilityState === 'visible' && inactiveDuration < INACTIVITY_TIMEOUT_MS) {
        if (timeSinceLastRefresh >= MIN_REFRESH_INTERVAL_MS && !isCheckingSession.current) {
          isCheckingSession.current = true;
          try {
            const data = await refreshTokenApi();
            lastRefreshRef.current = Date.now();
            if (data?.user) {
              setUser(data.user);
            }
          } catch {
            // Si el refresh silencioso falla temporalmente, no interrumpir; se reintentará en la siguiente petición
          } finally {
            isCheckingSession.current = false;
          }
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [user]);

  /**
   * Escucha eventos de sesión no autorizada y cambios de visibilidad / foco de la ventana.
   * Si el usuario se ausentó de la pestaña por más del tiempo permitido (>15 min),
   * la sesión expira limpiamente al volver.
   */
  useEffect(() => {
    const handleUnauthorized = (event?: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }> | undefined;
      const msg =
        customEvent?.detail?.message ||
        'Tu sesión expiró o iniciaste sesión desde otro dispositivo.';

      logout();
      if (!isPublicRoute()) {
        sessionStorage.setItem('cleango_auth_expired', msg);
        window.location.replace('/login');
      }
    };

    const handleForbidden = () => {
      if (!isPublicRoute()) {
        import('sonner').then(({ toast }) => {
          toast.error('Acceso denegado', {
            description: 'No tienes permisos suficientes para realizar esta acción.',
          });
        });
      }
    };

    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible' && !isPublicRoute() && !isCheckingSession.current) {
        const now = Date.now();
        const inactiveDuration = now - lastActiveRef.current;

        // Si el usuario estuvo inactivo por más del tiempo límite (abandono de pestaña o ausencia)
        if (inactiveDuration >= INACTIVITY_TIMEOUT_MS) {
          isCheckingSession.current = true;
          try {
            // Intentar verificar sesión
            const data = await getMe();
            setUser(data.user);
            lastActiveRef.current = Date.now();
            lastRefreshRef.current = Date.now();
          } catch {
            // Sesión efectivamente expirada por inactividad
            setUser(null);
            logoutUser();
            sessionStorage.setItem(
              'cleango_auth_expired',
              'Tu sesión expiró por inactividad. Inicia sesión nuevamente.'
            );
            window.location.replace('/login');
          } finally {
            isCheckingSession.current = false;
          }
        } else {
          // El usuario regresó dentro del tiempo válido; renovar silenciosamente si es oportuno
          recordActivity();
          if (now - lastRefreshRef.current >= MIN_REFRESH_INTERVAL_MS) {
            isCheckingSession.current = true;
            try {
              const data = await refreshTokenApi();
              lastRefreshRef.current = Date.now();
              if (data?.user) {
                setUser(data.user);
              }
            } catch {
              // No interrumpir si la sesión aún es válida
            } finally {
              isCheckingSession.current = false;
            }
          }
        }
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized as EventListener);
    window.addEventListener('auth:forbidden', handleForbidden as EventListener);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized as EventListener);
      window.removeEventListener('auth:forbidden', handleForbidden as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [logout, recordActivity]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
