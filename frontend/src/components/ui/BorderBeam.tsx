import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';

interface BorderBeamProps {
  duration?: number;
  color?: string;
  className?: string;
  borderRadius?: string | number;
  borderWidth?: number;
}

/**
 * A light that travels around the border of its (relatively positioned)
 * parent. Uses a rotating conic-gradient masked down to a hairline ring
 * (mask-composite: exclude) — works in every evergreen browser, unlike
 * `offset-path: rect()` which is still Chrome-only.
 */
export default function BorderBeam({
  duration = 6,
  color = '#90BF49',
  className,
  borderRadius = 'inherit',
  borderWidth = 1,
}: BorderBeamProps) {
  const maskStyle: CSSProperties = {
    padding: borderWidth,
    borderRadius,
    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  return (
    <div className={className ?? 'pointer-events-none absolute inset-0'} style={maskStyle}>
      <motion.div
        className="absolute inset-[-60%]"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${color} 25deg, transparent 70deg)`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
