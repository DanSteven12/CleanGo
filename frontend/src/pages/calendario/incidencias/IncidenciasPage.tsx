import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Loader2, Check, X, Trash2, CheckCircle2, Info, Eye } from 'lucide-react';
import { toast } from 'sonner';
import '../../../assets/styles/routes.css';

export interface AsignacionOption {
  id: number;
  ruta_nombre?: string;
  camion_numero?: string;
  conductor_nombre?: string;
  fecha_programada?: string;
  horario_inicio?: string;
  horario_fin?: string;
  estatus_recorrido?: string;
}

export interface Incidencia {
  id: number;
  asignacion_id: number;
  ruta_nombre?: string;
  camion_numero?: string;
  conductor_nombre?: string;
  fecha_programada?: string;
  tipo: 'Suspensión' | 'Reprogramación' | 'Cambio de horario' | 'Clima' | 'Evento';
  motivo: string;
  fecha_nueva?: string;
  hora_nueva?: string;
  descripcion?: string;
  estatus: 'Activa' | 'Aplicada' | 'Resuelta';
  created_at?: string;
  fecha_original?: string;
  hora_inicio_original?: string;
  hora_fin_original?: string;
}

/** Tipos de incidencia que son cambios definitivos: no pueden resolverse */
const TIPOS_PERMANENTES: Incidencia['tipo'][] = ['Reprogramación', 'Cambio de horario'];
const esTipoPermanente = (tipo: Incidencia['tipo']) => TIPOS_PERMANENTES.includes(tipo);

const format12Hour = (timeStr: string) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
};

export const IncidenciasPage: React.FC = () => {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [viewingIncidencia, setViewingIncidencia] = useState<Incidencia | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    asignacion_id: '',
    tipo: 'Suspensión' as Incidencia['tipo'],
    motivo: '',
    fecha_nueva: '',
    hora_nueva: '',
    descripcion: '',
    estatus: 'Activa'
  });

  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resI, resA] = await Promise.all([
        fetch('/api/incidencias'),
        fetch('/api/asignaciones')
      ]);
      if (!resI.ok) throw new Error(`HTTP ${resI.status}`);
      if (!resA.ok) throw new Error(`HTTP ${resA.status}`);

      const dataI = await resI.json();
      const dataA = await resA.json();
      setIncidencias(dataI);
      setAsignaciones(dataA);
    } catch (e) {
      console.error('[IncidenciasPage] fetchData:', e);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    const pendientes = asignaciones.filter(a => a.estatus_recorrido === 'Pendiente');
    setFormData({
      asignacion_id: pendientes.length > 0 ? String(pendientes[0].id) : '',
      tipo: 'Suspensión',
      motivo: '',
      fecha_nueva: '',
      hora_nueva: '',
      descripcion: '',
      estatus: 'Activa'
    });
    setEditingId(null);
    setIsViewing(false);
    setViewingIncidencia(null);
    setIsFormOpen(false);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
    setTimeout(() => {
      document.getElementById('incidencia-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleView = (i: Incidencia) => {
    setViewingIncidencia(i);
    setIsViewing(true);
    setIsFormOpen(true);
    setTimeout(() => {
      document.getElementById('incidencia-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleEdit = (i: Incidencia) => {
    setFormData({
      asignacion_id: String(i.asignacion_id),
      tipo: i.tipo,
      motivo: i.motivo,
      fecha_nueva: i.fecha_nueva ? i.fecha_nueva.split('T')[0] : '',
      hora_nueva: i.hora_nueva ? i.hora_nueva.substring(0, 5) : '',
      descripcion: i.descripcion || '',
      estatus: i.estatus
    });
    setEditingId(i.id);
    setIsFormOpen(true);
    setFormError(null);
    setTimeout(() => {
      document.getElementById('incidencia-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar esta incidencia?')) return;
    try {
      const res = await fetch(`/api/incidencias/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Incidencia eliminada correctamente');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  const handleResolve = async (id: number) => {
    if (!window.confirm('¿Marcar esta incidencia como resuelta?')) return;
    try {
      const res = await fetch(`/api/incidencias/${id}/resolver`, { method: 'PUT' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Error al resolver');
      }
      toast.success('Incidencia resuelta correctamente');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Error al resolver');
    }
  };

  const handleSave = async () => {
    if (!formData.asignacion_id || !formData.tipo || !formData.motivo) {
      setFormError('Asignación, tipo y motivo son obligatorios.');
      return;
    }
    if (formData.tipo === 'Reprogramación' && (!formData.fecha_nueva || !formData.hora_nueva)) {
      setFormError('Reprogramación requiere nueva fecha y nueva hora.');
      return;
    }
    if (formData.tipo === 'Cambio de horario' && !formData.hora_nueva) {
      setFormError('Cambio de horario requiere nueva hora.');
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      const url = editingId ? `/api/incidencias/${editingId}` : '/api/incidencias';
      const method = editingId ? 'PUT' : 'POST';

      // Las incidencias permanentes siempre tienen estatus Activa
      const payload = {
        ...formData,
        estatus: esTipoPermanente(formData.tipo) ? 'Activa' : formData.estatus,
        fecha_nueva: formData.fecha_nueva || undefined,
        hora_nueva: formData.hora_nueva || undefined,
        descripcion: formData.descripcion || undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }

      toast.success(`Incidencia ${editingId ? 'actualizada' : 'creada'} correctamente`);
      await fetchData();
      resetForm();
    } catch (e: any) {
      setFormError(e.message ?? 'Error al guardar la incidencia.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderBadge = (estatus: string) => {
    if (estatus === 'Activa') {
      return (
        <span style={{ display: 'inline-block', whiteSpace: 'nowrap', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, background: 'var(--warning)', color: 'var(--warning-foreground)' }}>
          ACTIVA
        </span>
      );
    }
    if (estatus === 'Aplicada') {
      return (
        <span style={{ display: 'inline-block', whiteSpace: 'nowrap', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, background: 'var(--primary)', color: '#fff' }}>
          APLICADA
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-block', whiteSpace: 'nowrap', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, background: 'var(--success)', color: 'var(--success-foreground)' }}>
        RESUELTA
      </span>
    );
  };

  const renderTipoBadge = (tipo: Incidencia['tipo']) => {
    if (esTipoPermanente(tipo)) {
      return (
        <span style={{
          display: 'inline-block',
          padding: '0.2rem 0.55rem',
          borderRadius: '999px',
          fontSize: '0.68rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          background: 'var(--secondary)',
          color: 'var(--accent)',
          border: '1px solid var(--primary)',
          letterSpacing: '0.03em'
        }}>
          PERMANENTE
        </span>
      );
    }
    return null;
  };

  const tipoPermanenteActivo = esTipoPermanente(formData.tipo);

  return (
    <div className="routes-page">
      <section className="routes-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Incidencias de Programación</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '0.2rem', marginBottom: 0 }}>Gestiona excepciones que afectan una asignación programada</p>
          </div>
          {!isFormOpen && (
            <button className="save-button" onClick={handleOpenCreate} style={{ textDecoration: 'none' }}>
              <Plus size={16} />
              Nueva Incidencia
            </button>
          )}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', padding: '1rem 0' }}>
            <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} />
            Cargando incidencias…
          </div>
        ) : incidencias.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2.5rem 1rem', color: 'var(--text)', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={22} style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: '0 0 0.25rem' }}>No hay incidencias registradas</p>
              <p style={{ fontSize: '0.8125rem', margin: 0 }}>Registra una nueva usando el botón de arriba.</p>
            </div>
          </div>
        ) : (
          <div className="routes-table-wrapper">
            <table className="routes-table">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>ESTADO</th>
                  <th style={{ width: '18%' }}>Asignación</th>
                  <th style={{ width: '14%' }}>Tipo</th>
                  <th style={{ width: '12%' }}>Naturaleza</th>
                  <th style={{ width: '20%' }}>Motivo</th>
                  <th style={{ width: '12%' }}>Nueva Fecha/Hora</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {incidencias.map(i => (
                  <tr key={i.id} className={editingId === i.id ? 'row-editing' : ''}>
                    <td>{renderBadge(i.estatus)}</td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-h)', fontSize: '0.85rem' }}>{i.ruta_nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text)', marginTop: '0.1rem' }}>
                        {i.fecha_programada ? i.fecha_programada.split('T')[0] : `ID: ${i.asignacion_id}`}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text)' }}>{i.tipo}</td>
                    <td>{renderTipoBadge(i.tipo)}</td>
                    <td style={{ color: 'var(--text)', fontSize: '0.85rem' }}>{i.motivo}</td>
                    <td style={{ color: 'var(--text)', fontSize: '0.8rem' }}>
                      {i.fecha_nueva ? i.fecha_nueva.split('T')[0] : ''}
                      {i.fecha_nueva && i.hora_nueva ? ' ' : ''}
                      {i.hora_nueva ? i.hora_nueva.substring(0, 5) : ''}
                      {!i.fecha_nueva && !i.hora_nueva && '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {i.estatus === 'Activa' ? (
                          <>
                            {/* Botón Resolver: solo para incidencias temporales Activas (no Aplicada ni Resuelta) */}
                            {!esTipoPermanente(i.tipo) && (
                              <button
                                id={`btn-resolver-${i.id}`}
                                className="action-btn action-btn--edit"
                                onClick={() => handleResolve(i.id)}
                                title="Resolver incidencia"
                                style={{ color: 'var(--success)' }}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            <button
                              id={`btn-editar-${i.id}`}
                              className="action-btn action-btn--edit"
                              onClick={() => handleEdit(i)}
                              title="Editar incidencia"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              id={`btn-eliminar-${i.id}`}
                              className="action-btn action-btn--edit"
                              onClick={() => handleDelete(i.id)}
                              title="Eliminar incidencia"
                              style={{ color: 'var(--destructive)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            id={`btn-ver-${i.id}`}
                            className="action-btn action-btn--edit"
                            onClick={() => handleView(i)}
                            title="Ver incidencia"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isFormOpen && (
          <div className="routes-section" id="incidencia-form-section" style={{ marginTop: '1.25rem', background: 'var(--panel-bg)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
              {isViewing ? 'Detalle de Incidencia' : (editingId ? 'Editar Incidencia' : 'Nueva Incidencia')}
            </h3>

            {isViewing && viewingIncidencia ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--panel-border)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Estado</div>
                    <div style={{ fontWeight: 500 }}>{renderBadge(viewingIncidencia.estatus)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Tipo</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>{viewingIncidencia.tipo}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Clasificación</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>
                      {esTipoPermanente(viewingIncidencia.tipo) ? 'Permanente' : 'Temporal'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Fecha de registro</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>
                      {viewingIncidencia.created_at ? new Date(viewingIncidencia.created_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--panel-border)' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Asignación Afectada</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>
                       Asignación #{viewingIncidencia.asignacion_id} - {viewingIncidencia.ruta_nombre || 'Ruta no especificada'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Fecha original</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>
                      {viewingIncidencia.fecha_original 
                        ? viewingIncidencia.fecha_original.split('T')[0] 
                        : (viewingIncidencia.fecha_programada ? viewingIncidencia.fecha_programada.split('T')[0] : 'N/A')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Horario original</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>
                      {viewingIncidencia.hora_inicio_original && viewingIncidencia.hora_fin_original 
                        ? `${format12Hour(viewingIncidencia.hora_inicio_original)} - ${format12Hour(viewingIncidencia.hora_fin_original)}`
                        : (() => {
                            const asig = asignaciones.find(a => a.id === viewingIncidencia.asignacion_id);
                            return asig?.horario_inicio && asig?.horario_fin 
                              ? `${format12Hour(asig.horario_inicio)} - ${format12Hour(asig.horario_fin)}`
                              : 'N/A';
                          })()
                      }
                    </div>
                  </div>
                  {viewingIncidencia.fecha_nueva && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Nueva fecha</div>
                      <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>{viewingIncidencia.fecha_nueva.split('T')[0]}</div>
                    </div>
                  )}
                  {viewingIncidencia.hora_nueva && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Nuevo horario efectivo</div>
                      <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>
                        {(() => {
                          const asig = asignaciones.find(a => a.id === viewingIncidencia.asignacion_id);
                          if (asig?.horario_inicio && asig?.horario_fin) {
                            const startParts = asig.horario_inicio.split(':');
                            const endParts = asig.horario_fin.split(':');
                            const startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
                            let endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
                            let durationMin = endMin - startMin;
                            if (durationMin < 0) durationMin += 24 * 60; // Por si cruza medianoche
                            
                            const newStartParts = viewingIncidencia.hora_nueva.split(':');
                            const newStartMin = parseInt(newStartParts[0], 10) * 60 + parseInt(newStartParts[1], 10);
                            const newEndMin = newStartMin + durationMin;
                            
                            const newEndHours = Math.floor(newEndMin / 60) % 24;
                            const newEndMins = newEndMin % 60;
                            const newEndFormatted = `${newEndHours.toString().padStart(2, '0')}:${newEndMins.toString().padStart(2, '0')}`;
                            
                            return `${format12Hour(viewingIncidencia.hora_nueva)} - ${format12Hour(newEndFormatted)}`;
                          }
                          return format12Hour(viewingIncidencia.hora_nueva);
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--panel-border)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Motivo</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>{viewingIncidencia.motivo}</div>
                  </div>
                  {viewingIncidencia.descripcion && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Descripción Adicional</div>
                      <div style={{ fontWeight: 500, color: 'var(--text-h)', whiteSpace: 'pre-wrap' }}>{viewingIncidencia.descripcion}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    className="save-button"
                    style={{ background: 'transparent', color: 'var(--text-h)', border: '1px solid var(--panel-border)', boxShadow: 'none' }}
                    onClick={resetForm}
                  >
                    <X size={16} />
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Aviso para incidencias permanentes */}
                {tipoPermanenteActivo && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                    background: 'var(--primary)',
                    border: '1px solid #0d4d85',
                    borderRadius: '0.5rem', padding: '0.75rem 1rem',
                    marginBottom: '1rem', fontSize: '0.8rem', color: '#ffffff'
                  }}>
                    <Info size={15} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--accent)' }} />
                    <span>
                      <strong style={{ color: 'var(--accent)' }}>Cambio definitivo:</strong> al guardar, la asignación se actualizará inmediatamente con la nueva {formData.tipo === 'Reprogramación' ? 'fecha y hora' : 'hora'}.
                      La hora de fin se recalculará conservando la duración original.
                      Este cambio quedará registrado como historial permanente y <strong style={{ color: 'var(--accent)' }}>no podrá resolverse</strong>.
                    </span>
                  </div>
                )}

                <div className="form-grid">

                  <div className="form-field">
                    <label className="form-label" style={{ marginBottom: '0.125rem' }}>Asignación *</label>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>Selecciona la orden de trabajo o ruta programada que se va a modificar.</p>
                    <select
                      id="form-asignacion-select"
                      className="form-input"
                      value={formData.asignacion_id}
                      onChange={e => setFormData({ ...formData, asignacion_id: e.target.value })}
                    >
                      <option value="" disabled>Selecciona una asignación</option>
                      {asignaciones.filter(a => a.estatus_recorrido === 'Pendiente' || String(a.id) === String(formData.asignacion_id)).map(a => (
                        <option key={a.id} value={a.id}>
                          Asignación #{a.id} - {a.ruta_nombre || 'Ruta'} ({a.fecha_programada ? a.fecha_programada.split('T')[0] : 'Fecha'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label" style={{ marginBottom: '0.125rem' }}>Tipo *</label>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>Clasificación de la incidencia (por ejemplo: Reprogramación o Suspensión).</p>
                    <select
                      id="form-tipo-select"
                      className="form-input"
                      value={formData.tipo}
                      onChange={e => setFormData({ ...formData, tipo: e.target.value as Incidencia['tipo'] })}
                    >
                      {(['Suspensión', 'Reprogramación', 'Cambio de horario', 'Clima', 'Evento'] as Incidencia['tipo'][]).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label" style={{ marginBottom: '0.125rem' }}>Motivo *</label>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>Razón principal del cambio (por ejemplo: Camión averiado o personal insuficiente).</p>
                    <input
                      id="form-motivo-input"
                      type="text"
                      className="form-input"
                      value={formData.motivo}
                      onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                      placeholder="Ej: Camión averiado"
                    />
                  </div>



                  <div className="form-field">
                    <label className="form-label" style={{ marginBottom: '0.125rem' }}>Nueva Fecha {(formData.tipo === 'Reprogramación') && '*'}</label>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>Especifica el día en el que se ejecutará finalmente esta actividad.</p>
                    <input
                      id="form-fecha-nueva-input"
                      type="date"
                      className="form-input"
                      value={formData.fecha_nueva}
                      onChange={e => setFormData({ ...formData, fecha_nueva: e.target.value })}
                      disabled={formData.tipo !== 'Reprogramación'}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" style={{ marginBottom: '0.125rem' }}>Nueva Hora {(formData.tipo === 'Reprogramación' || formData.tipo === 'Cambio de horario') && '*'}</label>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>Establece el nuevo horario de inicio; la hora de fin se ajustará automáticamente.</p>
                    <input
                      id="form-hora-nueva-input"
                      type="time"
                      className="form-input"
                      value={formData.hora_nueva}
                      onChange={e => setFormData({ ...formData, hora_nueva: e.target.value })}
                      disabled={formData.tipo !== 'Reprogramación' && formData.tipo !== 'Cambio de horario'}
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ marginBottom: '0.125rem' }}>Descripción Adicional</label>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>Detalles específicos o notas internas relevantes sobre este cambio preventivo.</p>
                    <textarea
                      id="form-descripcion-textarea"
                      className="form-input"
                      style={{ minHeight: '80px', resize: 'vertical' }}
                      value={formData.descripcion}
                      onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Detalles adicionales..."
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
                  <button id="btn-guardar-incidencia" className="save-button" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                    {isSaving ? 'Guardando…' : (editingId ? 'Actualizar Incidencia' : 'Crear Incidencia')}
                  </button>
                  <button
                    id="btn-cancelar-incidencia"
                    className="save-button"
                    style={{ background: 'transparent', color: 'var(--text-h)', border: '1px solid var(--panel-border)', boxShadow: 'none' }}
                    onClick={resetForm}
                    disabled={isSaving}
                  >
                    <X size={16} />
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
