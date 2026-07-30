import { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion';
import { MapPin, Bell, ShieldCheck, Map, Activity, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import Spotlight from '@/components/ui/Spotlight';
import MiniMapPreview from './features/MiniMapPreview';
import MiniRouteProgress from './features/MiniRouteProgress';
import MiniHistoryPanel from './features/MiniHistoryPanel';
import MiniControlPanel from './features/MiniControlPanel';
import MiniStatsDashboard from './features/MiniStatsDashboard';
import MiniAdminPanel from './features/MiniAdminPanel';

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  className: string;
  pattern?: boolean;
  PreviewComponent?: React.ElementType;
}

const features: FeatureItem[] = [
  {
    id: 'gps',
    title: 'Mapa en Tiempo Real',
    description:
      'Supervisa la ubicación de cada unidad de recolección mediante Google Maps con actualización continua del recorrido y posición del vehículo.',
    icon: MapPin,
    className:
      'md:col-span-2 lg:col-span-2 bg-gradient-to-br from-[#1a2318] to-bg-card',
    pattern: true,
    PreviewComponent: MiniMapPreview,
  },
  {
    id: 'realtime',
    title: 'Seguimiento de Recorridos',
    description:
      'Visualiza en tiempo real el avance de las rutas activas, la ubicación de las unidades, la distancia recorrida y el tiempo estimado de llegada.',
    icon: Map,
    className: 'md:col-span-1 lg:col-span-1 bg-bg-card/80',
    PreviewComponent: MiniRouteProgress,
  },
  {
    id: 'history',
    title: 'Historial Operativo',
    description:
      'Consulta recorridos finalizados con fechas, horarios, duración y cumplimiento de checkpoints registrados durante cada operación.',
    icon: History,
    className: 'md:col-span-1 lg:col-span-1 bg-bg-card/80',
    PreviewComponent: MiniHistoryPanel,
  },
  {
    id: 'alerts',
    title: 'Control del Recorrido',
    description:
      'Supervisa el cumplimiento de los puntos de control y el progreso de cada recorrido durante su ejecución.',
    icon: Bell,
    className:
      'md:col-span-2 lg:col-span-1 bg-gradient-to-bl from-[#101826] to-bg-card',
    PreviewComponent: MiniControlPanel,
  },
  {
    id: 'status',
    title: 'Estado de los Recorridos',
    description:
      'Consulta el estado de cada recorrido, identificando rutas pendientes, en curso y finalizadas desde un único panel.',
    icon: Activity,
    className:
      'md:col-span-3 lg:col-span-2 bg-gradient-to-t from-[#141b14] to-bg-card',
    pattern: true,
    PreviewComponent: MiniStatsDashboard,
  },
  {
    id: 'management',
    title: 'Administración Integral',
    description:
      'Administra rutas, conductores, unidades y asignaciones desde una plataforma centralizada para mantener organizada la operación municipal.',
    icon: ShieldCheck,
    className: 'md:col-span-3 lg:col-span-1 bg-bg-card/80',
    PreviewComponent: MiniAdminPanel,
  },
];

function FeatureCard({ feature, index }: { feature: FeatureItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 40 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 40 });

  // Subtle 3D tilt (max 6 degrees)
  const rotateX = useMotionTemplate`${mouseYSpring}deg`;
  const rotateY = useMotionTemplate`${mouseXSpring}deg`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct * 12); // max 6 deg
    y.set(yPct * -12);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={cn('perspective-1000', feature.className)}
      style={{ willChange: 'transform' }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        whileHover={{ scale: 1.03, y: -6 }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
        className="group relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-[28px] border border-white/[.06] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_16px_48px_rgba(144,191,73,0.15)] hover:border-brand-soft/30 transition-colors"
      >
        {feature.pattern && (
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }}
          />
        )}

        {/* Hover glow */}
        <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute top-0 left-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-brand-soft/40 to-transparent" />
        </div>

        {/* Parallax Content */}
        <motion.div
          className="relative z-10 flex h-full flex-col"
          style={{ transform: 'translateZ(30px)' }}
        >
          {feature.PreviewComponent && (
            <div className="mb-4">
              <feature.PreviewComponent />
            </div>
          )}

          <div className="mb-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[.04] border border-white/[.08] transition-colors group-hover:bg-brand/10 group-hover:border-brand-soft/30">
            <feature.icon className="h-6 w-6 text-brand-soft" />
          </div>
          <div className="mt-8">
            <h3 className="font-display text-xl font-medium text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted group-hover:text-ink-muted/90">{feature.description}</p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function FeaturesGrid() {
  const containerRef = useRef<HTMLElement>(null);

  // Track scroll progress of this section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Map scroll progress (0 to 1) to horizontal movement (e.g. from 120px to -120px)
  const xTranslation = useTransform(scrollYProgress, [0, 1], [120, -120]);

  // Apply spring for a smooth, inertial feel
  const smoothX = useSpring(xTranslation, {
    stiffness: 100,
    damping: 30,
    mass: 1
  });

  return (
    <section ref={containerRef} id="caracteristicas" className="relative w-full overflow-hidden bg-bg py-24 sm:py-32">
      <Spotlight className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-soft"
          >
            Plataforma Integral
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-3xl font-medium tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            Todo lo necesario para una<br className="hidden sm:block" /> operación impecable
          </motion.h2>
        </div>

        {/* ScrollCarousel-like Wrapper */}
        <motion.div
          style={{ x: smoothX }}
          className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-3 lg:gap-6 will-change-transform"
        >
          {features.map((feature, idx) => (
            <FeatureCard key={feature.id} feature={feature} index={idx} />
          ))}
        </motion.div>
      </Spotlight>
    </section>
  );
}
