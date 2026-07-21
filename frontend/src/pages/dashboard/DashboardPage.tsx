// frontend/src/pages/dashboard/DashboardPage.tsx
// Dashboard Principal de CleanGo — centro de monitoreo para el administrador.
// Reutiliza endpoints existentes y el nuevo /api/dashboard/*.
// No modifica ningún módulo existente.

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Map,
  CalendarDays,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CheckCheck,
  Plus,
  Satellite,
  FileWarning,
  History,
  Settings2,
  Route,
  Loader2,
  RefreshCw,
  TrendingUp,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { DashboardLiveMapEmbed } from './DashboardLiveMapEmbed';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  camiones_total: number;
  rutas_total: number;
  asignaciones_hoy: number;
  recorridos_activos: number;
  recorridos_completados_hoy: number;
  reportes_pendientes: number;
  reportes_en_proceso: number;
  reportes_cerrados: number;
}

interface ActividadReciente {
  asignaciones: Array<{
    id: number;
    fecha_programada: string;
    horario_inicio: string;
    horario_fin: string;
    estatus_recorrido: string;
    ruta_nombre: string;
    ruta_color: string;
    numero_economico: string;
    placa: string;
    conductor_nombre: string;
  }>;
  recorridos: Array<{
    id: number;
    hora_inicio: string;
    hora_fin: string;
    estado: string;
    ruta_nombre: string;
    ruta_color: string;
    numero_economico: string;
    fecha_programada: string;
  }>;
  reportes: Array<{
    id: number;
    tipo_reporte: string;
    descripcion: string;
    estado: string;
    fecha_reporte: string;
    direccion_referencia: string;
    ciudadano_nombre: string;
  }>;
}

interface AlertaItem {
  id: string;
  tipo: 'reporte' | 'asignacion';
  icono: React.ReactNode;
  titulo: string;
  descripcion: string;
  fecha: string;
  estado: string;
  colorEstado: string;
  bgEstado: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getNow(): string {
  return new Date().toLocaleString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── StatCard sub-component ────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accentColor: string;
  bgColor: string;
  id: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, accentColor, bgColor, id }) => (
  <div
    id={id}
    className="stat-card"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.875rem',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'default',
    }}
  >
    {/* Decorative corner glow */}
    <div style={{
      position: 'absolute', top: -20, right: -20,
      width: 70, height: 70, borderRadius: '50%',
      background: `${accentColor}18`,
      pointerEvents: 'none',
    }} />

    {/* Icon */}
    <div style={{
      width: 40, height: 40, borderRadius: '0.625rem',
      background: bgColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </div>

    {/* Value + Label */}
    <div>
      <div className="stat-value" style={{ fontSize: '1.875rem' }}>
        {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
      </div>
      <div className="stat-label" style={{ marginBottom: 0, marginTop: '0.25rem' }}>
        {label}
      </div>
    </div>
  </div>
);

// ─── QuickAccessButton sub-component ───────────────────────────────────────────

interface QuickBtnProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  gradient: string;
}

const QuickBtn: React.FC<QuickBtnProps> = ({ id, icon, label, description, onClick, gradient }) => (
  <button
    id={id}
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      padding: '1rem 1.25rem',
      background: 'var(--panel-bg)',
      border: '1px solid var(--panel-border)',
      borderRadius: '0.875rem',
      cursor: 'pointer',
      textAlign: 'left',
      boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06)',
      transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
      width: '100%',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 20px -4px oklch(0.2 0.04 240 / 0.15)';
      e.currentTarget.style.borderColor = 'oklch(0.52 0.14 250 / 0.3)';
      e.currentTarget.style.transform = 'translateY(-1px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06)';
      e.currentTarget.style.borderColor = 'var(--panel-border)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    {/* Icon */}
    <div style={{
      width: 44, height: 44, borderRadius: '0.75rem',
      background: gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 2px 8px oklch(0.2 0.04 240 / 0.15)',
    }}>
      {icon}
    </div>

    {/* Text */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-h)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text)', marginTop: '0.15rem' }}>
        {description}
      </div>
    </div>

    <ChevronRight size={16} style={{ color: 'var(--text)', flexShrink: 0 }} />
  </button>
);

// ─── SectionHeader sub-component ───────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1763A6, #152C40)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 2px 10px #1763A659',
      }}>
        {icon}
      </div>
      <div>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {action}
  </div>
);

// ─── Main DashboardPage ────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actividad, setActividad] = useState<ActividadReciente | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingActividad, setIsLoadingActividad] = useState(true);
  const [nowStr, setNowStr] = useState(getNow());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Actualizar reloj cada minuto
  useEffect(() => {
    const t = setInterval(() => setNowStr(getNow()), 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error();
      const data: DashboardStats = await res.json();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchActividad = useCallback(async () => {
    setIsLoadingActividad(true);
    try {
      const res = await fetch('/api/dashboard/actividad-reciente');
      if (!res.ok) throw new Error();
      const data: ActividadReciente = await res.json();
      setActividad(data);
    } catch {
      setActividad(null);
    } finally {
      setIsLoadingActividad(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
    void fetchActividad();
  }, [fetchStats, fetchActividad]);

  const handleRefresh = () => {
    setLastRefresh(new Date());
    void fetchStats();
    void fetchActividad();
  };

  // ── Alertas: construir desde reportes pendientes y asignaciones sin recorrido ─
  const alertas: AlertaItem[] = React.useMemo(() => {
    const items: AlertaItem[] = [];

    // Reportes pendientes (max 4)
    if (actividad?.reportes) {
      actividad.reportes
        .filter((r) => r.estado === 'Pendiente')
        .slice(0, 4)
        .forEach((r) => {
          items.push({
            id: `reporte-${r.id}`,
            tipo: 'reporte',
            icono: <FileWarning size={15} color="white" />,
            titulo: r.tipo_reporte || 'Reporte ciudadano',
            descripcion: r.descripcion?.slice(0, 80) || r.direccion_referencia || '—',
            fecha: formatDate(r.fecha_reporte),
            estado: 'Pendiente',
            colorEstado: 'oklch(0.58 0.22 25)',
            bgEstado: 'oklch(0.58 0.22 25 / 0.1)',
          });
        });
    }

    // Asignaciones sin recorrido del día (max 2)
    if (actividad?.asignaciones) {
      const hoy = new Date().toISOString().slice(0, 10);
      actividad.asignaciones
        .filter((a) => a.fecha_programada?.slice(0, 10) === hoy && a.estatus_recorrido === 'Pendiente')
        .slice(0, 2)
        .forEach((a) => {
          items.push({
            id: `asignacion-${a.id}`,
            tipo: 'asignacion',
            icono: <CalendarDays size={15} color="white" />,
            titulo: 'Asignación pendiente de iniciar',
            descripcion: `Ruta ${a.ruta_nombre} — Camión ${a.numero_economico}`,
            fecha: `${formatDateShort(a.fecha_programada)} ${a.horario_inicio?.slice(0, 5)}`,
            estado: 'Pendiente',
            colorEstado: 'oklch(0.50 0.12 75)',
            bgEstado: 'oklch(0.78 0.16 75 / 0.12)',
          });
        });
    }

    return items;
  }, [actividad]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      id="dashboard-page"
      style={{
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >

      {/* ════════ HEADER ════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #1763A6, #152C40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px #1763A659',
            }}>
              <LayoutDashboard size={20} color="white" />
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>
              Dashboard
            </h1>
          </div>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>
            {nowStr}
          </p>
        </div>

        <button
          id="dashboard-refresh"
          onClick={handleRefresh}
          title="Actualizar datos"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem',
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '0.625rem',
            fontSize: '0.8125rem', fontWeight: 600,
            color: 'var(--text)',
            cursor: 'pointer',
            boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--panel-bg)')}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* ════════ § 1. INDICADORES ══════════════════════════════════════════ */}
      <section id="dashboard-stats">
        <SectionHeader
          icon={<TrendingUp size={17} color="white" />}
          title="Indicadores principales"
          subtitle="Resumen del estado actual del sistema"
        />

        {isLoadingStats ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: 'var(--text)' }}>
            <Loader2 size={20} style={{ animation: 'spin-loop 0.9s linear infinite' }} />
            <span style={{ fontSize: '0.875rem' }}>Cargando indicadores...</span>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1rem',
          }}>
            <StatCard
              id="stat-camiones"
              icon={<Truck size={20} color="#1763A6" />}
              label="Camiones registrados"
              value={stats?.camiones_total ?? 0}
              accentColor="#1763A6"
              bgColor="#1763A618"
            />
            <StatCard
              id="stat-rutas"
              icon={<Route size={20} color="#152C40" />}
              label="Rutas registradas"
              value={stats?.rutas_total ?? 0}
              accentColor="#152C40"
              bgColor="#152C4018"
            />
            <StatCard
              id="stat-asignaciones-hoy"
              icon={<CalendarDays size={20} color="#4f46e5" />}
              label="Asignaciones hoy"
              value={stats?.asignaciones_hoy ?? 0}
              accentColor="#4f46e5"
              bgColor="#4f46e518"
            />
            <StatCard
              id="stat-recorridos-activos"
              icon={<Navigation size={20} color="#388C35" />}
              label="Recorridos activos"
              value={stats?.recorridos_activos ?? 0}
              accentColor="#388C35"
              bgColor="#388C3518"
            />
            <StatCard
              id="stat-recorridos-completados-hoy"
              icon={<CheckCircle2 size={20} color="#90BF49" />}
              label="Completados hoy"
              value={stats?.recorridos_completados_hoy ?? 0}
              accentColor="#90BF49"
              bgColor="#90BF4918"
            />
            <StatCard
              id="stat-reportes-pendientes"
              icon={<AlertTriangle size={20} color="oklch(0.58 0.22 25)" />}
              label="Reportes pendientes"
              value={stats?.reportes_pendientes ?? 0}
              accentColor="oklch(0.58 0.22 25)"
              bgColor="oklch(0.58 0.22 25 / 0.1)"
            />
            <StatCard
              id="stat-reportes-en-proceso"
              icon={<Clock size={20} color="oklch(0.65 0.16 75)" />}
              label="Reportes en proceso"
              value={stats?.reportes_en_proceso ?? 0}
              accentColor="oklch(0.65 0.16 75)"
              bgColor="oklch(0.78 0.16 75 / 0.1)"
            />
            <StatCard
              id="stat-reportes-cerrados"
              icon={<CheckCheck size={20} color="#388C35" />}
              label="Reportes cerrados"
              value={stats?.reportes_cerrados ?? 0}
              accentColor="#388C35"
              bgColor="#388C3518"
            />
          </div>
        )}
      </section>

      {/* ════════ § 2. MAPA EN VIVO ═════════════════════════════════════════ */}
      <section
        id="dashboard-mapa-vivo"
        className="section-card"
        style={{ padding: '1.5rem' }}
      >
        <DashboardLiveMapEmbed maxCards={3} />
      </section>

      {/* ════════ § 3. ALERTAS RECIENTES ════════════════════════════════════ */}
      <section id="dashboard-alertas" className="section-card" style={{ padding: '1.5rem' }}>
        <SectionHeader
          icon={<Bell size={17} color="white" />}
          title="Alertas recientes"
          subtitle="Situaciones que requieren atención"
          action={
            <button
              id="dashboard-ver-reportes"
              onClick={() => navigate('/reportes')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.875rem',
                background: 'transparent',
                color: '#1763A6',
                border: '1px solid #1763A640',
                borderRadius: '0.5rem',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1763A60F')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <FileWarning size={13} />
              Ver reportes
            </button>
          }
        />

        {isLoadingActividad ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 0', color: 'var(--text)' }}>
            <Loader2 size={18} style={{ animation: 'spin-loop 0.9s linear infinite' }} />
            <span style={{ fontSize: '0.875rem' }}>Cargando alertas...</span>
          </div>
        ) : alertas.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '2.5rem',
            background: 'var(--muted)',
            borderRadius: '0.75rem',
            gap: '0.75rem',
          }}>
            <CheckCircle2 size={28} style={{ color: '#90BF49' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-h)', fontSize: '0.9rem' }}>
                Sin alertas pendientes
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text)' }}>
                El sistema opera sin incidencias en este momento
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
            {alertas.map((alerta) => (
              <div
                key={alerta.id}
                style={{
                  display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
                  padding: '1rem',
                  background: 'var(--muted)',
                  border: '1px solid var(--panel-border)',
                  borderLeft: `3px solid ${alerta.colorEstado}`,
                  borderRadius: '0.75rem',
                }}
              >
                {/* Icono */}
                <div style={{
                  width: 32, height: 32, borderRadius: '0.5rem',
                  background: `linear-gradient(135deg, ${alerta.colorEstado}, oklch(0.42 0.14 250))`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {alerta.icono}
                </div>

                {/* Contenido */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-h)' }}>
                      {alerta.titulo}
                    </span>
                    <span style={{
                      padding: '0.15rem 0.45rem',
                      borderRadius: '999px',
                      fontSize: '0.68rem', fontWeight: 700,
                      color: alerta.colorEstado,
                      background: alerta.bgEstado,
                    }}>
                      {alerta.estado}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.35rem', fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                    {alerta.descripcion}
                  </p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                    {alerta.fecha}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ════════ § 4. ACCESOS RÁPIDOS ══════════════════════════════════════ */}
      <section id="dashboard-accesos-rapidos" className="section-card" style={{ padding: '1.5rem' }}>
        <SectionHeader
          icon={<Settings2 size={17} color="white" />}
          title="Accesos rápidos"
          subtitle="Navega directamente a los módulos principales"
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          <QuickBtn
            id="quickbtn-nueva-asignacion"
            icon={<Plus size={22} color="white" />}
            label="Nueva asignación"
            description="Programar ruta con camión y conductor"
            onClick={() => navigate('/asignaciones/nueva')}
            gradient="linear-gradient(135deg, #4f46e5, #7c3aed)"
          />
          <QuickBtn
            id="quickbtn-mapa-vivo"
            icon={<Satellite size={22} color="white" />}
            label="Mapa en Vivo"
            description="Monitorear recorridos en tiempo real"
            onClick={() => navigate('/mapa-vivo')}
            gradient="linear-gradient(135deg, #1763A6, #152C40)"
          />
          <QuickBtn
            id="quickbtn-reportes"
            icon={<FileWarning size={22} color="white" />}
            label="Reportes ciudadanos"
            description="Gestionar reportes recibidos"
            onClick={() => navigate('/reportes')}
            gradient="linear-gradient(135deg, oklch(0.58 0.22 25), oklch(0.48 0.18 30))"
          />
          <QuickBtn
            id="quickbtn-historial"
            icon={<History size={22} color="white" />}
            label="Historial de recorridos"
            description="Consultar recorridos completados"
            onClick={() => navigate('/historial')}
            gradient="linear-gradient(135deg, #388C35, #90BF49)"
          />
          <QuickBtn
            id="quickbtn-camiones"
            icon={<Truck size={22} color="white" />}
            label="Administrar camiones"
            description="Ver y editar flota vehicular"
            onClick={() => navigate('/camiones')}
            gradient="linear-gradient(135deg, #0ea5e9, #0369a1)"
          />
          <QuickBtn
            id="quickbtn-rutas"
            icon={<Map size={22} color="white" />}
            label="Administrar rutas"
            description="Ver y editar rutas de servicio"
            onClick={() => navigate('/rutas')}
            gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          />
        </div>
      </section>

      {/* ════════ § 5. ACTIVIDAD RECIENTE ═══════════════════════════════════ */}
      <section id="dashboard-actividad">
        <SectionHeader
          icon={<History size={17} color="white" />}
          title="Actividad reciente"
          subtitle="Últimos registros del sistema"
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>

          {/* — Últimas asignaciones — */}
          <div className="section-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays size={16} style={{ color: '#4f46e5' }} />
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-h)', fontFamily: 'var(--font-display)' }}>
                  Asignaciones
                </span>
              </div>
              <button
                id="actividad-ver-asignaciones"
                onClick={() => navigate('/asignaciones')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.3rem 0.625rem',
                  background: 'transparent', color: '#1763A6',
                  border: '1px solid #1763A640', borderRadius: '0.4rem',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Ver más <ChevronRight size={12} />
              </button>
            </div>

            {isLoadingActividad ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.8rem', padding: '1rem 0' }}>
                <Loader2 size={14} style={{ animation: 'spin-loop 0.9s linear infinite' }} />
                Cargando...
              </div>
            ) : (actividad?.asignaciones ?? []).length === 0 ? (
              <p style={{ color: 'var(--text)', fontSize: '0.8rem', padding: '1rem 0' }}>
                No hay asignaciones recientes.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {(actividad?.asignaciones ?? []).map((a, i) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.625rem 0',
                      borderBottom: i < (actividad?.asignaciones ?? []).length - 1 ? '1px solid var(--panel-border)' : 'none',
                    }}
                  >
                    {/* Color dot */}
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: a.ruta_color || '#1763A6',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.ruta_nombre}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text)' }}>
                        {a.numero_economico} · {formatDateShort(a.fecha_programada)}
                      </div>
                    </div>
                    <span style={{
                      padding: '0.15rem 0.45rem',
                      borderRadius: '999px',
                      fontSize: '0.68rem', fontWeight: 700,
                      color: a.estatus_recorrido === 'Completado' ? '#388C35'
                        : a.estatus_recorrido === 'En progreso' ? '#1763A6'
                        : 'oklch(0.50 0.12 75)',
                      background: a.estatus_recorrido === 'Completado' ? '#388C3518'
                        : a.estatus_recorrido === 'En progreso' ? '#1763A618'
                        : 'oklch(0.78 0.16 75 / 0.12)',
                      flexShrink: 0,
                    }}>
                      {a.estatus_recorrido}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* — Últimos recorridos completados — */}
          <div className="section-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} style={{ color: '#388C35' }} />
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-h)', fontFamily: 'var(--font-display)' }}>
                  Recorridos completados
                </span>
              </div>
              <button
                id="actividad-ver-historial"
                onClick={() => navigate('/historial')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.3rem 0.625rem',
                  background: 'transparent', color: '#1763A6',
                  border: '1px solid #1763A640', borderRadius: '0.4rem',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Ver más <ChevronRight size={12} />
              </button>
            </div>

            {isLoadingActividad ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.8rem', padding: '1rem 0' }}>
                <Loader2 size={14} style={{ animation: 'spin-loop 0.9s linear infinite' }} />
                Cargando...
              </div>
            ) : (actividad?.recorridos ?? []).length === 0 ? (
              <p style={{ color: 'var(--text)', fontSize: '0.8rem', padding: '1rem 0' }}>
                No hay recorridos completados aún.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {(actividad?.recorridos ?? []).map((r, i) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.625rem 0',
                      borderBottom: i < (actividad?.recorridos ?? []).length - 1 ? '1px solid var(--panel-border)' : 'none',
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: r.ruta_color || '#388C35',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.ruta_nombre}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text)' }}>
                        {r.numero_economico} · {r.hora_fin ? formatDate(r.hora_fin) : '—'}
                      </div>
                    </div>
                    <span style={{
                      padding: '0.15rem 0.45rem', borderRadius: '999px',
                      fontSize: '0.68rem', fontWeight: 700,
                      color: '#388C35', background: '#388C3518', flexShrink: 0,
                    }}>
                      Completado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* — Últimos reportes ciudadanos — */}
          <div className="section-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileWarning size={16} style={{ color: 'oklch(0.58 0.22 25)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-h)', fontFamily: 'var(--font-display)' }}>
                  Reportes ciudadanos
                </span>
              </div>
              <button
                id="actividad-ver-reportes"
                onClick={() => navigate('/reportes')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.3rem 0.625rem',
                  background: 'transparent', color: '#1763A6',
                  border: '1px solid #1763A640', borderRadius: '0.4rem',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Ver más <ChevronRight size={12} />
              </button>
            </div>

            {isLoadingActividad ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.8rem', padding: '1rem 0' }}>
                <Loader2 size={14} style={{ animation: 'spin-loop 0.9s linear infinite' }} />
                Cargando...
              </div>
            ) : (actividad?.reportes ?? []).length === 0 ? (
              <p style={{ color: 'var(--text)', fontSize: '0.8rem', padding: '1rem 0' }}>
                No hay reportes recientes.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {(actividad?.reportes ?? []).map((r, i) => {
                  const estadoColor = r.estado === 'Cerrado' ? '#388C35'
                    : r.estado === 'En proceso' ? '#1763A6'
                    : 'oklch(0.58 0.22 25)';
                  const estadoBg = r.estado === 'Cerrado' ? '#388C3518'
                    : r.estado === 'En proceso' ? '#1763A618'
                    : 'oklch(0.58 0.22 25 / 0.1)';
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                        padding: '0.625rem 0',
                        borderBottom: i < (actividad?.reportes ?? []).length - 1 ? '1px solid var(--panel-border)' : 'none',
                      }}
                    >
                      <FileWarning size={13} style={{ color: estadoColor, marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-h)' }}>
                          {r.tipo_reporte}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.descripcion?.slice(0, 50) || r.direccion_referencia || '—'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)', marginTop: '0.1rem' }}>
                          {formatDate(r.fecha_reporte)}
                        </div>
                      </div>
                      <span style={{
                        padding: '0.15rem 0.45rem', borderRadius: '999px',
                        fontSize: '0.68rem', fontWeight: 700,
                        color: estadoColor, background: estadoBg, flexShrink: 0,
                      }}>
                        {r.estado}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer info */}
      <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--muted-foreground)', paddingBottom: '0.5rem' }}>
        Última actualización: {lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        {' · '}CleanGo Logística Urbana
      </div>
    </div>
  );
};
