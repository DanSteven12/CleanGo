import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Loader2, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import '../../../assets/styles/routes.css';
import { Header } from '../../../components/layout/Header';
import { PageSectionHeader } from '../../../components/layout/PageSectionHeader';
import { useConfirm } from '../../../hooks/useConfirm';

export interface RutaOption {
  id: number;
  nombre: string;
}

export interface Horario {
  id: number;
  ruta_id: number;
  ruta_nombre?: string;
  dia_semana: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  hora_inicio_estimada: string;
  hora_fin_estimada: string;
}

export const HorariosPage: React.FC = () => {
  const confirm = useConfirm();
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [rutas, setRutas] = useState<RutaOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    ruta_id: '',
    dia_semana: 'Lunes',
    hora_inicio_estimada: '',
    hora_fin_estimada: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resH, resR] = await Promise.all([
        fetch('/api/horarios'),
        fetch('/api/rutas')
      ]);
      if (!resH.ok) throw new Error(`HTTP ${resH.status}`);
      if (!resR.ok) throw new Error(`HTTP ${resR.status}`);

      const dataH = await resH.json();
      const dataR = await resR.json();
      setHorarios(dataH);
      setRutas(dataR);
    } catch (e) {
      console.error('[HorariosPage] fetchData:', e);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFormData({
      ruta_id: rutas.length > 0 ? String(rutas[0].id) : '',
      dia_semana: 'Lunes',
      hora_inicio_estimada: '',
      hora_fin_estimada: '',
    });
    setEditingId(null);
    setIsFormOpen(false);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
    setTimeout(() => {
      document.getElementById('horario-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleEdit = (h: Horario) => {
    setFormData({
      ruta_id: String(h.ruta_id),
      dia_semana: h.dia_semana,
      hora_inicio_estimada: h.hora_inicio_estimada.substring(0, 5),
      hora_fin_estimada: h.hora_fin_estimada.substring(0, 5),
    });
    setEditingId(h.id);
    setIsFormOpen(true);
    setFormError(null);
    setTimeout(() => {
      document.getElementById('horario-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDelete = async (id: number) => {
    const accepted = await confirm({
      title: 'Eliminar horario',
      message: '¿Estás seguro de eliminar este horario? Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!accepted) return;
    try {
      const res = await fetch(`/api/horarios/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Horario eliminado correctamente');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  const handleSave = async () => {
    if (!formData.ruta_id || !formData.dia_semana || !formData.hora_inicio_estimada || !formData.hora_fin_estimada) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }
    if (formData.hora_inicio_estimada >= formData.hora_fin_estimada) {
      setFormError('La hora de inicio debe ser menor que la hora de fin.');
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      const url = editingId ? `/api/horarios/${editingId}` : '/api/horarios';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }

      toast.success(`Horario ${editingId ? 'actualizado' : 'creado'} correctamente`);
      await fetchData();
      resetForm();
    } catch (e: any) {
      setFormError(e.message ?? 'Error al guardar el horario.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Header
        subtitle="Gestiona los horarios habituales de cada ruta"
        title="Horarios Base"
      />
      <PageSectionHeader
        eyebrow="PROGRAMACIÓN"
        title="Horarios base"
        description="Gestión y configuración de los horarios habituales de recolección por ruta."
      />
      <div className="routes-page">
        <section className="routes-section">
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            {!isFormOpen && (
              <button className="save-button" onClick={handleOpenCreate} style={{ textDecoration: 'none' }}>
                <Plus size={16} />
                Nuevo Horario
              </button>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', padding: '1rem 0' }}>
              <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} />
              Cargando horarios…
            </div>
          ) : horarios.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2.5rem 1rem', color: 'var(--text)', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={22} style={{ color: 'var(--muted-foreground)' }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: '0 0 0.25rem' }}>No hay horarios registrados</p>
                <p style={{ fontSize: '0.8125rem', margin: 0 }}>Crea el primero usando el botón de arriba.</p>
              </div>
            </div>
          ) : (
            <div className="routes-table-wrapper" style={{ width: '100%' }}>
              <table className="routes-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Ruta</th>
                    <th style={{ width: '20%' }}>Día</th>
                    <th style={{ width: '20%' }}>Inicio</th>
                    <th style={{ width: '20%' }}>Fin</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {horarios.map(h => (
                    <tr key={h.id} className={editingId === h.id ? 'row-editing' : ''}>
                      <td style={{ fontWeight: 500, color: 'var(--text-h)' }}>{h.ruta_nombre}</td>
                      <td style={{ color: 'var(--text)' }}>{h.dia_semana}</td>
                      <td style={{ color: 'var(--text)' }}>{h.hora_inicio_estimada}</td>
                      <td style={{ color: 'var(--text)' }}>{h.hora_fin_estimada}</td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(h)}
                            title="Editar horario"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleDelete(h.id)}
                            title="Eliminar horario"
                            style={{ color: 'var(--destructive)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isFormOpen && (
            <div className="routes-section" id="horario-form-section" style={{ width: '100%', marginTop: '1.25rem', background: 'var(--panel-bg)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                {editingId ? 'Editar Horario' : 'Nuevo Horario'}
              </h3>
              <div className="form-grid">

                <div className="form-field">
                  <label className="form-label" style={{ marginBottom: '0.125rem' }}>Ruta *</label>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>Selecciona la zona geográfica o sector asignado para este horario.</p>
                  <select
                    className="form-input"
                    value={formData.ruta_id}
                    onChange={e => setFormData({ ...formData, ruta_id: e.target.value })}
                  >
                    <option value="" disabled>Selecciona una ruta</option>
                    {rutas.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label" style={{ marginBottom: '0.125rem' }}>Día de la semana *</label>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>Día en el que se ejecutará habitualmente esta ruta.</p>
                  <select
                    className="form-input"
                    value={formData.dia_semana}
                    onChange={e => setFormData({ ...formData, dia_semana: e.target.value })}
                  >
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label" style={{ marginBottom: '0.125rem' }}>Hora Inicio Estimada *</label>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>Hora aproximada en la que inicia el recorrido en la ruta.</p>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.hora_inicio_estimada}
                    onChange={e => setFormData({ ...formData, hora_inicio_estimada: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" style={{ marginBottom: '0.125rem' }}>Hora Fin Estimada *</label>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>Hora aproximada en la que finaliza el recorrido en la ruta.</p>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.hora_fin_estimada}
                    onChange={e => setFormData({ ...formData, hora_fin_estimada: e.target.value })}
                  />
                </div>

              </div>

              {formError && (
                <div className="validation-error-banner" role="alert" style={{ marginTop: '0.75rem' }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button className="save-button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  {isSaving ? 'Guardando…' : (editingId ? 'Actualizar Horario' : 'Crear Horario')}
                </button>
                <button
                  className="save-button"
                  style={{ background: 'transparent', color: 'var(--text-h)', border: '1px solid var(--panel-border)', boxShadow: 'none' }}
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
};
