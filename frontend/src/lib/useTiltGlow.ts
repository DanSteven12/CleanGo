import { useRef } from 'react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Cursor-reactive 3D tilt + a radial glow position, shared by bento cards.
 * Keeps the pointer math in one place instead of duplicating it per card.
 */
export function useTiltGlow(maxDeg = 6) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(my, [0, 1], [maxDeg, -maxDeg]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-maxDeg, maxDeg]), { stiffness: 200, damping: 20 });
  const glowX = useTransform(mx, (v) => `${v * 100}%`);
  const glowY = useTransform(my, (v) => `${v * 100}%`);

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  const onMouseLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return { ref, rotateX, rotateY, glowX, glowY, onMouseMove, onMouseLeave };
}
