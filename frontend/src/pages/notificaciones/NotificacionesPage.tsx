import React, { useState } from 'react';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import { useConfirm } from '../../hooks/useConfirm';
import { triggerRichToast } from '../../hooks/useRichToast';
import { crearAvisoManual } from '../../services/notificacionesService';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import {
  Bell,
  FileWarning,
  MapPinned,
  Route,
  Loader2,
  CheckCircle2,
  Circle,
  Inbox,
  Send,
  Megaphone,
  Check,
  CheckCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  Sparkles,
  RotateCcw,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NotificacionCategoria, Notificacion, NotificacionDestinatario, NotificacionTipo } from '../../types/notificaciones';
import { formatRelativeDate } from '../../utils/formatRelativeDate';
import { Header } from '../../components/layout/Header';
import { PageSectionHeader } from '../../components/layout/PageSectionHeader';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryIcon(categoria: NotificacionCategoria) {
  switch (categoria) {
    case 'REPORTE': return <FileWarning size={18} />;
    case 'RECORRIDO': return <MapPinned size={18} />;
    case 'RUTA': return <Route size={18} />;
    case 'AVISO':
    default:
      return <Bell size={18} />;
  }
}

function getCategoryColor(categoria: NotificacionCategoria, leida: boolean) {
  if (leida) return '#64748B'; // slate-500
  switch (categoria) {
    case 'REPORTE': return '#DC2626'; // Red
    case 'RECORRIDO': return '#2563EB'; // Blue
    case 'RUTA': return '#16A34A'; // Green
    case 'AVISO':
    default:
      return '#D97706'; // Amber
  }
}

// ─── Components ───────────────────────────────────────────────────────────────

const NotificacionSkeleton: React.FC = () => (
  <Card className="flex flex-row p-4 gap-4 animate-pulse opacity-70 bg-white dark:bg-[var(--card)] border-[var(--border)]">
    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[oklch(0.25_0.02_250)] flex-shrink-0" />
    <div className="flex flex-col gap-2 flex-1 pt-1">
      <div className="h-4 w-1/3 bg-slate-200 dark:bg-[oklch(0.25_0.02_250)] rounded" />
      <div className="h-3 w-2/3 bg-slate-200 dark:bg-[oklch(0.25_0.02_250)] rounded" />
      <div className="h-3 w-1/4 bg-slate-200 dark:bg-[oklch(0.25_0.02_250)] rounded mt-2" />
    </div>
  </Card>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
    <div className="w-16 h-16 rounded-full bg-[oklch(0.25_0.02_250_/_0.5)] flex items-center justify-center mb-4 text-[oklch(0.6_0.04_250)]">
      <Inbox size={28} strokeWidth={1.5} />
    </div>
    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
      Todo al día
    </h3>
    <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
      No hay notificaciones registradas en el sistema en este momento.
    </p>
  </div>
);

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const BandejaTab: React.FC = () => {
  const confirm = useConfirm();
  const { 
    notificaciones, 
    totalRegistros, 
    summary,
    loading, 
    error, 
    filtros, 
    actualizarFiltro, 
    cambiarPagina, 
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotif,
    limpiarLeidas,
  } = useNotificaciones();
  
  const [openingId, setOpeningId] = useState<number | null>(null);

  const handleOpen = async (notif: Notificacion) => {
    if (notif.leida) return;
    setOpeningId(notif.id);
    await marcarLeida(notif.id);
    setOpeningId(null);
  };

  const handleDeleteNotificacion = async (e: React.MouseEvent, notif: Notificacion) => {
    e.stopPropagation();
    const accepted = await confirm({
      title: 'Eliminar notificación',
      message: (
        <div className="flex flex-col gap-2 text-left">
          <p className="text-sm text-slate-300">
            ¿Estás seguro de que deseas eliminar esta notificación?
          </p>
          <div className="p-3 bg-slate-800/80 rounded-lg text-sm border border-slate-700/80 mt-1">
            <p className="font-semibold text-white">{notif.titulo}</p>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notif.mensaje}</p>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Esta acción solo la removerá de tu lista y no afectará registros ni reportes vinculados.
          </p>
        </div>
      ),
      variant: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (accepted) {
      await eliminarNotif(notif.id);
    }
  };

  const hasReadNotifications = notificaciones.some((n) => n.leida) || (totalRegistros > summary.unread);

  const handleLimpiarLeidas = async () => {
    const accepted = await confirm({
      title: 'Limpiar notificaciones leídas',
      message: (
        <div className="flex flex-col gap-2 text-left">
          <p className="text-sm text-slate-300">
            ¿Deseas eliminar todas las notificaciones que ya han sido leídas?
          </p>
          <p className="text-xs text-slate-400">
            Las notificaciones pendientes (no leídas) se conservarán en tu bandeja para que no pierdas ningún evento pendiente.
          </p>
        </div>
      ),
      variant: 'warning',
      confirmText: 'Limpiar leídas',
      cancelText: 'Cancelar',
    });

    if (accepted) {
      await limpiarLeidas();
    }
  };

  const hasActiveFilters = filtros.leida !== undefined || (!!filtros.categoria && filtros.categoria !== 'ALL') || (!!filtros.tipo && filtros.tipo !== 'ALL');

  const limit = filtros.limit || 10;
  const currentPage = filtros.page || 1;
  const totalPages = Math.ceil(totalRegistros / limit) || 1;
  const startRecord = totalRegistros === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalRegistros);

  return (
    <div className="flex flex-col gap-4 mt-4">
      {/* ── Summary & Actions Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {summary.unread} sin leer
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">·</span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {summary.thisWeek} esta semana
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasReadNotifications && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLimpiarLeidas}
              className="flex items-center gap-1.5 text-xs font-semibold h-8 text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/50 transition-colors"
            >
              <Trash2 size={14} />
              Limpiar leídas
            </Button>
          )}

          {summary.unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={marcarTodasLeidas}
              className="flex items-center gap-1.5 text-xs font-semibold h-8 text-[var(--primary)] border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 transition-colors"
            >
              <CheckCheck size={15} />
              Marcar todas como leídas
            </Button>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--card)]/90 backdrop-blur-xs p-3.5 rounded-xl border border-[var(--border)] shadow-xs transition-all">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] px-1 mr-0.5 select-none">
          <SlidersHorizontal size={14} className="text-[var(--primary)]" />
          <span>Filtros:</span>
        </div>

        <Select
          value={filtros.leida === undefined ? 'ALL' : String(filtros.leida)}
          onChange={(e) => actualizarFiltro({ leida: e.target.value === 'ALL' ? 'ALL' : e.target.value === 'true' })}
          icon={<CheckCircle2 size={15} />}
          isFiltered={filtros.leida !== undefined}
          containerClassName="min-w-[170px]"
        >
          <option value="ALL">Todos los estados</option>
          <option value="false">No leídas</option>
          <option value="true">Leídas</option>
        </Select>
        
        <Select
          value={filtros.categoria || 'ALL'}
          onChange={(e) => actualizarFiltro({ categoria: e.target.value as NotificacionCategoria | 'ALL' })}
          icon={<Layers size={15} />}
          isFiltered={!!filtros.categoria && filtros.categoria !== 'ALL'}
          containerClassName="min-w-[185px]"
        >
          <option value="ALL">Todas las categorías</option>
          <option value="REPORTE">Reportes</option>
          <option value="RECORRIDO">Recorridos</option>
          <option value="RUTA">Rutas</option>
          <option value="AVISO">Avisos</option>
        </Select>

        <Select
          value={filtros.tipo || 'ALL'}
          onChange={(e) => actualizarFiltro({ tipo: e.target.value as NotificacionTipo | 'ALL' })}
          icon={<Sparkles size={15} />}
          isFiltered={!!filtros.tipo && filtros.tipo !== 'ALL'}
          containerClassName="min-w-[170px]"
        >
          <option value="ALL">Todos los tipos</option>
          <option value="AUTOMATICA">Automáticas</option>
          <option value="MANUAL">Manuales</option>
        </Select>

        {hasActiveFilters && (
          <button
            onClick={() => actualizarFiltro({ leida: 'ALL', categoria: 'ALL', tipo: 'ALL' })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-colors ml-auto cursor-pointer"
            title="Restablecer filtros"
          >
            <RotateCcw size={13} />
            <span>Restablecer</span>
          </button>
        )}
      </div>

      {error ? (
        <Card className="p-4 border-red-500/20 bg-red-500/10 text-red-400">
          <p>{error}</p>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
            <NotificacionSkeleton />
            <NotificacionSkeleton />
            <NotificacionSkeleton />
          </motion.div>
        ) : notificaciones.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyState />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial="hidden" animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
            className="flex flex-col gap-3"
          >
            <AnimatePresence>
            {notificaciones.map((notif) => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <Card
                  onClick={() => handleOpen(notif)}
                  className={`
                    flex flex-row p-4 gap-4 transition-all duration-200 
                    ${!notif.leida 
                      ? 'cursor-pointer bg-[#F0F7FF] dark:bg-[oklch(0.22_0.03_250)] border border-blue-200/80 dark:border-blue-900/50 shadow-sm border-l-4 border-l-[#1763A6] hover:bg-[#E5F1FF] dark:hover:bg-[oklch(0.24_0.03_250)]' 
                      : 'bg-white dark:bg-[var(--card)] border-transparent shadow-none hover:bg-slate-50/80 dark:hover:bg-[oklch(0.22_0.02_250)]'}
                  `}
                >
                {/* Left icon wrapper */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ 
                    backgroundColor: !notif.leida ? `${getCategoryColor(notif.categoria, false)}18` : '#F3F4F6',
                    color: getCategoryColor(notif.categoria, notif.leida) 
                  }}
                >
                  {getCategoryIcon(notif.categoria)}
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 gap-1">
                  <div className="flex justify-between items-start gap-4">
                    <h3 
                      className={`text-sm ${!notif.leida ? 'font-semibold text-[#111827] dark:text-slate-100' : 'font-medium text-[#374151] dark:text-slate-300'}`}
                    >
                      {notif.titulo}
                    </h3>
                    <span className="text-xs whitespace-nowrap text-[#6B7280] dark:text-slate-400 font-medium">
                      {formatRelativeDate(notif.created_at)}
                    </span>
                  </div>
                  
                  <p className={`text-sm leading-snug ${!notif.leida ? 'text-[#4B5563] dark:text-slate-300' : 'text-[#6B7280] dark:text-slate-400'}`}>
                    {notif.mensaje}
                  </p>
                </div>

                {/* Status + Actions */}
                <div className="flex items-center gap-2 pl-2 flex-shrink-0">
                  {!notif.leida ? (
                    openingId === notif.id ? (
                      <Loader2 size={16} className="text-[#1763A6] animate-spin" />
                    ) : (
                      <span title="No leída" className="flex items-center">
                        <Circle size={10} className="fill-[#1763A6] text-[#1763A6]" />
                      </span>
                    )
                  ) : (
                    <span title="Leída" className="flex items-center">
                      <CheckCircle2 size={16} className="text-[#9CA3AF] dark:text-slate-500" />
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDeleteNotificacion(e, notif)}
                    title="Eliminar notificación"
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    aria-label="Eliminar notificación"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
          </AnimatePresence>
        </motion.div>
      )}
      </AnimatePresence>
      )}

      {/* ── Pagination ── */}
          {!loading && totalRegistros > 0 && (
            <div className="flex items-center justify-between mt-4 border-t border-[var(--border)] pt-4">
              <span className="text-sm text-[var(--muted-foreground)]">
                Mostrando {startRecord}–{endRecord} de {totalRegistros} notificaciones
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => cambiarPagina(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} /> Anterior
                </button>
                <button
                  onClick={() => cambiarPagina(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
    </div>
  );
};

const AvisosManualesTab: React.FC = () => {
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [destinatario, setDestinatario] = useState<NotificacionDestinatario>('CIUDADANOS');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const tituloTrim = titulo.trim();
    const mensajeTrim = mensaje.trim();

    if (!tituloTrim || !mensajeTrim) {
      setError('El título y el mensaje son obligatorios.');
      return;
    }

    if (tituloTrim.length > 150) {
      setError('El título no puede exceder los 150 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      await crearAvisoManual({
        titulo: tituloTrim,
        mensaje: mensajeTrim,
        destinatario,
        categoria: 'AVISO',
        tipo: 'MANUAL',
      });
      setSuccess(true);
      triggerRichToast({
        tipo: 'CAMION',
        titulo: 'Aviso publicado exitosamente',
        mensaje: `Se ha enviado el aviso "${tituloTrim}" a ${destinatario.toLowerCase()}.`,
        ruta: '/notificaciones',
      });
      setTitulo('');
      setMensaje('');
      setDestinatario('CIUDADANOS');
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al publicar el aviso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="p-6">
        <div className="flex flex-col gap-2 mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Megaphone size={20} className="text-[var(--primary)]" />
            Redactar Nuevo Aviso
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Crea comunicados oficiales para informar a los ciudadanos o conductores.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 border border-red-500/20 bg-red-500/10 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-6 border border-green-500/20 bg-green-500/10 text-green-400 rounded-lg text-sm flex items-center gap-2">
            <Check size={16} />
            Aviso publicado exitosamente.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Título */}
          <div className="flex flex-col gap-2">
            <label htmlFor="titulo" className="text-sm font-medium text-[var(--foreground)]">
              Título del Aviso
            </label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Suspensión del servicio de recolección"
              disabled={isSubmitting}
              maxLength={150}
            />
          </div>

          {/* Mensaje */}
          <div className="flex flex-col gap-2">
            <label htmlFor="mensaje" className="text-sm font-medium text-[var(--foreground)]">
              Mensaje Completo
            </label>
            <textarea
              id="mensaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Detalla la información que los usuarios deben conocer..."
              disabled={isSubmitting}
              rows={5}
              className="flex min-h-[80px] w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Destinatario */}
          <Select
            id="destinatario"
            label="Destinatario"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value as NotificacionDestinatario)}
            disabled={isSubmitting}
            icon={<Users size={16} />}
          >
            <option value="CIUDADANOS">Solo Ciudadanos</option>
            <option value="CONDUCTORES">Solo Conductores</option>
            <option value="AMBOS">Ciudadanos y Conductores</option>
          </Select>

          {/* Submit */}
          <div className="flex justify-end mt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !titulo.trim() || !mensaje.trim()}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Publicando...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Publicar Aviso
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const NotificacionesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bandeja' | 'manual'>('bandeja');

  return (
    <>
      <Header
        subtitle="Alertas, avisos y campañas"
        title="Centro de Notificaciones"
      />
      <PageSectionHeader
        eyebrow="COMUNICACIÓN"
        title="Centro de notificaciones"
        description="Bandeja unificada de alertas operativas, avisos municipales y campañas."
      />
      <div className="p-6 md:p-8 flex flex-col gap-6 w-full max-w-4xl mx-auto">

      {/* ── Navigation Tabs ── */}
      <div className="flex gap-6 border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('bandeja')}
          className={`
            pb-3 text-sm font-medium transition-all relative whitespace-nowrap
            ${activeTab === 'bandeja' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}
          `}
        >
          Bandeja de Notificaciones
          {activeTab === 'bandeja' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`
            pb-3 text-sm font-medium transition-all relative whitespace-nowrap
            ${activeTab === 'manual' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}
          `}
        >
          Avisos Manuales
          {activeTab === 'manual' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t-full" />
          )}
        </button>
      </div>

      {/* ── Content ── */}
      {activeTab === 'bandeja' ? <BandejaTab /> : <AvisosManualesTab />}
    </div>
    </>
  );
};
