import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import type { CamionData } from '../../types/camiones';
import '../../assets/styles/usuarios.css';

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
    <div className="usuarios-page">
      <div className="form-header-row">
        <button className="back-button" onClick={() => navigate('/camiones')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Detalles del Camión</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: 0 }}>
            Visualiza y edita la información de esta unidad
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => navigate(`/historial?camion_id=${id}`)}
        >
          <Calendar size={16} /> Ver historial de recorridos
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', padding: '2rem' }}>
          <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} /> Cargando información…
        </div>
      ) : (
        <>
          <div className="form-container">
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

                <div className="form-field" style={{ gridColumn: '1 / -1', marginTop: '1rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)' }}>
                    <strong>Nota:</strong> Todas las unidades se consideran equipadas con GPS por defecto debido a que utilizan la ubicación proporcionada por la aplicación móvil. La contraseña del dispositivo solo puede ser modificada a través de la acción dedicada en la lista de camiones.
                  </p>
                </div>
              </div>

              {error && (
                <div className="validation-error-banner" style={{ marginTop: '1.5rem' }}>
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-secondary" onClick={() => navigate('/camiones')} disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  {isSaving ? 'Actualizando...' : 'Actualizar Camión'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
