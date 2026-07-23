// frontend/src/pages/auth/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, Loader2, Send } from 'lucide-react';
import { forgotPassword } from '../../services/authService';
import iconoCamion from '../../assets/images/icono.png';
import '../../assets/styles/auth.css';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError('El correo electrónico es obligatorio.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('El correo electrónico no tiene un formato válido.');
      return false;
    }
    setEmailError(null);
    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            ¿Olvidaste tu<br />
            <span>contraseña?</span>
          </h1>
          <p className="auth-hero-desc">
            No te preocupes. Ingresa tu correo y te enviaremos un enlace para restablecer tu acceso de forma segura.
          </p>
        </div>
        <div className="auth-features">
          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <Send size={18} color="#fff" />
            </div>
            <div className="auth-feature-text">
              <span className="auth-feature-title">Enlace seguro por correo</span>
              <span className="auth-feature-desc">El token de recuperación expira en 1 hora</span>
            </div>
          </div>
          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <CheckCircle2 size={18} color="#fff" />
            </div>
            <div className="auth-feature-text">
              <span className="auth-feature-title">Un solo uso</span>
              <span className="auth-feature-desc">El enlace se invalida automáticamente después de usarlo</span>
            </div>
          </div>
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
            <h2 className="auth-form-title">Recuperar contraseña</h2>
            <p className="auth-form-subtitle">
              {sent
                ? 'Revisa tu bandeja de entrada.'
                : 'Ingresa tu correo para recibir instrucciones.'}
            </p>
          </div>

          {sent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="auth-success-banner">
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong>Solicitud enviada</strong><br />
                  Si el correo <strong>{email}</strong> está registrado, recibirás instrucciones para restablecer tu contraseña.
                </div>
              </div>

              <Link to="/login" className="auth-submit-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {serverError && (
                <div className="auth-error-banner" role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{serverError}</span>
                </div>
              )}

              <div>
                <label htmlFor="forgot-email" className="auth-label">Correo electrónico</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><Mail size={16} /></span>
                  <input
                    id="forgot-email"
                    type="email"
                    className={`auth-input${emailError ? ' auth-input--error' : ''}`}
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                    autoComplete="email"
                    disabled={isSubmitting}
                  />
                </div>
                {emailError && (
                  <p className="auth-field-error"><AlertCircle size={12} />{emailError}</p>
                )}
              </div>

              <button
                id="forgot-submit"
                type="submit"
                className="auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 size={17} className="spin" /> Enviando…</>
                ) : (
                  <><Send size={16} /> Enviar instrucciones</>
                )}
              </button>
            </form>
          )}

          {!sent && (
            <div className="auth-bottom">
              <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
