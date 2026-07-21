import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Loader2,
  KeyRound,
  X,
  Truck,
  History,
  MapPin,
  CalendarDays,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';

import type { CamionRecord } from '../../types/camiones';
import '../../assets/styles/usuarios.css';
import '../../assets/styles/camiones-cards.css';

/* ─── Inline Modal (unchanged logic) ──────────────────────────────────────── */

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

/* ─── Truck Card ───────────────────────────────────────────────────────────── */

interface TruckCardProps {
  camion: CamionRecord;
  onEdit: (c: CamionRecord) => void;
  onPassword: (c: CamionRecord) => void;
  onHistorial: () => void;
  onAsignar: () => void;
  formatDate: (d: string) => string;
}

const TruckCard: React.FC<TruckCardProps> = ({
  camion,
  onEdit,
  onPassword,
  onHistorial,
  onAsignar,
  formatDate,
}) => (
  <article className="truck-card">
    {/* ── Header ── */}
    <div className="truck-card__header">
      <div className="truck-card__icon-wrap">
        <Truck size={22} strokeWidth={1.8} />
      </div>

      <div className="truck-card__identity">
        <span className="truck-card__eco">{camion.numero_economico}</span>
        <span className="truck-card__placa">{camion.placa}</span>
      </div>

      {/* Edit + password actions grouped top-right */}
      <div className="truck-card__meta-actions">
        <button
          className="truck-card__icon-btn truck-card__icon-btn--edit"
          onClick={() => onEdit(camion)}
          title="Editar unidad"
        >
          <Pencil size={13} />
        </button>
        <button
          className="truck-card__icon-btn truck-card__icon-btn--key"
          onClick={() => onPassword(camion)}
          title="Cambiar contraseña"
        >
          <KeyRound size={13} />
        </button>
      </div>
    </div>

    {/* ── Divider ── */}
    <div className="truck-card__divider" />

    {/* ── Info rows ── */}
    <div className="truck-card__info">
      <div className="truck-card__info-row">
        <span className="truck-card__info-label">
          <Smartphone size={12} />
          Usuario del dispositivo
        </span>
        <span className="truck-card__info-value">{camion.usuario_dispositivo}</span>
      </div>

      <div className="truck-card__info-row">
        <span className="truck-card__info-label">
          <CalendarDays size={12} />
          Fecha de registro
        </span>
        <span className="truck-card__info-value">{formatDate(camion.created_at)}</span>
      </div>
    </div>

    {/* ── Footer actions ── */}
    <div className="truck-card__footer">
      <button className="truck-card__action truck-card__action--outline" onClick={onHistorial}>
        <History size={14} />
        Ver historial
      </button>
      <button className="truck-card__action truck-card__action--primary" onClick={onAsignar}>
        <MapPin size={14} />
        Asignar ruta
      </button>
    </div>
  </article>
);

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export const CamionesPage: React.FC = () => {
  const navigate = useNavigate();
  const [camiones, setCamiones] = useState<CamionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* password modal state — logic unchanged */
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [selectedCamion, setSelectedCamion] = useState<CamionRecord | null>(null);
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ── Fetch ── */
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

  useEffect(() => { fetchCamiones(); }, []);

  /* ── Navigation helpers ── */
  const handleOpenCreate   = ()                   => navigate('/camiones/nuevo');
  const handleOpenEdit     = (c: CamionRecord)    => navigate(`/camiones/${c.id}/editar`);
  const handleOpenPassword = (c: CamionRecord)    => {
    setSelectedCamion(c);
    setPasswordData({ password: '', confirmPassword: '' });
    setFormError(null);
    setIsPasswordOpen(true);
  };
  const handleGoHistorial  = ()                   => navigate('/historial');
  const handleGoAsignar    = ()                   => navigate('/asignaciones/nueva');

  /* ── Save password (logic unchanged) ── */
  const handleSavePassword = async () => {
    setFormError(null);
    if (!passwordData.password || passwordData.password.length < 6)
      return setFormError('La contraseña debe tener al menos 6 caracteres.');
    if (passwordData.password !== passwordData.confirmPassword)
      return setFormError('Las contraseñas no coinciden.');

    setIsSaving(true);
    try {
      const res = await fetch(`/api/camiones/${selectedCamion!.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nueva_password: passwordData.password }),
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

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('es-MX') : '—';

  /* ── Render ── */
  return (
    <div className="usuarios-page">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Unidades de Recolección</h2>
          <p className="page-subtitle">Panel de gestión de camiones y credenciales móviles</p>
        </div>
        <button onClick={handleOpenCreate} className="save-button">
          <Plus size={16} /> Registrar Camión
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="trucks-loading">
          <Loader2 size={18} className="spin" style={{ color: 'var(--primary)' }} />
          <span>Cargando unidades…</span>
        </div>
      ) : camiones.length === 0 ? (
        <div className="trucks-empty">
          <Truck size={40} strokeWidth={1.4} />
          <p>No hay camiones registrados todavía.</p>
          <button className="save-button" onClick={handleOpenCreate}>
            <Plus size={14} /> Registrar primer camión
          </button>
        </div>
      ) : (
        /* Card grid */
        <div className="trucks-grid">
          {camiones.map(c => (
            <TruckCard
              key={c.id}
              camion={c}
              onEdit={handleOpenEdit}
              onPassword={handleOpenPassword}
              onHistorial={handleGoHistorial}
              onAsignar={handleGoAsignar}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Password Modal — logic unchanged */}
      <Modal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        title="Cambiar Contraseña de Dispositivo"
      >
        <p style={{ color: 'var(--text)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Unidad: <strong>{selectedCamion?.numero_economico}</strong> ({selectedCamion?.usuario_dispositivo})
        </p>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-field">
            <label className="form-label">Nueva Contraseña *</label>
            <input
              type="password"
              className="form-input"
              value={passwordData.password}
              onChange={e => setPasswordData({ ...passwordData, password: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Confirmar Contraseña *</label>
            <input
              type="password"
              className="form-input"
              value={passwordData.confirmPassword}
              onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </div>
        </div>

        {formError && (
          <div className="validation-error-banner" style={{ marginTop: '1rem' }}>
            <span>{formError}</span>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setIsPasswordOpen(false)} disabled={isSaving}>
            Cancelar
          </button>
          <button className="save-button" onClick={handleSavePassword} disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="spin" /> : 'Actualizar'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
