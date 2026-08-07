import { motion } from 'framer-motion';
import { LogIn, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MagneticButton from '../ui/MagneticButton';
import { useAuth } from '@/hooks/useAuth';

export default function HeroButtons() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mt-9 flex flex-wrap items-center justify-center gap-4"
    >
      {/* Primary: glow button with animated conic border-beam + magnetic pull toward cursor */}
      <MagneticButton strength={0.25}>
        <button
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0%, rgba(144,191,73,0.9) 15%, transparent 30%)',
              animation: 'spin 2.4s linear infinite',
            }}
          />
          <span className="absolute inset-[1.5px] rounded-full bg-brand" aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute -inset-2 rounded-full opacity-40 blur-xl transition-opacity duration-500 group-hover:opacity-70"
            style={{ background: 'radial-gradient(circle, rgba(144,191,73,0.6), transparent 70%)' }}
          />
          {isAuthenticated ? (
            <LayoutDashboard className="relative z-10 h-4 w-4" strokeWidth={2} />
          ) : (
            <LogIn className="relative z-10 h-4 w-4" strokeWidth={2} />
          )}
          <span className="relative z-10">{isAuthenticated ? 'IR AL DASHBOARD' : 'INICIAR SESIÓN'}</span>
        </button>
      </MagneticButton>



      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}
