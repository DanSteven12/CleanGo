import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Loader2, Check, X, Lock, CheckCircle2, AlertCircle, MapPin, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import '../../assets/styles/routes.css';
import { Header } from '../../components/layout/Header';
import { PageSectionHeader } from '../../components/layout/PageSectionHeader';
import { MapSelector } from '../../components/routes/MapSelector';
import type { CheckpointInput } from '../../types/routes';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface RouteOption {
  id: number;
  nombre: string;
  color: string;
  descripcion?: string;
  editable?: boolean;
  notEditableReason?: string;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export const RoutesPage: React.FC = () => {
  // ── Lista de rutas guardadas ─────────────────────────────────────────────
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);

  // ── Edición de rutas existentes ──────────────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editColor, setEditColor] = useState('#1763A6');
  const [editError, setEditError] = useState<string | null>(null);
  const [editCheckpoints, setEditCheckpoints] = useState<CheckpointInput[]>([]);
  const [initialEditCheckpoints, setInitialEditCheckpoints] = useState<CheckpointInput[]>([]);
  const [isLoadingCheckpoints, setIsLoadingCheckpoints] = useState(false);

  // ── Modal de confirmación al salir con cambios sin guardar ───────────────
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // ── Fetch rutas ──────────────────────────────────────────────────────────
  const fetchRoutes = useCallback(async () => {
    setIsLoadingRoutes(true);
    try {
      const res = await fetch('/api/rutas');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RouteOption[] = await res.json();
      setRoutes(data.map(r => ({ ...r, color: r.color || '#1763A6' })));
    } catch (e) {
      console.error('[RoutesPage] fetchRoutes:', e);
    } finally {
      setIsLoadingRoutes(false);
    }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  // ── Detección de cambios sin guardar ─────────────────────────────────────
  const hasUnsavedChanges = useMemo(() => {
    if (!editingId) return false;
    const initialRoute = routes.find(r => r.id === editingId);
    if (!initialRoute) return false;

    const nameChanged = editNombre.trim() !== initialRoute.nombre;
    const descChanged = (editDescripcion.trim() || undefined) !== (initialRoute.descripcion || undefined);
    const colorChanged = editColor !== initialRoute.color;
    const checkpointsChanged = JSON.stringify(editCheckpoints) !== JSON.stringify(initialEditCheckpoints);

    return nameChanged || descChanged || colorChanged || checkpointsChanged;
  }, [editingId, routes, editNombre, editDescripcion, editColor, editCheckpoints, initialEditCheckpoints]);

  // Alerta nativa antes de recargar o cerrar pestaña si hay cambios pendientes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ── Cancelar edición (con confirmación si hay cambios) ────────────────────
  const executeCancelEdit = () => {
    setEditingId(null);
    setEditError(null);
    setEditCheckpoints([]);
    setInitialEditCheckpoints([]);
  };

  const requestCancelEdit = () => {
    if (hasUnsavedChanges) {
      setPendingAction(() => executeCancelEdit);
      setShowExitConfirm(true);
    } else {
      executeCancelEdit();
    }
  };

  // ── Cargar ruta en formulario de edición ─────────────────────────────────
  const startEdit = async (r: RouteOption) => {
    if (r.editable === false) return;

    const performStartEdit = async () => {
      setEditingId(r.id);
      setEditNombre(r.nombre);
      setEditDescripcion(r.descripcion ?? '');
      setEditColor(r.color);
      setEditError(null);
      setEditCheckpoints([]);
      setInitialEditCheckpoints([]);
      setIsLoadingCheckpoints(true);

      setTimeout(() => {
        document.getElementById('edit-ruta-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);

      try {
        const res = await fetch(`/api/routes/${r.id}/checkpoints`);
        if (res.ok) {
          const pts = await res.json();
          setEditCheckpoints(pts);
          setInitialEditCheckpoints(pts);
        }
      } catch (e) {
        console.error('[RoutesPage] startEdit error loading checkpoints:', e);
      } finally {
        setIsLoadingCheckpoints(false);
      }
    };

    if (hasUnsavedChanges) {
      setPendingAction(() => performStartEdit);
      setShowExitConfirm(true);
    } else {
      await performStartEdit();
    }
  };

  // ── Guardar edición de ruta existente ────────────────────────────────────
  const handleUpdateRuta = async () => {
    if (!editNombre.trim()) {
      setEditError('El nombre de la ruta es obligatorio.');
      document.getElementById('edit-ruta-nombre')?.focus();
      return;
    }
    if (editNombre.length > 50) {
      setEditError('El nombre no puede exceder los 50 caracteres.');
      document.getElementById('edit-ruta-nombre')?.focus();
      return;
    }
    if (editDescripcion.length > 200) {
      setEditError('La descripción no puede exceder los 200 caracteres.');
      document.getElementById('edit-ruta-descripcion')?.focus();
      return;
    }
    if (editCheckpoints.length < 2) {
      setEditError('Debes incluir al menos dos puntos de control para guardar la ruta.');
      return;
    }
    setEditError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/rutas/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editNombre.trim(),
          descripcion: editDescripcion.trim() || undefined,
          color: editColor,
          checkpoints: editCheckpoints,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? `HTTP ${res.status}`);
      }
      await fetchRoutes();
      toast.success('✓ Ruta actualizada correctamente.', { duration: 3000 });
      executeCancelEdit();
    } catch (e: any) {
      setEditError(e.message ?? 'Error al actualizar la ruta.');
      toast.error(e.message ?? 'Error al actualizar la ruta.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      <Header
        subtitle="Gestiona las rutas de recolección del sistema"
        title="Administración de Rutas"
      />
      <PageSectionHeader
        eyebrow="OPERACIÓN"
        title="Rutas y checkpoints"
        description="Planeación de recorridos, asignación de unidades y verificación de paradas."
      />
    <div className="routes-page">
      {/* ─── SECCIÓN: Lista de rutas existentes ─── */}
      <section className="routes-section">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <Link to="/rutas/nueva" className="save-button" style={{ textDecoration: 'none' }}>
            <Plus size={16} />
            Crear Nueva Ruta
          </Link>
        </div>

        <AnimatePresence mode="wait">
        {isLoadingRoutes ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', padding: '1rem 0' }}>
            <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} />
            Cargando rutas…
          </motion.div>
        ) : routes.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2.5rem 1rem', color: 'var(--text)', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={22} style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: '0 0 0.25rem' }}>No hay rutas registradas</p>
              <p style={{ fontSize: '0.8125rem', margin: 0 }}>Crea la primera usando el botón de arriba.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="routes-table-wrapper" style={{ width: '100%' }}>
            <table className="routes-table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>Color</th>
                  <th style={{ width: '30%' }}>Nombre</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Estado</th>
                  <th style={{ width: 'auto' }}>Descripción</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <motion.tbody
                initial="hidden" animate="show"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
              >
                <AnimatePresence>
                {routes.map(r => {
                  const isEditable = r.editable !== false;
                  return (
                    <motion.tr 
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      className={editingId === r.id ? 'row-editing' : ''}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className="route-color-dot"
                          style={{ background: r.color, display: 'inline-block' }}
                        />
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--text-h)' }}>{r.nombre}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`estado-badge ${isEditable ? 'estado-activa' : 'estado-suspendida'}`}
                          title={!isEditable ? r.notEditableReason : 'Ruta disponible para edición'}
                        >
                          {isEditable ? (
                            <>
                              <CheckCircle2 size={12} />
                              Editable
                            </>
                          ) : (
                            <>
                              <Lock size={12} />
                              No editable
                            </>
                          )}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text)' }}>
                        {r.descripcion ? r.descripcion : <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Sin descripción</span>}
                        {!isEditable && r.notEditableReason && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9ca3af)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} style={{ flexShrink: 0 }} />
                            <span>{r.notEditableReason}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            id={`btn-edit-ruta-${r.id}`}
                            className="action-btn action-btn--edit"
                            onClick={() => isEditable && startEdit(r)}
                            title={isEditable ? "Editar ruta" : r.notEditableReason}
                            disabled={!isEditable}
                            style={!isEditable ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </motion.div>
        )}
        </AnimatePresence>

        {editingId !== null && (
          <div className="routes-section" id="edit-ruta-form" style={{ width: '100%', marginTop: '1.25rem', background: 'var(--panel-bg)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--panel-border)' }}>
              <div>
                <h3 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                  Editando Ruta: {editNombre}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)' }}>ID de Ruta: #{editingId}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="estado-badge estado-activa" style={{ padding: '0.3rem 0.75rem' }}>
                  <CheckCircle2 size={13} />
                  Editable
                </span>
                <span style={{ fontSize: '0.8rem', background: 'var(--bg-app, #f3f4f6)', padding: '0.3rem 0.65rem', borderRadius: '6px', color: 'var(--text-h, #1f2937)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', border: '1px solid var(--panel-border)' }}>
                  <MapPin size={13} style={{ color: editColor }} />
                  {editCheckpoints.length} Checkpoints
                </span>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label className="form-label" htmlFor="edit-ruta-nombre">Nombre *</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)' }}>{editNombre.length}/50</span>
                </div>
                <input
                  id="edit-ruta-nombre"
                  className="form-input"
                  type="text"
                  maxLength={50}
                  value={editNombre}
                  placeholder="Ej: Barrio Centro"
                  onChange={e => setEditNombre(e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
                  Asigna un nombre corto y fácil de identificar.
                </p>
              </div>
              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label className="form-label" htmlFor="edit-ruta-descripcion">Descripción</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)' }}>{editDescripcion.length}/200</span>
                </div>
                <input
                  id="edit-ruta-descripcion"
                  className="form-input"
                  type="text"
                  maxLength={200}
                  value={editDescripcion}
                  placeholder="Ej: Recolección domiciliaria en el Barrio Centro durante el turno matutino."
                  onChange={e => setEditDescripcion(e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
                  Describe brevemente el recorrido o su propósito.
                </p>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="edit-ruta-color">Color de ruta</label>
                <div className="color-picker-row">
                  <input
                    id="edit-ruta-color"
                    className="color-picker-input"
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    title="Selecciona un color para identificar la ruta."
                  />
                  <span className="color-picker-value">{editColor}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
                  Selecciona el color que identificará la ruta en el mapa.
                </p>
              </div>
            </div>

            {/* ── MAPA DE EDICIÓN DE CHECKPOINTS ── */}
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ fontSize: '1rem', color: 'var(--text-h)', marginBottom: '1rem', fontWeight: 600 }}>Puntos de Control</h4>
              {isLoadingCheckpoints ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.875rem' }}>
                  <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} />
                  Cargando puntos de la ruta…
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--panel-border)' }}>
                  <MapSelector
                    routeColor={editColor}
                    onCheckpointsChange={setEditCheckpoints}
                    initialCheckpoints={initialEditCheckpoints}
                    mode="edit"
                  />
                </div>
              )}
            </div>

            {editError && (
              <div className="validation-error-banner" role="alert" style={{ marginTop: '0.75rem' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{editError}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                id="btn-actualizar-ruta"
                className="save-button"
                onClick={handleUpdateRuta}
                disabled={isSaving || !editNombre.trim() || editCheckpoints.length < 2}
                title={
                  !editNombre.trim()
                    ? "Ingresa un nombre válido"
                    : editCheckpoints.length < 2
                    ? "Debes incluir al menos 2 puntos de control"
                    : "Guardar cambios"
                }
              >
                {isSaving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                {isSaving ? 'Actualizando…' : 'Guardar cambios'}
              </button>
              <button
                id="btn-cancelar-edicion"
                className="save-button"
                style={{ background: 'transparent', color: 'var(--text-h)', border: '1px solid var(--panel-border)', boxShadow: 'none' }}
                onClick={requestCancelEdit}
                disabled={isSaving}
              >
                <X size={16} />
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── MODAL CONFIRMACIÓN CAMBIOS SIN GUARDAR ── */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem'
        }}>
          <div style={{
            background: 'var(--panel-bg, #ffffff)', borderRadius: '0.75rem', padding: '1.5rem',
            maxWidth: '440px', width: '100%', border: '1px solid var(--panel-border, #e2e8f0)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-h, #0f172a)' }}>
              <div style={{ background: 'oklch(0.85 0.12 85 / 0.2)', padding: '0.5rem', borderRadius: '50%', color: '#d97706' }}>
                <ShieldAlert size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display, sans-serif)' }}>
                ¿Salir sin guardar los cambios?
              </h3>
            </div>
            
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: 'var(--text, #475569)', lineHeight: 1.5 }}>
              Tienes modificaciones en el formulario o en los puntos de control de la ruta que aún no has guardado. Si sales ahora, estos cambios se perderán.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="save-button"
                style={{ background: 'transparent', color: 'var(--text-h, #0f172a)', border: '1px solid var(--panel-border, #cbd5e1)', boxShadow: 'none' }}
                onClick={() => {
                  setShowExitConfirm(false);
                  setPendingAction(null);
                }}
              >
                Continuar editando
              </button>
              <button
                className="save-button"
                style={{ background: '#ef4444', color: '#ffffff', border: 'none', boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)' }}
                onClick={() => {
                  setShowExitConfirm(false);
                  if (pendingAction) pendingAction();
                  setPendingAction(null);
                }}
              >
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
