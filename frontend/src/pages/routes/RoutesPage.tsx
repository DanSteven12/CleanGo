import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { CheckpointInput } from '../../types/routes';
import '../../assets/styles/routes.css';



// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface RouteOption {
  id: number;
  nombre: string;
  color: string;
  descripcion?: string;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export const RoutesPage: React.FC = () => {
  // ── Lista de rutas guardadas ─────────────────────────────────────────────
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);

  // ── Edición de rutas existentes ──────────────────────────────────────────
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [isDeleting, setIsDeleting]   = useState<number | null>(null);
  const [isSaving, setIsSaving]       = useState(false);
  const [editNombre, setEditNombre]         = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editColor, setEditColor]           = useState('#3498db');
  const [editError, setEditError]     = useState<string | null>(null);

  // ── Fetch rutas ──────────────────────────────────────────────────────────
  const fetchRoutes = useCallback(async () => {
    setIsLoadingRoutes(true);
    try {
      const res = await fetch('/api/rutas');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RouteOption[] = await res.json();
      setRoutes(data.map(r => ({ ...r, color: r.color || '#3498db' })));
    } catch (e) {
      console.error('[RoutesPage] fetchRoutes:', e);
    } finally {
      setIsLoadingRoutes(false);
    }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  // ── Cancelar edición ─────────────────────────────────────────────────────
  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  // ── Cargar ruta en formulario de edición ─────────────────────────────────
  const startEdit = (r: RouteOption) => {
    setEditingId(r.id);
    setEditNombre(r.nombre);
    setEditDescripcion(r.descripcion ?? '');
    setEditColor(r.color);
    setEditError(null);
    document.getElementById('edit-ruta-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Guardar edición de ruta existente ────────────────────────────────────
  const handleUpdateRuta = async () => {
    if (!editNombre.trim()) {
      setEditError('El nombre de la ruta es obligatorio.');
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
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? `HTTP ${res.status}`);
      }
      await fetchRoutes();
      cancelEdit();
    } catch (e: any) {
      setEditError(e.message ?? 'Error al actualizar la ruta.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Eliminar ruta ────────────────────────────────────────────────────────
  const handleDeleteRuta = async (id: number) => {
    if (!window.confirm('¿Eliminar esta ruta y todos sus checkpoints?')) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/rutas/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? `HTTP ${res.status}`);
      }
      await fetchRoutes();
      if (editingId === id) cancelEdit();
    } catch (e: any) {
      alert(`Error al eliminar: ${e.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="routes-page">
      {/* ─── SECCIÓN: Lista de rutas existentes ─── */}
      <section className="routes-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Administración de Rutas de Recolección</h2>
          <Link to="/rutas/nueva" className="save-button" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.1rem', marginRight: '0.25rem' }}>+</span> Crear Nueva Ruta
          </Link>
        </div>

        {isLoadingRoutes ? (
          <p style={{ color: 'var(--text)', fontSize: '0.875rem' }}>Cargando rutas…</p>
        ) : routes.length === 0 ? (
          <p style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
            No hay rutas registradas. Crea la primera arriba.
          </p>
        ) : (
          <div className="routes-table-wrapper">
            <table className="routes-table">
              <thead>
                <tr>
                  <th>Color</th>
                  <th>Nombre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id} className={editingId === r.id ? 'row-editing' : ''}>
                    <td>
                      <span
                        className="route-color-dot"
                        style={{ background: r.color, display: 'inline-block' }}
                      />
                    </td>
                    <td>{r.nombre}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          id={`btn-edit-ruta-${r.id}`}
                          className="action-btn action-btn--edit"
                          onClick={() => startEdit(r)}
                          title="Editar ruta"
                        >
                          ✏️
                        </button>
                        <button
                          id={`btn-delete-ruta-${r.id}`}
                          className="action-btn action-btn--delete"
                          onClick={() => handleDeleteRuta(r.id)}
                          disabled={isDeleting === r.id}
                          title="Eliminar ruta"
                        >
                          {isDeleting === r.id ? '…' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Formulario inline de edición */}
        {editingId !== null && (
          <div className="routes-section" id="edit-ruta-form" style={{ marginTop: '1.25rem', background: 'var(--panel-bg)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
              Editando: {editNombre}
            </h3>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Nombre *</label>
                <input className="form-input" type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label">Descripción</label>
                <input className="form-input" type="text" value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label">Color de ruta</label>
                <div className="color-picker-row">
                  <input className="color-picker-input" type="color" value={editColor} onChange={e => setEditColor(e.target.value)} />
                  <span className="color-picker-value">{editColor}</span>
                </div>
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
              <button id="btn-actualizar-ruta" className="save-button" onClick={handleUpdateRuta} disabled={isSaving}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M16.704 5.292a1 1 0 010 1.416l-8.5 8.5a1 1 0 01-1.416 0l-4-4a1 1 0 111.416-1.416L8 12.084l7.788-7.788a1 1 0 011.416 0z" clipRule="evenodd" />
                </svg>
                {isSaving ? 'Actualizando…' : 'Actualizar Ruta'}
              </button>
              <button
                id="btn-cancelar-edicion"
                className="save-button"
                style={{ background: 'var(--panel-border)', color: 'var(--text-h)' }}
                onClick={cancelEdit}
                disabled={isSaving}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
