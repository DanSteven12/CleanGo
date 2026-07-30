import { motion, useMotionTemplate } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTiltGlow } from '@/lib/useTiltGlow';

interface StatusCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  status?: 'online' | 'syncing';
  description?: string;
  className?: string;
  delay?: number;
}

export default function StatusCard({ icon: Icon, label, value, status = 'online', description, className, delay = 0 }: StatusCardProps) {
  const { ref, rotateX, rotateY, glowX, glowY, onMouseMove, onMouseLeave } = useTiltGlow(5);
  const glowBackground = useMotionTemplate`radial-gradient(160px circle at ${glowX} ${glowY}, rgba(144,191,73,0.10), transparent 70%)`;

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
        'group relative overflow-hidden rounded-2xl border border-white/[.06] bg-white/[.03] p-4 backdrop-blur-xl',
        'shadow-[0_1px_0_rgba(255,255,255,.04)_inset] transition-colors hover:border-brand-soft/30',
        className,
      )}
    >
      {/* cursor-tracked radial glow */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glowBackground }}
      />
      {/* faint top border beam on hover */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-soft/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[.04]">
          <Icon className="h-4 w-4 text-brand-soft" strokeWidth={1.75} />
        </div>
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
              status === 'online' ? 'bg-brand-soft' : 'bg-ai',
            )}
          />
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', status === 'online' ? 'bg-brand-soft' : 'bg-ai')} />
        </span>
      </div>

      <p className="relative mt-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="relative mt-0.5 font-display text-lg font-medium text-white">{value}</p>
      {description && (
        <p className="relative mt-2 text-[11px] leading-relaxed text-ink-muted/70">{description}</p>
      )}
    </motion.div>
  );
}
