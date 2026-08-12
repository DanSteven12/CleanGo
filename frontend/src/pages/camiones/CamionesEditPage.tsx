import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import type { CamionData } from '../../types/camiones';
import '../../assets/styles/usuarios.css';
import { Header } from '../../components/layout/Header';

export const CamionesEditPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CamionData>({
    numero_economico: '',
    placa: '',
    usuario_dispositivo: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const resCamion = await fetch(`/api/camiones/${id}`);

        if (!resCamion.ok) throw new Error('Error al cargar camión');

        const camion = await resCamion.json();

        setFormData({
          numero_economico: camion.numero_economico,
          placa: camion.placa,
          usuario_dispositivo: camion.usuario_dispositivo
        });
      } catch (e: any) {
        toast.error(e.message || 'Error al cargar datos');
        navigate('/camiones');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, navigate]);

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
    setFieldErrors(prev => ({ ...prev, [name]: err }));
    return err === '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let normalizedValue = value;

    if (name === 'placa') normalizedValue = value.toUpperCase().trim();
    if (name === 'numero_economico') normalizedValue = value.trim();
    if (name === 'usuario_dispositivo') normalizedValue = value.toLowerCase().trim();

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
      const valid = validateField(key, formData[key] as string);
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
      const res = await fetch(`/api/camiones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el camión');

      toast.success('Camión actualizado exitosamente');
      navigate('/camiones');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasValidationErrors = Object.values(fieldErrors).some(err => err !== '');
  const isSubmitDisabled = isSaving || hasValidationErrors;

  return (
    <>
      <Header
        subtitle="Visualiza y edita la información de esta unidad"
        title="Detalles del Camión"
      />
    <div className="usuarios-page">
      <div className="form-header-row" style={{ marginTop: '1rem', padding: '0 2rem' }}>
        <button className="back-button" onClick={() => navigate('/camiones')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--text-h)' }}>
          <ArrowLeft size={16} /> Volver a la lista
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', padding: '2rem' }}>
          <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} /> Cargando información…
        </div>
      ) : (
        <>
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
                  <input
                    type="text"
                    className={`form-input ${touched.numero_economico && fieldErrors.numero_economico ? 'input-error' : ''}`}
                    name="numero_economico"
                    value={formData.numero_economico}
                    onChange={handleChange}
                    onBlur={handleBlur}
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
                  <input
                    type="text"
                    className={`form-input ${touched.placa && fieldErrors.placa ? 'input-error' : ''}`}
                    name="placa"
                    value={formData.placa}
                    onChange={handleChange}
                    onBlur={handleBlur}
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
                  <input
                    type="text"
                    className={`form-input ${touched.usuario_dispositivo && fieldErrors.usuario_dispositivo ? 'input-error' : ''}`}
                    name="usuario_dispositivo"
                    value={formData.usuario_dispositivo}
                    onChange={handleChange}
                    onBlur={handleBlur}
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
                  {isSaving ? 'Actualizando...' : 'Actualizar Camión'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </div>
    </>
  );
};
