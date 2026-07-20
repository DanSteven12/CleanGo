import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import type { Conductor } from '../../types/conductores';
import '../../assets/styles/usuarios.css';

export const ConductoresPage: React.FC = () => {
  const navigate = useNavigate();
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
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al conductor "${conductor.nombre_completo}"?`)) {
      return;
    }

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
    <div className="usuarios-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Conductores</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '0.2rem', marginBottom: 0 }}>Administración del catálogo de conductores</p>
        </div>
        <button onClick={handleOpenCreate} className="save-button">
          <Plus size={16} /> Nuevo Conductor
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', padding: '1rem 0' }}>
          <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} /> Cargando conductores…
        </div>
      ) : (
        <div className="usuarios-table-wrapper" style={{ marginTop: '1.5rem' }}>
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Nombre Completo</th>
                <th>Fecha de Registro</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conductores.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>No se encontraron conductores</td>
                </tr>
              ) : (
                conductores.map(c => (
                  <tr key={c.id}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
