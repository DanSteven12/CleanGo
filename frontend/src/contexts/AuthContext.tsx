// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { AuthUser } from '../services/authService';
import { getMe, logoutUser } from '../services/authService';
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

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isCheckingSession = useRef(false);

  /**
   * Called after a successful login.
   * The JWT lives in an HttpOnly cookie — only the user object is kept in state.
   */
  const login = useCallback((newUser: AuthUser) => {
    setUser(newUser);
  }, []);

  /**
   * Ends the session: asks the server to clear the HttpOnly cookie,
   * then clears the local user state.
   */
  const logout = useCallback(() => {
    logoutUser(); // fire-and-forget — cookie is cleared server-side
    setUser(null);
  }, []);

  /**
   * On mount: validate any existing session by calling GET /api/auth/me.
   * The HttpOnly cookie is sent automatically by the browser.
   * If the cookie is missing or expired, silently clear state.
   */
  useEffect(() => {
    getMe()
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        // No valid session — stay logged out
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  /**
   * Listen for global unauthorized events (e.g., session invalidated from another device),
   * and monitor window focus / visibility change to automatically detect expired sessions.
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
      // If window becomes visible / focused and user is on a protected route
      if (document.visibilityState === 'visible' && !isPublicRoute() && !isCheckingSession.current) {
        isCheckingSession.current = true;
        try {
          const data = await getMe();
          setUser(data.user);
        } catch {
          // Session expired or invalid
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
  }, [logout]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
