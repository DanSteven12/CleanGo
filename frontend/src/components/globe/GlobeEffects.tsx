import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { GlobePulse } from './GlobePulse';
import BorderBeam from '../ui/BorderBeam';

/**
 * Presentation layer around <GlobePulse />: perspective tilt on mouse move,
 * subtle zoom + brighter glow on hover. GlobePulse itself is untouched —
 * this only wraps it.
 */
export default function GlobeEffects({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 18 });
  const scale = useSpring(1, { stiffness: 140, damping: 16 });
  const glow = useSpring(0.35, { stiffness: 100, damping: 20 });

  const handleMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleEnter = () => {
    scale.set(1.035);
    glow.set(0.65);
  };

  const handleLeave = () => {
    mx.set(0);
    my.set(0);
    scale.set(1);
    glow.set(0.35);
  };

  return (
    <div className={className ?? 'relative mx-auto aspect-square w-full max-w-[620px]'} style={{ perspective: 1000 }}>
      {/* outer halo — larger, softer, gives the globe room to dominate the composition */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[10%] rounded-full blur-[80px]"
        style={{
          background: 'radial-gradient(circle, rgba(56,140,53,0.35) 0%, rgba(23,99,166,0.15) 50%, transparent 72%)',
          opacity: glow,
        }}
      />
      {/* ambient glow beneath the globe */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[6%] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(56,140,53,0.55) 0%, rgba(23,99,166,0.25) 45%, transparent 70%)',
          opacity: glow,
        }}
      />
      {/* slow-rotating beam around the globe's own ring */}
      <div className="pointer-events-none absolute inset-[4%] rounded-full opacity-70">
        <BorderBeam duration={10} borderRadius="9999px" borderWidth={1.5} color="#90BF49" />
      </div>

      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{ rotateX, rotateY, scale, transformStyle: 'preserve-3d' }}
        className="relative"
      >
        {/* thin reflective ring */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow:
              'inset 0 1px 1px rgba(255,255,255,0.08), inset 0 -20px 40px rgba(0,0,0,0.5), 0 0 80px rgba(56,140,53,0.15)',
          }}
        />
        <GlobePulse />
      </motion.div>
    </div>
  );
}
