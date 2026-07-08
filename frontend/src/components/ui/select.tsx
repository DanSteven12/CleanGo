import React from 'react';
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
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      id,
      disabled,
      options,
      placeholder,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('flex flex-col gap-[0.375rem]', className)}>
        {label && (
          <label
            htmlFor={selectId}
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

        {/* Wrapper for select + chevron icon */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            style={{
              height: '40px',
              padding: '0 2.25rem 0 0.75rem',
              border: `1px solid ${error ? 'oklch(0.58 0.22 25)' : 'var(--panel-border)'}`,
              borderRadius: '0.5rem',
              background: disabled ? 'var(--muted)' : 'var(--panel-bg)',
              color: 'var(--text-h)',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              outline: 'none',
              opacity: disabled ? 0.55 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              width: '100%',
              boxSizing: 'border-box',
              appearance: 'none',
              WebkitAppearance: 'none',
            }}
            onFocus={(e) => {
              if (!disabled) {
                e.target.style.borderColor = error
                  ? 'oklch(0.58 0.22 25)'
                  : 'oklch(0.52 0.14 250)';
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
          >
            {/* Placeholder option */}
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}

            {/* Options from prop array */}
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}

            {/* Or children for custom <option> elements */}
            {!options && children}
          </select>

          {/* Custom chevron icon */}
          <ChevronDown
            size={15}
            style={{
              position: 'absolute',
              right: '0.625rem',
              pointerEvents: 'none',
              color: disabled ? 'var(--muted-foreground)' : 'oklch(0.52 0.03 250)',
              flexShrink: 0,
            }}
          />
        </div>

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
Select.displayName = 'Select';
