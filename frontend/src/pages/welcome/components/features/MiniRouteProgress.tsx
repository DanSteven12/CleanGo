import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';

export default function MiniRouteProgress() {
  const [progress, setProgress] = useState(0.38);
  const [distKm, setDistKm] = useState(5.4);
  const [etaMin, setEtaMin] = useState(22);

  /* Animate progress from 0 to ~80% over 12 s, then reset */
  useEffect(() => {
    let cancelled = false;
    function loop() {
      if (cancelled) return;
      animate(0.05, 0.85, {
        duration: 12, ease: 'easeInOut',
        onUpdate: (v) => {
          if (!cancelled) {
            setProgress(v);
            setDistKm(+(14.2 * v).toFixed(1));
            setEtaMin(Math.ceil((14.2 * (1 - v)) / 0.9));
          }
        },
        onComplete: () => { if (!cancelled) { setProgress(0.05); loop(); } },
      });
    }
    loop();
    return () => { cancelled = true; };
  }, []);

  const checkpointsDone = Math.round(progress * 12);

  return (
    <div className="relative h-36 w-full rounded-2xl border border-white/[.06] bg-bg-panel/40 p-4 shadow-inner mb-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest text-ink-muted">Seguimiento</span>
        <div className="flex items-center gap-1.5 rounded-full border border-[#1763A6]/30 bg-[#1763A6]/10 px-2 py-0.5">
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-1.5 w-1.5 rounded-full bg-[#1763A6]"
          />
          <span className="text-[9px] font-semibold text-[#6fa8e8]">En progreso</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 mt-2">
        <div className="flex justify-between text-[10px]">
          <span className="text-ink-muted">Avance de ruta</span>
          <span className="font-semibold text-white">{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[.05]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#1763A6] to-[#90BF49]"
            style={{ boxShadow: '0 0 8px #90BF4960', width: `${progress * 100}%` }}
            transition={{ duration: 0.3, ease: 'linear' }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="rounded-lg bg-white/[.02] p-2 text-center border border-white/[.03]">
          <p className="text-[9px] text-ink-muted uppercase">Checkpoints</p>
          <p className="text-xs font-semibold text-white mt-0.5">{checkpointsDone}<span className="text-white/30"> / 12</span></p>
        </div>
        <div className="rounded-lg bg-white/[.02] p-2 text-center border border-white/[.03]">
          <p className="text-[9px] text-ink-muted uppercase">Recorrido</p>
          <p className="text-xs font-semibold text-white mt-0.5">{distKm}<span className="text-white/30"> km</span></p>
        </div>
        <div className="rounded-lg bg-white/[.02] p-2 text-center border border-white/[.03]">
          <p className="text-[9px] text-ink-muted uppercase">ETA</p>
          <p className="text-xs font-semibold text-white mt-0.5">{etaMin}<span className="text-white/30"> min</span></p>
        </div>
      </div>
    </div>
  );
}

