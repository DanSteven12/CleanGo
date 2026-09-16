import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, X, Eye, Loader2, ImageOff, MapPin, FileWarning,
  ClipboardList, Clock, CheckCircle2, ChevronLeft, ChevronRight,
  AlertCircle, Calendar, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import type { ReporteRecord, ReporteIndicadores, EstadoReporte, TipoReporte } from '../../types/reportes';
import '../../assets/styles/reportes.css';
import { Header } from '../../components/layout/Header';
import { PageSectionHeader } from '../../components/layout/PageSectionHeader';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_REPORTE: TipoReporte[] = [
  'Basura acumulada',
  'Camión no pasó',
  'Contenedor lleno',
  'Calles contaminadas',
];

const ITEMS_PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTipoClass(tipo: TipoReporte): string {
  const map: Record<TipoReporte, string> = {
    'Basura acumulada':    'tipo-basura',
    'Camión no pasó':      'tipo-camion',
    'Contenedor lleno':    'tipo-contenedor',
    'Calles contaminadas': 'tipo-calles',
  };
  return map[tipo] ?? '';
}

function getEstadoClass(estado: EstadoReporte): string {
  const map: Record<EstadoReporte, string> = {
    'Pendiente':  'estado-pendiente',
    'En proceso': 'estado-en-proceso',
    'Cerrado':    'estado-cerrado',
  };
  return map[estado] ?? '';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCoords(lat: string | number, lng: string | number): string {
  const la = Number(lat).toFixed(6);
  const lo = Number(lng).toFixed(6);
  return `${la}, ${lo}`;
}

function hasValidCoords(lat: string | number, lng: string | number): boolean {
  const la = Number(lat);
  const lo = Number(lng);
  return !isNaN(la) && !isNaN(lo) && la !== 0 && lo !== 0;
}

// ─── Foto con fallback ────────────────────────────────────────────────────────

interface ReporteImageProps {
  src: string | null;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
  placeholderSize?: number;
}

const BACKEND_BASE = (import.meta.env.VITE_API_URL as string || '').replace(/\/api\/?$/, '').replace(/\/$/, '');

const ReporteImage: React.FC<ReporteImageProps> = ({
  src,
  alt = 'Fotografía del reporte',
  className = 'reporte-thumb',
  placeholderClassName = 'reporte-thumb-placeholder',
  placeholderSize = 22,
}) => {
  const [broken, setBroken] = useState(false);

  // Construir URL absoluta: si empieza con /uploads, anteponemos el backend base.
  // En dev (Vite proxy) BACKEND_BASE es '' y el proxy reenvía /uploads al backend.
  // En producción BACKEND_BASE es la URL del backend sin /api.
  const resolvedSrc = src
    ? src.startsWith('http')
      ? src
      : `${BACKEND_BASE}${src}`
    : null;

  if (!resolvedSrc || broken) {
    return (
      <div className={placeholderClassName}>
        <ImageOff size={placeholderSize} />
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
    />
  );
};

// ─── Modal de detalle ──────────────────────────────────────────────────────────

interface ReporteDetailModalProps {
  reporte: ReporteRecord;
  onClose: () => void;
  onEstadoUpdated: () => void;
}

const ReporteDetailModal: React.FC<ReporteDetailModalProps> = ({
  reporte,
  onClose,
  onEstadoUpdated,
}) => {
  const [newEstado, setNewEstado] = useState<EstadoReporte | ''>(
    reporte.estado === 'Pendiente' ? '' : reporte.estado
  );
  const [isSaving, setIsSaving] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isCerrado = reporte.estado === 'Cerrado';

  const handleGuardarEstado = async () => {
    if (!newEstado || newEstado === reporte.estado) {
      toast.info('El estado seleccionado es el mismo que el actual.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/reportes/${reporte.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newEstado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar estado');
      toast.success(`Estado actualizado a "${newEstado}"`);
      onEstadoUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Error al actualizar estado');
    } finally {
      setIsSaving(false);
    }
  };

  const lat = Number(reporte.latitud);
  const lng = Number(reporte.longitud);
  const validCoords = hasValidCoords(lat, lng);
  const mapSrc = validCoords
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`
    : null;

  return (
    <motion.div
      className="reporte-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
    >
      <motion.div
        className="reporte-modal" role="dialog" aria-modal="true" aria-label="Detalle del reporte"
        initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* ── Header ── */}
        <div className="reporte-modal-header">
          <h2 className="reporte-modal-title">
            Reporte #{reporte.id} — {reporte.tipo_reporte}
          </h2>
          <button className="reporte-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="reporte-modal-body">
          {/* Foto grande */}
          <ReporteImage
            src={reporte.fotografia}
            alt={`Fotografía del reporte #${reporte.id}`}
            className="reporte-modal-photo"
            placeholderClassName="reporte-modal-photo-placeholder"
            placeholderSize={36}
          />

          {/* Grid de datos */}
          <div className="reporte-modal-grid">
            <div className="reporte-modal-field">
              <span className="reporte-modal-field-label">Tipo de reporte</span>
              <span className="reporte-modal-field-value">
                <span className={`tipo-badge ${getTipoClass(reporte.tipo_reporte)}`}>
                  {reporte.tipo_reporte}
                </span>
              </span>
            </div>

            <div className="reporte-modal-field">
              <span className="reporte-modal-field-label">Estado actual</span>
              <span className="reporte-modal-field-value">
                <span className={`estado-reporte-badge ${getEstadoClass(reporte.estado)}`}>
                  {reporte.estado}
                </span>
              </span>
            </div>

            <div className="reporte-modal-field">
              <span className="reporte-modal-field-label">Fecha del reporte</span>
              <span className="reporte-modal-field-value">{formatDate(reporte.fecha_reporte)}</span>
            </div>

            <div className="reporte-modal-field">
              <span className="reporte-modal-field-label">Coordenadas GPS</span>
              <span className="reporte-modal-field-value" style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                {validCoords ? formatCoords(lat, lng) : 'No disponibles'}
              </span>
            </div>

            {reporte.ciudadano_nombre && (
              <div className="reporte-modal-field">
                <span className="reporte-modal-field-label">Ciudadano</span>
                <span className="reporte-modal-field-value">{reporte.ciudadano_nombre}</span>
              </div>
            )}

            {reporte.ciudadano_correo && (
              <div className="reporte-modal-field">
                <span className="reporte-modal-field-label">Correo</span>
                <span className="reporte-modal-field-value" style={{ fontSize: '0.82rem' }}>{reporte.ciudadano_correo}</span>
              </div>
            )}

            {reporte.direccion_referencia && (
              <div className="reporte-modal-field full-width">
                <span className="reporte-modal-field-label">Dirección de referencia</span>
                <span className="reporte-modal-field-value">{reporte.direccion_referencia}</span>
              </div>
            )}

            {reporte.descripcion && (
              <div className="reporte-modal-field full-width">
                <span className="reporte-modal-field-label">Descripción</span>
                <span className="reporte-modal-field-value" style={{ lineHeight: 1.6 }}>{reporte.descripcion}</span>
              </div>
            )}
          </div>

          {/* Mapa Google Maps */}
          {mapSrc && (
            <div>
              <p className="reporte-modal-field-label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={12} /> Ubicación en el mapa
              </p>
              <div className="reporte-modal-map">
                <iframe
                  src={mapSrc}
                  title={`Mapa del reporte #${reporte.id}`}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          )}

          {/* Cambio de estado */}
          <div className="reporte-estado-section">
            <p className="reporte-estado-title">Actualizar estado</p>
            <div className="reporte-estado-row">
              <select
                id={`estado-select-${reporte.id}`}
                className="reporte-estado-select"
                value={newEstado}
                onChange={(e) => setNewEstado(e.target.value as EstadoReporte)}
                disabled={isSaving || isCerrado}
              >
                {reporte.estado === 'Pendiente' && (
                  <option value="" disabled>Seleccione un estado...</option>
                )}
                {reporte.estado !== 'Cerrado' && (
                  <option value="En proceso">En proceso</option>
                )}
                <option value="Cerrado">Cerrado</option>
              </select>
              <button
                id={`btn-guardar-estado-${reporte.id}`}
                className="reporte-estado-btn"
                onClick={handleGuardarEstado}
                disabled={isSaving || isCerrado || !newEstado || newEstado === reporte.estado}
              >
                {isSaving ? <Loader2 size={15} className="spin" /> : 'Guardar estado'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Página Principal ─────────────────────────────────────────────────────────

export const ReportesPage: React.FC = () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [reportes, setReportes] = useState<ReporteRecord[]>([]);
  const [indicadores, setIndicadores] = useState<ReporteIndicadores>({
    total: 0, pendientes: 0, en_proceso: 0, cerrados: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIndicadores, setIsLoadingIndicadores] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Debounce search query to optimize indexed search requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Paginación
  const [page, setPage] = useState(1);

  // Modal de detalle
  const [selectedReporte, setSelectedReporte] = useState<ReporteRecord | null>(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchIndicadores = useCallback(async () => {
    setIsLoadingIndicadores(true);
    try {
      const res = await fetch('/api/reportes/indicadores');
      if (!res.ok) throw new Error('Error al cargar indicadores');
      const data = await res.json();
      setIndicadores(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingIndicadores(false);
    }
  }, []);

  const fetchReportes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (estadoFilter) params.set('estado', estadoFilter);
      if (tipoFilter)   params.set('tipo', tipoFilter);
      if (fechaDesde)   params.set('fecha_desde', fechaDesde);
      if (fechaHasta)   params.set('fecha_hasta', fechaHasta);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const res = await fetch(`/api/reportes?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar reportes');
      const data = await res.json();
      setReportes(data);
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron cargar los reportes');
    } finally {
      setIsLoading(false);
    }
  }, [estadoFilter, tipoFilter, fechaDesde, fechaHasta, debouncedSearch]);

  useEffect(() => {
    fetchIndicadores();
  }, [fetchIndicadores]);

  useEffect(() => {
    setPage(1);
    fetchReportes();
  }, [fetchReportes]);

  // ── Paginación ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(reportes.length / ITEMS_PER_PAGE));

  const currentReportes = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return reportes.slice(start, start + ITEMS_PER_PAGE);
  }, [reportes, page]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleClearFilters = () => {
    setSearch('');
    setEstadoFilter('');
    setTipoFilter('');
    setFechaDesde('');
    setFechaHasta('');
    setPage(1);
  };

  const hasActiveFilters = search || estadoFilter || tipoFilter || fechaDesde || fechaHasta;

  const handleEstadoUpdated = () => {
    fetchReportes();
    fetchIndicadores();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Header 
        subtitle="Bandeja de atención — Reportes enviados desde la app móvil" 
        title="Reportes Ciudadanos" 
      />
      <PageSectionHeader
        eyebrow="ATENCIÓN CIUDADANA"
        title="Reportes Ciudadanos"
        description="Gestión y seguimiento de reportes enviados desde la app móvil."
      />
      <div className="reportes-page">

      {/* ── Indicadores ──────────────────────────────────────── */}
      <div className="reportes-stats-grid">
        {/* Total */}
        <div
          className="reportes-stat-card"
          style={{ '--stat-accent': '#1763A6', '--stat-icon-bg': 'oklch(0.52 0.14 250 / 0.10)' } as React.CSSProperties}
        >
          <div className="reportes-stat-icon">
            <ClipboardList size={22} />
          </div>
          <div className="reportes-stat-info">
            <span className="reportes-stat-label">Total de reportes</span>
            <span className="reportes-stat-value">
              {isLoadingIndicadores ? '—' : indicadores.total}
            </span>
          </div>
        </div>

        {/* Pendientes */}
        <div
          className="reportes-stat-card"
          style={{ '--stat-accent': 'oklch(0.62 0.16 75)', '--stat-icon-bg': 'oklch(0.78 0.16 75 / 0.10)' } as React.CSSProperties}
        >
          <div className="reportes-stat-icon" style={{ color: 'oklch(0.62 0.16 75)' }}>
            <AlertCircle size={22} />
          </div>
          <div className="reportes-stat-info">
            <span className="reportes-stat-label">Pendientes</span>
            <span className="reportes-stat-value">
              {isLoadingIndicadores ? '—' : indicadores.pendientes}
            </span>
          </div>
        </div>

        {/* En proceso */}
        <div
          className="reportes-stat-card"
          style={{ '--stat-accent': '#1763A6', '--stat-icon-bg': 'oklch(0.52 0.14 250 / 0.08)' } as React.CSSProperties}
        >
          <div className="reportes-stat-icon">
            <Clock size={22} />
          </div>
          <div className="reportes-stat-info">
            <span className="reportes-stat-label">En proceso</span>
            <span className="reportes-stat-value">
              {isLoadingIndicadores ? '—' : indicadores.en_proceso}
            </span>
          </div>
        </div>

        {/* Cerrados */}
        <div
          className="reportes-stat-card"
          style={{ '--stat-accent': '#388C35', '--stat-icon-bg': 'oklch(0.76 0.17 135 / 0.10)' } as React.CSSProperties}
        >
          <div className="reportes-stat-icon" style={{ color: '#388C35' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="reportes-stat-info">
            <span className="reportes-stat-label">Cerrados</span>
            <span className="reportes-stat-value">
              {isLoadingIndicadores ? '—' : indicadores.cerrados}
            </span>
          </div>
        </div>
      </div>

      {/* ── Filtros ───────────────────────────────────────────── */}
      <div className="reportes-filters-card">
        {/* Búsqueda */}
        <Input
          id="reportes-search"
          label="Buscar"
          type="text"
          placeholder="Descripción o dirección..."
          leftIcon={<Search size={15} />}
          clearable={true}
          onClear={() => setSearch('')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="min-w-[220px] flex-2"
        />

        {/* Estado */}
        <Select
          id="reportes-filter-estado"
          label="Estado"
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          icon={<CheckCircle2 size={15} />}
          isFiltered={!!estadoFilter}
          containerClassName="min-w-[150px] flex-1"
        >
          <option value="">Todos</option>
          <option value="Pendiente">Pendiente</option>
          <option value="En proceso">En proceso</option>
          <option value="Cerrado">Cerrado</option>
        </Select>

        {/* Tipo */}
        <Select
          id="reportes-filter-tipo"
          label="Tipo de reporte"
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          icon={<FileWarning size={15} />}
          isFiltered={!!tipoFilter}
          containerClassName="min-w-[170px] flex-1"
        >
          <option value="">Todos</option>
          {TIPOS_REPORTE.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>

        {/* Fecha desde */}
        <Input
          id="reportes-fecha-desde"
          label="Desde"
          type="date"
          value={fechaDesde}
          max={fechaHasta || undefined}
          onChange={(e) => setFechaDesde(e.target.value)}
          leftIcon={<Calendar size={15} />}
          containerClassName="min-w-[145px] flex-1"
        />

        {/* Fecha hasta */}
        <Input
          id="reportes-fecha-hasta"
          label="Hasta"
          type="date"
          value={fechaHasta}
          min={fechaDesde || undefined}
          onChange={(e) => setFechaHasta(e.target.value)}
          leftIcon={<Calendar size={15} />}
          containerClassName="min-w-[145px] flex-1"
        />

        {/* Limpiar filtros */}
        {hasActiveFilters && (
          <div className="reportes-filter-actions">
            <button
              id="reportes-btn-limpiar"
              className="reportes-btn-clear"
              onClick={handleClearFilters}
              title="Limpiar filtros"
            >
              <RotateCcw size={14} />
              <span>Limpiar</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Bandeja de tickets ───────────────────────────────── */}
      <div className="reportes-inbox-section">

        {/* Header de sección */}
        <div className="reportes-inbox-header">
          <h2 className="reportes-inbox-title">Bandeja de reportes</h2>
          {!isLoading && (
            <span className="reportes-table-count">
              {reportes.length} {reportes.length === 1 ? 'reporte' : 'reportes'}
            </span>
          )}
        </div>

        {/* ─── Estados: cargando / vacío / lista ─── */}
        <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="reportes-loading">
            <Loader2 size={18} className="spin" style={{ color: 'var(--primary)' }} />
            Cargando reportes…
          </motion.div>
        ) : reportes.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="reportes-empty">
            <FileWarning size={48} className="reportes-empty-icon" />
            <p>No se encontraron reportes con los filtros aplicados.</p>
            {hasActiveFilters && (
              <button className="reportes-btn-clear" onClick={handleClearFilters}>
                <X size={13} /> Limpiar filtros
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial="hidden" animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
          >
            {/* ─── Lista de tarjetas ─── */}
            <div className="reportes-ticket-list">
              <AnimatePresence>
              {currentReportes.map((r) => (
                <motion.article
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className={`reporte-ticket-card reporte-ticket--${getEstadoClass(r.estado)}`}
                  onClick={() => setSelectedReporte(r)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver detalle del reporte #${r.id}: ${r.tipo_reporte}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedReporte(r); } }}
                >
                  {/* ── Franja de color lateral por estado ── */}
                  <span className="reporte-ticket-stripe" aria-hidden="true" />

                  {/* ── Foto ── */}
                  <div className="reporte-ticket-photo">
                    <ReporteImage
                      src={r.fotografia}
                      className="reporte-ticket-img"
                      placeholderClassName="reporte-ticket-img-placeholder"
                      placeholderSize={24}
                    />
                  </div>

                  {/* ── Información principal ── */}
                  <div className="reporte-ticket-body">
                    {/* Tipo como título */}
                    <div className="reporte-ticket-top">
                      <span className={`tipo-badge ${getTipoClass(r.tipo_reporte)}`}>
                        {r.tipo_reporte}
                      </span>
                      <span className="reporte-ticket-id">#{r.id}</span>
                    </div>

                    {/* Descripción (máx. 2 líneas) */}
                    <p className="reporte-ticket-desc">
                      {r.descripcion || <em>Sin descripción</em>}
                    </p>

                    {/* Meta: dirección + fecha */}
                    <div className="reporte-ticket-meta">
                      <span className="reporte-ticket-meta-item">
                        <MapPin size={12} aria-hidden="true" />
                        {r.direccion_referencia ?? <em>Dirección no especificada</em>}
                      </span>
                      <span className="reporte-ticket-meta-sep" aria-hidden="true">·</span>
                      <span className="reporte-ticket-meta-item">
                        <Clock size={12} aria-hidden="true" />
                        {formatDate(r.fecha_reporte)}
                      </span>
                    </div>
                  </div>

                  {/* ── Estado + Acción ── */}
                  <div className="reporte-ticket-side">
                    <span className={`estado-reporte-badge ${getEstadoClass(r.estado)}`}>
                      {r.estado}
                    </span>
                    <button
                      id={`btn-ver-reporte-${r.id}`}
                      className="reporte-ticket-btn"
                      onClick={(e) => { e.stopPropagation(); setSelectedReporte(r); }}
                      title={`Ver detalle del reporte #${r.id}`}
                      aria-label={`Ver detalle del reporte #${r.id}`}
                    >
                      <Eye size={15} />
                      <span>Ver detalle</span>
                    </button>
                  </div>
                </motion.article>
              ))}
              </AnimatePresence>
            </div>

            {/* ─── Paginación (sin cambios) ─── */}
            {totalPages > 1 && (
              <div className="reportes-pagination">
                <button
                  id="reportes-btn-anterior"
                  className="reportes-pagination-btn"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={15} /> Anterior
                </button>
                <span className="reportes-pagination-info">
                  Página {page} de {totalPages}
                </span>
                <button
                  id="reportes-btn-siguiente"
                  className="reportes-pagination-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente <ChevronRight size={15} />
                </button>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* ── Modal de detalle ─────────────────────────────────── */}
      <AnimatePresence>
      {selectedReporte && (
        <ReporteDetailModal
          reporte={selectedReporte}
          onClose={() => setSelectedReporte(null)}
          onEstadoUpdated={handleEstadoUpdated}
        />
      )}
      </AnimatePresence>
    </div>
    </>
  );
};
