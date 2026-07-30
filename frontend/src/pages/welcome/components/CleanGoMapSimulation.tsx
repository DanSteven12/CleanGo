import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   Route path: a series of [x, y] waypoints (SVG coordinate space)
   representing simplified city streets (300 × 300 viewport).
   ───────────────────────────────────────────────────────────── */
const ROUTE: [number, number][] = [
  [30,  270],
  [30,  200],
  [30,  140],
  [80,  140],
  [80,   80],
  [140,  80],
  [200,  80],
  [200, 140],
  [260, 140],
  [260, 200],
  [260, 260],
  [200, 260],
  [140, 260],
  [140, 200],
];

/* Build SVG path string from waypoints */
function buildPath(pts: [number, number][]) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

/* Interpolate position along a polyline at progress t ∈ [0, 1] */
function getPositionOnPath(pts: [number, number][], t: number): [number, number] {
  const totalSegs = pts.length - 1;
  const clampedT = Math.max(0, Math.min(1, t));
  const rawSeg = clampedT * totalSegs;
  const segIdx = Math.min(Math.floor(rawSeg), totalSegs - 1);
  const segT = rawSeg - segIdx;
  const [x1, y1] = pts[segIdx];
  const [x2, y2] = pts[segIdx + 1];
  return [x1 + (x2 - x1) * segT, y1 + (y2 - y1) * segT];
}

/* Heading angle of the truck on the current segment */
function getHeading(pts: [number, number][], t: number): number {
  const totalSegs = pts.length - 1;
  const rawSeg = Math.max(0, Math.min(1, t)) * totalSegs;
  const segIdx = Math.min(Math.floor(rawSeg), totalSegs - 1);
  const [x1, y1] = pts[segIdx];
  const [x2, y2] = pts[segIdx + 1];
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}

/* Checkpoints are indices into the ROUTE array */
const CHECKPOINT_INDICES = [0, 2, 4, 6, 8, 10, 11, 12, 13];

const STREETS_H: [number, number, number, number][] = [
  [10, 80, 290, 80],
  [10, 140, 290, 140],
  [10, 200, 290, 200],
  [10, 260, 290, 260],
];
const STREETS_V: [number, number, number, number][] = [
  [30, 10, 30, 290],
  [80, 10, 80, 290],
  [140, 10, 140, 290],
  [200, 10, 200, 290],
  [260, 10, 260, 290],
];

const CITY_BLOCKS = [
  [35, 15, 40, 60], [90, 15, 45, 60], [150, 15, 45, 60], [210, 15, 45, 60],
  [35, 90, 40, 45], [90, 90, 45, 45], [150, 90, 45, 45], [210, 90, 45, 45],
  [35, 150, 40, 45], [90, 150, 45, 45], [150, 150, 45, 45], [210, 150, 45, 45],
  [35, 210, 40, 45], [90, 210, 45, 45], [150, 210, 45, 45], [210, 210, 45, 45],
];

/* ─── Badge ─── */
function Badge({ color, label, delay = 0 }: { color: string; label: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="flex items-center gap-1.5 rounded-full border border-white/[.07] bg-white/[.04] px-2.5 py-1 backdrop-blur-sm"
    >
      <motion.span
        className="block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">{label}</span>
    </motion.div>
  );
}

/* ─── Animated progress bar ─── */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[.06]">
      <motion.div
        className="h-full rounded-full"
        style={{
          background: 'linear-gradient(90deg, #1763A6, #90BF49)',
          boxShadow: '0 0 8px #90BF4980',
        }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.4, ease: 'linear' }}
      />
    </div>
  );
}

/* ─── Clock ─── */
function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

/* ══════════════════════════════════════════════════════════════
   Main simulation component
   ══════════════════════════════════════════════════════════════ */
export default function CleanGoMapSimulation() {
  const clock = useClock();
  const [progressSnap, setProgressSnap] = useState(0);

  /* Loop truck from 0 → 1 over 18 seconds, then restart */
  useEffect(() => {
    let cancelled = false;
    let ctrl: ReturnType<typeof animate> | null = null;

    function loop() {
      if (cancelled) return;
      let current = 0;
      ctrl = animate(current, 1, {
        duration: 18,
        ease: 'linear',
        onUpdate: (v) => {
          if (!cancelled) setProgressSnap(v);
        },
        onComplete: () => {
          if (!cancelled) {
            setProgressSnap(0);
            loop();
          }
        },
      });
    }
    loop();
    return () => {
      cancelled = true;
      ctrl?.stop();
    };
  }, []);

  const [tx, ty] = getPositionOnPath(ROUTE, progressSnap);
  const heading = getHeading(ROUTE, progressSnap);

  const completedCount = CHECKPOINT_INDICES.filter(
    (ci) => ci / (ROUTE.length - 1) < progressSnap,
  ).length;
  const totalCheckpoints = CHECKPOINT_INDICES.length;

  const distanceTotal = 14.2;
  const distanceLeft = +(distanceTotal * (1 - progressSnap)).toFixed(1);
  const etaMin = Math.ceil(distanceLeft / 0.8);

  /* Build the "done" portion of the route */
  const doneSegCount = Math.max(2, Math.ceil(progressSnap * (ROUTE.length - 1)) + 1);
  const donePath = buildPath(ROUTE.slice(0, Math.min(doneSegCount, ROUTE.length)));
  const remainStart = Math.max(0, Math.ceil(progressSnap * (ROUTE.length - 1)));
  const remainPath = buildPath(ROUTE.slice(remainStart));

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-bg/90">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-display text-[11px] font-semibold uppercase tracking-widest text-brand-soft">
            CleanGo
          </span>
          <span className="text-[9px] text-white/30">Monitor v2</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-white/40">{clock}</span>
          <Badge color="#90BF49" label="GPS" />
        </div>
      </div>

      {/* ── Map area ── */}
      <div className="relative flex-1">
        <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full">

          {/* City block fills */}
          {CITY_BLOCKS.map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx="3"
              fill="#ffffff" fillOpacity={0.015} />
          ))}

          {/* Street lanes */}
          {STREETS_H.map(([x1, y1, x2, y2], i) => (
            <line key={`h${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#ffffff" strokeOpacity={0.045} strokeWidth="8" />
          ))}
          {STREETS_V.map(([x1, y1, x2, y2], i) => (
            <line key={`v${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#ffffff" strokeOpacity={0.045} strokeWidth="8" />
          ))}

          {/* Centre dashes */}
          {STREETS_H.map(([x1, y1, x2, y2], i) => (
            <line key={`hd${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#ffffff" strokeOpacity={0.02} strokeWidth="1" strokeDasharray="5 5" />
          ))}
          {STREETS_V.map(([x1, y1, x2, y2], i) => (
            <line key={`vd${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#ffffff" strokeOpacity={0.02} strokeWidth="1" strokeDasharray="5 5" />
          ))}

          {/* Route glow shadow */}
          <path d={buildPath(ROUTE)} fill="none"
            stroke="#1763A6" strokeOpacity={0.2} strokeWidth="11"
            strokeLinecap="round" strokeLinejoin="round" />

          {/* Remaining route (dim) */}
          <path d={remainPath} fill="none"
            stroke="#ffffff" strokeOpacity={0.07} strokeWidth="3.5"
            strokeLinecap="round" strokeLinejoin="round" />

          {/* Completed route */}
          <path d={donePath} fill="none"
            stroke="url(#routeGrad)" strokeWidth="3.5"
            strokeLinecap="round" strokeLinejoin="round" />

          {/* Truck pulse ring */}
          <motion.circle cx={tx} cy={ty} r={7}
            fill="#90BF49" fillOpacity={0.15}
            animate={{ r: [5, 11, 5], fillOpacity: [0.2, 0, 0.2] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Checkpoints */}
          {CHECKPOINT_INDICES.map((ci, idx) => {
            const [cx, cy] = ROUTE[ci];
            const done = ci / (ROUTE.length - 1) < progressSnap;
            const isCurrent = idx === completedCount;
            return (
              <g key={idx}>
                {isCurrent && (
                  <motion.circle cx={cx} cy={cy} r={10}
                    fill="#90BF49" fillOpacity={0.15}
                    animate={{ r: [8, 14, 8], fillOpacity: [0.2, 0, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <circle cx={cx} cy={cy} r={4.5}
                  fill={done ? '#90BF49' : '#ffffff'}
                  fillOpacity={done ? 0.9 : 0.12}
                  stroke={done ? '#90BF49' : '#ffffff'}
                  strokeOpacity={done ? 0.4 : 0.08}
                  strokeWidth={1.5}
                />
                {done && (
                  <path d={`M${cx - 2} ${cy} l2 2 l3 -3`}
                    stroke="#050607" strokeWidth={1.2}
                    strokeLinecap="round" strokeLinejoin="round" fill="none" />
                )}
              </g>
            );
          })}

          {/* Start pin */}
          <circle cx={ROUTE[0][0]} cy={ROUTE[0][1]} r={5}
            fill="#1763A6" fillOpacity={0.9} />
          <circle cx={ROUTE[0][0]} cy={ROUTE[0][1]} r={2.5}
            fill="#ffffff" fillOpacity={0.9} />

          {/* End pin */}
          <g transform={`translate(${ROUTE[ROUTE.length - 1][0]},${ROUTE[ROUTE.length - 1][1]})`}>
            <path d="M0,-10 C-5,-10 -5,-3 0,0 C5,-3 5,-10 0,-10Z"
              fill="#90BF49" fillOpacity={0.9} />
            <circle cx={0} cy={-6} r={2} fill="#050607" fillOpacity={0.85} />
          </g>

          {/* Truck */}
          <g transform={`translate(${tx},${ty})`}>
            <g transform={`rotate(${heading}) translate(-12,-7)`}>
              {/* Glow */}
              <ellipse cx={12} cy={7} rx={14} ry={8} fill="#1763A6" fillOpacity={0.3} />
              {/* Body */}
              <rect x={0} y={2} width={16} height={9} rx={1.5} fill="#1763A6" />
              {/* Cab */}
              <rect x={16} y={4} width={7} height={7} rx={1} fill="#152C40" />
              {/* Window */}
              <rect x={17} y={5} width={5} height={3.5} rx={0.5} fill="#90BF4955" />
              {/* Wheels */}
              <circle cx={5}  cy={12} r={2} fill="#0A0D10" />
              <circle cx={5}  cy={12} r={1} fill="#9CA3AF" />
              <circle cx={19} cy={12} r={2} fill="#0A0D10" />
              <circle cx={19} cy={12} r={1} fill="#9CA3AF" />
              {/* Shine */}
              <rect x={1} y={3} width={14} height={1} rx={0.5} fill="white" opacity={0.1} />
              {/* Green stripe */}
              <rect x={0} y={6.5} width={16} height={1} fill="#90BF49" opacity={0.85} />
            </g>
          </g>

          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1763A6" />
              <stop offset="100%" stopColor="#90BF49" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating status card — top right */}
        <motion.div
          animate={{ y: [-3, 3, -3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-3 top-3 min-w-[128px] rounded-xl border border-white/[.08] bg-bg-panel/90 p-3 shadow-2xl backdrop-blur-md"
        >
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-white/40">Estado</p>
          <div className="flex items-center gap-1.5">
            <motion.span
              className="block h-2 w-2 rounded-full bg-[#90BF49]"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <span className="text-xs font-semibold text-white">En curso</span>
          </div>
          <p className="mt-1 text-[9px] text-white/35 font-mono">{clock}</p>
        </motion.div>

        {/* Route label — top left */}
        <motion.div
          animate={{ y: [3, -3, 3] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute left-3 top-3 rounded-xl border border-white/[.08] bg-bg-panel/90 px-3 py-2 shadow-2xl backdrop-blur-md"
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40">Ruta activa</p>
          <p className="text-[11px] font-semibold text-brand-soft">Norte · Sector 4</p>
        </motion.div>
      </div>

      {/* ── Bottom panel ── */}
      <div className="space-y-2.5 border-t border-white/[.06] px-4 py-3">

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge color="#90BF49" label="Ruta optimizada" delay={0.3} />
          <Badge color="#1763A6" label="Monitoreo activo" delay={0.5} />
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40">Progreso del recorrido</span>
            <span className="text-[10px] font-semibold text-brand-soft">
              {Math.round(progressSnap * 100)}%
            </span>
          </div>
          <ProgressBar progress={progressSnap} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Checkpoints', value: `${completedCount}`, unit: `/ ${totalCheckpoints}` },
            { label: 'Distancia',   value: `${distanceLeft}`,   unit: 'km' },
            { label: 'ETA',         value: `${etaMin}`,         unit: 'min' },
          ].map((s) => (
            <div key={s.label}
              className="rounded-lg border border-white/[.05] bg-white/[.02] px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-wide text-white/35">{s.label}</p>
              <p className="mt-0.5 text-xs font-semibold text-white">
                {s.value}
                <span className="text-white/30"> {s.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
