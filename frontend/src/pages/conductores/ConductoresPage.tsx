import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import type { Conductor } from '../../types/conductores';
import '../../assets/styles/usuarios.css';
import { Header } from '../../components/layout/Header';
import { PageSectionHeader } from '../../components/layout/PageSectionHeader';
import { useConfirm } from '../../hooks/useConfirm';

export const ConductoresPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

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

  const handleDelete = async (conductor: Conductor) => {
    const accepted = await confirm({
      title: 'Eliminar conductor',
      message: `¿Estás seguro de que deseas eliminar al conductor "${conductor.nombre_completo}"? Esta acción eliminará permanentemente el registro y no podrá deshacerse.`,
      variant: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!accepted) return;

    setIsDeleting(conductor.id);
    try {
      const res = await fetch(`/api/conductores/${conductor.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar conductor');
      }

      toast.success('Conductor eliminado correctamente');
      fetchConductores(); // Recargar la lista
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—';

  return (
    <>
      <Header
        subtitle="Administración del catálogo de conductores"
        title="Conductores"
      />
      <PageSectionHeader
        eyebrow="PERSONAL"
        title="Conductores"
        description="Perfiles, rutas asignadas y rendimiento del personal operativo."
      />
      <div className="usuarios-page">
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <button onClick={handleOpenCreate} className="save-button">
            <Plus size={16} /> Nuevo Conductor
          </button>
        </div>

        <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', padding: '1rem 0' }}>
            <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} /> Cargando conductores…
          </motion.div>
        ) : conductores.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text)' }}>
            No se encontraron conductores
          </motion.div>
        ) : (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="usuarios-table-wrapper" style={{ marginTop: '1.5rem' }}>
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Fecha de Registro</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <motion.tbody
                initial="hidden" animate="show"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
              >
                <AnimatePresence>
                {conductores.map(c => (
                  <motion.tr
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text-h)' }}>{c.nombre_completo}</td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDate(c.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button className="action-btn action-btn--edit" onClick={() => handleOpenEdit(c)} title="Editar Conductor">
                          <Pencil size={14} />
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handleDelete(c)}
                          title="Eliminar Conductor"
                          style={{ color: 'var(--destructive)' }}
                          disabled={isDeleting === c.id}
                        >
                          {isDeleting === c.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </>
  );
};
