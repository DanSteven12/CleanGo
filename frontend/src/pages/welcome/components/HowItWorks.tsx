import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Route, Truck, MapPin, Monitor, FileSpreadsheet } from 'lucide-react';
import Spotlight from '@/components/ui/Spotlight';
import { cn } from '@/lib/utils';

const steps = [
  {
    icon: Route,
    title: 'Configuración de Rutas',
    description:
      'El administrador registra las rutas de recolección, define checkpoints estratégicos y establece los horarios de operación para cada recorrido.',
  },
  {
    icon: Truck,
    title: 'Asignación de Recursos',
    description:
      'Las unidades y los conductores son asignados a cada ruta, garantizando una planificación organizada antes del inicio de la jornada.',
  },
  {
    icon: MapPin,
    title: 'Inicio y Monitoreo del Recorrido',
    description:
      'El conductor inicia el recorrido desde la aplicación móvil y la plataforma actualiza en tiempo real la ubicación, el avance y el cumplimiento de cada checkpoint.',
  },
  {
    icon: Monitor,
    title: 'Supervisión Operativa',
    description:
      'Desde el panel de control, los operadores visualizan las rutas activas, el estado de los recorridos, el progreso de las unidades y los tiempos estimados de llegada.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Historial e Indicadores',
    description:
      'Al finalizar la operación, el sistema almacena el historial del recorrido con tiempos de ejecución, checkpoints completados y estadísticas para apoyar la toma de decisiones.',
  },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track vertical scroll progress inside the timeline container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 65%', 'end 75%'],
  });

  // Smooth out scroll progress for fluid motion
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Transform scroll progress to line height percentage
  const lineHeight = useTransform(smoothProgress, [0, 1], ['0%', '100%']);

  return (
    <section id="como-funciona" className="relative w-full overflow-hidden bg-bg py-24 sm:py-32">
      <Spotlight className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-display text-3xl font-medium tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            ¿Cómo funciona <span className="text-brand-soft">CleanGo</span>?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 mx-auto max-w-2xl text-base text-ink-muted sm:text-lg"
          >
            Desde la planificación de las rutas hasta el análisis de los recorridos finalizados, CleanGo centraliza toda la
            operación de recolección de residuos en una única plataforma, ofreciendo supervisión en tiempo real y trazabilidad completa del servicio.
          </motion.p>
        </div>

        <div ref={containerRef} className="relative">
          {/* Static Background Line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-white/[.08] md:left-1/2 md:-translate-x-1/2" />

          {/* Animated Progress Line */}
          <motion.div
            style={{ height: lineHeight }}
            className="absolute left-[27px] top-4 w-px md:left-1/2 md:-translate-x-1/2 z-10 origin-top pointer-events-none"
          >
            {/* The Line gradient & glow */}
            <div
              className="h-full w-full rounded-full"
              style={{
                background: 'linear-gradient(to bottom, #84cc16, #65a30d, #4d7c0f)',
                boxShadow: '0 0 10px rgba(132, 204, 22, 0.8), 0 0 20px rgba(101, 163, 13, 0.4)',
              }}
            />

            {/* Glowing sphere at the bottom tip of animated line */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20 flex items-center justify-center">
              {/* Diffused halo */}
              <div className="absolute h-6 w-6 rounded-full bg-[#84cc16]/40 blur-sm" />

              {/* Subtle pulsing outer ring */}
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute h-4 w-4 rounded-full bg-[#84cc16]/60 blur-[1px]"
              />

              {/* Core solid glowing sphere */}
              <div className="relative h-2.5 w-2.5 rounded-full bg-[#84cc16] shadow-[0_0_10px_#84cc16,0_0_16px_#65a30d]" />
            </div>
          </motion.div>

          <div className="space-y-16">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.7, delay: index * 0.15, ease: 'easeOut' }}
                  className={cn(
                    'relative flex items-start gap-8 md:justify-between',
                    isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                  )}
                >
                  {/* Empty space for alternating layout */}
                  <div className="hidden md:block md:w-[45%]" />

                  {/* Center Node */}
                  <div className="absolute left-[13px] md:static md:left-auto flex shrink-0 justify-center z-20">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg border-4 border-bg shadow-[0_0_0_2px_rgba(255,255,255,0.08)]">
                      <div className="h-2 w-2 rounded-full bg-brand-soft shadow-[0_0_12px_rgba(144,191,73,0.8)]" />
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="ml-12 w-full md:ml-0 md:w-[45%]">
                    <div
                      className={cn(
                        'group relative overflow-hidden rounded-3xl border border-white/[.06] bg-white/[.02] p-6 backdrop-blur-sm transition-colors hover:border-brand-soft/30 hover:bg-white/[.04]',
                        isEven ? 'md:text-right' : 'md:text-left'
                      )}
                    >
                      <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                        <div className="absolute top-0 left-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-brand-soft/30 to-transparent" />
                      </div>
                      <div className={cn('mb-4 flex', isEven ? 'md:justify-end' : 'md:justify-start')}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.04] border border-white/[.08]">
                          <step.icon className="h-5 w-5 text-brand-soft" />
                        </div>
                      </div>
                      <h3 className="font-display text-xl font-medium text-white">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Spotlight>
    </section>
  );
}

