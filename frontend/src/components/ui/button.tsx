import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ─── Button variants ──────────────────────────────────────────────────────────

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium text-sm',
    'rounded-[0.625rem]',
    'border border-transparent',
    'transition-all duration-150 ease-in-out',
    'cursor-pointer select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'gradient-primary text-white',
          'shadow-[0_2px_12px_oklch(0.52_0.14_250_/_0.30)]',
          'hover:shadow-[0_4px_20px_oklch(0.52_0.14_250_/_0.45)]',
          'hover:brightness-110',
        ],
        secondary: [
          'bg-[var(--secondary)] text-white',
          'hover:brightness-110',
        ],
        outline: [
          'bg-transparent border-[var(--border)] text-[var(--foreground)]',
          'hover:bg-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]',
        ],
        ghost: [
          'bg-transparent text-[var(--foreground)]',
          'hover:bg-[var(--muted)]',
        ],
        destructive: [
          'bg-[var(--destructive)] text-white',
          'hover:brightness-110',
        ],
        success: [
          'bg-[var(--success)] text-[var(--success-foreground)]',
          'hover:brightness-110',
        ],
        // Sidebar-specific cancel button
        cancel: [
          'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
          'hover:bg-[var(--panel-border)] hover:text-[var(--text-h)]',
        ],
      },
      size: {
        sm:  'h-8 px-3 text-xs',
        md:  'h-10 px-4 text-sm',
        lg:  'h-11 px-6 text-base',
        xl:  'h-12 px-8 text-base font-semibold',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {children}
          </>
        ) : children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
