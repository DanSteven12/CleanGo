import { useEffect, useState } from 'react';
import { motion, useInView, useMotionTemplate } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTiltGlow } from '@/lib/useTiltGlow';

interface MetricsCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  trend: number[]; // sparkline points, 0-100
  accent?: 'brand' | 'ai';
  description?: string;
  className?: string;
  delay?: number;
}

function Sparkline({ points, accent }: { points: number[]; accent: 'brand' | 'ai' }) {
  const w = 96;
  const h = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * h}`)
    .join(' ');
  const color = accent === 'brand' ? '#90BF49' : '#1763A6';

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <circle cx={w} cy={h - ((points[points.length - 1] - min) / range) * h} r={2} fill={color} />
    </svg>
  );
}

export default function MetricsCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  trend,
  accent = 'brand',
  description,
  className,
  delay = 0,
}: MetricsCardProps) {
  const { ref, rotateX, rotateY, glowX, glowY, onMouseMove, onMouseLeave } = useTiltGlow(5);
  const glowBackground = useMotionTemplate`radial-gradient(180px circle at ${glowX} ${glowY}, rgba(144,191,73,0.10), transparent 70%)`;
  const inView = useInView(ref, { once: true, margin: '-10%' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.015 }}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/[.06] bg-bg-card/60 p-5 backdrop-blur-xl',
        'transition-colors hover:border-brand-soft/30',
        className,
      )}
    >
      {/* cursor-tracked radial glow */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glowBackground }}
      />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-soft/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[.04]">
          <Icon className="h-4 w-4 text-brand-soft" strokeWidth={1.75} />
        </div>
        <Sparkline points={trend} accent={accent} />
      </div>

      <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-medium tabular-nums text-white">
        {display.toLocaleString('en-US')}
        <span className="ml-0.5 text-sm text-ink-muted">{suffix}</span>
      </p>
      {description && (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted/70">{description}</p>
      )}
    </motion.div>
  );
}
