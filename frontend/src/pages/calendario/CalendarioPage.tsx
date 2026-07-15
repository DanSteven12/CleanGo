import React, { useEffect, useState, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
// Locale español: importado explícitamente para traducción completa de FullCalendar
import esLocale from '@fullcalendar/core/locales/es';
import { Calendar, Route, Truck, HardHat, TriangleAlert, CheckCircle2, Clock, CalendarDays, CalendarClock, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import '../../assets/styles/routes.css';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Horario {
  id: number;
  ruta_id: number;
  ruta_nombre?: string;
  dia_semana: 'Lunes'|'Martes'|'Miércoles'|'Jueves'|'Viernes'|'Sábado'|'Domingo';
  hora_inicio_estimada: string;
  hora_fin_estimada: string;
}

interface AsignacionRecord {
  id: number;
  ruta_id: number;
  ruta_nombre: string;
  ruta_color: string;
  camion_id: number;
  numero_economico: string;
  placa: string;
  conductor_id: number;
  conductor_nombre: string;
  num_licencia: string;
  fecha_programada: string;
  horario_inicio: string;
  horario_fin: string;
  estatus_recorrido: string;
}

interface Incidencia {
  id: number;
  asignacion_id: number;
  tipo: 'Suspensión' | 'Reprogramación' | 'Cambio de horario' | 'Clima' | 'Evento';
  motivo: string;
  fecha_nueva?: string;
  hora_nueva?: string;
  descripcion?: string;
  estatus: 'Activa' | 'Aplicada' | 'Resuelta';
}

const dayMap: Record<string, number> = {
  'Domingo': 0,
  'Lunes': 1,
  'Martes': 2,
  'Miércoles': 3,
  'Jueves': 4,
  'Viernes': 5,
  'Sábado': 6,
};

// Tipos que representan cambios definitivos (permanentes)
const TIPOS_PERMANENTES = ['Reprogramación', 'Cambio de horario'];

// ─── CalendarioPage Component ───────────────────────────────────────────────

export const CalendarioPage: React.FC = () => {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionRecord[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resH, resA, resI] = await Promise.all([
        fetch('/api/horarios'),
        fetch('/api/asignaciones'),
        fetch('/api/incidencias')
      ]);

      if (!resH.ok) throw new Error('Error al cargar horarios');
      if (!resA.ok) throw new Error('Error al cargar asignaciones');
      if (!resI.ok) throw new Error('Error al cargar incidencias');

      setHorarios(await resH.json());
      setAsignaciones(await resA.json());
      setIncidencias(await resI.json());
    } catch (error) {
      console.error('[CalendarioPage] Error fetching data:', error);
      toast.error('Error al cargar los datos del calendario.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Process Events ───────────────────────────────────────────────────────

  const events = useMemo(() => {
    const calendarEvents: any[] = [];

    // 1. Horarios base recurrentes
    horarios.forEach(h => {
      const dayOfWeek = dayMap[h.dia_semana];
      if (dayOfWeek !== undefined) {
        calendarEvents.push({
          id: `horario-${h.id}`,
          title: `[Base] ${h.ruta_nombre || 'Ruta'}`,
          daysOfWeek: [dayOfWeek],
          startTime: h.hora_inicio_estimada,
          endTime: h.hora_fin_estimada,
          backgroundColor: '#e2e8f0',
          borderColor: '#cbd5e1',
          textColor: '#475569',
          extendedProps: {
            isBase: true,
            horario: h
          }
        });
      }
    });

    // Lookup para incidencias activas o aplicadas por asignacion_id
    // Se incluye 'Aplicada' para que las reprogramaciones/cambios de horario sigan coloreando el calendario
    const incidenciasActivas = incidencias.filter(i => i.estatus === 'Activa' || i.estatus === 'Aplicada');
    const incidenciasMap = new Map<number, Incidencia>();
    incidenciasActivas.forEach(i => incidenciasMap.set(i.asignacion_id, i));

    // 2. Asignaciones
    asignaciones.forEach(a => {
      const incidencia = incidenciasMap.get(a.id);

      // Fecha y horario ya actualizados directamente en la asignación para
      // Reprogramación y Cambio de horario. No se hace override aquí.
      const startStr = a.fecha_programada ? a.fecha_programada.split('T')[0] : '';
      const startTime = a.horario_inicio ? a.horario_inicio.slice(0, 5) : '08:00';
      const endTime = a.horario_fin ? a.horario_fin.slice(0, 5) : '16:00';

      let backgroundColor = a.ruta_color || '#1763A6';
      let borderColor = backgroundColor;
      let title = a.ruta_nombre || `Asignación #${a.id}`;
      let isSuspended = false;

      // Colores según tipo de incidencia activa
      if (incidencia) {
        if (incidencia.tipo === 'Suspensión') {
          backgroundColor = '#ef4444';
          borderColor = '#dc2626';
          title = `[Suspendida] ${title}`;
          isSuspended = true;
        } else if (incidencia.tipo === 'Clima') {
          backgroundColor = '#3b82f6';
          borderColor = '#2563eb';
          title = `[Clima] ${title}`;
        } else if (incidencia.tipo === 'Evento') {
          backgroundColor = '#8b5cf6';
          borderColor = '#7c3aed';
          title = `[Evento] ${title}`;
        } else if (TIPOS_PERMANENTES.includes(incidencia.tipo)) {
          // Reprogramación / Cambio de horario ya aplicados — color ámbar como indicador histórico
          backgroundColor = '#f59e0b';
          borderColor = '#d97706';
        }
      }

      if (startStr) {
        calendarEvents.push({
          id: `asignacion-${a.id}`,
          title,
          start: `${startStr}T${startTime}:00`,
          end: `${startStr}T${endTime}:00`,
          backgroundColor,
          borderColor,
          extendedProps: {
            isBase: false,
            asignacion: a,
            incidencia,
            isSuspended
          }
        });
      }
    });

    return calendarEvents;
  }, [horarios, asignaciones, incidencias]);

  // ─── Summary Stats ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    let scheduledToday = 0;
    let activeReschedules = 0;
    let activeSuspensions = 0;

    asignaciones.forEach(a => {
      const dateStr = a.fecha_programada ? a.fecha_programada.split('T')[0] : '';
      if (dateStr === todayStr) scheduledToday++;
    });

    incidencias.forEach(i => {
      if (i.estatus === 'Activa') {
        if (i.tipo === 'Suspensión') activeSuspensions++;
        if (TIPOS_PERMANENTES.includes(i.tipo)) activeReschedules++;
      }
    });

    return { scheduledToday, activeReschedules, activeSuspensions };
  }, [asignaciones, incidencias]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderEventContent = (eventInfo: any) => {
    const { isBase, incidencia, isSuspended } = eventInfo.event.extendedProps;

    if (isBase) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px', overflow: 'hidden' }}>
          <Clock size={12} style={{ opacity: 0.7 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {eventInfo.event.title}
          </span>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', padding: '2px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {eventInfo.timeText} {eventInfo.event.title}
          </strong>
        </div>
        {incidencia && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
            <TriangleAlert size={9} style={{ color: '#fff', flexShrink: 0 }} />
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              color: '#fff',
              background: 'rgba(0,0,0,0.35)',
              borderRadius: '3px',
              padding: '0 3px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>{incidencia.tipo}</span>
          </div>
        )}
      </div>
    );
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event);
  };

  const closeDialog = () => setSelectedEvent(null);

  return (
    <div className="routes-page">
      <section className="routes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', minHeight: 'calc(100vh - 3rem)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Vista General de Calendario</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '0.2rem', marginBottom: 0 }}>Programación dinámica de asignaciones e incidencias</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'oklch(0.30 0.06 250 / 0.5)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <CalendarDays size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text)', margin: 0 }}>Programados hoy</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>{stats.scheduledToday}</p>
            </div>
          </div>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'oklch(0.30 0.06 250 / 0.5)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <CalendarClock size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text)', margin: 0 }}>Reprogramaciones</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>{stats.activeReschedules}</p>
            </div>
          </div>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'oklch(0.30 0.06 250 / 0.5)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <TriangleAlert size={20} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text)', margin: 0 }}>Suspensiones</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>{stats.activeSuspensions}</p>
            </div>
          </div>
        </div>

        {/* Calendar Container */}
        <div style={{ flex: 1, background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '0.75rem', padding: '1.5rem', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text)' }}>
              <Loader2 size={24} className="spin" style={{ color: 'var(--accent)' }} />
              Cargando calendario...
            </div>
          ) : (
            <style>
              {`
                .fc-theme-standard td, .fc-theme-standard th { border-color: var(--panel-border); }
                .fc .fc-toolbar-title { font-family: var(--font-display); font-size: 1.25rem; color: var(--text-h); }
                .fc .fc-button-primary { background-color: var(--accent); border-color: var(--accent); color: var(--accent-foreground); }
                .fc .fc-button-primary:not(:disabled):active, .fc .fc-button-primary:not(:disabled).fc-button-active { background-color: oklch(0.52 0.14 250); border-color: oklch(0.52 0.14 250); }
                .fc .fc-daygrid-day.fc-day-today { background-color: oklch(0.30 0.06 250 / 0.2) !important; }
                .fc .fc-event { border-radius: 4px; cursor: pointer; transition: transform 0.15s ease; border: none; }
                .fc .fc-event:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .fc-timegrid-slot-label-cushion, .fc-col-header-cell-cushion { color: var(--text); }
                .fc .fc-daygrid-day-number { color: var(--text); }
                .fc .fc-list-event-title a { color: var(--text-h); }
                .fc .fc-list-day-cushion { background: var(--panel-border); }
              `}
            </style>
          )}

          {!isLoading && (
            <div style={{ height: 'calc(100vh - 16rem)', minHeight: '600px' }}>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                locale={esLocale}
                events={events}
                eventContent={renderEventContent}
                eventClick={handleEventClick}
                height="100%"
                slotMinTime="05:00:00"
                slotMaxTime="22:00:00"
                nowIndicator={true}
                buttonText={{
                  today: 'Hoy',
                  month: 'Mes',
                  week: 'Semana',
                  day: 'Día',
                  list: 'Agenda'
                }}
              />
            </div>
          )}
        </div>

      </section>

      {/* Modal / Dialog de Detalles */}
      {selectedEvent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
            borderRadius: '1rem', width: '100%', maxWidth: '450px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden'
          }}>
            {/* Header del modal */}
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid var(--panel-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              background: selectedEvent.backgroundColor
            }}>
              <h3 style={{ margin: 0, color: selectedEvent.extendedProps.isBase ? '#1e293b' : '#fff', fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {selectedEvent.title}
              </h3>
              <button onClick={closeDialog} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '0.25rem', cursor: 'pointer', color: selectedEvent.extendedProps.isBase ? '#475569' : '#fff' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body del modal */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {selectedEvent.extendedProps.isBase ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Route size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                      Ruta: <strong style={{ color: 'var(--text-h)' }}>{selectedEvent.extendedProps.horario.ruta_nombre}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Clock size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                      Horario Base: <strong style={{ color: 'var(--text-h)' }}>{selectedEvent.extendedProps.horario.dia_semana} de {selectedEvent.extendedProps.horario.hora_inicio_estimada} a {selectedEvent.extendedProps.horario.hora_fin_estimada}</strong>
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--muted)', borderRadius: '0.5rem', fontSize: '0.8rem', color: 'var(--text)' }}>
                    Este es un horario de referencia recurrente. Las asignaciones reales confirmarán el camión y conductor.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Calendar size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                      Fecha y Hora: <strong style={{ color: 'var(--text-h)' }}>
                        {selectedEvent.start?.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                      </strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Truck size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                      Camión: <strong style={{ color: 'var(--text-h)' }}>{selectedEvent.extendedProps.asignacion.numero_economico} ({selectedEvent.extendedProps.asignacion.placa})</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <HardHat size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                      Conductor: <strong style={{ color: 'var(--text-h)' }}>{selectedEvent.extendedProps.asignacion.conductor_nombre}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                      Estatus del Recorrido: <span style={{
                        background: 'var(--panel-border)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600, color: 'var(--text-h)'
                      }}>{selectedEvent.extendedProps.asignacion.estatus_recorrido}</span>
                    </span>
                  </div>

                  {selectedEvent.extendedProps.incidencia && (
                    <div style={{
                      marginTop: '0.5rem', padding: '1rem',
                      background: selectedEvent.extendedProps.isSuspended ? '#fef2f2' : '#fffbeb',
                      border: `1px solid ${selectedEvent.extendedProps.isSuspended ? '#fca5a5' : '#fde68a'}`,
                      borderRadius: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: selectedEvent.extendedProps.isSuspended ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                        <TriangleAlert size={16} />
                        {TIPOS_PERMANENTES.includes(selectedEvent.extendedProps.incidencia.tipo)
                          ? `Historial — ${selectedEvent.extendedProps.incidencia.tipo}`
                          : `Incidencia Activa: ${selectedEvent.extendedProps.incidencia.tipo}`
                        }
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                        <strong>Motivo:</strong> {selectedEvent.extendedProps.incidencia.motivo}
                      </p>
                      {selectedEvent.extendedProps.incidencia.descripcion && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#475569' }}>
                          <strong>Detalle:</strong> {selectedEvent.extendedProps.incidencia.descripcion}
                        </p>
                      )}
                      {TIPOS_PERMANENTES.includes(selectedEvent.extendedProps.incidencia.tipo) && (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#92400e', fontStyle: 'italic' }}>
                          Este cambio fue aplicado definitivamente a la programación de esta asignación.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
