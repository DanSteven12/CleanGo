// frontend/src/pages/auth/RegisterPage.tsx
import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { registerUser } from '../../services/authService';
import iconoCamion from '../../assets/images/icono.png';
import { LoginLeftPanel } from '../../components/auth/LoginLeftPanel';
import '../../assets/styles/auth.css';

interface FieldErrors {
  nombre?: string;
  correo?: string;
  password?: string;
  confirmPassword?: string;
}

export const RegisterPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!nombre.trim() || nombre.trim().length < 2) {
      errors.nombre = 'El nombre debe tener al menos 2 caracteres.';
    }
    if (!correo.trim()) {
      errors.correo = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      errors.correo = 'El correo electrónico no tiene un formato válido.';
    }
    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Debe incluir al menos una letra mayúscula.';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Debe incluir al menos un número.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      toast.error('Por favor, corrige los errores en el formulario.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser({
        nombre: nombre.trim(),
        correo: correo.trim(),
        password,
        confirmPassword,
      });
      toast.success('¡Registro exitoso! Redirigiendo...');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-root">
      {/* Left panel with modern TechOrbit animation */}
      <LoginLeftPanel />

      {/* Right panel */}
      <div className="auth-panel-right">
        <div className="auth-mobile-brand">
          <div className="auth-mobile-brand-logo">
            <img src={iconoCamion} alt="CleanGo" />
          </div>
          <span className="auth-mobile-brand-name">CleanGo</span>
        </div>

        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Crear cuenta</h2>
            <p className="auth-form-subtitle">Completa los datos para registrarte en el sistema</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {serverError && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{serverError}</span>
              </div>
            )}

            {/* Nombre */}
            <div>
              <label htmlFor="reg-nombre" className="auth-label">Nombre completo</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><User size={16} /></span>
                <input
                  id="reg-nombre"
                  type="text"
                  className={`auth-input${fieldErrors.nombre ? ' auth-input--error' : ''}`}
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); setFieldErrors(p => ({ ...p, nombre: undefined })); }}
                  autoComplete="name"
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.nombre && (
                <p className="auth-field-error"><AlertCircle size={12} />{fieldErrors.nombre}</p>
              )}
            </div>

            {/* Correo */}
            <div>
              <label htmlFor="reg-correo" className="auth-label">Correo electrónico</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Mail size={16} /></span>
                <input
                  id="reg-correo"
                  type="email"
                  className={`auth-input${fieldErrors.correo ? ' auth-input--error' : ''}`}
                  placeholder="tu@correo.com"
                  value={correo}
                  onChange={(e) => { setCorreo(e.target.value); setFieldErrors(p => ({ ...p, correo: undefined })); }}
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.correo && (
                <p className="auth-field-error"><AlertCircle size={12} />{fieldErrors.correo}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="reg-password" className="auth-label">Contraseña</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Lock size={16} /></span>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input auth-input--with-eye${fieldErrors.password ? ' auth-input--error' : ''}`}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  autoComplete="new-password"
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

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="reg-confirm" className="auth-label">Confirmar contraseña</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Lock size={16} /></span>
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className={`auth-input auth-input--with-eye${fieldErrors.confirmPassword ? ' auth-input--error' : ''}`}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: undefined })); }}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="auth-field-error"><AlertCircle size={12} />{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              id="reg-submit"
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 size={17} className="spin" /> Creando cuenta…</>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>

          <div className="auth-bottom">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="auth-link">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
