import React, { useState, useEffect } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { UsuarioData, UsuarioRecord } from '../../../types/usuarios';

interface UserFormProps {
  initialData?: Partial<UsuarioData>;
  isEditing?: boolean;
  selectedUser?: UsuarioRecord;
  onSubmit: (formData: UsuarioData) => Promise<void>;
  isSaving: boolean;
  formError: string | null;
}

export const UserForm: React.FC<UserFormProps> = ({ 
  initialData, 
  isEditing = false, 
  selectedUser,
  onSubmit, 
  isSaving, 
  formError 
}) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<UsuarioData>({
    nombre: '',
    correo: '',
    telefono: '',
    password: '',
    confirmPassword: '',
    rol: 'Ciudadano',
    estado: 'Activo',
    ...initialData,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const dummyNumbers = [
    '1234567890',
    '0123456789',
    '9876543210',
    '0987654321',
    '1122334455',
    '1212121212',
    '2345678901',
    '9898989898',
  ];

  const validateField = (name: string, value: string) => {
    let err = '';
    if (name === 'nombre') {
      const clean = value.trim();
      if (!clean) {
        err = 'El nombre es requerido.';
      } else if (clean.length < 3 || clean.length > 100) {
        err = 'El nombre debe tener entre 3 y 100 caracteres.';
      } else if (/[0-9]/.test(clean)) {
        err = 'El nombre no debe contener números.';
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(clean)) {
        err = 'El nombre solo debe contener letras.';
      } else if (clean.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '').length < 3) {
        err = 'El nombre debe tener al menos 3 letras.';
      }
    }
    if (name === 'correo') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value.trim()) err = 'El correo es requerido.';
      else if (value.trim().length > 100) err = 'El correo no puede exceder los 100 caracteres.';
      else if (!emailRegex.test(value.trim())) err = 'Introduce un formato de correo electrónico válido.';
    }
    if (name === 'telefono') {
      const clean = value.trim();
      if (!clean) {
        err = 'El teléfono es requerido.';
      } else if (!/^[0-9]{10}$/.test(clean)) {
        err = 'El teléfono debe tener exactamente 10 dígitos numéricos.';
      } else if (!/^[2-9]/.test(clean)) {
        err = 'El teléfono no puede iniciar con 0 ni 1.';
      } else if (/^(\d)\1{9}$/.test(clean) || /(\d)\1{6,}/.test(clean) || dummyNumbers.includes(clean)) {
        err = 'Por favor ingresa un número telefónico real y válido.';
      }
    }
    if (!isEditing) {
      if (name === 'password') {
        if (!value) err = 'La contraseña es requerida.';
        else if (value.length < 10 || value.length > 72) err = 'Debe tener entre 10 y 72 caracteres.';
        else if (/\s/.test(value)) err = 'La contraseña no debe contener espacios.';
        else if (!/[A-Z]/.test(value)) err = 'Debe contener al menos 1 letra mayúscula.';
        else if (!/[a-z]/.test(value)) err = 'Debe contener al menos 1 letra minúscula.';
        else if (!/[0-9]/.test(value)) err = 'Debe contener al menos 1 número.';
        else if (!/[^A-Za-z0-9]/.test(value)) err = 'Debe contener al menos 1 carácter especial.';
        else if (formData.correo && value.toLowerCase() === formData.correo.trim().toLowerCase()) {
          err = 'La contraseña no puede ser igual al correo electrónico.';
        } else if (formData.nombre && value.toLowerCase() === formData.nombre.trim().toLowerCase()) {
          err = 'La contraseña no puede ser igual al nombre de usuario.';
        }
      }
      if (name === 'confirmPassword') {
        if (!value) err = 'La confirmación es requerida.';
        else if (value !== formData.password) err = 'Las contraseñas no coinciden.';
      }
    }
    setFieldErrors(prev => ({ ...prev, [name]: err }));
    return err === '';
  };

  const handleChange = (name: keyof UsuarioData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
    if (name === 'password' && !isEditing) {
      validateField('confirmPassword', formData.confirmPassword || '');
    }
  };

  const handleBlur = (name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const pwd = formData.password || '';
  const pwdLengthValid = pwd.length >= 10 && pwd.length <= 72;
  const pwdUpperValid = /[A-Z]/.test(pwd);
  const pwdLowerValid = /[a-z]/.test(pwd);
  const pwdNumberValid = /[0-9]/.test(pwd);
  const pwdSpecialValid = /[^A-Za-z0-9]/.test(pwd);
  const pwdNoSpacesValid = pwd.length > 0 && !/\s/.test(pwd);
  const pwdMatchValid = (formData.confirmPassword || '') !== '' && pwd === formData.confirmPassword;
  const pwdNotEmailValid = !formData.correo || pwd.toLowerCase() !== formData.correo.trim().toLowerCase();
  const pwdNotNameValid = !formData.nombre || pwd.toLowerCase() !== formData.nombre.trim().toLowerCase();

  const isFormValid = () => {
    const cleanNombre = (formData.nombre || '').trim();
    if (
      !cleanNombre ||
      cleanNombre.length < 3 ||
      cleanNombre.length > 100 ||
      /[0-9]/.test(cleanNombre) ||
      !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(cleanNombre) ||
      cleanNombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '').length < 3
    ) {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.correo || formData.correo.trim().length > 100 || !emailRegex.test(formData.correo.trim())) return false;

    const cleanTel = (formData.telefono || '').trim();
    if (
      !cleanTel ||
      !/^[0-9]{10}$/.test(cleanTel) ||
      !/^[2-9]/.test(cleanTel) ||
      /^(\d)\1{9}$/.test(cleanTel) ||
      /(\d)\1{6,}/.test(cleanTel) ||
      dummyNumbers.includes(cleanTel)
    ) {
      return false;
    }

    if (!isEditing) {
      if (
        !pwdLengthValid || 
        !pwdUpperValid || 
        !pwdLowerValid || 
        !pwdNumberValid || 
        !pwdSpecialValid || 
        !pwdNoSpacesValid || 
        !pwdNotEmailValid || 
        !pwdNotNameValid || 
        !pwdMatchValid
      ) return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!isFormValid()) return;
    onSubmit(formData);
  };

  return (
    <motion.div 
      className="routes-section" id="usuario-form" style={{ marginTop: '1rem' }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
    >
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="form-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Nombre Completo *</label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{(formData.nombre || '').length}/100</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
            Ingresa el nombre completo del usuario que tendrá acceso al sistema.
          </p>
          <input 
            type="text" 
            className={`form-input ${touched.nombre && fieldErrors.nombre ? 'input-error' : ''}`}
            value={formData.nombre} 
            onChange={e => {
              const filtered = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
              handleChange('nombre', filtered);
            }} 
            onBlur={e => handleBlur('nombre', e.target.value)}
            placeholder="Ej: Juan Pérez"
            maxLength={100}
          />
          <AnimatePresence>
            {touched.nombre && fieldErrors.nombre && (
              <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                {fieldErrors.nombre}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="form-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Correo Electrónico *</label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{(formData.correo || '').length}/100</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
            Introduce un correo electrónico único que será utilizado para iniciar sesión.
          </p>
          <input 
            type="email" 
            className={`form-input ${touched.correo && fieldErrors.correo ? 'input-error' : ''}`}
            value={formData.correo} 
            onChange={e => handleChange('correo', e.target.value)} 
            onBlur={e => handleBlur('correo', e.target.value)}
            placeholder="Ej: juan@ejemplo.com"
            maxLength={100}
          />
          <AnimatePresence>
            {touched.correo && fieldErrors.correo && (
              <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                {fieldErrors.correo}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="form-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Teléfono *</label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{(formData.telefono || '').length}/10</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
            Número de contacto del usuario (10 dígitos).
          </p>
          <input 
            type="tel" 
            className={`form-input ${touched.telefono && fieldErrors.telefono ? 'input-error' : ''}`}
            value={formData.telefono || ''} 
            onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              handleChange('telefono', val);
            }} 
            onBlur={e => handleBlur('telefono', e.target.value)}
            placeholder="Ej. 9191234567"
            maxLength={10}
          />
          <AnimatePresence>
            {touched.telefono && fieldErrors.telefono && (
              <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                {fieldErrors.telefono}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {!isEditing && (
          <>
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Contraseña *</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{(formData.password || '').length}/72</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
                Define una contraseña segura con la que el usuario accederá al sistema.
              </p>
              <input 
                type="password" 
                className={`form-input ${touched.password && fieldErrors.password ? 'input-error' : ''}`}
                value={formData.password || ''} 
                onChange={e => handleChange('password', e.target.value)} 
                onBlur={e => handleBlur('password', e.target.value)}
                placeholder="Al menos 10 caracteres"
                maxLength={72}
              />
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                <span style={{ color: pwdLengthValid ? '#22c55e' : (touched.password ? '#ef4444' : 'var(--text)') }}>
                  {pwdLengthValid ? '✓' : '○'} Mínimo 10 caracteres
                </span>
                <span style={{ color: pwdUpperValid ? '#22c55e' : (touched.password ? '#ef4444' : 'var(--text)') }}>
                  {pwdUpperValid ? '✓' : '○'} Una mayúscula
                </span>
                <span style={{ color: pwdLowerValid ? '#22c55e' : (touched.password ? '#ef4444' : 'var(--text)') }}>
                  {pwdLowerValid ? '✓' : '○'} Una minúscula
                </span>
                <span style={{ color: pwdNumberValid ? '#22c55e' : (touched.password ? '#ef4444' : 'var(--text)') }}>
                  {pwdNumberValid ? '✓' : '○'} Un número
                </span>
                <span style={{ color: pwdSpecialValid ? '#22c55e' : (touched.password ? '#ef4444' : 'var(--text)') }}>
                  {pwdSpecialValid ? '✓' : '○'} Un carácter especial
                </span>
                <span style={{ color: pwdNoSpacesValid ? '#22c55e' : (touched.password ? '#ef4444' : 'var(--text)') }}>
                  {pwdNoSpacesValid ? '✓' : '○'} Sin espacios
                </span>
              </div>
            </div>

            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Confirmar Contraseña *</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{(formData.confirmPassword || '').length}/72</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
                Vuelve a escribir la contraseña para confirmar que ambos valores coinciden.
              </p>
              <input 
                type="password" 
                className={`form-input ${touched.confirmPassword && fieldErrors.confirmPassword ? 'input-error' : ''}`}
                value={formData.confirmPassword || ''} 
                onChange={e => handleChange('confirmPassword', e.target.value)} 
                onBlur={e => handleBlur('confirmPassword', e.target.value)}
                placeholder="Repita la contraseña"
                maxLength={72}
              />
              <AnimatePresence>
                {touched.confirmPassword && (formData.confirmPassword || '').length > 0 && !pwdMatchValid && (
                  <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                    Las contraseñas no coinciden.
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {isEditing && selectedUser && (
          <div className="form-field">
            <label className="form-label">Estado *</label>
            <select 
              className="form-select" 
              value={formData.estado || 'Activo'} 
              onChange={e => setFormData({ ...formData, estado: e.target.value as 'Activo' | 'Bloqueado' })}
            >
              <option value="Activo">Activo</option>
              <option value="Bloqueado">Bloqueado</option>
            </select>
          </div>
        )}
      </div>

      <AnimatePresence>
      {formError && (
        <motion.div 
          initial={{ opacity: 0, height: 0, y: -5 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -5 }}
          style={{ overflow: 'hidden' }}
        >
          <div className="validation-error-banner" style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span>{formError}</span>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="form-actions" style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', width: '100%' }}>
        <button
          type="button"
          className="save-button"
          style={{ background: 'transparent', color: 'var(--text-h)', border: '1px solid var(--panel-border)', boxShadow: 'none' }}
          onClick={() => navigate('/usuarios')}
          disabled={isSaving}
        >
          <X size={16} />
          Cancelar
        </button>
        <button
          className="save-button crear-ruta-btn"
          onClick={handleSubmit}
          disabled={isSaving || !isFormValid()}
        >
          {isSaving ? (
            <>
              <Loader2 size={20} className="spin" />
              {isEditing ? 'Guardando…' : 'Creando…'}
            </>
          ) : (
            <>
              <Check size={20} />
              {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
