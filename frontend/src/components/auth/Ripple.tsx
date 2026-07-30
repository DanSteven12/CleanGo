// frontend/src/components/auth/Ripple.tsx
import React from 'react';

interface RippleProps {
  /** number of ripple rings rendered */
  rings?: number;
  /** base size of the smallest ring in px */
  baseSize?: number;
  /** color in any valid CSS format */
  color?: string;
  className?: string;
}

export const Ripple: React.FC<RippleProps> = ({
  rings = 5,
  baseSize = 120,
  color = 'rgba(144, 191, 73, 0.15)',
  className = '',
}) => {
  return (
    <div
      className={`ripple-container ${className}`}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: rings }).map((_, i) => {
        const size = baseSize + i * 110;
        const delay = i * 0.6;
        const duration = 4 + i * 0.4;
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              border: `1px solid ${color}`,
              animation: `ripple-expand ${duration}s ease-out ${delay}s infinite`,
              opacity: 0,
            }}
          />
        );
      })}
      <style>{`
        @keyframes ripple-expand {
          0%   { transform: scale(0.85); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
