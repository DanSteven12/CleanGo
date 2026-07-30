import { motion } from 'framer-motion';
import { Cpu, ShieldCheck, BarChart3 } from 'lucide-react';
import Spotlight from '@/components/ui/Spotlight';

const aboutCards = [
  {
    title: 'Innovación Tecnológica',
    description:
      'Desarrollamos soluciones digitales modernas que permiten optimizar la gestión de la recolección de residuos mediante monitoreo en tiempo real, seguimiento GPS y herramientas inteligentes para la toma de decisiones.',
    icon: Cpu,
  },
  {
    title: 'Confiabilidad',
    description:
      'Nuestra plataforma proporciona información precisa y actualizada sobre las rutas, unidades y recorridos, ofreciendo un mayor control operativo y transparencia en cada proceso.',
    icon: ShieldCheck,
  },
  {
    title: 'Eficiencia Operativa',
    description:
      'CleanGo facilita la supervisión de las operaciones, reduce tiempos de respuesta y mejora la administración de los servicios públicos mediante una interfaz intuitiva y datos centralizados.',
    icon: BarChart3,
  },
];

export default function AboutSection() {
  return (
    <section
      id="quienes-somos"
      className="relative w-full overflow-hidden bg-bg py-24 sm:py-32"
    >
      <Spotlight className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16">
          <div className="max-w-3xl">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-3xl font-medium tracking-tight text-white sm:text-4xl md:text-5xl"
            >
              <span className="text-brand-soft">Quiénes</span> Somos
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-4 text-base leading-8 text-ink-muted sm:text-lg"
            >
              CleanGo es una plataforma tecnológica desarrollada para modernizar
              la gestión de la recolección de residuos mediante herramientas de
              monitoreo en tiempo real, seguimiento de rutas y análisis de
              información operativa. Nuestro propósito es facilitar la
              supervisión de las unidades, optimizar los procesos y contribuir a
              una administración más eficiente, transparente y orientada a la
              toma de decisiones basada en datos.
            </motion.p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {aboutCards.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.7,
                delay: idx * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group relative flex flex-col overflow-hidden rounded-[24px] border border-white/[.06] bg-white/[.02] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-soft/30 hover:bg-white/[.04]"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[.05] bg-white/[.03]">
                <card.icon
                  className="h-8 w-8 text-brand-soft"
                  strokeWidth={1.8}
                />
              </div>

              <h3 className="mb-4 text-xl font-semibold text-white">
                {card.title}
              </h3>

              <p className="leading-relaxed text-ink-muted">
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Spotlight>
    </section>
  );
}