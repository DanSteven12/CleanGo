import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapSelector } from '../../components/routes/MapSelector';
import type { CheckpointInput } from '../../types/routes';
import '../../assets/styles/routes.css';

export const RoutesCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // ── Formulario de ruta (en memoria hasta "Crear Ruta") ───────────────────
  const [nombre, setNombre]             = useState('');
  const [descripcion, setDescripcion]   = useState('');
  const [color, setColor]               = useState('#3498db');

  // ── Estado compartido: checkpoints (MapSelector notifica al padre vía onCheckpointsChange) ──
  const [checkpoints, setCheckpoints] = useState<CheckpointInput[]>([]);

  // ── UI feedback ──────────────────────────────────────────────────────────
  const [isCreating, setIsCreating]   = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);
  const [mapResetKey, setMapResetKey] = useState(0);

  // ── Resetear formulario de creación ─────────────────────────────────────
  const resetCrearForm = () => {
    setNombre('');
    setDescripcion('');
    setColor('#3498db');
    setCheckpoints([]);
    setFormError(null);
    // Fuerza remount de MapSelector para limpiar su estado interno de checkpoints
    setMapResetKey((k) => k + 1);
  };

  // ── CREAR RUTA — única acción transaccional ──────────────────────────────
  const handleCrearRuta = async () => {
    // Validaciones del frontend
    if (!nombre.trim()) {
      setFormError('El nombre de la ruta es obligatorio.');
      document.getElementById('ruta-nombre')?.focus();
      return;
    }

    setFormError(null);
    setIsCreating(true);

    try {
      const res = await fetch('/api/crear-ruta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruta: {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            color,
          },
          checkpoints,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((data as any).message ?? `Error HTTP ${res.status}`);
      }

      resetCrearForm();
      // Navegar automáticamente al listado utilizando useNavigate()
      navigate('/rutas');
    } catch (e: any) {
      console.error('[RoutesCreatePage] handleCrearRuta:', e);
      setFormError(e.message ?? 'Error al crear la ruta.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="routes-page">
      {/* ─── SECCIÓN: Formulario crear ruta ─── */}
      <section className="routes-section" id="ruta-form">
        <h2 className="section-title">Nueva Ruta</h2>

        <div className="form-grid">
          {/* Nombre */}
          <div className="form-field">
            <label className="form-label">Nombre *</label>
            <input
              id="ruta-nombre"
              className="form-input"
              type="text"
              value={nombre}
              placeholder="Ej. Ruta Centro"
              onChange={e => setNombre(e.target.value)}
            />
          </div>

          {/* Descripción */}
          <div className="form-field">
            <label className="form-label">Descripción</label>
            <input
              id="ruta-descripcion"
              className="form-input"
              type="text"
              value={descripcion}
              placeholder="Descripción opcional"
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          {/* Color */}
          <div className="form-field">
            <label className="form-label">Color de ruta</label>
            <div className="color-picker-row">
              <input
                id="ruta-color"
                className="color-picker-input"
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
              />
              <span className="color-picker-value">{color}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECCIÓN: Puntos de Control (mapa) ─── */}
      <section className="routes-section">
        <MapSelector
          key={mapResetKey}
          routeColor={color}
          onCheckpointsChange={setCheckpoints}
        />
      </section>

      {/* ─── SECCIÓN: Error global + Botón único "Crear Ruta" ─── */}
      <section className="routes-section" style={{ paddingTop: '0.5rem' }}>
        {formError && (
          <div className="validation-error-banner" role="alert" style={{ marginBottom: '1rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{formError}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            id="btn-crear-ruta"
            className="save-button crear-ruta-btn"
            onClick={handleCrearRuta}
            disabled={isCreating}
            style={{ flex: 1 }}
          >
            {isCreating ? (
              <>
                <svg className="save-icon spin" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Creando ruta…
              </>
            ) : (
              <>
                <svg className="save-icon" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path fillRule="evenodd" d="M16.704 5.292a1 1 0 010 1.416l-8.5 8.5a1 1 0 01-1.416 0l-4-4a1 1 0 111.416-1.416L8 12.084l7.788-7.788a1 1 0 011.416 0z" clipRule="evenodd" />
                </svg>
                Crear Ruta
              </>
            )}
          </button>
          <button
            type="button"
            className="save-button"
            style={{ background: 'var(--panel-border)', color: 'var(--text-h)' }}
            onClick={() => navigate('/rutas')}
            disabled={isCreating}
          >
            Cancelar
          </button>
        </div>
      </section>
    </div>
  );
};
