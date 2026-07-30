import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';

const ROUTE: [number, number][] = [
  [18, 105], [18, 65], [80, 65], [80, 30],
  [180, 30], [180, 65], [250, 65], [250, 105], [302, 105],
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function posAt(t: number): [number, number] {
  const n = ROUTE.length - 1;
  const raw = Math.max(0, Math.min(1, t)) * n;
  const idx = Math.min(Math.floor(raw), n - 1);
  const seg = raw - idx;
  return [lerp(ROUTE[idx][0], ROUTE[idx + 1][0], seg), lerp(ROUTE[idx][1], ROUTE[idx + 1][1], seg)];
}

function headingAt(t: number): number {
  const n = ROUTE.length - 1;
  const idx = Math.min(Math.floor(Math.max(0, Math.min(1, t)) * n), n - 1);
  return Math.atan2(ROUTE[idx + 1][1] - ROUTE[idx][1], ROUTE[idx + 1][0] - ROUTE[idx][0]) * (180 / Math.PI);
}

const PATH_D = ROUTE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
const CHECKPOINT_IDX = [1, 3, 5, 7];

export default function MiniMapPreview() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    function loop() {
      if (cancelled) return;
      animate(0, 1, {
        duration: 9, ease: 'linear',
        onUpdate: (v) => { if (!cancelled) setProgress(v); },
        onComplete: () => { if (!cancelled) { setProgress(0); loop(); } },
      });
    }
    loop();
    return () => { cancelled = true; };
  }, []);

  const [tx, ty] = posAt(progress);
  // Calculate percentage of path completed
  const pct = Math.max(0, Math.min(100, progress * 100));

  return (
    <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-white/[.06] bg-[#080d10] shadow-inner mb-6">
      <svg viewBox="0 0 320 130" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {/* City block fills */}
        {([[22,10,54,50],[90,10,86,16],[90,35,86,26],[188,10,58,50],[22,73,54,27],[90,73,86,27],[188,73,58,27]] as number[][]).map(([x,y,w,h],i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#fff" fillOpacity={0.012} />
        ))}
        
        {/* Street lanes */}
        {[[0,65,320,65],[0,105,320,105]].map(([x1,y1,x2,y2],i) => <line key={`h${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeOpacity={0.05} strokeWidth="8" />)}
        {[[18,0,18,130],[80,0,80,130],[180,0,180,130],[250,0,250,130],[302,0,302,130]].map(([x1,y1,x2,y2],i) => <line key={`v${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeOpacity={0.05} strokeWidth="8" />)}
        
        {/* Centre dashes */}
        {[[0,65,320,65],[0,105,320,105]].map(([x1,y1,x2,y2],i) => <line key={`d${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeOpacity={0.02} strokeWidth="1" strokeDasharray="5 4" />)}
        
        {/* Wide soft glow under everything */}
        <path d={PATH_D} fill="none" stroke="#1763A6" strokeOpacity={0.15} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Full Remaining Dim Path */}
        <path d={PATH_D} fill="none" stroke="#ffffff" strokeOpacity={0.06} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Completed Route using pathLength and strokeDashoffset for perfect clean corners */}
        <path d={PATH_D} fill="none" stroke="url(#mmpG)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          pathLength="100" strokeDasharray="100" strokeDashoffset={100 - pct} />
        
        {/* Truck pulse */}
        <motion.circle cx={tx} cy={ty} r={7} fill="#90BF49" fillOpacity={0.15}
          animate={{ r:[4,9,4], fillOpacity:[0.2,0,0.2] }}
          transition={{ duration:1.4, repeat:Infinity, ease:'easeInOut' }} />
        
        {/* Checkpoints */}
        {CHECKPOINT_IDX.map((ci, i) => {
          const [cx, cy] = ROUTE[ci];
          const done = ci / (ROUTE.length - 1) <= progress + 0.01;
          return <circle key={i} cx={cx} cy={cy} r={3.5} fill={done ? '#90BF49' : '#fff'} fillOpacity={done ? 0.95 : 0.15} stroke={done ? '#90BF49' : '#fff'} strokeOpacity={done ? 0.4 : 0.1} strokeWidth={2} />;
        })}
        
        {/* Start */}
        <circle cx={ROUTE[0][0]} cy={ROUTE[0][1]} r={5} fill="#1763A6" fillOpacity={0.9} />
        <circle cx={ROUTE[0][0]} cy={ROUTE[0][1]} r={2.5} fill="#fff" fillOpacity={0.9} />
        
        {/* End */}
        <g transform={`translate(${ROUTE[ROUTE.length-1][0]},${ROUTE[ROUTE.length-1][1]})`}>
          <path d="M0,-9 C-4.5,-9 -4.5,-2 0,0 C4.5,-2 4.5,-9 0,-9Z" fill="#90BF49" fillOpacity={0.9} />
          <circle cx={0} cy={-5.5} r={1.5} fill="#050607" fillOpacity={0.85} />
        </g>
        
        {/* Truck */}
        <g transform={`translate(${tx},${ty})`}>
          <g transform={`rotate(${headingAt(progress)}) translate(-8,-5)`}>
            <ellipse cx={8} cy={5} rx={10} ry={6} fill="#1763A6" fillOpacity={0.35} />
            <rect x={0} y={1} width={11} height={7} rx={1} fill="#1763A6" />
            <rect x={11} y={2.5} width={5} height={5.5} rx={0.8} fill="#152C40" />
            <rect x={11.5} y={3} width={4} height={2.5} rx={0.5} fill="#90BF4940" />
            <circle cx={3} cy={9} r={1.5} fill="#0A0D10" /><circle cx={3} cy={9} r={0.7} fill="#9CA3AF" />
            <circle cx={13} cy={9} r={1.5} fill="#0A0D10" /><circle cx={13} cy={9} r={0.7} fill="#9CA3AF" />
            <rect x={0} y={4.5} width={11} height={0.8} fill="#90BF49" opacity={0.85} />
          </g>
        </g>
        
        <defs>
          <linearGradient id="mmpG" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1763A6" /><stop offset="100%" stopColor="#90BF49" />
          </linearGradient>
        </defs>
      </svg>
      {/* Live badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full border border-white/[.06] bg-bg-panel/80 px-2 py-1 backdrop-blur-sm">
        <motion.span className="block h-1.5 w-1.5 rounded-full bg-brand-soft"
          animate={{ opacity:[1,0.3,1] }} transition={{ duration:1.6, repeat:Infinity }} />
        <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">En vivo</span>
      </div>
    </div>
  );
}

