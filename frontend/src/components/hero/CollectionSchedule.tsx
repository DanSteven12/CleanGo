import { useEffect, useState } from 'react';
import { motion, useMotionTemplate } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTiltGlow } from '@/lib/useTiltGlow';

const SCHEDULE_DATA = [
  { id: 1, dayName: 'Lunes', startHour: 17, endHour: 20, displayTime: '5:00 PM – 8:00 PM' },
  { id: 2, dayName: 'Martes', startHour: 19, endHour: 20, displayTime: '7:00 PM – 8:00 PM' },
  { id: 3, dayName: 'Miércoles', startHour: 17, endHour: 20, displayTime: '5:00 PM – 8:00 PM' },
  { id: 4, dayName: 'Jueves', startHour: 17, endHour: 20, displayTime: '5:00 PM – 8:00 PM' },
  { id: 5, dayName: 'Viernes', startHour: 18, endHour: 20, displayTime: '6:00 PM – 8:00 PM' },
  { id: 6, dayName: 'Sábado', startHour: 18, endHour: 15, displayTime: '6:00 PM – 3:00 PM' },
];

function getStatus(dayId: number, startH: number, endH: number): 'Próximo' | 'En servicio' | 'Finalizado' | null {
  const now = new Date();
  if (now.getDay() !== dayId) return null;

  const current = now.getHours() + now.getMinutes() / 60;
  
  if (startH > endH) {
    if (current >= startH || current <= endH) return 'En servicio';
    if (current < startH && current > endH) return 'Próximo';
  } else {
    if (current >= startH && current <= endH) return 'En servicio';
    if (current < startH) return 'Próximo';
  }
  return 'Finalizado';
}

function ScheduleCard({ day, delay }: { day: typeof SCHEDULE_DATA[0]; delay: number }) {
  const [status, setStatus] = useState<'Próximo' | 'En servicio' | 'Finalizado' | null>(null);
  const [isToday, setIsToday] = useState(false);
  const { ref, rotateX, rotateY, glowX, glowY, onMouseMove, onMouseLeave } = useTiltGlow(5);

  const glowBgNormal = useMotionTemplate`radial-gradient(180px circle at ${glowX}px ${glowY}px, rgba(144,191,73,0.10), transparent 70%)`;
  const glowBgToday = useMotionTemplate`radial-gradient(180px circle at ${glowX}px ${glowY}px, rgba(23,99,166,0.15), transparent 70%)`;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setIsToday(now.getDay() === day.id);
      setStatus(getStatus(day.id, day.startHour, day.endHour));
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [day]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.015 }}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl transition-colors',
        isToday 
          ? 'border-ai/40 bg-ai/10 shadow-[0_8px_32px_-12px_rgba(23,99,166,0.3)]' 
          : 'border-white/[.06] bg-bg-card/60 hover:border-brand-soft/30'
      )}
    >
      {/* cursor-tracked radial glow */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: isToday ? glowBgToday : glowBgNormal }}
      />
      
      {/* Top border highlight pulse if today */}
      {isToday && (
        <motion.span
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ai to-transparent"
        />
      )}
      {!isToday && (
         <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-soft/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      )}

      <div className="relative flex items-start justify-between">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          isToday ? 'bg-ai/20 text-ai' : 'bg-white/[.04] text-brand-soft'
        )}>
          <Calendar className="h-5 w-5" strokeWidth={1.75} />
        </div>
        
        {isToday && (
          <span className="inline-flex items-center rounded-full border border-ai/30 bg-ai/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-ai">
            Hoy
          </span>
        )}
      </div>

      <div className="relative mt-4">
        <h4 className="font-display text-xl font-medium text-white">{day.dayName}</h4>
        <div className="mt-2 flex items-center gap-1.5 text-ink-muted">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">{day.displayTime}</span>
        </div>
      </div>

      {status && (
        <div className="relative mt-5 flex items-center">
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            status === 'En servicio' && 'bg-brand/10 text-brand-soft border border-brand/20',
            status === 'Próximo' && 'bg-white/5 text-white/70 border border-white/10',
            status === 'Finalizado' && 'bg-red-500/10 text-red-400 border border-red-500/20'
          )}>
            {status === 'En servicio' && <span className="h-1.5 w-1.5 rounded-full bg-brand-soft animate-pulse" />}
            {status}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default function CollectionSchedule() {
  return (
    <div className="relative z-10 mx-auto mt-24 w-full max-w-5xl px-4 sm:mt-32 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10 flex flex-col items-center text-center"
      >
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-soft">
          Horarios
        </span>
        <h3 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
          Calendario de Recolección
        </h3>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          Consulta los días y horarios programados para el servicio de recolección en tu zona.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {SCHEDULE_DATA.map((day, i) => (
          <ScheduleCard key={day.id} day={day} delay={0.1 * i} />
        ))}
      </div>
    </div>
  );
}
