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
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import type { CamionRecord } from '../../types/camiones';
import '../../assets/styles/usuarios.css';
import '../../assets/styles/camiones-cards.css';
import { Header } from '../../components/layout/Header';
import { PageSectionHeader } from '../../components/layout/PageSectionHeader';

/* ─── Inline Modal ────────────────────────────────────────────────────────── */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="modal-header">
              <h3 className="modal-title">{title}</h3>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  <motion.article
    className="truck-card"
    layout
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
  >
    {/* ── Header con fondo Pastel y Logo Azul Squircle ── */}
    <div className="truck-card__header">
      <div className="truck-card__header-left">
        {/* Contenedor de Logo Azul Redondeado */}
        <div className="truck-card__icon-box">
          <Truck size={22} color="#ffffff" strokeWidth={1.8} />
        </div>

        {/* Identidad de la unidad */}
        <div className="truck-card__identity">
          <span className="truck-card__eco" title={camion.numero_economico}>
            {camion.numero_economico}
          </span>
          <span className="truck-card__placa" title={`Placa: ${camion.placa}`}>
            {camion.placa}
          </span>
        </div>
      </div>

      {/* Badge de Estado y Acciones */}
      <div className="truck-card__header-right">
        <span
          className={`truck-card__status ${
            camion.gps_instalado ? 'truck-card__status--active' : 'truck-card__status--inactive'
          }`}
        >
          {camion.gps_instalado ? 'GPS Activo' : 'Sin GPS'}
        </span>
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
    </div>

    {/* ── Filas de Información ── */}
    <div className="truck-card__body">
      <div className="truck-card__row">
        <Smartphone size={16} className="truck-card__icon" strokeWidth={1.8} />
        <span><strong>Dispositivo:</strong> {camion.usuario_dispositivo}</span>
      </div>

      <div className="truck-card__row">
        <CalendarDays size={16} className="truck-card__icon" strokeWidth={1.8} />
        <span><strong>Registro:</strong> {formatDate(camion.created_at)}</span>
      </div>

      <div className="truck-card__row">
        <Radio size={16} className="truck-card__icon" strokeWidth={1.8} />
        <span>
          <strong>Rastreo GPS:</strong>{' '}
          {camion.gps_instalado ? 'Instalado y sincronizado' : 'No instalado'}
        </span>
      </div>
    </div>

    {/* ── Divider ── */}
    <div className="truck-card__divider" />

    {/* ── Métricas en 3 Columnas con Datos Reales de la BD ── */}
    <div className="truck-card__metrics">
      <div className="truck-card__metric">
        <span className="truck-card__metric-label">PLACA</span>
        <span className="truck-card__metric-value">{camion.placa}</span>
      </div>

      <div className="truck-card__metric">
        <span className="truck-card__metric-label">USUARIO</span>
        <span className="truck-card__metric-value" title={camion.usuario_dispositivo}>
          {camion.usuario_dispositivo}
        </span>
      </div>

      <div className="truck-card__metric">
        <span className="truck-card__metric-label">GPS</span>
        <span className="truck-card__metric-value">
          {camion.gps_instalado ? 'Activo' : 'Inactivo'}
        </span>
      </div>
    </div>

    {/* ── Botones de Acción ── */}
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
  </motion.article>
);

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export const CamionesPage: React.FC = () => {
  const navigate = useNavigate();
  const [camiones, setCamiones] = useState<CamionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* Password modal state */
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

  const pwd = passwordData.password;
  const pwdLengthValid = pwd.length >= 8 && pwd.length <= 20;
  const pwdUpperValid = /[A-Z]/.test(pwd);
  const pwdNumberValid = /[0-9]/.test(pwd);
  const pwdSpecialValid = /[^A-Za-z0-9]/.test(pwd);
  const pwdMatchValid = passwordData.confirmPassword !== '' && pwd === passwordData.confirmPassword;
  const isPasswordValid = pwdLengthValid && pwdUpperValid && pwdNumberValid && pwdSpecialValid && pwdMatchValid;

  /* ── Save password ── */
  const handleSavePassword = async () => {
    setFormError(null);
    if (!pwdLengthValid)
      return setFormError('La contraseña debe tener entre 8 y 20 caracteres.');
    if (!pwdUpperValid || !pwdNumberValid || !pwdSpecialValid)
      return setFormError('La contraseña debe incluir mayúscula, número y carácter especial.');
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
    <>
      <Header
        subtitle="Panel de gestión de camiones y credenciales móviles"
        title="Unidades de Recolección"
      />
      <PageSectionHeader
        eyebrow="FLOTA"
        title="Camiones de recolección"
        description="Estado, asignación y estadísticas de cada unidad."
      />
      <div className="usuarios-page">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
          <button onClick={handleOpenCreate} className="save-button">
            <Plus size={16} /> Registrar Camión
          </button>
        </div>

        {/* Loading state */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="trucks-loading">
              <Loader2 size={18} className="spin" style={{ color: 'var(--primary)' }} />
              <span>Cargando unidades…</span>
            </motion.div>
          ) : camiones.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="trucks-empty">
              <Truck size={40} strokeWidth={1.4} />
              <p>No hay camiones registrados todavía.</p>
              <button className="save-button" onClick={handleOpenCreate}>
                <Plus size={14} /> Registrar primer camión
              </button>
            </motion.div>
          ) : (
            /* Card grid */
            <motion.div
              key="grid"
              initial="hidden"
              animate="show"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
              className="trucks-grid"
            >
              <AnimatePresence>
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
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Password Modal */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Nueva Contraseña *</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{passwordData.password.length}/20</span>
              </div>
              <input
                type="password"
                className="form-input"
                value={passwordData.password}
                onChange={e => setPasswordData({ ...passwordData, password: e.target.value })}
                maxLength={20}
              />
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                <span style={{ color: pwdLengthValid ? '#22c55e' : (pwd.length > 0 ? '#ef4444' : 'var(--text)') }}>
                  {pwdLengthValid ? '✓' : '○'} Entre 8 y 20 caracteres
                </span>
                <span style={{ color: pwdUpperValid ? '#22c55e' : (pwd.length > 0 ? '#ef4444' : 'var(--text)') }}>
                  {pwdUpperValid ? '✓' : '○'} Al menos 1 letra mayúscula
                </span>
                <span style={{ color: pwdNumberValid ? '#22c55e' : (pwd.length > 0 ? '#ef4444' : 'var(--text)') }}>
                  {pwdNumberValid ? '✓' : '○'} Al menos 1 número
                </span>
                <span style={{ color: pwdSpecialValid ? '#22c55e' : (pwd.length > 0 ? '#ef4444' : 'var(--text)') }}>
                  {pwdSpecialValid ? '✓' : '○'} Al menos 1 carácter especial
                </span>
              </div>
            </div>
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Confirmar Contraseña *</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{passwordData.confirmPassword.length}/20</span>
              </div>
              <input
                type="password"
                className="form-input"
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                maxLength={20}
              />
              {passwordData.confirmPassword.length > 0 && !pwdMatchValid && (
                <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                  Las contraseñas no coinciden.
                </span>
              )}
            </div>
          </div>

          {formError && (
            <div className="validation-error-banner" style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span>{formError}</span>
            </div>
          )}

          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setIsPasswordOpen(false)} disabled={isSaving}>
              Cancelar
            </button>
            <button className="save-button" onClick={handleSavePassword} disabled={isSaving || !isPasswordValid}>
              {isSaving ? <Loader2 size={16} className="spin" /> : 'Actualizar'}
            </button>
          </div>
        </Modal>
      </div>
    </>
  );
};
