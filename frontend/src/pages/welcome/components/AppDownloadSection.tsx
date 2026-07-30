import { motion } from 'framer-motion';
import Spotlight from '@/components/ui/Spotlight';

function AndroidIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5516 0 .9997.4482.9997.9993s-.4481.9997-.9997.9997zm-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5516 0 .9997.4482.9997.9993s-.4481.9997-.9997.9997zm11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1522-.5676.416.416 0 00-.5676.1522l-2.0225 3.503C15.59 8.354 13.856 8.0004 12 8.0004c-1.856 0-3.59.3536-5.1365.9494L4.841 5.4468a.416.416 0 00-.5676-.1522.416.416 0 00-.1522.5676l1.9973 3.4592C2.6889 11.0664.3333 14.2819.3333 18h23.3334c0-3.7181-2.3556-6.9336-5.785-8.6786z" />
    </svg>
  );
}

export default function AppDownloadSection() {
  return (
    <section
      id="descargar-app"
      className="relative w-full overflow-hidden bg-bg py-24 sm:py-32"
    >
      {/* Background illumination effect */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-[120px]" />

      <Spotlight className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-display text-3xl font-medium tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            Descarga la <span className="text-brand-soft">App</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg"
          >
            Lleva CleanGo contigo. Próximamente podrás consultar el estado de la recolección en tu zona, recibir notificaciones importantes y acceder a la información del servicio directamente desde tu dispositivo móvil.
          </motion.p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-xl"
        >
          <div className="group relative overflow-hidden rounded-[24px] border border-white/[.06] bg-white/[.02] p-8 text-center backdrop-blur-md shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-brand-soft/30 hover:bg-white/[.04] sm:p-10">
            {/* Top border glow line on hover */}
            <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              <div className="absolute left-1/4 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-brand-soft/40 to-transparent" />
            </div>

            {/* Android Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[.08] bg-white/[.03] shadow-inner backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
              <AndroidIcon className="h-10 w-10 text-brand-soft" />
            </div>

            {/* Card Title & Subtitle */}
            <h3 className="font-display text-2xl font-semibold text-white">
              Aplicación para Android
            </h3>
            <p className="mt-2 text-sm font-medium text-ink-muted">
              Próximamente disponible en Google Play
            </p>

            {/* Disabled Action Button */}
            <div className="mt-8 flex justify-center">
              <button
                disabled
                className="w-full sm:w-auto min-w-[200px] cursor-not-allowed rounded-full border border-white/10 bg-white/[.05] px-8 py-3.5 text-sm font-semibold text-white/50 backdrop-blur-md transition-all opacity-70 shadow-sm"
              >
                Próximamente
              </button>
            </div>

            {/* Bottom Footer Note inside card */}
            <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-ink-muted/80">
              Estamos trabajando para ofrecer la mejor experiencia posible. Muy pronto podrás descargar la aplicación oficial de CleanGo para Android.
            </p>
          </div>
        </motion.div>
      </Spotlight>
    </section>
  );
}
