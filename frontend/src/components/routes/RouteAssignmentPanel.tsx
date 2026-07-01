import React, { useEffect, useState } from 'react';
import '../../assets/styles/routes.css';
import type { AsignacionData } from '../../types/routes';

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
  estado_empleado: string;
}

export type { AsignacionData };

interface RouteAssignmentPanelProps {
  data: AsignacionData;
  onChange: (data: AsignacionData) => void;
}

export const RouteAssignmentPanel: React.FC<RouteAssignmentPanelProps> = ({ data, onChange }) => {
  const [camiones, setCamiones] = useState<CamionOption[]>([]);
  const [conductores, setConductores] = useState<ConductorOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch camiones y conductores al montar
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const [resCamiones, resConductores] = await Promise.all([
          fetch('/api/asignaciones/camiones'),
          fetch('/api/asignaciones/conductores'),
        ]);

        if (!resCamiones.ok) throw new Error(`Error ${resCamiones.status} al cargar camiones`);
        if (!resConductores.ok) throw new Error(`Error ${resConductores.status} al cargar conductores`);

        const dataCamiones: CamionOption[] = await resCamiones.json();
        const dataConductores: ConductorOption[] = await resConductores.json();

        setCamiones(dataCamiones);
        setConductores(dataConductores);
      } catch (err: any) {
        console.error('[RouteAssignmentPanel] fetchData error:', err);
        setErrorMsg(err.message ?? 'Error al obtener opciones para la asignación.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  const set = (patch: Partial<AsignacionData>) => onChange({ ...data, ...patch });

  return (
    <div className="assignment-panel">
      <h3 className="assignment-panel-title">Asignación de Ruta</h3>

      {isLoading ? (
        <p className="loading-text" style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
          Cargando opciones…
        </p>
      ) : (
        <div className="assignment-form-fields">
          {errorMsg && (
            <div className="validation-error-banner" role="alert" style={{ marginBottom: '0.75rem' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Camión */}
          <div className="form-field">
            <label className="form-label" htmlFor="assign-camion">Camión *</label>
            <select
              id="assign-camion"
              className="form-select"
              value={data.camion_id}
              onChange={(e) => set({ camion_id: e.target.value ? Number(e.target.value) : '' })}
            >
              <option value="">Seleccione un camión</option>
              {camiones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero_economico} ({c.placa}) - {c.estatus_operativo}
                </option>
              ))}
            </select>
          </div>

          {/* Conductor */}
          <div className="form-field">
            <label className="form-label" htmlFor="assign-conductor">Conductor *</label>
            <select
              id="assign-conductor"
              className="form-select"
              value={data.conductor_id}
              onChange={(e) => set({ conductor_id: e.target.value ? Number(e.target.value) : '' })}
            >
              <option value="">Seleccione un conductor</option>
              {conductores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre_completo} (Lic: {d.num_licencia})
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Programada */}
          <div className="form-field">
            <label className="form-label" htmlFor="assign-fecha">Fecha programada *</label>
            <input
              id="assign-fecha"
              type="date"
              className="form-input"
              value={data.fecha_programada}
              onChange={(e) => set({ fecha_programada: e.target.value })}
            />
          </div>

          {/* Estatus del recorrido */}
          <div className="form-field">
            <label className="form-label" htmlFor="assign-estado">Estatus del recorrido</label>
            <select
              id="assign-estado"
              className="form-select"
              value={data.estatus_recorrido}
              onChange={(e) => set({ estatus_recorrido: e.target.value })}
            >
              <option value="Pendiente">Pendiente</option>
              <option value="En Progreso">En progreso</option>
              <option value="Completado">Completado</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
