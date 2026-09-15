import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Loader2,
  Phone,
  FileText,
  CalendarDays,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import type { Conductor } from '../../types/conductores';
import '../../assets/styles/conductores-cards.css';
import { Header } from '../../components/layout/Header';
import { PageSectionHeader } from '../../components/layout/PageSectionHeader';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const getInitials = (name: string): string => {
  if (!name) return 'CH';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ─── Conductor Card ────────────────────────────────────────────────────────── */

interface ConductorCardProps {
  conductor: Conductor;
  onEdit: (c: Conductor) => void;
  formatDate: (d: string | null) => string;
}

const ConductorCard: React.FC<ConductorCardProps> = ({
  conductor,
  onEdit,
  formatDate,
}) => {
  const initials = getInitials(conductor.nombre_completo);
  const isActive = conductor.estado === 'Activo';

  return (
    <motion.article
      className="driver-card"
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* ── Top Header (Mint pastel background) ── */}
      <div className="driver-card__header">
        <div className="driver-card__header-left">
          {/* Avatar Circle */}
          <div className="driver-card__avatar">
            {initials}
          </div>

          {/* Identity: Nombre y Número de Empleado */}
          <div className="driver-card__identity">
            <h3 className="driver-card__name" title={conductor.nombre_completo}>
              {conductor.nombre_completo}
            </h3>
            <span className="driver-card__subtitle" title={`N° Empleado: ${conductor.numero_empleado}`}>
              {conductor.numero_empleado}
            </span>
          </div>
        </div>

        {/* Status Badge & Edit action */}
        <div className="driver-card__header-right">
          <span
            className={`driver-card__status ${
              isActive ? 'driver-card__status--active' : 'driver-card__status--inactive'
            }`}
          >
            {conductor.estado}
          </span>
          <button
            className="driver-card__edit-btn"
            onClick={() => onEdit(conductor)}
            title="Editar conductor"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* ── Body: Info Rows with Real Database Data ── */}
      <div className="driver-card__body">
        {/* N° de Licencia */}
        <div className="driver-card__row">
          <FileText size={16} className="driver-card__icon" strokeWidth={1.8} />
          <span><strong>N° Licencia:</strong> {conductor.numero_licencia || '—'}</span>
        </div>

        {/* Vigencia de Licencia */}
        <div className="driver-card__row">
          <CalendarDays size={16} className="driver-card__icon" strokeWidth={1.8} />
          <span><strong>Vigencia:</strong> {formatDate(conductor.vigencia_licencia)}</span>
        </div>

        {/* Teléfono */}
        <div className="driver-card__row">
          <Phone size={16} className="driver-card__icon" strokeWidth={1.8} />
          <span>
            <strong>Teléfono:</strong>{' '}
            {conductor.telefono || 'Sin teléfono registrado'}
          </span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="driver-card__divider" />

      {/* ── Footer con Datos Reales de la BD ── */}
      <div className="driver-card__metrics">
        <div className="driver-card__metric">
          <span className="driver-card__metric-label">EXPEDICIÓN</span>
          <span className="driver-card__metric-value">
            {conductor.fecha_expedicion_licencia ? formatDate(conductor.fecha_expedicion_licencia) : '—'}
          </span>
        </div>

        <div className="driver-card__metric">
          <span className="driver-card__metric-label">VIGENCIA</span>
          <span className="driver-card__metric-value">
            {formatDate(conductor.vigencia_licencia)}
          </span>
        </div>

        <div className="driver-card__metric">
          <span className="driver-card__metric-label">ESTADO</span>
          <span className="driver-card__metric-value">
            {conductor.estado}
          </span>
        </div>
      </div>
    </motion.article>
  );
};

/* ─── Page Component ────────────────────────────────────────────────────────── */

export const ConductoresPage: React.FC = () => {
  const navigate = useNavigate();
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConductores = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/conductores');
      if (!res.ok) throw new Error('Error al cargar conductores');
      const data = await res.json();
      setConductores(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar conductores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConductores();
  }, []);

  const handleOpenCreate = () => {
    navigate('/conductores/create');
  };

  const handleOpenEdit = (conductor: Conductor) => {
    navigate(`/conductores/${conductor.id}/edit`);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    const raw = String(d).slice(0, 10);
    const [y, m, day] = raw.split('-').map(Number);
    if (!y || !m || !day) return raw;
    return new Date(y, m - 1, day).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <>
      <Header
        subtitle="Administración del catálogo de conductores"
        title="Conductores"
      />
      <PageSectionHeader
        eyebrow="PERSONAL"
        title="Conductores"
        description="Perfiles, licencias y estado del personal operativo."
      />
      <div className="conductores-page">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
          <button onClick={handleOpenCreate} className="save-button">
            <Plus size={16} /> Nuevo Conductor
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="trucks-loading"
            >
              <Loader2 size={18} className="spin" style={{ color: 'var(--primary)' }} />
              <span>Cargando conductores…</span>
            </motion.div>
          ) : conductores.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="trucks-empty"
            >
              <UserCheck size={40} strokeWidth={1.4} />
              <p>No hay conductores registrados todavía.</p>
              <button className="save-button" onClick={handleOpenCreate}>
                <Plus size={14} /> Registrar primer conductor
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial="hidden"
              animate="show"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
              className="conductores-grid"
            >
              <AnimatePresence>
                {conductores.map(c => (
                  <ConductorCard
                    key={c.id}
                    conductor={c}
                    onEdit={handleOpenEdit}
                    formatDate={formatDate}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
