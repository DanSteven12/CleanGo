// frontend/src/pages/historial/HistorialRecorridosPage.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type {
  CheckpointDetalle,
  HistorialPaginado,
  RecorridoCompletado,
  RecorridoDetalle,
} from '../../types/routes';
import '../../assets/styles/assignments.css';
import '../../assets/styles/historial.css';

// ─── Interfaces locales ───────────────────────────────────────────────────────

interface FiltrosCatalogo {
  camiones:   { id: number; numero_economico: string; placa: string }[];
  conductores: { id: number; nombre_completo: string }[];
  rutas:       { id: number; nombre: string; color: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTimeOnly(dt: string | null): string {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(dt: string | null): string {
  if (!dt) return '—';
  // fecha_programada viene como DATE (YYYY-MM-DD) — parsear sin zona horaria
  const raw = String(dt).slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return raw;
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

function fmtDuracion(minutos: number | null): string {
  if (minutos === null || minutos === undefined) return '—';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getDesviacion(min: number | null): { label: string; cls: string } {
  if (min === null || min === undefined) return { label: '—', cls: '' };
  if (min <= 0) return { label: `${Math.abs(min)} min antes`, cls: 'historial-timeline-desviacion--ok' };
  if (min <= 5)  return { label: `+${min} min`,               cls: 'historial-timeline-desviacion--tarde' };
  return           { label: `+${min} min`,                    cls: 'historial-timeline-desviacion--muy-tarde' };
}

// ─── Sub-componente: Panel de detalle ─────────────────────────────────────────

interface DetailPanelProps {
  detalle: RecorridoDetalle;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ detalle, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  }, [detalle.id]);

  return (
    <div className="historial-detail-panel" ref={ref} id={`detalle-recorrido-${detalle.id}`}>
      {/* ─── Cabecera ─── */}
      <div className="historial-detail-header">
        <div className="historial-detail-title">
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: detalle.ruta_color, display: 'inline-block', flexShrink: 0 }} />
          Detalle del Recorrido #{detalle.id}
          <span className="estatus-badge estatus-completado">{detalle.estado}</span>
        </div>
        <button
          id={`btn-cerrar-detalle-${detalle.id}`}
          className="historial-detail-close"
          onClick={onClose}
          title="Cerrar detalle"
          aria-label="Cerrar detalle"
        >✕</button>
      </div>

      {/* ─── Info cards ─── */}
      <div className="historial-detail-cards">
        <div className="historial-info-card">
          <span className="historial-info-card__label">Ruta</span>
          <span className="historial-info-card__value">{detalle.ruta_nombre}</span>
        </div>
        <div className="historial-info-card">
          <span className="historial-info-card__label">Unidad</span>
          <span className="historial-info-card__value">{detalle.numero_economico}</span>
          <span className="historial-info-card__sub">{detalle.placa}</span>
        </div>
        <div className="historial-info-card">
          <span className="historial-info-card__label">Conductor</span>
          <span className="historial-info-card__value">{detalle.conductor_nombre}</span>
          <span className="historial-info-card__sub">Lic: {detalle.num_licencia}</span>
        </div>
        <div className="historial-info-card">
          <span className="historial-info-card__label">Fecha Programada</span>
          <span className="historial-info-card__value">{fmtDate(detalle.fecha_programada)}</span>
          <span className="historial-info-card__sub">{detalle.horario_inicio?.slice(0, 5)} – {detalle.horario_fin?.slice(0, 5)}</span>
        </div>
        <div className="historial-info-card">
          <span className="historial-info-card__label">Inicio Real</span>
          <span className="historial-info-card__value">{fmtTimeOnly(detalle.hora_inicio)}</span>
        </div>
        <div className="historial-info-card">
          <span className="historial-info-card__label">Fin Real</span>
          <span className="historial-info-card__value">{fmtTimeOnly(detalle.hora_fin)}</span>
        </div>
        <div className="historial-info-card">
          <span className="historial-info-card__label">Duración Total</span>
          <span className="historial-info-card__value" style={{ color: 'var(--accent)' }}>
            {fmtDuracion(detalle.duracion_minutos)}
          </span>
        </div>
      </div>

      {/* ─── Timeline de checkpoints ─── */}
      <div className="historial-checkpoints-section">
        <p className="historial-checkpoints-title">
          Checkpoints — {detalle.checkpoints.length} punto{detalle.checkpoints.length !== 1 ? 's' : ''} de control
        </p>
        {detalle.checkpoints.length === 0 ? (
          <div className="historial-state-box" style={{ padding: '1.5rem' }}>
            <span className="historial-state-icon">📍</span>
            <span>No se encontraron checkpoints para este recorrido.</span>
          </div>
        ) : (
          <div className="historial-timeline">
            {detalle.checkpoints.map((cp: CheckpointDetalle) => {
              const dotCls =
                cp.estado === 'Completado' ? 'historial-timeline-dot historial-timeline-dot--completado'
                : cp.estado === 'Omitido'  ? 'historial-timeline-dot historial-timeline-dot--omitido'
                :                            'historial-timeline-dot';

              const { label: devLabel, cls: devCls } = getDesviacion(cp.desviacion_minutos);

              return (
                <div className="historial-timeline-item" key={cp.id} id={`cp-item-${cp.id}`}>
                  <div className={dotCls}>{cp.orden}</div>
                  <div className="historial-timeline-body">
                    <div>
                      <div className="historial-timeline-name">{cp.nombre}</div>
                      <div className="historial-timeline-times">
                        Estimado: {fmtTimeOnly(cp.hora_estimada)} · Llegada: {fmtTimeOnly(cp.hora_llegada)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      {cp.estado !== 'Pendiente' && devCls && (
                        <span className={`historial-timeline-desviacion ${devCls}`}>{devLabel}</span>
                      )}
                      <span
                        className={
                          cp.estado === 'Completado' ? 'estatus-badge estatus-completado'
                          : cp.estado === 'Omitido'  ? 'estatus-badge'
                          :                            'estatus-badge estatus-pendiente'
                        }
                        style={cp.estado === 'Omitido' ? {
                          background: 'oklch(0.58 0.22 25 / 0.1)',
                          color: 'oklch(0.45 0.2 25)',
                          border: '1px solid oklch(0.58 0.22 25 / 0.3)',
                        } : undefined}
                      >{cp.estado}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const HistorialRecorridosPage: React.FC = () => {

  // ── Catálogos ────────────────────────────────────────────────────────────
  const [catalogo, setCatalogo] = useState<FiltrosCatalogo>({ camiones: [], conductores: [], rutas: [] });

  // ── Estado de filtros ────────────────────────────────────────────────────
  const [fechaInicio,  setFechaInicio]  = useState('');
  const [fechaFin,     setFechaFin]     = useState('');
  const [camionId,     setCamionId]     = useState('');
  const [conductorId,  setConductorId]  = useState('');
  const [rutaId,       setRutaId]       = useState('');

  // ── Estado de resultados ─────────────────────────────────────────────────
  const [recorridos,   setRecorridos]   = useState<RecorridoCompletado[]>([]);
  const [total,        setTotal]        = useState(0);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [hasBuscado,   setHasBuscado]   = useState(false);

  // ── Estado del detalle ───────────────────────────────────────────────────
  const [selectedId,        setSelectedId]        = useState<number | null>(null);
  const [detalle,           setDetalle]           = useState<RecorridoDetalle | null>(null);
  const [isLoadingDetalle,  setIsLoadingDetalle]  = useState(false);
  const [errorDetalle,      setErrorDetalle]      = useState<string | null>(null);

  // ── Cargar catálogos al montar ───────────────────────────────────────────
  useEffect(() => {
    const fetchFiltros = async () => {
      try {
        const res = await fetch('/api/recorridos/historial/filtros');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: FiltrosCatalogo = await res.json();
        setCatalogo(data);
      } catch (e) {
        console.error('[HistorialPage] fetchFiltros:', e);
      }
    };
    void fetchFiltros();
  }, []);

  // ── Función de búsqueda reutilizable (acepta page explícita) ─────────────
  const fetchHistorial = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    setSelectedId(null);
    setDetalle(null);

    const params = new URLSearchParams({ page: String(page) });
    if (fechaInicio)  params.set('fecha_inicio',  fechaInicio);
    if (fechaFin)     params.set('fecha_fin',      fechaFin);
    if (camionId)     params.set('camion_id',      camionId);
    if (conductorId)  params.set('conductor_id',   conductorId);
    if (rutaId)       params.set('ruta_id',        rutaId);

    try {
      const res = await fetch(`/api/recorridos/historial?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? `Error del servidor: HTTP ${res.status}`);
      }
      const data: HistorialPaginado = await res.json();
      setRecorridos(data.data);
      setTotal(data.total);
      setCurrentPage(data.page);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Error al obtener el historial de recorridos.');
      setRecorridos([]);
    } finally {
      setIsLoading(false);
    }
  }, [fechaInicio, fechaFin, camionId, conductorId, rutaId]);

  // ── Buscar (primera página) ──────────────────────────────────────────────
  const handleBuscar = useCallback(async () => {
    setHasBuscado(true);
    await fetchHistorial(1);
  }, [fetchHistorial]);

  // ── Cambiar página ───────────────────────────────────────────────────────
  const handlePage = useCallback(async (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    await fetchHistorial(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchHistorial, totalPages]);

  // ── Limpiar filtros ──────────────────────────────────────────────────────
  const handleLimpiar = () => {
    setFechaInicio(''); setFechaFin('');
    setCamionId(''); setConductorId(''); setRutaId('');
    setRecorridos([]); setTotal(0); setCurrentPage(1); setTotalPages(1);
    setSelectedId(null); setDetalle(null);
    setError(null); setHasBuscado(false);
  };

  // ── Seleccionar / cerrar detalle ─────────────────────────────────────────
  const handleSelectRow = async (id: number) => {
    if (selectedId === id) {
      setSelectedId(null);
      setDetalle(null);
      return;
    }
    setSelectedId(id);
    setDetalle(null);
    setIsLoadingDetalle(true);
    setErrorDetalle(null);
    try {
      const res = await fetch(`/api/recorridos/historial/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? `HTTP ${res.status}`);
      }
      const data: RecorridoDetalle = await res.json();
      setDetalle(data);
    } catch (e: any) {
      setErrorDetalle(e.message ?? 'Error al cargar el detalle del recorrido.');
    } finally {
      setIsLoadingDetalle(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="historial-page">

      {/* ─── Barra de filtros ─── */}
      <div className="historial-filters-card">

        <div className="historial-filter-group">
          <label htmlFor="filtro-fecha-inicio">Fecha inicio</label>
          <input
            id="filtro-fecha-inicio"
            type="date"
            value={fechaInicio}
            max={fechaFin || undefined}
            onChange={e => setFechaInicio(e.target.value)}
          />
        </div>

        <div className="historial-filter-group">
          <label htmlFor="filtro-fecha-fin">Fecha fin</label>
          <input
            id="filtro-fecha-fin"
            type="date"
            value={fechaFin}
            min={fechaInicio || undefined}
            onChange={e => setFechaFin(e.target.value)}
          />
        </div>

        <div className="historial-filter-group">
          <label htmlFor="filtro-ruta">Ruta</label>
          <select id="filtro-ruta" value={rutaId} onChange={e => setRutaId(e.target.value)}>
            <option value="">Todas las rutas</option>
            {catalogo.rutas.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>

        <div className="historial-filter-group">
          <label htmlFor="filtro-unidad">Unidad</label>
          <select id="filtro-unidad" value={camionId} onChange={e => setCamionId(e.target.value)}>
            <option value="">Todas las unidades</option>
            {catalogo.camiones.map(c => (
              <option key={c.id} value={c.id}>{c.numero_economico} — {c.placa}</option>
            ))}
          </select>
        </div>

        <div className="historial-filter-group">
          <label htmlFor="filtro-conductor">Conductor</label>
          <select id="filtro-conductor" value={conductorId} onChange={e => setConductorId(e.target.value)}>
            <option value="">Todos los conductores</option>
            {catalogo.conductores.map(d => (
              <option key={d.id} value={d.id}>{d.nombre_completo}</option>
            ))}
          </select>
        </div>

        <div className="historial-filter-actions">
          <button
            id="btn-buscar-historial"
            className="historial-btn-buscar"
            onClick={handleBuscar}
            disabled={isLoading}
          >
            {isLoading
              ? <><span className="historial-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Buscando…</>
              : <>🔍 Buscar</>}
          </button>
          <button
            id="btn-limpiar-historial"
            className="historial-btn-limpiar"
            onClick={handleLimpiar}
            disabled={isLoading}
          >✕ Limpiar</button>
        </div>
      </div>

      {/* ─── Error general ─── */}
      {error && (
        <div className="historial-error-banner" role="alert">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      {/* ─── Tabla de resultados ─── */}
      {(hasBuscado || recorridos.length > 0) && (
        <div className="historial-results-section">
          <div className="historial-results-header">
            <p className="historial-results-title">Recorridos Finalizados</p>
            {!isLoading && (
              <span className="historial-results-count">
                {total} resultado{total !== 1 ? 's' : ''}
                {totalPages > 1 && ` · Página ${currentPage} de ${totalPages}`}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="historial-state-box">
              <div className="historial-spinner" />
              <span>Consultando historial…</span>
            </div>
          ) : recorridos.length === 0 ? (
            <div className="historial-state-box">
              <span className="historial-state-icon">📂</span>
              <span>No se encontraron recorridos con los filtros seleccionados.</span>
            </div>
          ) : (
            <>
              <div className="historial-table-wrapper">
                <table className="historial-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Fecha Programada</th>
                      <th>Ruta</th>
                      <th>Unidad</th>
                      <th>Conductor</th>
                      <th>Hora Inicio</th>
                      <th>Hora Fin</th>
                      <th>Duración</th>
                      <th>Checkpoints</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recorridos.map(r => {
                      const isSelected = selectedId === r.id;
                      const pct = r.total_checkpoints > 0
                        ? Math.round((r.checkpoints_completados / r.total_checkpoints) * 100)
                        : 0;

                      return (
                        <tr
                          key={r.id}
                          id={`fila-recorrido-${r.id}`}
                          className={isSelected ? 'historial-row--selected' : ''}
                          onClick={() => handleSelectRow(r.id)}
                          title="Clic para ver detalle"
                        >
                          {/* ID */}
                          <td style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '0.78rem' }}>
                            #{r.id}
                          </td>

                          {/* Fecha programada */}
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-h)', fontWeight: 600 }}>
                            {fmtDate(r.fecha_programada)}
                          </td>

                          {/* Ruta */}
                          <td>
                            <span className="historial-ruta-pill">
                              <span className="historial-ruta-dot" style={{ background: r.ruta_color }} />
                              {r.ruta_nombre}
                            </span>
                          </td>

                          {/* Unidad */}
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.845rem', color: 'var(--text-h)' }}>
                              {r.numero_economico}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text)' }}>{r.placa}</div>
                          </td>

                          {/* Conductor */}
                          <td style={{ fontSize: '0.845rem', fontWeight: 600, color: 'var(--text-h)' }}>
                            {r.conductor_nombre}
                          </td>

                          {/* Inicio real */}
                          <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                            {fmtTimeOnly(r.hora_inicio)}
                          </td>

                          {/* Fin real */}
                          <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                            {fmtTimeOnly(r.hora_fin)}
                          </td>

                          {/* Duración */}
                          <td>
                            <span className="historial-duracion">{fmtDuracion(r.duracion_minutos)}</span>
                          </td>

                          {/* Checkpoints barra */}
                          <td style={{ minWidth: 110 }}>
                            <div className="historial-checkpoint-bar">
                              <div className="historial-checkpoint-bar-track">
                                <div className="historial-checkpoint-bar-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="historial-checkpoint-bar-label">
                                {r.checkpoints_completados}/{r.total_checkpoints} ({pct}%)
                              </span>
                            </div>
                          </td>

                          {/* Estado */}
                          <td>
                            <span className="estatus-badge estatus-completado">{r.estado}</span>
                          </td>

                          {/* Acción */}
                          <td onClick={e => e.stopPropagation()}>
                            <button
                              id={`btn-ver-detalle-${r.id}`}
                              className={`historial-btn-ver${isSelected ? ' historial-btn-ver--active' : ''}`}
                              onClick={() => handleSelectRow(r.id)}
                              title={isSelected ? 'Cerrar detalle' : 'Ver detalle'}
                            >
                              {isSelected ? '▲ Cerrar' : '▼ Detalle'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ─── Controles de paginación ─── */}
              {totalPages > 1 && (
                <div className="historial-pagination">
                  <button
                    id="btn-pag-anterior"
                    className="historial-pag-btn"
                    onClick={() => handlePage(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoading}
                    title="Página anterior"
                  >← Anterior</button>

                  <span className="historial-pag-info">
                    Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                    <span style={{ color: 'var(--text)', fontWeight: 400, marginLeft: '0.35rem' }}>
                      ({total} registros)
                    </span>
                  </span>

                  <button
                    id="btn-pag-siguiente"
                    className="historial-pag-btn"
                    onClick={() => handlePage(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoading}
                    title="Página siguiente"
                  >Siguiente →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Panel de detalle ─── */}
      {selectedId !== null && (
        <>
          {isLoadingDetalle && (
            <div className="historial-state-box">
              <div className="historial-spinner" />
              <span>Cargando detalle del recorrido…</span>
            </div>
          )}
          {errorDetalle && !isLoadingDetalle && (
            <div className="historial-error-banner" role="alert">
              <span>⚠️</span><span>{errorDetalle}</span>
            </div>
          )}
          {detalle && !isLoadingDetalle && (
            <DetailPanel
              detalle={detalle}
              onClose={() => { setSelectedId(null); setDetalle(null); }}
            />
          )}
        </>
      )}

      {/* ─── Estado inicial ─── */}
      {!hasBuscado && !isLoading && (
        <div className="historial-state-box">
          <span className="historial-state-icon">📜</span>
          <span>
            Aplica los filtros y presiona <strong>Buscar</strong> para consultar el historial de recorridos finalizados.
          </span>
        </div>
      )}
    </div>
  );
};
