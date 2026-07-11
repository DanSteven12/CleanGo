import React from 'react';
import { cn } from '../../lib/utils';

// ─── Input ────────────────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, disabled, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('flex flex-col gap-[0.375rem]', className)}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          style={{
            height: '40px',
            padding: '0 0.75rem',
            border: `1px solid ${error ? 'oklch(0.58 0.22 25)' : 'var(--panel-border)'}`,
            borderRadius: '0.5rem',
            background: disabled ? 'var(--muted)' : 'var(--panel-bg)',
            color: 'var(--text-h)',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            outline: 'none',
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            width: '100%',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            if (!disabled) {
              e.target.style.borderColor = error
                ? 'oklch(0.58 0.22 25)'
                : '#1763A6';
              e.target.style.boxShadow = error
                ? '0 0 0 3px oklch(0.58 0.22 25 / 0.15)'
                : '0 0 0 3px oklch(0.52 0.14 250 / 0.15)';
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error
              ? 'oklch(0.58 0.22 25)'
              : 'var(--panel-border)';
            e.target.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
          {...props}
        />

        {error && (
          <span
            role="alert"
            style={{
              fontSize: '0.75rem',
              color: 'oklch(0.42 0.18 25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            {error}
          </span>
        )}

        {hint && !error && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--muted-foreground)',
            }}
          >
            {hint}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
