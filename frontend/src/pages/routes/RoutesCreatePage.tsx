import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MapSelector } from '../../components/routes/MapSelector';
import { Loader2, Check, X } from 'lucide-react';
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
    if (!nombre.trim()) {
      toast.error('El nombre de la ruta es obligatorio.');
      document.getElementById('ruta-nombre')?.focus();
      return;
    }
    if (nombre.length > 50) {
      toast.error('El nombre no puede exceder los 50 caracteres.');
      document.getElementById('ruta-nombre')?.focus();
      return;
    }
    if (descripcion.length > 200) {
      toast.error('La descripción no puede exceder los 200 caracteres.');
      document.getElementById('ruta-descripcion')?.focus();
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
      toast.success('¡Ruta creada exitosamente!');
      // Navegar automáticamente al listado utilizando useNavigate()
      navigate('/rutas');
    } catch (e: any) {
      console.error('[RoutesCreatePage] handleCrearRuta:', e);
      toast.error(e.message ?? 'Error al crear la ruta.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="routes-page">
      {/* ─── SECCIÓN: Formulario crear ruta ─── */}
      <section className="routes-section" id="ruta-form">
        <div>
          <h2 className="section-title" style={{ margin: '0 0 0.2rem', fontFamily: 'var(--font-display)' }}>Nueva Ruta</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: '0 0 1.25rem' }}>Define el nombre, descripción y color de la ruta</p>
        </div>

        <div className="form-grid">
          {/* Nombre */}
          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="form-label" htmlFor="ruta-nombre">Nombre *</label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)' }}>{nombre.length}/50</span>
            </div>
            <input
              id="ruta-nombre"
              className="form-input"
              type="text"
              maxLength={50}
              value={nombre}
              placeholder="Ej: Barrio Centro"
              onChange={e => setNombre(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
              Asigna un nombre corto y fácil de identificar.
            </p>
          </div>

          {/* Descripción */}
          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="form-label" htmlFor="ruta-descripcion">Descripción</label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)' }}>{descripcion.length}/200</span>
            </div>
            <input
              id="ruta-descripcion"
              className="form-input"
              type="text"
              maxLength={200}
              value={descripcion}
              placeholder="Ej: Recolección domiciliaria en el Barrio Centro durante el turno matutino."
              onChange={e => setDescripcion(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
              Describe brevemente el recorrido o su propósito.
            </p>
          </div>

          {/* Color */}
          <div className="form-field">
            <label className="form-label" htmlFor="ruta-color">Color de ruta</label>
            <div className="color-picker-row">
              <input
                id="ruta-color"
                className="color-picker-input"
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                title="Selecciona un color para identificar la ruta."
              />
              <span className="color-picker-value">{color}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
              Selecciona el color que identificará la ruta en el mapa.
            </p>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="save-button"
            style={{ background: 'transparent', color: 'var(--text-h)', border: '1px solid var(--panel-border)', boxShadow: 'none', width: '180px', height: '40px' }}
            onClick={() => navigate('/rutas')}
            disabled={isCreating}
          >
            <X size={16} />
            Cancelar
          </button>
          <button
            id="btn-crear-ruta"
            className="save-button crear-ruta-btn"
            onClick={handleCrearRuta}
            disabled={isCreating}
            style={{ width: '180px', height: '40px' }}
          >
            {isCreating ? (
              <>
                <Loader2 size={20} className="spin" />
                Creando ruta…
              </>
            ) : (
              <>
                <Check size={20} />
                Crear Ruta
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
};
