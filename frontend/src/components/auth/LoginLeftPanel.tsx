// frontend/src/components/auth/LoginLeftPanel.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Ripple } from './Ripple';
import { TechOrbitDisplay } from './TechOrbitDisplay';

/**
 * Decorative left panel for the CleanGo login page.
 * Contains the Ripple background + TechOrbitDisplay animation.
 */
export const LoginLeftPanel: React.FC = () => {
  return (
    <div className="auth-panel-left auth-panel-left--animated">
      {/* ── Static decorative grid (kept from original) ── */}
      <div className="auth-panel-bg-grid" />

      {/* ── Ripple background waves ── */}
      <Ripple
        rings={6}
        baseSize={140}
        color="rgba(144, 191, 73, 0.14)"
      />

      {/* ── Secondary ripple, blue tint ── */}
      <Ripple
        rings={4}
        baseSize={80}
        color="rgba(23, 99, 166, 0.25)"
      />

      {/* ── Orbit animation (centred, takes most vertical space) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 440, height: 440, maxWidth: '90%', maxHeight: '90%' }}>
          <TechOrbitDisplay />
        </div>
      </div>

      {/* ── Bottom tagline — adjusted so text is 100% visible and unclipped ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 20,
          padding: '0 1.5rem',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            fontSize: '0.85rem',
            color: 'rgba(215, 235, 255, 0.78)',
            lineHeight: 1.5,
            margin: '0 auto',
            maxWidth: '460px',
            letterSpacing: '0.01em',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          }}
        >
          CleanGo, gestión inteligente de recolección de residuos
        </p>
      </motion.div>
    </div>
  );
};

