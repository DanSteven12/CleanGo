// frontend/src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook to access the authenticated session from any component.
 *
 * @example
 * const { user, isAuthenticated, logout } = useAuth();
 */
export function useAuth() {
  return useContext(AuthContext);
}
