// frontend/src/pages/auth/ResetPasswordPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { resetPassword } from '../../services/authService';
import iconoCamion from '../../assets/images/icono.png';
import '../../assets/styles/auth.css';

interface FieldErrors {
  newPassword?: string;
  confirmPassword?: string;
}

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validate(): boolean {
    if (!newPassword) {
      errors.newPassword = 'La contraseña es obligatoria.';
    } else if (newPassword.length < 10) {
      errors.newPassword = 'La contraseña debe tener al menos 10 caracteres.';
    } else if (newPassword.length > 72) {
      errors.newPassword = 'La contraseña no puede superar los 72 caracteres.';
    } else if (/\s/.test(newPassword)) {
      errors.newPassword = 'La contraseña no puede contener espacios.';
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = 'Debe incluir al menos una letra mayúscula.';
    } else if (!/[a-z]/.test(newPassword)) {
      errors.newPassword = 'Debe incluir al menos una letra minúscula.';
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = 'Debe incluir al menos un número.';
    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
      errors.newPassword = 'Debe incluir al menos un carácter especial.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirma tu nueva contraseña.';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!token) {
      setServerError('Token de recuperación no encontrado. Solicita un nuevo enlace.');
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword, confirmPassword);
      toast.success('Contraseña restablecida correctamente.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const strengthChecks = [
    { label: 'Mínimo 10 caracteres', ok: newPassword.length >= 10 && newPassword.length <= 72 },
    { label: 'Una mayúscula', ok: /[A-Z]/.test(newPassword) },
    { label: 'Una minúscula', ok: /[a-z]/.test(newPassword) },
    { label: 'Un número', ok: /[0-9]/.test(newPassword) },
    { label: 'Un carácter especial', ok: /[^A-Za-z0-9]/.test(newPassword) },
    { label: 'Sin espacios', ok: newPassword.length > 0 && !/\s/.test(newPassword) },
    { label: 'Las contraseñas coinciden', ok: !!confirmPassword && confirmPassword === newPassword },
  ];

  return (
    <div className="auth-root">
      {/* Left panel */}
      <div className="auth-panel-left">
        <div className="auth-panel-bg-grid" />
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <img src={iconoCamion} alt="CleanGo" />
          </div>
          <div>
            <div className="auth-brand-name">CleanGo</div>
            <div className="auth-brand-sub">Logística Urbana</div>
          </div>
        </div>
        <div className="auth-hero">
          <h1 className="auth-hero-title">
            Crea tu nueva<br />
            <span>contraseña segura</span>
          </h1>
          <p className="auth-hero-desc">
            Elige una contraseña fuerte que cumpla los requisitos de seguridad. Una vez actualizada, podrás iniciar sesión de inmediato.
          </p>
        </div>
        <div className="auth-features">
          {strengthChecks.map((c) => (
            <div className="auth-feature-item" key={c.label} style={{ gap: '0.625rem' }}>
              <CheckCircle2
                size={18}
                color={c.ok ? '#90BF49' : 'oklch(0.55 0.03 240)'}
                style={{ flexShrink: 0, transition: 'color 0.2s' }}
              />
              <span
                className="auth-feature-title"
                style={{
                  fontSize: '0.85rem',
                  color: c.ok ? '#90BF49' : 'oklch(0.65 0.03 240)',
                  transition: 'color 0.2s',
                }}
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>

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
            <h2 className="auth-form-title">Nueva contraseña</h2>
            <p className="auth-form-subtitle">Elige una contraseña segura para tu cuenta</p>
          </div>

          {!token && (
            <div className="auth-error-banner" role="alert" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>Enlace de recuperación inválido o expirado. <Link to="/forgot-password" className="auth-link">Solicita uno nuevo</Link>.</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {serverError && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{serverError}</span>
              </div>
            )}

            {/* Nueva contraseña */}
            <div>
              <label htmlFor="reset-new" className="auth-label">Nueva contraseña</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Lock size={16} /></span>
                <input
                  id="reset-new"
                  type={showNew ? 'text' : 'password'}
                  className={`auth-input auth-input--with-eye${fieldErrors.newPassword ? ' auth-input--error' : ''}`}
                  placeholder="Mínimo 10 caracteres"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setFieldErrors(p => ({ ...p, newPassword: undefined })); }}
                  autoComplete="new-password"
                  maxLength={72}
                  disabled={isSubmitting || !token}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowNew(v => !v)}
                  aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.newPassword && (
                <p className="auth-field-error"><AlertCircle size={12} />{fieldErrors.newPassword}</p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="reset-confirm" className="auth-label">Confirmar contraseña</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Lock size={16} /></span>
                <input
                  id="reset-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className={`auth-input auth-input--with-eye${fieldErrors.confirmPassword ? ' auth-input--error' : ''}`}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: undefined })); }}
                  autoComplete="new-password"
                  disabled={isSubmitting || !token}
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
              id="reset-submit"
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting || !token}
            >
              {isSubmitting ? (
                <><Loader2 size={17} className="spin" /> Actualizando…</>
              ) : (
                'Restablecer contraseña'
              )}
            </button>
          </form>

          <div className="auth-bottom">
            <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <ArrowLeft size={14} /> Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
