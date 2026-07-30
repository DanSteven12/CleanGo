import { motion } from 'framer-motion';
import { Leaf, Navigation, Map } from 'lucide-react';
import Spotlight from '@/components/ui/Spotlight';
import CleanGoMapSimulation from './CleanGoMapSimulation';

export default function AboutSection() {
  return (
    <section id="tecnologia" className="relative w-full overflow-hidden bg-bg py-24 sm:py-32">
      <Spotlight className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h2 className="mb-4 font-display text-3xl font-medium tracking-tight text-white sm:text-4xl md:text-5xl">
              ¿Qué es <span className="text-brand-soft">CleanGo</span>?
            </h2>
            <p className="mb-8 text-base leading-relaxed text-ink-muted sm:text-lg">
              CleanGo es una plataforma digital para la gestión y supervisión de la recolección de residuos sólidos urbanos. Centraliza la administración de rutas, unidades y conductores,
              permitiendo monitorear los recorridos en tiempo real mediante Google Maps, registrar el cumplimiento de checkpoints y consultar el historial operativo desde un único panel de control.
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: Navigation,
                  title: 'Monitoreo en Tiempo Real',
                  description:
                    'Visualiza la ubicación de las unidades, el avance de los recorridos y el estado operativo de cada ruta desde un mapa centralizado.',
                },
                {
                  icon: Leaf,
                  title: 'Administración Integral',
                  description:
                    'Gestiona rutas, conductores, unidades y horarios desde una plataforma diseñada para optimizar la operación de los servicios públicos municipales.',
                },
                {
                  icon: Map,
                  title: 'Información para la Toma de Decisiones',
                  description:
                    'Consulta historiales de recorridos, cumplimiento de checkpoints y estadísticas operativas que facilitan la supervisión y la mejora continua del servicio.',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.15, ease: 'easeOut' }}
                  className="flex gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[.08] bg-white/[.03] backdrop-blur-sm">
                    <item.icon className="h-5 w-5 text-brand-soft" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{item.title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Premium live dashboard simulation ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="relative flex justify-center"
          >
            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-3xl border border-white/[.08] bg-white/[.02] backdrop-blur-md shadow-2xl">
              {/* Ambient glow layers */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-brand-soft/20 via-transparent to-transparent opacity-30" />
              <div className="pointer-events-none absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-[80px]" />
              {/* Simulation fills the whole container */}
              <div className="absolute inset-0">
                <CleanGoMapSimulation />
              </div>
            </div>
          </motion.div>
        </div>
      </Spotlight>
    </section>
  );
}
