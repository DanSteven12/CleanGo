import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TriangleAlert,
  ShieldAlert,
  CircleHelp,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText,
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus en el botón Cancelar al abrir
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Cierre con la tecla Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);

  const getVariantStyles = (v: ConfirmVariant) => {
    switch (v) {
      case 'danger':
        return {
          iconBg: 'rgba(239, 68, 68, 0.12)',
          iconColor: '#ef4444',
          borderColor: 'rgba(239, 68, 68, 0.25)',
          confirmBg: '#ef4444',
          confirmHoverBg: '#dc2626',
          confirmShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
          Icon: TriangleAlert,
          defaultConfirmText: 'Eliminar',
        };
      case 'warning':
        return {
          iconBg: 'rgba(245, 158, 11, 0.12)',
          iconColor: '#f59e0b',
          borderColor: 'rgba(245, 158, 11, 0.25)',
          confirmBg: '#f59e0b',
          confirmHoverBg: '#d97706',
          confirmShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
          Icon: ShieldAlert,
          defaultConfirmText: 'Continuar',
        };
      case 'info':
        return {
          iconBg: 'rgba(23, 99, 166, 0.12)',
          iconColor: '#1763A6',
          borderColor: 'rgba(23, 99, 166, 0.25)',
          confirmBg: '#1763A6',
          confirmHoverBg: '#13528b',
          confirmShadow: '0 4px 14px rgba(23, 99, 166, 0.35)',
          Icon: CircleHelp,
          defaultConfirmText: 'Aceptar',
        };
      case 'success':
        return {
          iconBg: 'rgba(56, 140, 53, 0.12)',
          iconColor: '#388C35',
          borderColor: 'rgba(56, 140, 53, 0.25)',
          confirmBg: '#388C35',
          confirmHoverBg: '#2d702b',
          confirmShadow: '0 4px 14px rgba(56, 140, 53, 0.35)',
          Icon: CheckCircle2,
          defaultConfirmText: 'Confirmar',
        };
    }
  };

  const styleConfig = getVariantStyles(variant);
  const IconComponent = styleConfig.Icon;
  const finalConfirmText = confirmText || styleConfig.defaultConfirmText;

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          {/* Backdrop con Blur y Opacidad animada */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              if (!loading) onCancel();
            }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Dialog Box Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'relative',
              width: '92%',
              maxWidth: '510px',
              backgroundColor: 'var(--panel-bg, #12181D)',
              border: `1px solid ${styleConfig.borderColor}`,
              borderRadius: 'var(--radius-lg, 0.85rem)',
              boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.65), 0 0 20px 0 rgba(0, 0, 0, 0.3)',
              padding: '1.75rem',
              color: 'var(--text-h, #FFFFFF)',
              zIndex: 1,
              overflow: 'hidden',
            }}
          >
            {/* Botón de Cierre X superior */}
            <button
              type="button"
              onClick={() => {
                if (!loading) onCancel();
              }}
              disabled={loading}
              aria-label="Cerrar modal"
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text, #9CA3AF)',
                cursor: loading ? 'not-allowed' : 'pointer',
                padding: '0.25rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-h, #FFFFFF)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text, #9CA3AF)')}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.125rem' }}>
              {/* Badge del Icono */}
              <div
                style={{
                  flexShrink: 0,
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '0.75rem',
                  backgroundColor: styleConfig.iconBg,
                  color: styleConfig.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${styleConfig.borderColor}`,
                }}
              >
                <IconComponent size={24} />
              </div>

              {/* Contenido Texto */}
              <div style={{ flex: 1, paddingTop: '0.125rem' }}>
                <h3
                  id="confirm-dialog-title"
                  style={{
                    fontFamily: 'var(--font-display, inherit)',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--text-h, #FFFFFF)',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </h3>
                <div
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.875rem',
                    color: 'var(--text, #9CA3AF)',
                    lineHeight: 1.5,
                  }}
                >
                  {message}
                </div>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div
              style={{
                marginTop: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              {/* Botón Cancelar */}
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={onCancel}
                disabled={loading}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: '0.5rem',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--panel-border, rgba(255, 255, 255, 0.15))',
                  color: 'var(--text-h, #FFFFFF)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: loading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {cancelText}
              </button>

              {/* Botón Confirmar */}
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                style={{
                  padding: '0.625rem 1.35rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '0.5rem',
                  backgroundColor: styleConfig.confirmBg,
                  color: '#FFFFFF',
                  border: 'none',
                  boxShadow: styleConfig.confirmShadow,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease',
                  opacity: loading ? 0.8 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = styleConfig.confirmHoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = styleConfig.confirmBg;
                  }
                }}
              >
                {loading && <Loader2 size={16} className="spin" />}
                <span>{finalConfirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
