import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import '../../assets/styles/usuarios.css';
import { Header } from '../../components/layout/Header';

export const ConductoresEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [formData, setFormData] = useState({
    nombre_completo: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConductor = async () => {
      try {
        const res = await fetch(`/api/conductores/${id}`);
        if (!res.ok) throw new Error('Error al cargar conductor');
        const data = await res.json();
        setFormData({
          nombre_completo: data.nombre_completo
        });
      } catch (e) {
        console.error(e);
        toast.error('No se pudo cargar la información del conductor');
        navigate('/conductores');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchConductor();
    }
  }, [id, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre_completo.trim()) {
      return setError('El nombre completo es obligatorio.');
    }

    if (formData.nombre_completo.trim().length > 150) {
      return setError('El nombre completo excede el máximo de 150 caracteres.');
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/conductores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_completo: formData.nombre_completo.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el conductor');

      toast.success('Conductor actualizado exitosamente');
      navigate('/conductores');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="usuarios-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <>
      <Header
        subtitle="Modifica la información del conductor"
        title="Editar Conductor"
      />
    <div className="usuarios-page">
      <div className="form-header-row" style={{ marginTop: '1rem', padding: '0 2rem' }}>
        <button className="back-button" onClick={() => navigate('/conductores')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--text-h)' }}>
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
              <label className="form-label">Nombre completo *</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '-0.3rem', marginBottom: '0.5rem' }}>
                Ingresa el nombre completo del conductor que podrá ser asignado a los recorridos del sistema.
              </p>
              <input 
                type="text" 
                className="form-input" 
                name="nombre_completo" 
                value={formData.nombre_completo} 
                onChange={handleChange} 
                placeholder="Ej: Juan Pérez Martínez"
                required
              />
            </div>
          </div>

          <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -5 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -5 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="validation-error-banner" style={{ marginTop: '1.5rem' }}>
                <span>{error}</span>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn-secondary" onClick={() => navigate('/conductores')} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="save-button" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} 
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
    </>
  );
};
