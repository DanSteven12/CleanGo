import React from 'react';
import { cn } from '../../lib/utils';

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--border)]',
        'bg-[var(--card)] text-[var(--card-foreground)]',
        'shadow-[var(--shadow-card)]',
        glass && [
          'backdrop-blur-md bg-[oklch(1_0_0_/_0.72)]',
          'border-[oklch(1_0_0_/_0.22)]',
          'dark:bg-[oklch(0.22_0.03_250_/_0.72)]',
          'dark:border-[oklch(1_0_0_/_0.10)]',
        ],
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

// ─── CardHeader ───────────────────────────────────────────────────────────────

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

// ─── CardTitle ────────────────────────────────────────────────────────────────

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'font-display text-lg font-semibold leading-none tracking-tight text-[var(--foreground)]',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

// ─── CardDescription ─────────────────────────────────────────────────────────

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-[var(--muted-foreground)]', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

// ─── CardContent ─────────────────────────────────────────────────────────────

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

// ─── CardFooter ──────────────────────────────────────────────────────────────

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
