import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ─── Badge variants ───────────────────────────────────────────────────────────

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5',
    'px-2.5 py-0.5',
    'rounded-full',
    'text-xs font-semibold tracking-wide',
    'uppercase whitespace-nowrap',
    'border',
    'transition-colors duration-150',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-[var(--primary)] text-[var(--primary-foreground)]',
          'border-transparent',
        ],
        secondary: [
          'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
          'border-transparent',
        ],
        outline: [
          'bg-transparent text-[var(--foreground)] border-[var(--border)]',
        ],
        success: [
          'bg-[oklch(0.76_0.17_135_/_0.12)] text-[oklch(0.38_0.10_145)]',
          'border-[oklch(0.76_0.17_135_/_0.35)]',
        ],
        warning: [
          'bg-[oklch(0.78_0.16_75_/_0.12)] text-[oklch(0.40_0.10_65)]',
          'border-[oklch(0.78_0.16_75_/_0.38)]',
        ],
        destructive: [
          'bg-[oklch(0.58_0.22_25_/_0.12)] text-[oklch(0.40_0.18_25)]',
          'border-[oklch(0.58_0.22_25_/_0.35)]',
        ],
        primary: [
          'bg-[oklch(0.52_0.14_250_/_0.12)] text-[oklch(0.38_0.12_250)]',
          'border-[oklch(0.52_0.14_250_/_0.35)]',
        ],
        // For assignment status
        pendiente: [
          'bg-[oklch(0.78_0.16_75_/_0.12)] text-[oklch(0.38_0.12_72)]',
          'border-[oklch(0.78_0.16_75_/_0.38)]',
        ],
        'en-progreso': [
          'bg-[oklch(0.52_0.14_250_/_0.12)] text-[oklch(0.38_0.12_250)]',
          'border-[oklch(0.52_0.14_250_/_0.35)]',
        ],
        completado: [
          'bg-[oklch(0.76_0.17_135_/_0.12)] text-[oklch(0.38_0.10_145)]',
          'border-[oklch(0.76_0.17_135_/_0.35)]',
        ],
        retrasado: [
          'bg-[oklch(0.58_0.22_25_/_0.12)] text-[oklch(0.40_0.18_25)]',
          'border-[oklch(0.58_0.22_25_/_0.35)]',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

Badge.displayName = 'Badge';

export { badgeVariants };

// ─── Status badge helper ──────────────────────────────────────────────────────

type EstatusKey = 'Pendiente' | 'En Progreso' | 'Completado' | 'Retrasado';

const estatusVariantMap: Record<EstatusKey, VariantProps<typeof badgeVariants>['variant']> = {
  'Pendiente':    'pendiente',
  'En Progreso':  'en-progreso',
  'Completado':   'completado',
  'Retrasado':    'retrasado',
};

export const EstatusBadge: React.FC<{ estatus: string; className?: string }> = ({ estatus, className }) => {
  const variant = estatusVariantMap[estatus as EstatusKey] ?? 'default';
  return <Badge variant={variant} className={className}>{estatus}</Badge>;
};
