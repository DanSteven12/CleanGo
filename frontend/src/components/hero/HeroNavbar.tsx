import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Menu, X, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#tecnologia', label: 'Plataforma' },
  { href: '#caracteristicas', label: 'Características' },
  { href: '#quienes-somos', label: 'Quiénes Somos' },
  { href: '#descargar-app', label: 'Descargar App' },
];

export default function HeroNavbar() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState(navLinks[0].href);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Navbar tightens once page scrolls — same "settles in" pattern Linear/Vercel use.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy: highlights whichever section is currently in view.
  // Sections beyond the Hero don't exist yet — this quietly no-ops
  // until they are added (no changes needed to this file).
  useEffect(() => {
    const targets = navLinks
      .map((link) => document.querySelector(link.href))
      .filter((el): el is Element => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const href = `#${visible[0].target.id}`;
          setActiveHref(href);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed inset-x-0 top-4 z-40 flex items-center justify-between px-4 transition-all duration-500 sm:top-6 sm:px-6 md:px-10',
          scrolled && 'top-3 sm:top-3',
        )}
      >
        <a
          href="#inicio"
          className={cn(
            'flex items-center gap-2 rounded-full border border-white/[.06] px-4 py-2 backdrop-blur-xl transition-colors duration-500',
            scrolled ? 'bg-bg-panel/80' : 'bg-white/[.04]',
          )}
        >
          <span className="font-display text-base font-medium tracking-tight text-white">
            CleanGo<span className="text-brand-soft">.</span>
          </span>
        </a>

        <div
          className={cn(
            'hidden items-center gap-1 rounded-full border border-white/[.06] px-1.5 py-1.5 backdrop-blur-xl transition-colors duration-500 lg:flex',
            scrolled ? 'bg-bg-panel/80' : 'bg-white/[.04]',
          )}
        >
          {navLinks.map((link) => {
            const isActive = activeHref === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'relative rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-white' : 'text-ink-muted hover:text-white',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full border border-brand-soft/25 bg-white/[.06]"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            className="hidden items-center gap-2 rounded-full border border-white/[.06] bg-white/[.04] px-4 py-2 text-sm font-medium text-white backdrop-blur-xl transition-colors hover:border-brand-soft/40 sm:flex"
          >
            {isAuthenticated ? (
              <>
                <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={2} />
                Ir al Dashboard
              </>
            ) : (
              <>
                <LogIn className="h-3.5 w-3.5" strokeWidth={2} />
                Iniciar sesión
              </>
            )}
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[.06] bg-white/[.04] text-white backdrop-blur-xl transition-colors hover:border-brand-soft/40 lg:hidden"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            <Menu className={cn('absolute h-5 w-5 transition-all duration-300', menuOpen ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100')} />
            <X className={cn('absolute h-5 w-5 transition-all duration-300', menuOpen ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0')} />
          </button>
        </div>
      </motion.nav>

      <div
        className={cn(
          'fixed inset-0 z-30 bg-bg/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMenuOpen(false)}
      />

      <div
        className={cn(
          'fixed inset-y-0 right-0 z-30 w-[85%] max-w-sm border-l border-white/[.06] bg-bg-panel/95 backdrop-blur-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden',
          menuOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex h-full flex-col px-8 pb-8 pt-28">
          <div className="flex flex-col gap-1">
            {navLinks.map((link, i) => {
              const isActive = activeHref === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'border-b py-4 pl-3 text-xl font-medium transition-all duration-500',
                    isActive ? 'border-white/[.06] border-l-2 border-l-brand-soft text-white' : 'border-white/[.06] text-white/80',
                    menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0',
                  )}
                  style={{ transitionDelay: menuOpen ? `${150 + i * 60}ms` : '0ms' }}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
          <button
            onClick={() => { setMenuOpen(false); navigate(isAuthenticated ? '/dashboard' : '/login'); }}
            className={cn(
              'mt-8 flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition-all duration-500',
              menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0',
            )}
            style={{ transitionDelay: menuOpen ? '450ms' : '0ms' }}
          >
            {isAuthenticated ? (
              <>
                <LayoutDashboard className="h-4 w-4" />
                Ir al Dashboard
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
