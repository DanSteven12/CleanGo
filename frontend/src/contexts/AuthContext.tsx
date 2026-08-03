// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../services/authService';
import { getMe, logoutUser } from '../services/authService';

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
   * Listen for global unauthorized events (e.g., session invalidated from another device).
   */
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      import('sonner').then(({ toast }) => {
        toast.error('Sesión invalidada', {
          description: 'Tu sesión expiró o iniciaste sesión desde otro dispositivo.',
        });
      });
    };

    const handleForbidden = () => {
      import('sonner').then(({ toast }) => {
        toast.error('Acceso denegado', {
          description: 'No tienes permisos suficientes para realizar esta acción.',
        });
      });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized as EventListener);
    window.addEventListener('auth:forbidden', handleForbidden as EventListener);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized as EventListener);
      window.removeEventListener('auth:forbidden', handleForbidden as EventListener);
    };
  }, [logout]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
