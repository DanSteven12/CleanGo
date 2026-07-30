import { useMemo } from 'react';

type Speck = {
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  hue: 'brand' | 'ai' | 'white';
};

const HUE: Record<Speck['hue'], string> = {
  brand: 'rgba(144,191,73,0.55)',
  ai: 'rgba(23,99,166,0.55)',
  white: 'rgba(255,255,255,0.35)',
};

/**
 * Ambient floating specks — separate from NeuralNetwork so the connective
 * graph and the depth/dust layer can be tuned independently. Pure CSS
 * animation, no canvas cost.
 */
export default function Particles({ count = 22, className }: { count?: number; className?: string }) {
  const specks = useMemo<Speck[]>(() => {
    const hues: Speck['hue'][] = ['brand', 'ai', 'white', 'white'];
    return Array.from({ length: count }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 14 + 10,
      delay: Math.random() * -20,
      hue: hues[Math.floor(Math.random() * hues.length)],
    }));
  }, [count]);

  return (
    <div className={className ?? 'pointer-events-none absolute inset-0 overflow-hidden'} aria-hidden="true">
      {specks.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            background: HUE[s.hue],
            boxShadow: `0 0 ${s.size * 4}px ${HUE[s.hue]}`,
            animation: `speck-drift ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes speck-drift {
          0%, 100% { transform: translate(0, 0); opacity: 0.15; }
          50% { transform: translate(6px, -14px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
