import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Wraps its children and paints a cursor-follow radial light behind them.
 * Implemented as a wrapper (not an overlay sibling) so mousemove bubbles
 * up naturally from every child — including interactive ones — without
 * needing a separate hit-testing layer that could block clicks.
 */
export default function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(-400), { stiffness: 60, damping: 20 });
  const y = useSpring(useMotionValue(-400), { stiffness: 60, damping: 20 });

  const handleMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  };

  return (
    <div ref={ref} onMouseMove={handleMove} className={className ?? 'relative'}>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute z-[5] h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: x,
          top: y,
          background: 'radial-gradient(circle, rgba(144,191,73,0.08) 0%, rgba(23,99,166,0.04) 40%, transparent 70%)',
        }}
      />
      {children}
    </div>
  );
}
