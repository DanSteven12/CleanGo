import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Loader2, KeyRound, X } from 'lucide-react';
import { toast } from 'sonner';

import type { CamionRecord } from '../../types/camiones';
import '../../assets/styles/usuarios.css'; // Reutilizamos estilos

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export const CamionesPage: React.FC = () => {
  const navigate = useNavigate();
  const [camiones, setCamiones] = useState<CamionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [selectedCamion, setSelectedCamion] = useState<CamionRecord | null>(null);
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCamiones = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/camiones');
      if (!res.ok) throw new Error('Error al cargar camiones');
      const data = await res.json();
      setCamiones(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar camiones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCamiones();
  }, []);

  const totalPages = Math.ceil(camiones.length / itemsPerPage);
  const currentCamiones = camiones.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleOpenCreate = () => {
    navigate('/camiones/nuevo');
  };

  const handleOpenEdit = (camion: CamionRecord) => {
    navigate(`/camiones/${camion.id}/editar`);
  };

  const handleOpenPassword = (camion: CamionRecord) => {
    setSelectedCamion(camion);
    setPasswordData({ password: '', confirmPassword: '' });
    setFormError(null);
    setIsPasswordOpen(true);
  };

  const handleSavePassword = async () => {
    setFormError(null);
    if (!passwordData.password || passwordData.password.length < 6) {
      return setFormError('La contraseña debe tener al menos 6 caracteres.');
    }
    if (passwordData.password !== passwordData.confirmPassword) {
      return setFormError('Las contraseñas no coinciden.');
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/camiones/${selectedCamion!.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nueva_password: passwordData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Error al actualizar contraseña');

      toast.success('Contraseña actualizada correctamente');
      setIsPasswordOpen(false);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—';

  return (
    <div className="usuarios-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Unidades de Recolección</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '0.2rem', marginBottom: 0 }}>Administración de camiones y credenciales móviles</p>
        </div>
        <button onClick={handleOpenCreate} className="save-button">
          <Plus size={16} /> Registrar Camión
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', padding: '1rem 0' }}>
          <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} /> Cargando camiones…
        </div>
      ) : (
        <>
          <div className="usuarios-table-wrapper">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>No. Económico</th>
                  <th>Placa</th>
                  <th>Usuario Disp.</th>
                  <th>Registro</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentCamiones.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No se encontraron camiones</td>
                  </tr>
                ) : (
                  currentCamiones.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-h)' }}>{c.numero_economico}</td>
                      <td>{c.placa}</td>
                      <td>{c.usuario_dispositivo}</td>
                      <td style={{ fontSize: '0.8rem' }}>{formatDate(c.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button className="action-btn action-btn--edit" onClick={() => handleOpenEdit(c)} title="Editar Detalles y Ver Historial">
                            <Pencil size={14} />
                          </button>
                          <button className="action-btn" onClick={() => handleOpenPassword(c)} title="Cambiar Contraseña" style={{ color: 'oklch(0.6 0.15 40)' }}>
                            <KeyRound size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-secondary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '0.85rem', alignSelf: 'center', color: 'var(--text)' }}>
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn-secondary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Cambiar Contraseña */}
      <Modal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} title="Cambiar Contraseña de Dispositivo">
        <p style={{ color: 'var(--text)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Unidad: <strong>{selectedCamion?.numero_economico}</strong> ({selectedCamion?.usuario_dispositivo})
        </p>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-field">
            <label className="form-label">Nueva Contraseña *</label>
            <input type="password" className="form-input" value={passwordData.password} onChange={e => setPasswordData({ ...passwordData, password: e.target.value })} />
          </div>
          <div className="form-field">
            <label className="form-label">Confirmar Contraseña *</label>
            <input type="password" className="form-input" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
          </div>
        </div>

        {formError && (
          <div className="validation-error-banner" style={{ marginTop: '1rem' }}>
            <span>{formError}</span>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setIsPasswordOpen(false)} disabled={isSaving}>Cancelar</button>
          <button className="save-button" onClick={handleSavePassword} disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="spin" /> : 'Actualizar'}
          </button>
        </div>
      </Modal>

    </div>
  );
};
