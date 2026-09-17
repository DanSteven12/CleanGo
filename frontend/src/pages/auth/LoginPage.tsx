// frontend/src/pages/auth/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { loginUser, ApiError } from '../../services/authService';
import '../../assets/styles/auth.css';
import { LoginSecurityBlock } from '../../components/auth/LoginSecurityBlock';
import { LoginAttemptsWarning } from '../../components/auth/LoginAttemptsWarning';
import { LoginLeftPanel } from '../../components/auth/LoginLeftPanel';

// ─── Field-level error state ──────────────────────────────────────────────────
interface FieldErrors {
  email?: string;
  password?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const expiredMsg = sessionStorage.getItem('cleango_auth_expired');
    if (expiredMsg) {
      sessionStorage.removeItem('cleango_auth_expired');
      toast.error('Sesión cerrada', {
        description: expiredMsg,
      });
    }
  }, []);

  // Already authenticated → redirect to dashboard
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // ─── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!email.trim()) {
      errors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'El correo electrónico no tiene un formato válido.';
    }
    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { user } = await loginUser({ email: email.trim(), password, rememberMe });
      login(user);
      toast.success(`¡Bienvenido, ${user.nombre}!`);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 429 && err.retryAfter) {
          const event = new CustomEvent('block-login', { detail: err.retryAfter });
          window.dispatchEvent(event);
        } else if (err.status === 401 && err.remaining !== undefined) {
          const event = new CustomEvent('login-attempts-update', {
            detail: { remaining: err.remaining }
          });
          window.dispatchEvent(event);
          setServerError(err.message);
        } else {
          setServerError(err.message);
        }
      } else {
        const msg = err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.';
        setServerError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="auth-root">
      {/* ── Left panel — animated (LoginLeftPanel) ─────────── */}
      <LoginLeftPanel />

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="auth-panel-right overflow-hidden relative">
        <LoginSecurityBlock />

        <div className="auth-form-card">
          <LoginAttemptsWarning />

          {/* Return to home link */}
          <Link
            to="/"
            className="inline-flex items-center text-xs font-medium text-ink-muted hover:text-primary transition-colors mb-6 group"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Volver al inicio
          </Link>

          <div className="auth-form-header">
            <h2 className="auth-form-title">Iniciar sesión</h2>
            <p className="auth-form-subtitle">Accede a tu cuenta para continuar</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Server error */}
            {serverError && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{serverError}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="auth-label">Correo electrónico</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Mail size={16} /></span>
                <input
                  id="login-email"
                  type="email"
                  className={`auth-input${fieldErrors.email ? ' auth-input--error' : ''}`}
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.email && (
                <p className="auth-field-error"><AlertCircle size={12} />{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="auth-label">Contraseña</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Lock size={16} /></span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input auth-input--with-eye${fieldErrors.password ? ' auth-input--error' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="auth-field-error"><AlertCircle size={12} />{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember me + Forgot password */}
            <div className="auth-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  id="login-remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                Recordarme
              </label>
              <Link to="/forgot-password" className="auth-link">¿Olvidaste tu contraseña?</Link>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 size={17} className="spin" /> Verificando…</>
              ) : (
                'Iniciar sesión'
              )}
            </button>

            {/* Legal Notice */}
            <div className="auth-legal-notice">
              Al iniciar sesión aceptas nuestros{' '}
              <Link to="/terms-and-conditions" state={{ from: '/login' }} className="auth-legal-link">
                Términos y Condiciones
              </Link>{' '}
              y nuestra{' '}
              <Link to="/privacy-policy" state={{ from: '/login' }} className="auth-legal-link">
                Política de Privacidad
              </Link>.
            </div>
          </form>

          <div className="auth-bottom" style={{ color: 'var(--text-muted, #737373)', fontSize: '0.8rem', marginTop: '1.25rem', lineHeight: 1.4 }}>
            Acceso exclusivo para personal autorizado del Ayuntamiento.
          </div>
        </div>
      </div>
    </div>
  );
};
