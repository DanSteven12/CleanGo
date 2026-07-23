// frontend/src/components/routes/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

/**
 * Wraps private routes. While the auth state is being validated (token check),
 * shows a full-screen loader. If not authenticated, redirects to /login.
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--background)',
          gap: '0.75rem',
          color: 'var(--text)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.9rem',
        }}
      >
        <Loader2
          size={24}
          className="spin"
          style={{ color: 'var(--primary)' }}
        />
        Verificando sesión…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
