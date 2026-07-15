import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Loader2, Check, X } from 'lucide-react';

import type { AsignacionData, AsignacionRecord } from '../../types/routes';
import { getEffectiveSchedule } from '../../utils/schedule';

import '../../assets/styles/routes.css';
import '../../assets/styles/assignments.css';



// ─── Tipos locales ────────────────────────────────────────────────────────────

interface RouteOption {
  id: number;
  nombre: string;
  color: string;
}

interface CamionOption {
  id: number;
  numero_economico: string;
  placa: string;
  estatus_operativo: string;
}

interface ConductorOption {
  id: number;
  nombre_completo: string;
  num_licencia: string;
}

const ESTATUS_OPTIONS = ['Pendiente', 'En Progreso', 'Completado'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEstatusBadgeClass(estatus: string) {
  if (estatus === 'Pendiente') return 'estatus-badge estatus-pendiente';
  if (estatus === 'En Progreso') return 'estatus-badge estatus-en-progreso';
  if (estatus === 'Completado') return 'estatus-badge estatus-completado';
  return 'estatus-badge estatus-pendiente';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return dateStr.slice(0, 10);
}

function formatTime12h(timeStr: string) {
  if (!timeStr) return '—';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours < 10 ? `0${hours}` : hours;
  return `${strHours}:${minutes} ${ampm}`;
}

function getIncidenciaBadge(tipo?: string) {
  if (!tipo) return null;
  switch (tipo) {
    case 'Reprogramación':   return <span className="incidencia-badge incidencia-reprogramacion">🟠 Reprogramada</span>;
    case 'Cambio de horario': return <span className="incidencia-badge incidencia-horario">🟡 Horario</span>;
    case 'Suspensión':        return <span className="incidencia-badge incidencia-suspension">🔴 Suspendida</span>;
    case 'Clima':             return <span className="incidencia-badge incidencia-clima">🌧 Clima</span>;
    case 'Evento':            return <span className="incidencia-badge incidencia-evento">🚧 Evento</span>;
    default:                  return <span className="incidencia-badge">{tipo}</span>;
  }
}



// ─── Componente Principal ─────────────────────────────────────────────────────

export const AssignmentsPage: React.FC = () => {
  // ── Catálogos ──────────────────────────────────────────────────────────
  const [rutas, setRutas] = useState<RouteOption[]>([]);
  const [camiones, setCamiones] = useState<CamionOption[]>([]);
  const [conductores, setConductores] = useState<ConductorOption[]>([]);

  // ── Lista de asignaciones ──────────────────────────────────────────────
  const [asignaciones, setAsignaciones] = useState<AsignacionRecord[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // ── Edición inline ─────────────────────────────────────────────────────
  const EMPTY_FORM: AsignacionData = {
    camion_id: '',
    conductor_id: '',
    fecha_programada: '',
    horario_inicio: '',
    horario_fin: '',
    estatus_recorrido: 'Pendiente',
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<AsignacionData>(EMPTY_FORM);
  const [editRutaId, setEditRutaId] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Modal Incidencia ───────────────────────────────────────────────────
  const [viewingIncidencia, setViewingIncidencia] = useState<AsignacionRecord | null>(null);
  const navigate = useNavigate();


  // ── Fetch catálogos ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [resRutas, resCamiones, resConductores] = await Promise.all([
          fetch('/api/rutas'),
          fetch('/api/asignaciones/camiones'),
          fetch('/api/asignaciones/conductores'),
        ]);
        if (!resRutas.ok) throw new Error('Error al cargar rutas');
        if (!resCamiones.ok) throw new Error('Error al cargar camiones');
        if (!resConductores.ok) throw new Error('Error al cargar conductores');

        setRutas(await resRutas.json());
        setCamiones(await resCamiones.json());
        setConductores(await resConductores.json());
      } catch (e) {
        console.error('[AssignmentsPage] fetchCatalogs:', e);
      }
    };
    void fetchCatalogs();
  }, []);

  // ── Fetch lista de asignaciones ────────────────────────────────────────
  const fetchAsignaciones = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch('/api/asignaciones');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AsignacionRecord[] = await res.json();
      setAsignaciones(data);
    } catch (e) {
      console.error('[AssignmentsPage] fetchAsignaciones:', e);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchAsignaciones(); }, [fetchAsignaciones]);

  // ── Iniciar edición ────────────────────────────────────────────────────
  const startEdit = (a: AsignacionRecord) => {
    setEditingId(a.id);
    setEditRutaId(a.ruta_id);
    setEditForm({
      camion_id: a.camion_id,
      conductor_id: a.conductor_id,
      fecha_programada: formatDate(a.fecha_programada),
      horario_inicio: a.horario_inicio ? a.horario_inicio.slice(0, 5) : '',
      horario_fin: a.horario_fin ? a.horario_fin.slice(0, 5) : '',
      estatus_recorrido: a.estatus_recorrido,
    });
    setEditError(null);
    setTimeout(() => {
      document.getElementById('edit-asignacion-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const cancelEdit = () => { setEditingId(null); setEditError(null); };

  // ── Guardar edición ────────────────────────────────────────────────────
  const handleUpdate = async () => {
    setEditError(null);
    if (!editRutaId) return setEditError('Selecciona una ruta.');
    if (!editForm.camion_id) return setEditError('Selecciona un camión.');
    if (!editForm.conductor_id) return setEditError('Selecciona un conductor.');
    if (!editForm.fecha_programada) return setEditError('La fecha programada es obligatoria.');
    if (!editForm.horario_inicio) return setEditError('El horario de inicio es obligatorio.');
    if (!editForm.horario_fin) return setEditError('El horario de fin es obligatorio.');

    setIsSaving(true);
    try {
      const res = await fetch(`/api/asignaciones/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruta_id: Number(editRutaId),
          camion_id: Number(editForm.camion_id),
          conductor_id: Number(editForm.conductor_id),
          fecha_programada: editForm.fecha_programada,
          horario_inicio: editForm.horario_inicio,
          horario_fin: editForm.horario_fin,
          estatus_recorrido: editForm.estatus_recorrido,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).message ?? `HTTP ${res.status}`);
      await fetchAsignaciones();
      cancelEdit();
    } catch (e: any) {
      setEditError(e.message ?? 'Error al actualizar la asignación.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Helpers para campos de formulario ─────────────────────────────────
  const setEF = (patch: Partial<AsignacionData>) => setEditForm(prev => ({ ...prev, ...patch }));

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="assignments-page" style={{ padding: '1.5rem' }}>
      {/* ─── SECCIÓN: Historial de asignaciones ─── */}
      <section className="routes-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Control y Registro de Asignaciones</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '0.2rem', marginBottom: 0 }}>Asignación de rutas a unidades y conductores</p>
          </div>
          <Link to="/asignaciones/nueva" className="save-button" style={{ textDecoration: 'none' }}>
            <Plus size={16} />
            Crear Nueva Asignación
          </Link>
        </div>

        {isLoadingList ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', padding: '1rem 0' }}>
          <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} />
            Cargando asignaciones…
          </div>
        ) : asignaciones.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📋</span>
            <p>No hay asignaciones registradas.<br />Crea la primera usando el botón de arriba.</p>
          </div>
        ) : (
          <div className="assignments-table-wrapper">
            <table className="assignments-table">
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th>Camión</th>
                  <th>Conductor</th>
                  <th>Fecha y Horario</th>
                  <th>Estado</th>
                  <th>Incidencia</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {asignaciones.map(a => (
                  <tr key={a.id} className={editingId === a.id ? 'row-editing' : ''}>
                    <td>
                      <span className="ruta-pill">
                        <span className="ruta-pill-dot" style={{ background: a.ruta_color }} />
                        {a.ruta_nombre}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-h)' }}>
                        {a.numero_economico}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{a.placa}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-h)' }}>
                        {a.conductor_nombre}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text)' }}>Lic: {a.num_licencia}</div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {(() => {
                        const schedule = getEffectiveSchedule(a);
                        return (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                              {formatDate(schedule.date)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text)', marginTop: '0.15rem' }}>
                              {formatTime12h(schedule.start)} – {formatTime12h(schedule.end)}
                            </div>
                            {a.incidencia_tipo && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                                 ({a.incidencia_tipo === 'Reprogramación' ? 'Reprogramada por incidencia' : a.incidencia_tipo === 'Cambio de horario' ? 'Horario actualizado por incidencia' : a.incidencia_motivo})
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td>
                      <span className={getEstatusBadgeClass(a.estatus_recorrido)}>
                        {a.estatus_recorrido}
                      </span>
                    </td>
                    <td>
                      {a.incidencia_tipo ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                          {getIncidenciaBadge(a.incidencia_tipo)}
                          <button 
                            onClick={() => setViewingIncidencia(a)}
                            style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                          >
                            [ Ver incidencia ]
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text)', fontSize: '0.8125rem' }}>Ninguna</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {!a.incidencia_tipo ? (
                          <button
                            id={`btn-edit-asignacion-${a.id}`}
                            className="action-btn action-btn--edit"
                            onClick={() => startEdit(a)}
                            title="Editar asignación"
                          >
                            <Pencil size={14} />
                          </button>
                        ) : (
                           <span style={{ fontSize: '0.75rem', color: 'var(--text)' }}>Solo lectura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}



        {/* ─── Formulario inline de edición ─── */}
        {editingId !== null && (
          <div className="assignment-edit-card" id="edit-asignacion-form" style={{ marginTop: '1.5rem' }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
              Editando asignación #{editingId}
            </h3>
            <div className="form-grid">
              {/* Ruta */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-ruta">Ruta *</label>
                <select
                  id="edit-ruta"
                  className="form-select"
                  value={editRutaId}
                  onChange={e => setEditRutaId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Seleccione una ruta</option>
                  {rutas.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Camión */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-camion">Camión *</label>
                <select
                  id="edit-camion"
                  className="form-select"
                  value={editForm.camion_id}
                  onChange={e => setEF({ camion_id: e.target.value ? Number(e.target.value) : '' })}
                >
                  <option value="">Seleccione un camión</option>
                  {camiones.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.numero_economico} ({c.placa})
                    </option>
                  ))}
                </select>
              </div>

              {/* Conductor */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-conductor">Conductor *</label>
                <select
                  id="edit-conductor"
                  className="form-select"
                  value={editForm.conductor_id}
                  onChange={e => setEF({ conductor_id: e.target.value ? Number(e.target.value) : '' })}
                >
                  <option value="">Seleccione un conductor</option>
                  {conductores.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre_completo}</option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-fecha">Fecha programada *</label>
                <input
                  id="edit-fecha"
                  type="date"
                  className="form-input"
                  value={editForm.fecha_programada}
                  onChange={e => setEF({ fecha_programada: e.target.value })}
                />
              </div>

              {/* Horario inicio */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-horario-inicio">Horario inicio *</label>
                <input
                  id="edit-horario-inicio"
                  type="time"
                  className="form-input"
                  value={editForm.horario_inicio}
                  onChange={e => setEF({ horario_inicio: e.target.value })}
                />
              </div>

              {/* Horario fin */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-horario-fin">Horario fin *</label>
                <input
                  id="edit-horario-fin"
                  type="time"
                  className="form-input"
                  value={editForm.horario_fin}
                  onChange={e => setEF({ horario_fin: e.target.value })}
                />
              </div>

              {/* Estatus */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-estatus">Estatus del recorrido</label>
                <select
                  id="edit-estatus"
                  className="form-select"
                  value={editForm.estatus_recorrido}
                  onChange={e => setEF({ estatus_recorrido: e.target.value })}
                >
                  {ESTATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {editError && (
              <div className="validation-error-banner" role="alert" style={{ marginTop: '0.75rem' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{editError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                id="btn-actualizar-asignacion"
                className="save-button"
                onClick={handleUpdate}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                {isSaving ? 'Actualizando…' : 'Actualizar Asignación'}
              </button>
              <button
                id="btn-cancelar-edicion-asignacion"
                className="save-button"
                style={{ background: 'transparent', color: 'var(--text-h)', border: '1px solid var(--panel-border)', boxShadow: 'none' }}
                onClick={cancelEdit}
                disabled={isSaving}
              >
                <X size={16} />
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal Ver Incidencia */}
      {viewingIncidencia && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: 'var(--panel-bg)', padding: '2rem', borderRadius: '1rem',
            width: '100%', maxWidth: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-display)', color: 'var(--text-h)' }}>Resumen de Incidencia</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text)' }}>Tipo:</span>
                <strong style={{ color: 'var(--text-h)' }}>{viewingIncidencia.incidencia_tipo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text)' }}>Motivo:</span>
                <strong style={{ color: 'var(--text-h)', textAlign: 'right', maxWidth: '60%' }}>{viewingIncidencia.incidencia_motivo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text)' }}>Fecha original:</span>
                <strong style={{ color: 'var(--text-h)' }}>{formatDate(viewingIncidencia.incidencia_fecha_original || viewingIncidencia.fecha_programada)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text)' }}>Horario original:</span>
                <strong style={{ color: 'var(--text-h)' }}>
                  {formatTime12h(viewingIncidencia.incidencia_hora_inicio_original || viewingIncidencia.horario_inicio)} – {formatTime12h(viewingIncidencia.incidencia_hora_fin_original || viewingIncidencia.horario_fin)}
                </strong>
              </div>
              {viewingIncidencia.incidencia_fecha_nueva && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text)' }}>Nueva fecha:</span>
                  <strong style={{ color: 'var(--text-h)' }}>{formatDate(viewingIncidencia.incidencia_fecha_nueva)}</strong>
                </div>
              )}
              {viewingIncidencia.incidencia_hora_nueva && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text)' }}>Nuevo horario:</span>
                  <strong style={{ color: 'var(--text-h)' }}>
                    {formatTime12h(getEffectiveSchedule(viewingIncidencia).start)} – {formatTime12h(getEffectiveSchedule(viewingIncidencia).end)}
                  </strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text)' }}>Estado:</span>
                <strong style={{ color: 'var(--text-h)' }}>{viewingIncidencia.incidencia_estatus}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              <button
                className="save-button"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => navigate('/calendario/incidencias')}
              >
                Ir a Calendario → Incidencias
              </button>
              <button
                className="save-button"
                style={{ width: '100%', justifyContent: 'center', background: 'transparent', color: 'var(--text)', border: '1px solid var(--panel-border)', boxShadow: 'none' }}
                onClick={() => setViewingIncidencia(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

