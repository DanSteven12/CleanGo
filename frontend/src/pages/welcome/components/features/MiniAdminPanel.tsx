import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState } from 'react';

/* Soft animated number — occasionally shifts ±1 to simulate live admin data */
const AnimatedNumber = ({ value, accent = '#90BF49' }: { value: number; accent?: string }) => {
  const [v, setV] = useState(value);
  const ctrl = useAnimation();

  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() > 0.65) {
        const next = Math.max(0, v + (Math.random() > 0.5 ? 1 : -1));
        setV(next);
        ctrl.start({ scale: [1, 1.12, 1], color: ['#fff', accent, '#fff'], transition: { duration: 0.45 } });
      }
    }, 3500 + Math.random() * 1500);
    return () => clearInterval(id);
  }, [v, ctrl, accent]);

  return <motion.span animate={ctrl} className="text-sm font-bold text-white leading-none">{v}</motion.span>;
};

const items = [
  { label: 'Conductores', value: 42, sub: 'activos',       accent: '#90BF49' },
  { label: 'Unidades',    value: 38, sub: 'disponibles',   accent: '#1763A6' },
  { label: 'Rutas',       value: 15, sub: 'programadas',   accent: '#90BF49' },
  { label: 'Asignaciones',value: 12, sub: 'del día',       accent: '#1763A6' },
];

export default function MiniAdminPanel() {
  return (
    <div className="relative h-36 w-full rounded-2xl border border-white/[.06] bg-bg-panel/40 p-3 shadow-inner mb-6 grid grid-cols-2 grid-rows-2 gap-2">
      {items.map((item) => (
        <motion.div
          key={item.label}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="rounded-xl border border-white/[.04] bg-white/[.02] p-2.5 flex flex-col justify-center cursor-default"
        >
          <p className="text-[8px] uppercase tracking-wider text-ink-muted mb-1">{item.label}</p>
          <div className="flex items-end gap-1.5">
            <AnimatedNumber value={item.value} accent={item.accent} />
            <span className="text-[9px] font-normal text-ink-muted pb-0.5">{item.sub}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

