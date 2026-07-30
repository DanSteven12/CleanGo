import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

function useTick() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export default function MiniControlPanel() {
  const clock = useTick();

  return (
    <div className="relative h-36 w-full rounded-2xl border border-white/[.06] bg-bg-panel/40 p-3 shadow-inner mb-6 flex flex-col gap-1.5">
      {/* GPS + Active badge row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-2 w-2 rounded-full bg-brand-soft shadow-[0_0_6px_#90BF49]"
          />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-brand-soft">GPS Conectado</span>
        </div>
        <div className="rounded-full border border-white/[.07] bg-white/[.03] px-2 py-0.5 font-mono text-[9px] text-white/50">
          {clock}
        </div>
      </div>

      {/* Checkpoint actual */}
      <div className="rounded-xl border border-white/[.04] bg-white/[.02] px-3 py-2 flex items-center justify-between">
        <div>
          <p className="text-[8px] uppercase tracking-wider text-ink-muted mb-0.5">Checkpoint actual</p>
          <p className="text-[11px] font-semibold text-white">CP-07 · Av. Reforma</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] uppercase tracking-wider text-ink-muted mb-0.5">Estado</p>
          <p className="text-[10px] font-semibold text-brand-soft">Completado</p>
        </div>
      </div>

      {/* Próximo checkpoint + act. */}
      <div className="rounded-xl border border-white/[.04] bg-white/[.02] px-3 py-2 flex items-center justify-between">
        <div>
          <p className="text-[8px] uppercase tracking-wider text-ink-muted mb-0.5">Próx. checkpoint</p>
          <p className="text-[11px] font-semibold text-white">CP-08 · Blvd. Norte</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] uppercase tracking-wider text-ink-muted mb-0.5">Distancia</p>
          <p className="text-[10px] font-semibold text-[#6fa8e8]">1.8 km</p>
        </div>
      </div>
    </div>
  );
}

