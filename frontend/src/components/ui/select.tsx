import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Select ───────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  isFiltered?: boolean;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      hint,
      id,
      disabled,
      options,
      placeholder,
      icon,
      isFiltered,
      children,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] select-none flex items-center gap-1.5"
          >
            {label}
            {isFiltered && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            )}
          </label>
        )}

        {/* Wrapper for select + optional left icon + chevron icon */}
        <div className="relative group flex items-center">
          {icon && (
            <div
              className={cn(
                'absolute left-3 pointer-events-none transition-colors duration-200 z-10 flex items-center justify-center',
                isFocused
                  ? 'text-[var(--primary)]'
                  : isFiltered
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]'
              )}
            >
              {icon}
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              'w-full h-10 text-sm font-medium rounded-xl appearance-none cursor-pointer outline-none transition-all duration-200',
              'bg-[var(--card)] text-[var(--foreground)]',
              'border border-[var(--border)] shadow-xs',
              'group-hover:border-[var(--primary)]/50 group-hover:shadow-[0_2px_10px_-2px_rgba(23,99,166,0.12)]',
              'focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:shadow-[0_0_15px_rgba(23,99,166,0.18)]',
              disabled && 'opacity-50 cursor-not-allowed bg-[var(--muted)]',
              error && 'border-[var(--destructive)] focus:ring-[var(--destructive)]/20',
              isFiltered && !error && 'border-[var(--primary)]/60 bg-[var(--primary)]/[0.03]',
              icon ? 'pl-9 pr-9' : 'pl-3.5 pr-9',
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
          >
            {/* Placeholder option */}
            {placeholder && (
              <option value="" disabled className="text-[var(--muted-foreground)] bg-[var(--card)]">
                {placeholder}
              </option>
            )}

            {/* Options from prop array */}
            {options?.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-[var(--card)] text-[var(--foreground)] py-1.5"
              >
                {opt.label}
              </option>
            ))}

            {/* Or children for custom <option> elements */}
            {!options && children}
          </select>

          {/* Custom chevron icon with smooth rotation on focus */}
          <div
            className={cn(
              'absolute right-3 pointer-events-none transition-transform duration-200 flex items-center justify-center',
              isFocused
                ? 'rotate-180 text-[var(--primary)]'
                : 'text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]'
            )}
          >
            <ChevronDown size={15} />
          </div>
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
Select.displayName = 'Select';
