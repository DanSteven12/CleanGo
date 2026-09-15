// frontend/src/pages/auth/RegisterPage.tsx
import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { registerUser } from '../../services/authService';
import iconoCamion from '../../assets/images/icono.png';
import { LoginLeftPanel } from '../../components/auth/LoginLeftPanel';
import '../../assets/styles/auth.css';

interface FieldErrors {
  nombre?: string;
  correo?: string;
  telefono?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

export const RegisterPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
    if (!telefono.trim()) {
      errors.telefono = 'El teléfono es obligatorio.';
    } else if (!/^[0-9]{10}$/.test(telefono.trim())) {
      errors.telefono = 'El teléfono debe tener exactamente 10 dígitos numéricos.';
    }
    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 10) {
      errors.password = 'La contraseña debe tener al menos 10 caracteres.';
    } else if (password.length > 72) {
      errors.password = 'La contraseña no puede superar los 72 caracteres.';
    } else if (/\s/.test(password)) {
      errors.password = 'La contraseña no puede contener espacios.';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Debe incluir al menos una letra mayúscula.';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Debe incluir al menos una letra minúscula.';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Debe incluir al menos un número.';
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      errors.password = 'Debe incluir al menos un carácter especial.';
    } else if (nombre.trim() && password.toLowerCase() === nombre.trim().toLowerCase()) {
      errors.password = 'La contraseña no puede ser igual a tu nombre.';
    } else if (correo.trim() && (password.toLowerCase() === correo.trim().toLowerCase() || (correo.includes('@') && password.toLowerCase() === correo.split('@')[0].trim().toLowerCase()))) {
      errors.password = 'La contraseña no puede ser igual a tu correo electrónico.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }
    if (!acceptedTerms) {
      errors.terms = 'Debes aceptar los Términos de servicio y la Política de privacidad.';
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
        telefono: telefono.trim(),
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

            {/* Teléfono */}
            <div>
              <label htmlFor="reg-telefono" className="auth-label">Teléfono</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Phone size={16} /></span>
                <input
                  id="reg-telefono"
                  type="tel"
                  className={`auth-input${fieldErrors.telefono ? ' auth-input--error' : ''}`}
                  placeholder="Ej. 9191234567"
                  value={telefono}
                  onChange={(e) => { 
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setTelefono(val); 
                    setFieldErrors(p => ({ ...p, telefono: undefined })); 
                  }}
                  maxLength={10}
                  autoComplete="tel"
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.telefono && (
                <p className="auth-field-error"><AlertCircle size={12} />{fieldErrors.telefono}</p>
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
                  placeholder="Mínimo 10 caracteres"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  autoComplete="new-password"
                  maxLength={72}
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

              {/* Requisitos visuales de contraseña */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.75rem', marginTop: '0.5rem', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                <span style={{ color: (password.length >= 10 && password.length <= 72) ? '#22c55e' : (password.length > 0 ? '#ef4444' : 'var(--text-muted, #94a3b8)') }}>
                  {(password.length >= 10 && password.length <= 72) ? '✓' : '○'} Mínimo 10 caracteres
                </span>
                <span style={{ color: /[A-Z]/.test(password) ? '#22c55e' : (password.length > 0 ? '#ef4444' : 'var(--text-muted, #94a3b8)') }}>
                  {/[A-Z]/.test(password) ? '✓' : '○'} Una mayúscula
                </span>
                <span style={{ color: /[a-z]/.test(password) ? '#22c55e' : (password.length > 0 ? '#ef4444' : 'var(--text-muted, #94a3b8)') }}>
                  {/[a-z]/.test(password) ? '✓' : '○'} Una minúscula
                </span>
                <span style={{ color: /[0-9]/.test(password) ? '#22c55e' : (password.length > 0 ? '#ef4444' : 'var(--text-muted, #94a3b8)') }}>
                  {/[0-9]/.test(password) ? '✓' : '○'} Un número
                </span>
                <span style={{ color: /[^A-Za-z0-9]/.test(password) ? '#22c55e' : (password.length > 0 ? '#ef4444' : 'var(--text-muted, #94a3b8)') }}>
                  {/[^A-Za-z0-9]/.test(password) ? '✓' : '○'} Un carácter especial
                </span>
                <span style={{ color: (password.length > 0 && !/\s/.test(password)) ? '#22c55e' : (password.length > 0 ? '#ef4444' : 'var(--text-muted, #94a3b8)') }}>
                  {(password.length > 0 && !/\s/.test(password)) ? '✓' : '○'} Sin espacios
                </span>
              </div>
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

            {/* Términos de servicio y Política de privacidad */}
            <div className="auth-terms-container">
              <label htmlFor="reg-terms" className="auth-terms-label">
                <input
                  id="reg-terms"
                  type="checkbox"
                  className="auth-terms-checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    setFieldErrors(p => ({ ...p, terms: undefined }));
                  }}
                  disabled={isSubmitting}
                />
                <span className="auth-terms-text">
                  Acepto los{' '}
                  <Link 
                    to="/terms-and-conditions" 
                    state={{ from: '/register' }} 
                    className="auth-terms-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Términos de servicio
                  </Link>{' '}
                  y la{' '}
                  <Link 
                    to="/privacy-policy" 
                    state={{ from: '/register' }} 
                    className="auth-terms-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Política de privacidad
                  </Link>{' '}
                  municipal de CleanGo.
                </span>
              </label>
              {fieldErrors.terms && (
                <p className="auth-field-error" style={{ marginTop: '0.35rem' }}>
                  <AlertCircle size={12} />
                  {fieldErrors.terms}
                </p>
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
