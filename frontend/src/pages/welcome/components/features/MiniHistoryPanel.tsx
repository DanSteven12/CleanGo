import { motion } from 'framer-motion';

const records = [
  { route: 'Ruta Norte',  date: '28 Jul 2026', start: '06:15', end: '10:30', checkpoints: '15 / 15' },
  { route: 'Ruta Centro', date: '27 Jul 2026', start: '07:00', end: '12:30', checkpoints: '12 / 12' },
  { route: 'Ruta Sur',    date: '27 Jul 2026', start: '13:00', end: '16:45', checkpoints: '10 / 10' },
];

export default function MiniHistoryPanel() {
  return (
    <div className="relative h-36 w-full rounded-2xl border border-white/[.06] bg-bg-panel/40 p-3 shadow-inner mb-6 flex flex-col gap-1.5 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-1 pb-0.5 border-b border-white/[.04]">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Historial operativo</span>
        <span className="text-[9px] text-ink-muted">{records.length} registros</span>
      </div>

      {records.map((r, i) => (
        <motion.div
          key={r.route}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: i * 0.12, ease: 'easeOut' }}
          className="flex items-center justify-between rounded-xl border border-white/[.03] bg-white/[.015] px-2.5 py-1.5"
        >
          {/* Status dot + route name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft/10">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5 L3.5 6.5 L7.5 2.5" stroke="#90BF49" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-white truncate">{r.route}</p>
              <p className="text-[8px] text-ink-muted">{r.date}</p>
            </div>
          </div>

          {/* Times + checkpoints */}
          <div className="text-right shrink-0 ml-2">
            <p className="text-[9px] text-white font-medium">{r.start} – {r.end}</p>
            <p className="text-[8px] text-ink-muted">✓ {r.checkpoints}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

