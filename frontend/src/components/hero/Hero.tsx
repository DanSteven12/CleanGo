import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MapPin, Navigation, Route, Shield, Truck, Map, MapPinned } from 'lucide-react';
import HeroNavbar from './HeroNavbar';
import HeroTitle from './HeroTitle';
import HeroButtons from './HeroButtons';
import GlobeEffects from '../globe/GlobeEffects';
import NeuralNetwork from '../background/NeuralNetwork';
import Particles from '../background/Particles';
import MetricsCard from '../cards/MetricsCard';
import StatusCard from '../cards/StatusCard';
import TrackingCard from '../cards/TrackingCard';
import Spotlight from '../ui/Spotlight';
import BoomerangVideoBg from './BoomerangVideoBg';
import CollectionSchedule from './CollectionSchedule';

/** Live clock — updates every second using local browser time */
function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  const day = weekdays[now.getDay()];
  const date = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();

  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = (hours % 12 || 12).toString().padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 flex flex-col items-center gap-0.5"
    >
      <p className="text-xs font-medium tracking-wide text-ink-muted capitalize">
        {day} {date} de {month} de {year}
      </p>
      <p className="font-display text-2xl font-medium tabular-nums text-white/90">
        {h12}:{minutes}
        <span className="text-brand-soft">:{seconds}</span>
        <span className="ml-1.5 text-sm font-normal text-ink-muted">{ampm}</span>
      </p>
    </motion.div>
  );
}


/** Cinematic video showcase — Axon-inspired presentation, CleanGo identity */
function CinematicVideoShowcase() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start end', 'end start'],
  });

  // Subtle parallax: video translates slightly upward as user scrolls down
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '-6%']);

  return (
    <motion.div
      ref={wrapperRef}
      initial={{ opacity: 0, y: 56 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="group mt-24 w-full max-w-5xl"
    >
      {/* Video Title & Description Header */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-soft">
          Gestión Municipal Inteligente
        </span>
        <h3 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl max-w-3xl">
          Innovando la Gestión Municipal
        </h3>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">
          CleanGo fortalece la gestión municipal mediante el monitoreo inteligente de rutas, seguimiento GPS en tiempo real y herramientas que optimizan la operación diaria para brindar un mejor servicio a la ciudadanía.
        </p>
      </div>

      {/*
        Outer shell — rounded, glass-bordered, with a hover-triggered
        green glow that signals interactivity while staying subtle.
      */}
      <div
        className={[
          'relative overflow-hidden rounded-[28px]',
          'border border-white/[.07]',
          'shadow-[0_16px_64px_-12px_rgba(56,140,53,0.22)]',
          'transition-shadow duration-500',
          'group-hover:shadow-[0_20px_80px_-12px_rgba(56,140,53,0.38)]',
          'bg-bg-card/50 backdrop-blur-xl',
        ].join(' ')}
      >
        {/* ── Top shimmer hairline ── */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(56,140,53,0.55) 40%, rgba(56,140,53,0.55) 60%, transparent)',
          }}
        />

        {/* ── Bottom shimmer hairline ── */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.08) 60%, transparent)',
          }}
        />

        {/*
          Video layer — wrapped in a motion.div so the
          parallax translateY is GPU-composited independently.
        */}
        <motion.div
          style={{ y: videoY, willChange: 'transform' }}
          className="relative"
        >
          {/* Subtle zoom pulse on idle, relaxes on hover */}
          <div
            className={[
              'transition-transform duration-700 ease-out',
              'scale-[1.04] group-hover:scale-100',
              'will-change-transform',
            ].join(' ')}
          >
            <BoomerangVideoBg
              src="/videos/cleango.mp4"
              className="block h-auto w-full rounded-[28px] object-cover"
            />
          </div>
        </motion.div>

        {/*
          Dark vignette overlay — sits above the video, adds depth and
          makes the video feel embedded rather than floating.
          Uses a radial gradient so the centre stays clear.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-[28px]"
          style={{
            background: [
              'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 55%, rgba(0,0,0,0.28) 100%)',
              'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.32) 100%)',
            ].join(', '),
          }}
        />
      </div>
    </motion.div>
  );
}


export default function Hero() {
  return (
    <section id="inicio" className="relative min-h-screen w-full overflow-hidden bg-bg">
      {/* film grain */}
      <div className="grain" />

      {/* ambient aurora wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[640px] w-[900px] -translate-x-1/2 rounded-full opacity-[.14] blur-[120px]"
        style={{ background: 'radial-gradient(circle, #388C35, transparent 65%)', animation: 'aurora 18s ease-in-out infinite' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-[420px] w-[560px] rounded-full opacity-[.10] blur-[110px]"
        style={{ background: 'radial-gradient(circle, #1763A6, transparent 65%)' }}
      />

      <NeuralNetwork />
      <Particles count={26} />

      <HeroNavbar />

      <Spotlight className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-32 sm:px-6 sm:pt-40 md:pt-44">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.03] px-3.5 py-1.5 backdrop-blur-xl"
        >
          <MapPin className="h-3.5 w-3.5 text-brand-soft" strokeWidth={2} />
          <span className="text-xs font-medium tracking-wide text-ink-muted">
            Centro de Monitoreo Municipal · Ocosingo, Chiapas
          </span>
        </motion.div>

        <HeroTitle
          className="text-center"
          lines={[
            { text: 'Monitoreo de Rutas de', accent: false },
            { text: 'Recolección.', accent: true },
          ]}
        />

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 flex flex-wrap items-center justify-center gap-3"
        >
          {[
            { emoji: '📍', label: 'Ocosingo, Chiapas' },
            { emoji: '🛰', label: 'Seguimiento GPS' },
            { emoji: '🚛', label: 'Monitoreo en Tiempo Real' },
          ].map((b) => (
            <span
              key={b.label}
              className="flex items-center gap-1.5 rounded-full border border-white/[.08] bg-white/[.04] px-3.5 py-1.5 text-xs font-medium text-ink-muted backdrop-blur-xl"
            >
              <span>{b.emoji}</span>
              <span>{b.label}</span>
            </span>
          ))}
        </motion.div>

        <HeroButtons />

        {/* Live clock */}
        <LiveClock />

        {/* Dashboard / Bento */}
        <div className="relative mt-20 w-full sm:mt-24 md:mt-28">
          <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_minmax(360px,560px)_1fr] lg:gap-6">

            {/* Left column — desktop only */}
            <div className="order-2 hidden flex-col gap-4 lg:order-1 lg:flex">
              {/* Izquierda superior: Unidades Monitoreadas */}
              <MetricsCard
                icon={Truck}
                label="UNIDADES MONITOREADAS"
                value={48}
                suffix=" vehículos"
                trend={[28, 32, 30, 38, 36, 42, 44, 48]}
                accent="brand"
                delay={0.15}
                description="Seguimiento GPS en tiempo real de la flota municipal."
              />
              {/* Izquierda inferior: Rutas Activas */}
              <MetricsCard
                icon={Route}
                label="RUTAS ACTIVAS"
                value={26}
                suffix=" recorridos"
                trend={[14, 18, 16, 20, 22, 24, 25, 26]}
                accent="ai"
                delay={0.3}
                description="Cobertura diaria de rutas de recolección."
              />
            </div>

            {/* Center — globe, protagonist */}
            <div className="order-1 relative flex justify-center lg:order-2">
              <GlobeEffects />

              {/* floating tracking badges anchored to the globe, desktop only */}
              <div className="pointer-events-none absolute inset-0 hidden lg:block">
                <div className="pointer-events-auto absolute -left-6 top-6">
                  <TrackingCard icon={MapPin} title="GPS ACTIVO" value="Actualización cada 2 s" delay={0.5} />
                </div>
                <div className="pointer-events-auto absolute -right-10 top-24">
                  <TrackingCard icon={Navigation} title="ETA" value="4 min" meta="promedio" delay={0.65} />
                </div>
                <div className="pointer-events-auto absolute -left-10 bottom-10">
                  <TrackingCard icon={Map} title="COBERTURA" value="Ocosingo, Chiapas" delay={0.8} />
                </div>
              </div>
            </div>

            {/* Right column — desktop only */}
            <div className="order-3 hidden flex-col gap-4 lg:flex">
              {/* Derecha superior: Puntos de Recolección */}
              <MetricsCard
                icon={MapPinned}
                label="PUNTOS DE RECOLECCIÓN"
                value={186}
                suffix=" registrados"
                trend={[120, 138, 145, 155, 162, 170, 180, 186]}
                accent="brand"
                delay={0.25}
                description="Checkpoints monitoreados durante los recorridos."
              />
              {/* Derecha inferior: Disponibilidad del Sistema */}
              <StatusCard
                icon={Shield}
                label="DISPONIBILIDAD DEL SISTEMA"
                value="99.1%"
                delay={0.4}
                description="Servicios GPS y plataforma operando correctamente."
              />
            </div>
          </div>

          {/* Mobile / tablet: cards stacked below the globe */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
            <TrackingCard float={false} icon={MapPin} title="GPS ACTIVO" value="Cada 2 s" delay={0.1} />
            <TrackingCard float={false} icon={Navigation} title="ETA" value="4 min" delay={0.18} />
            <TrackingCard float={false} icon={Map} title="Cobertura" value="Ocosingo" delay={0.26} />
            <MetricsCard
              icon={Truck}
              label="Unidades GPS"
              value={48}
              suffix=" veh."
              trend={[28, 32, 30, 38, 36, 42, 44, 48]}
              delay={0.34}
              description="Seguimiento GPS de la flota municipal."
            />
            <MetricsCard
              icon={Route}
              label="Rutas"
              value={26}
              suffix=" rec."
              trend={[14, 18, 16, 20, 22, 24, 25, 26]}
              accent="ai"
              delay={0.42}
              description="Rutas de recolección activas."
            />
            <StatusCard
              icon={Shield}
              label="Disponibilidad"
              value="99.1%"
              delay={0.5}
              description="Sistema operativo."
            />
          </div>
        </div>

        {/* ── Collection Schedule Section ── */}
        <CollectionSchedule />

        {/* ── CleanGo video showcase — cinematic Axon-style ── */}
        <CinematicVideoShowcase />


      </Spotlight>
    </section>
  );
}
