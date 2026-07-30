// frontend/src/pages/auth/LoginPage.tsx
import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Truck, MapPin, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { loginUser, ApiError } from '../../services/authService';
import iconoCamion from '../../assets/images/icono.png';
import '../../assets/styles/auth.css';
import { LoginSecurityBlock } from '../../components/auth/LoginSecurityBlock';
import { LoginAttemptsWarning } from '../../components/auth/LoginAttemptsWarning';

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
      const { user } = await loginUser({ email: email.trim(), password });
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
      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="auth-panel-left">
        <div className="auth-panel-bg-grid" />

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <img src={iconoCamion} alt="CleanGo" />
          </div>
          <div>
            <div className="auth-brand-name">CleanGo</div>
            <div className="auth-brand-sub">Logística Urbana</div>
          </div>
        </div>

        {/* Hero */}
        <div className="auth-hero">
          <h1 className="auth-hero-title">
            Gestión inteligente de<br />
            <span>recolección de residuos</span>
          </h1>
          <p className="auth-hero-desc">
            Plataforma centralizada para la administración de rutas, conductores y operación en tiempo real.
          </p>
        </div>

        {/* Features */}
        <div className="auth-features">
          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <Truck size={18} color="#fff" />
            </div>
            <div className="auth-feature-text">
              <span className="auth-feature-title">Gestión de Flota</span>
              <span className="auth-feature-desc">Control total de camiones y conductores</span>
            </div>
          </div>
          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <MapPin size={18} color="#fff" />
            </div>
            <div className="auth-feature-text">
              <span className="auth-feature-title">Mapa en Vivo</span>
              <span className="auth-feature-desc">Seguimiento GPS en tiempo real</span>
            </div>
          </div>
          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <BarChart3 size={18} color="#fff" />
            </div>
            <div className="auth-feature-text">
              <span className="auth-feature-title">Reportes y Métricas</span>
              <span className="auth-feature-desc">Análisis detallado de la operación</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="auth-panel-right overflow-hidden relative">
        <LoginSecurityBlock />
        
        {/* Mobile brand */}
        <div className="auth-mobile-brand">
          <div className="auth-mobile-brand-logo">
            <img src={iconoCamion} alt="CleanGo" />
          </div>
          <span className="auth-mobile-brand-name">CleanGo</span>
        </div>

        <div className="auth-form-card">
          <LoginAttemptsWarning />
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
          </form>

          <div className="auth-bottom">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="auth-link">Regístrate aquí</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
