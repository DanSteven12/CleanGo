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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.numero_economico || !formData.placa || !formData.usuario_dispositivo) {
      return setError('Todos los campos son obligatorios.');
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
                  <label className="form-label">Número Económico *</label>
                  <input
                    type="text"
                    className="form-input"
                    name="numero_economico"
                    value={formData.numero_economico}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Placa *</label>
                  <input
                    type="text"
                    className="form-input"
                    name="placa"
                    value={formData.placa}
                    onChange={handleChange}
                    required
                  />
                </div>



                <div className="form-field">
                  <label className="form-label">Usuario del Dispositivo *</label>
                  <input
                    type="text"
                    className="form-input"
                    name="usuario_dispositivo"
                    value={formData.usuario_dispositivo}
                    onChange={handleChange}
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
                <button type="button" className="btn-secondary" onClick={() => navigate('/camiones')} disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={isSaving}>
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
