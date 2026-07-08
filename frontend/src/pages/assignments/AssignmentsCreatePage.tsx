import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, X } from 'lucide-react';
import type { AsignacionData } from '../../types/routes';
import '../../assets/styles/routes.css';
import '../../assets/styles/assignments.css';

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

export const AssignmentsCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // ── Catálogos ──────────────────────────────────────────────────────────
  const [rutas,      setRutas]      = useState<RouteOption[]>([]);
  const [camiones,   setCamiones]   = useState<CamionOption[]>([]);
  const [conductores,setConductores]= useState<ConductorOption[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);

  // ── Formulario de creación ─────────────────────────────────────────────
  const EMPTY_FORM: AsignacionData = {
    camion_id: '',
    conductor_id: '',
    fecha_programada: '',
    horario_inicio: '',
    horario_fin: '',
    estatus_recorrido: 'Pendiente',
  };
  const [form, setForm]             = useState<AsignacionData>(EMPTY_FORM);
  const [formRutaId, setFormRutaId] = useState<number | ''>('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Fetch catálogos ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCatalogs = async () => {
      setIsLoadingCatalogs(true);
      try {
        const [resRutas, resCamiones, resConductores] = await Promise.all([
          fetch('/api/rutas'),
          fetch('/api/asignaciones/camiones'),
          fetch('/api/asignaciones/conductores'),
        ]);
        if (!resRutas.ok)       throw new Error('Error al cargar rutas');
        if (!resCamiones.ok)    throw new Error('Error al cargar camiones');
        if (!resConductores.ok) throw new Error('Error al cargar conductores');

        setRutas(await resRutas.json());
        setCamiones(await resCamiones.json());
        setConductores(await resConductores.json());
      } catch (e) {
        console.error('[AssignmentsCreatePage] fetchCatalogs:', e);
      } finally {
        setIsLoadingCatalogs(false);
      }
    };
    void fetchCatalogs();
  }, []);

  // ── Crear asignación ───────────────────────────────────────────────────
  const handleCrear = async () => {
    setCreateError(null);
    if (!formRutaId)              return setCreateError('Selecciona una ruta.');
    if (!form.camion_id)          return setCreateError('Selecciona un camión.');
    if (!form.conductor_id)       return setCreateError('Selecciona un conductor.');
    if (!form.fecha_programada)   return setCreateError('La fecha programada es obligatoria.');
    if (!form.horario_inicio)     return setCreateError('El horario de inicio es obligatorio.');
    if (!form.horario_fin)        return setCreateError('El horario de fin es obligatorio.');

    setIsCreating(true);
    try {
      const res = await fetch('/api/asignaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruta_id:          Number(formRutaId),
          camion_id:        Number(form.camion_id),
          conductor_id:     Number(form.conductor_id),
          fecha_programada: form.fecha_programada,
          horario_inicio:   form.horario_inicio,
          horario_fin:      form.horario_fin,
          estatus_recorrido: form.estatus_recorrido,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).message ?? `HTTP ${res.status}`);

      setForm(EMPTY_FORM);
      setFormRutaId('');
      // Navegar automáticamente al listado utilizando useNavigate()
      navigate('/asignaciones');
    } catch (e: any) {
      setCreateError(e.message ?? 'Error al crear la asignación.');
    } finally {
      setIsCreating(false);
    }
  };

  const setF = (patch: Partial<AsignacionData>) => setForm(prev => ({ ...prev, ...patch }));

  return (
    <div className="assignments-page" style={{ padding: '1.5rem' }}>
      {/* ─── SECCIÓN: Formulario nueva asignación ─── */}
      <section className="routes-section" id="asignacion-form">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Nueva Asignación</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '0.2rem', marginBottom: 0 }}>Completa los datos para registrar una nueva asignación</p>
          </div>
        </div>

        {isLoadingCatalogs ? (
          <p style={{ color: 'var(--text)', fontSize: '0.875rem' }}>Cargando opciones…</p>
        ) : (
          <div className="form-grid">
            {/* Ruta */}
            <div className="form-field">
              <label className="form-label" htmlFor="new-ruta">Ruta *</label>
              <select
                id="new-ruta"
                className="form-select"
                value={formRutaId}
                onChange={e => setFormRutaId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seleccione una ruta</option>
                {rutas.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            {/* Camión */}
            <div className="form-field">
              <label className="form-label" htmlFor="new-camion">Camión *</label>
              <select
                id="new-camion"
                className="form-select"
                value={form.camion_id}
                onChange={e => setF({ camion_id: e.target.value ? Number(e.target.value) : '' })}
              >
                <option value="">Seleccione un camión</option>
                {camiones.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.numero_economico} ({c.placa}) — {c.estatus_operativo}
                  </option>
                ))}
              </select>
            </div>

            {/* Conductor */}
            <div className="form-field">
              <label className="form-label" htmlFor="new-conductor">Conductor *</label>
              <select
                id="new-conductor"
                className="form-select"
                value={form.conductor_id}
                onChange={e => setF({ conductor_id: e.target.value ? Number(e.target.value) : '' })}
              >
                <option value="">Seleccione un conductor</option>
                {conductores.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nombre_completo} (Lic: {d.num_licencia})
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha programada */}
            <div className="form-field">
              <label className="form-label" htmlFor="new-fecha">Fecha programada *</label>
              <input
                id="new-fecha"
                type="date"
                className="form-input"
                value={form.fecha_programada}
                onChange={e => setF({ fecha_programada: e.target.value })}
              />
            </div>

            {/* Horario inicio */}
            <div className="form-field">
              <label className="form-label" htmlFor="new-horario-inicio">Horario inicio *</label>
              <input
                id="new-horario-inicio"
                type="time"
                className="form-input"
                value={form.horario_inicio}
                onChange={e => setF({ horario_inicio: e.target.value })}
              />
            </div>

            {/* Horario fin */}
            <div className="form-field">
              <label className="form-label" htmlFor="new-horario-fin">Horario fin *</label>
              <input
                id="new-horario-fin"
                type="time"
                className="form-input"
                value={form.horario_fin}
                onChange={e => setF({ horario_fin: e.target.value })}
              />
            </div>

            {/* Estatus del recorrido */}
            <div className="form-field">
              <label className="form-label" htmlFor="new-estatus">Estatus del recorrido</label>
              <select
                id="new-estatus"
                className="form-select"
                value={form.estatus_recorrido}
                onChange={e => setF({ estatus_recorrido: e.target.value })}
              >
                {ESTATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {createError && (
          <div className="validation-error-banner" role="alert" style={{ marginTop: '0.75rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{createError}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            id="btn-crear-asignacion"
            className="save-button crear-ruta-btn"
            onClick={handleCrear}
            disabled={isCreating || isLoadingCatalogs}
            style={{ flex: 1 }}
          >
            {isCreating ? (
              <>
                <Loader2 size={18} className="spin" />
                Creando…
              </>
            ) : (
              <>
                <Check size={18} />
                Crear Asignación
              </>
            )}
          </button>
          <button
            type="button"
            className="save-button"
            style={{ background: 'transparent', color: 'var(--text-h)', border: '1px solid var(--panel-border)', boxShadow: 'none' }}
            onClick={() => navigate('/asignaciones')}
            disabled={isCreating}
          >
            <X size={16} />
            Cancelar
          </button>
        </div>
      </section>
    </div>
  );
};
