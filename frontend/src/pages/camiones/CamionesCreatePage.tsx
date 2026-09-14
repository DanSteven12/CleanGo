import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import '../../assets/styles/usuarios.css';
import { Header } from '../../components/layout/Header';

export const CamionesCreatePage: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    numero_economico: '',
    placa: '',
    usuario_dispositivo: '',
    password_dispositivo: ''
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateField = (name: string, value: string) => {
    let err = '';
    if (name === 'numero_economico') {
      if (!value) err = 'El número económico es requerido.';
      else if (!/^[A-Za-z0-9-]{3,10}$/.test(value)) err = 'Debe tener entre 3 y 10 caracteres (solo letras, números y guiones).';
    }
    if (name === 'placa') {
      if (!value) err = 'La placa es requerida.';
      else if (!/^[A-Z0-9-]{5,10}$/.test(value)) err = 'Debe tener entre 5 y 10 caracteres permitidos.';
      else if (!/[A-Z]/.test(value) || !/[0-9]/.test(value)) err = 'Debe contener al menos una letra y un número.';
    }
    if (name === 'usuario_dispositivo') {
      if (!value) err = 'El usuario es requerido.';
      else if (!/^[a-z0-9_]{4,15}$/.test(value)) err = 'Entre 4 y 15 caracteres (minúsculas, números, guiones bajos).';
    }
    if (name === 'password_dispositivo') {
      if (!value) err = 'La contraseña es requerida.';
      else if (value.length < 8 || value.length > 20) err = 'Debe tener entre 8 y 20 caracteres.';
      else if (!/[A-Z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) err = 'Debe contener mayúscula, número y carácter especial.';
    }
    setFieldErrors(prev => ({ ...prev, [name]: err }));
    return err === '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let normalizedValue = value;

    if (name === 'placa') normalizedValue = value.toUpperCase().trim();
    if (name === 'numero_economico') normalizedValue = value.trim();
    if (name === 'usuario_dispositivo') normalizedValue = value.toLowerCase().trim();
    // No truncamos espacios en la contraseña a menos que lo deseen, pero generalemnte se permite, 
    // sin embargo, para dispositivos móviles es mejor evitar espacios al inicio/fin
    if (name === 'password_dispositivo') normalizedValue = value.trim();

    setFormData(prev => ({ ...prev, [name]: normalizedValue }));
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, normalizedValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const isFormValid = () => {
    const keys = Object.keys(formData) as Array<keyof typeof formData>;
    let isValid = true;
    keys.forEach(key => {
      const valid = validateField(key, formData[key]);
      if (!valid) isValid = false;
    });
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Marcar todos como tocados
    const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    if (!isFormValid()) {
      return setError('Por favor corrige los errores en el formulario antes de guardar.');
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/camiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el camión');

      toast.success('Camión registrado exitosamente');
      navigate('/camiones');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const pwd = formData.password_dispositivo;
  const pwdLengthValid = pwd.length >= 8 && pwd.length <= 20;
  const pwdUpperValid = /[A-Z]/.test(pwd);
  const pwdNumberValid = /[0-9]/.test(pwd);
  const pwdSpecialValid = /[^A-Za-z0-9]/.test(pwd);
  const hasValidationErrors = Object.values(fieldErrors).some(err => err !== '');
  const isSubmitDisabled = isSaving || hasValidationErrors;

  return (
    <>
      <Header
        subtitle="Ingresa los datos de la unidad y sus credenciales"
        title="Registrar Nuevo Camión"
      />
    <div className="usuarios-page">
      <div className="form-header-row" style={{ marginTop: '1rem', padding: '0 2rem' }}>
        <button className="back-button" onClick={() => navigate('/camiones')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--text-h)' }}>
          <ArrowLeft size={16} /> Volver a la lista
        </button>
      </div>

      <motion.div 
        className="form-container"
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Número Económico *</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{formData.numero_economico.length}/10</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '0.2rem', marginBottom: '0.5rem' }}>Introduce el identificador único con el que se reconoce el camión dentro de la flota.</p>
              <input 
                type="text" 
                className={`form-input ${touched.numero_economico && fieldErrors.numero_economico ? 'input-error' : ''}`}
                name="numero_economico" 
                value={formData.numero_economico} 
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Ej: CAM-015"
                maxLength={10}
                required
              />
              <AnimatePresence>
                {touched.numero_economico && fieldErrors.numero_economico && (
                  <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                    {fieldErrors.numero_economico}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Placa *</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{formData.placa.length}/10</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '0.2rem', marginBottom: '0.5rem' }}>Ingresa el número de placa oficial de la unidad.</p>
              <input 
                type="text" 
                className={`form-input ${touched.placa && fieldErrors.placa ? 'input-error' : ''}`}
                name="placa" 
                value={formData.placa} 
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Ej: AB-1234-C"
                maxLength={10}
                required
              />
              <AnimatePresence>
                {touched.placa && fieldErrors.placa && (
                  <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                    {fieldErrors.placa}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Usuario del Dispositivo *</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{formData.usuario_dispositivo.length}/15</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '0.2rem', marginBottom: '0.5rem' }}>Define el nombre de usuario que utilizará el dispositivo asignado al camión para iniciar sesión.</p>
              <input 
                type="text" 
                className={`form-input ${touched.usuario_dispositivo && fieldErrors.usuario_dispositivo ? 'input-error' : ''}`}
                name="usuario_dispositivo" 
                value={formData.usuario_dispositivo} 
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Ej: cam015_app"
                maxLength={15}
                required
              />
              <AnimatePresence>
                {touched.usuario_dispositivo && fieldErrors.usuario_dispositivo && (
                  <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                    {fieldErrors.usuario_dispositivo}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Contraseña del Dispositivo *</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{formData.password_dispositivo.length}/20</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '0.2rem', marginBottom: '0.5rem' }}>Establece una contraseña segura para autenticar el dispositivo en el sistema.</p>
              <input 
                type="password" 
                className={`form-input ${touched.password_dispositivo && fieldErrors.password_dispositivo ? 'input-error' : ''}`}
                name="password_dispositivo" 
                value={formData.password_dispositivo} 
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Al menos 8 caracteres"
                maxLength={20}
                required
              />
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                <span style={{ color: pwdLengthValid ? '#22c55e' : (touched.password_dispositivo ? '#ef4444' : 'var(--text)') }}>
                  {pwdLengthValid ? '✓' : '○'} Entre 8 y 20 caracteres
                </span>
                <span style={{ color: pwdUpperValid ? '#22c55e' : (touched.password_dispositivo ? '#ef4444' : 'var(--text)') }}>
                  {pwdUpperValid ? '✓' : '○'} Al menos 1 letra mayúscula
                </span>
                <span style={{ color: pwdNumberValid ? '#22c55e' : (touched.password_dispositivo ? '#ef4444' : 'var(--text)') }}>
                  {pwdNumberValid ? '✓' : '○'} Al menos 1 número
                </span>
                <span style={{ color: pwdSpecialValid ? '#22c55e' : (touched.password_dispositivo ? '#ef4444' : 'var(--text)') }}>
                  {pwdSpecialValid ? '✓' : '○'} Al menos 1 carácter especial
                </span>
              </div>
            </div>
          </div>

          <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -5 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -5 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="validation-error-banner" style={{ marginTop: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span>{error}</span>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn-secondary" onClick={() => navigate('/camiones')} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="save-button" disabled={isSubmitDisabled}>
              {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} 
              {isSaving ? 'Guardando...' : 'Guardar Camión'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
    </>
  );
};
