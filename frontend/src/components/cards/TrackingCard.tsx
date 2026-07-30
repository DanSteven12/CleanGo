import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import BorderBeam from '../ui/BorderBeam';

interface TrackingCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  meta?: string;
  className?: string;
  delay?: number;
  float?: boolean; // gentle idle bob, for panels anchored beside the globe
}

export default function TrackingCard({ icon: Icon, title, value, meta, className, delay = 0, float = true }: TrackingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: float ? [0, -6, 0] : 0,
      }}
      transition={{
        opacity: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
        y: float ? { duration: 5.5, delay: delay + 0.6, repeat: Infinity, ease: 'easeInOut' } : undefined,
      }}
      whileHover={{ scale: 1.04 }}
      className={cn(
        'group relative flex items-center gap-3 rounded-full border border-white/[.08] bg-white/[.04] px-4 py-2.5',
        'shadow-[0_8px_30px_rgba(0,0,0,.35)] backdrop-blur-xl transition-colors hover:border-brand-soft/40',
        className,
      )}
    >
      <span
        className="pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ boxShadow: '0 0 24px rgba(144,191,73,0.25)' }}
      />
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <BorderBeam duration={3.5} borderRadius="9999px" borderWidth={1} />
      </span>
      <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15">
        <Icon className="h-3.5 w-3.5 text-brand-soft" strokeWidth={2} />
      </div>
      <div className="leading-tight">
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">{title}</p>
        <p className="text-sm font-medium text-white">
          {value}
          {meta && <span className="ml-1 text-xs font-normal text-ink-muted">{meta}</span>}
        </p>
      </div>
    </motion.div>
  );
}
