import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CinematicIntroProps {
  /** URL of the user's own video. Not provided by this component — pass it in when ready. */
  videoSrc: string;
  /** Wordmark shown during the reveal. Defaults to CleanGo. */
  brand?: string;
  /** Minimum time the intro stays on screen before handing off to the video, in ms. */
  introDurationMs?: number;
  /** Safety ceiling: hand off to the video even if it hasn't buffered yet, in ms. */
  maxWaitMs?: number;
  className?: string;
}

/**
 * Cinematic entrance sequence, built entirely with CSS transitions/keyframes
 * (no Framer Motion, no GSAP) — gradient mesh → particles → glass reveal →
 * cross-dissolve into the user's own <video>. Every animated property is
 * GPU-only (transform / opacity / filter); nothing here animates
 * width/height/top/left.
 *
 * Usage:
 *   <CinematicIntro videoSrc="/videos/cleango.mp4" />
 *
 * This component is additive — it does not alter Hero.tsx, the globe, the
 * bento cards, or anything else already shipped. Drop it wherever the
 * welcome/video screen mounts.
 */
export default function CinematicIntro({
  videoSrc,
  brand = 'CleanGo',
  introDurationMs = 2600,
  maxWaitMs = 4200,
  className,
}: CinematicIntroProps) {
  const [videoReady, setVideoReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [introMounted, setIntroMounted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Respect the same global reduced-motion rule already enforced in index.css
  // (it collapses animation-duration to ~0) by also collapsing the *timers*
  // that gate the handoff — otherwise a reduced-motion user would still sit
  // through a silent 2.6s wait for an animation they can't see.
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const effectiveIntroMs = prefersReducedMotion ? 0 : introDurationMs;

  // Minimum stage timer — the cinematic sequence gets to breathe even if
  // the video buffers instantly.
  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), effectiveIntroMs);
    return () => clearTimeout(t);
  }, [effectiveIntroMs]);

  // Safety ceiling — never trap the user behind the intro if the video is slow.
  useEffect(() => {
    const t = setTimeout(() => setVideoReady(true), maxWaitMs);
    return () => clearTimeout(t);
  }, [maxWaitMs]);

  // Hand off the moment both conditions are met — natural, not a fixed clock.
  useEffect(() => {
    if (minTimeElapsed && videoReady && !exiting) {
      setExiting(true);
      const video = videoRef.current;
      if (video) {
        // Defensive reset: guarantees visible playback starts at frame 0
        // exactly at the reveal, regardless of any buffering the browser
        // may have done while the video sat hidden behind the overlay.
        try {
          video.currentTime = 0;
        } catch {
          /* not seekable yet — fine, play() below still works */
        }
        video.play().catch(() => {});
      }
      const t = setTimeout(() => setIntroMounted(false), 950); // matches intro-exit duration
      return () => clearTimeout(t);
    }
  }, [minTimeElapsed, videoReady, exiting]);

  // Keep the video paused for as long as the overlay is up — belt-and-braces
  // alongside omitting the `autoPlay` attribute, in case a browser starts
  // buffering-with-playback on its own.
  useEffect(() => {
    if (!exiting) videoRef.current?.pause();
  }, [exiting]);

  // Stop playback if this unmounts mid-sequence (e.g. route change).
  useEffect(() => {
    return () => {
      videoRef.current?.pause();
    };
  }, []);

  return (
    <div className={cn('relative h-screen w-full overflow-hidden bg-bg', className)}>
      {/* ---------- Layer 1: the user's own video, loading silently underneath ---------- */}
      <video
        ref={videoRef}
        src={videoSrc}
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover [backface-visibility:hidden] [transform:translateZ(0)]',
          exiting ? 'animate-[video-arrive_1.1s_cubic-bezier(0.16,1,0.3,1)_both]' : 'opacity-0',
        )}
      />

      {/* ---------- Layer 2: the cinematic intro overlay ---------- */}
      {introMounted && (
        <div
          className={cn(
            'absolute inset-0 will-change-[opacity,transform,filter]',
            exiting && 'animate-[intro-exit_0.95s_cubic-bezier(0.65,0,0.35,1)_forwards]',
          )}
        >
          {/* 1 — CleanGo gradient field, mesh-like, slow independent drift layers (ambient parallax) */}
          <div className="absolute inset-0 bg-bg" aria-hidden="true">
            <div
              className="absolute -left-1/4 -top-1/4 h-[140%] w-[140%] animate-mesh-drift-slow rounded-full opacity-[.16] blur-[110px] will-change-transform [transform:translateZ(0)]"
              style={{ background: 'radial-gradient(circle, #388C35, transparent 60%)' }}
            />
            <div
              className="absolute -bottom-1/3 -right-1/4 h-[120%] w-[120%] animate-mesh-drift rounded-full opacity-[.14] blur-[100px] will-change-transform [transform:translateZ(0)]"
              style={{ background: 'radial-gradient(circle, #1763A6, transparent 62%)' }}
            />
            <div
              className="absolute left-1/3 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 animate-mesh-drift rounded-full opacity-[.10] blur-[90px] will-change-transform [transform:translateZ(0)]"
              style={{ background: 'radial-gradient(circle, #90BF49, transparent 65%)', animationDelay: '-6s' }}
            />
          </div>

          {/* soft noise, same trick used across the rest of the product */}
          <div className="grain" aria-hidden="true" />

          {/* 2 — subtle luminous particles, pure CSS drift */}
          <IntroParticles count={16} />

          {/* 3–7, 9, 11 — glass panel with the reveal: blur → focus, scale-in, fade-in, glow */}
          <div className="relative flex h-full w-full items-center justify-center px-6">
            <div className="animate-intro-reveal will-change-[opacity,transform,filter] [transform:translateZ(0)]">
              <div className="relative flex flex-col items-center gap-5 rounded-[28px] border border-white/[.07] bg-white/[.03] px-10 py-9 backdrop-blur-2xl sm:px-14 sm:py-11">
                {/* discreet glow behind the glass panel */}
                <div
                  className="absolute inset-0 -z-10 animate-intro-glow-pulse rounded-[28px] blur-2xl will-change-[opacity]"
                  style={{ background: 'radial-gradient(circle, rgba(56,140,53,0.35), transparent 70%)' }}
                />
                <span className="h-9 w-9 rounded-full border border-brand-soft/30 bg-brand/15 sm:h-10 sm:w-10" aria-hidden="true" />
                <p className="font-display text-2xl font-medium tracking-tight text-white sm:text-3xl">
                  {brand}
                  <span className="text-brand-soft">.</span>
                </p>
                <div className="h-px w-10 bg-gradient-to-r from-transparent via-brand-soft/50 to-transparent" />
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted" role="status" aria-live="polite">
                  Cargando experiencia
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Ambient floating light specks for the intro — CSS keyframes only. */
function IntroParticles({ count = 16 }: { count?: number }) {
  const specks = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    top: `${(i * 53) % 100}%`,
    size: 1 + ((i * 7) % 3),
    duration: 5 + ((i * 3) % 7),
    delay: -(i * 0.9),
  }));

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {specks.map((s, i) => (
        <span
          key={i}
          className="absolute animate-particle-drift rounded-full bg-brand-soft/70 will-change-[opacity,transform] [transform:translateZ(0)]"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            boxShadow: '0 0 6px rgba(144,191,73,0.6)',
          }}
        />
      ))}
    </div>
  );
}
