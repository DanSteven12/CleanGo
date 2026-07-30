import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Status = 'En curso' | 'Finalizado' | 'Pendiente';

const COLOR: Record<Status, { dot: string; text: string; bg: string; border: string }> = {
  'En curso':   { dot: '#1763A6', text: '#6fa8e8', bg: '#1763A610', border: '#1763A630' },
  'Finalizado': { dot: '#90BF49', text: '#90BF49', bg: '#90BF4910', border: '#90BF4930' },
  'Pendiente':  { dot: '#f59e0b', text: '#fbbf24', bg: '#f59e0b10', border: '#f59e0b30' },
};

const INITIAL: { route: string; status: Status }[] = [
  { route: 'Ruta Norte',   status: 'En curso'   },
  { route: 'Ruta Centro',  status: 'Finalizado' },
  { route: 'Ruta Sur',     status: 'Pendiente'  },
  { route: 'Ruta Oriente', status: 'Pendiente'  },
];

export default function MiniStatsDashboard() {
  const [routes, setRoutes] = useState(INITIAL);

  /* Periodically cycle statuses to simulate live updates */
  useEffect(() => {
    const id = setInterval(() => {
      setRoutes(prev => {
        const next = [...prev];
        // Pick a random Pendiente route and move it to En curso
        const pendientes = next.filter(r => r.status === 'Pendiente');
        const enCurso   = next.filter(r => r.status === 'En curso');
        if (pendientes.length && enCurso.length) {
          const idx = next.findIndex(r => r === enCurso[0]);
          const pendIdx = next.findIndex(r => r === pendientes[0]);
          next[idx] = { ...next[idx], status: 'Finalizado' };
          setTimeout(() => setRoutes(r => r.map((x, i) => i === pendIdx ? { ...x, status: 'En curso' } : x)), 500);
        }
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-36 w-full rounded-2xl border border-white/[.06] bg-bg-panel/40 p-3 shadow-inner mb-6 flex flex-col gap-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[.04] mb-0.5">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Estado de recorridos</span>
        <span className="text-[9px] text-ink-muted">{routes.length} rutas</span>
      </div>

      {routes.map((r) => {
        const c = COLOR[r.status];
        return (
          <motion.div key={r.route} layout transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}
          >
            <div className="flex items-center gap-2">
              <motion.span
                className="block h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: c.dot }}
                animate={r.status === 'En curso' ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                transition={r.status === 'En curso' ? { duration: 1.3, repeat: Infinity } : {}}
              />
              <span className="text-[10px] font-semibold text-white">{r.route}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key={r.status}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.25 }}
                className="text-[9px] font-semibold"
                style={{ color: c.text }}
              >
                {r.status}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

