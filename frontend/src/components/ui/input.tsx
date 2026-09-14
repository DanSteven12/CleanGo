import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Input ────────────────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      hint,
      id,
      disabled,
      leftIcon,
      rightIcon,
      clearable,
      onClear,
      value,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const hasValue = value !== undefined && value !== '' && value !== null;

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] select-none"
          >
            {label}
          </label>
        )}

        <div className="relative group flex items-center">
          {/* Optional Left Icon */}
          {leftIcon && (
            <div
              className={cn(
                'absolute left-3 pointer-events-none transition-colors duration-200 z-10 flex items-center justify-center',
                isFocused
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]'
              )}
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            value={value}
            className={cn(
              'w-full h-10 text-sm font-medium rounded-xl outline-none transition-all duration-200',
              'bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60',
              'border border-[var(--border)] shadow-xs',
              'group-hover:border-[var(--primary)]/50 group-hover:shadow-[0_2px_10px_-2px_rgba(23,99,166,0.12)]',
              'focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:shadow-[0_0_15px_rgba(23,99,166,0.18)]',
              disabled && 'opacity-50 cursor-not-allowed bg-[var(--muted)]',
              error && 'border-[var(--destructive)] focus:ring-[var(--destructive)]/20',
              leftIcon ? 'pl-9' : 'pl-3.5',
              clearable || rightIcon ? 'pr-9' : 'pr-3.5',
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />

          {/* Clear button if clearable and has value */}
          {clearable && hasValue && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear?.();
              }}
              className="absolute right-2.5 p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}

          {/* Optional Right Icon (when clear button is not showing) */}
          {rightIcon && !(clearable && hasValue) && (
            <div
              className={cn(
                'absolute right-3 pointer-events-none transition-colors duration-200 flex items-center justify-center',
                isFocused ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
              )}
            >
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <span
            role="alert"
            className="text-xs text-[var(--destructive)] flex items-center gap-1 font-medium"
          >
            {error}
          </span>
        )}

        {hint && !error && (
          <span className="text-xs text-[var(--muted-foreground)]">
            {hint}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
