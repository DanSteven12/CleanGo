import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import '../../assets/styles/usuarios.css';

export const CamionesCreatePage: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    numero_economico: '',
    placa: '',
    usuario_dispositivo: '',
    password_dispositivo: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.numero_economico || !formData.placa || !formData.usuario_dispositivo || !formData.password_dispositivo) {
      return setError('Todos los campos son obligatorios.');
    }

    if (formData.password_dispositivo.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
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

  return (
    <div className="usuarios-page">
      <div className="form-header-row">
        <button className="back-button" onClick={() => navigate('/camiones')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Registrar Nuevo Camión</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: 0 }}>
            Ingresa los datos de la unidad y sus credenciales
          </p>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Número Económico *</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '-0.3rem', marginBottom: '0.5rem' }}>Introduce el identificador único con el que se reconoce el camión dentro de la flota.</p>
              <input 
                type="text" 
                className="form-input" 
                name="numero_economico" 
                value={formData.numero_economico} 
                onChange={handleChange} 
                placeholder="Ej: CAM-015"
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label">Placa *</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '-0.3rem', marginBottom: '0.5rem' }}>Ingresa el número de placa oficial de la unidad.</p>
              <input 
                type="text" 
                className="form-input" 
                name="placa" 
                value={formData.placa} 
                onChange={handleChange} 
                placeholder="Ej: AB-1234-C"
                required
              />
            </div>
            
            
            
            <div className="form-field">
              <label className="form-label">Usuario del Dispositivo *</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '-0.3rem', marginBottom: '0.5rem' }}>Define el nombre de usuario que utilizará el dispositivo asignado al camión para iniciar sesión.</p>
              <input 
                type="text" 
                className="form-input" 
                name="usuario_dispositivo" 
                value={formData.usuario_dispositivo} 
                onChange={handleChange} 
                placeholder="Ej: cam015_app"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Contraseña del Dispositivo *</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '-0.3rem', marginBottom: '0.5rem' }}>Establece una contraseña segura para autenticar el dispositivo en el sistema.</p>
              <input 
                type="password" 
                className="form-input" 
                name="password_dispositivo" 
                value={formData.password_dispositivo} 
                onChange={handleChange}
                placeholder="Al menos 8 caracteres"
                required
              />
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
              {isSaving ? 'Guardando...' : 'Guardar Camión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
