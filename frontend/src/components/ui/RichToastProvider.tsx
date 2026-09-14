// frontend/src/components/ui/RichToastProvider.tsx
//
// Renders active Rich Toasts in a fixed portal anchored to the top-right corner
// of the viewport. Works alongside (not replacing) Sonner's <Toaster>.
//
// Usage in App.tsx:
//   import { RichToastProvider } from './components/ui/RichToastProvider';
//   <RichToastProvider />   ← place next to <Toaster> and <BlockingOverlay>

import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { RichToastCard } from './RichToastCard';
import { useRichToast } from '../../hooks/useRichToast';

// ─── RichToastProvider ────────────────────────────────────────────────────────

export const RichToastProvider: React.FC = () => {
  const { toasts, dismissToast } = useRichToast();

  // Render nothing until at least one toast is queued.
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-label="Notificaciones en tiempo real"
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 99990, // above Sonner (z-index ~9999) but below modals
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',   // container transparent; cards re-enable it
        width: '348px',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <AnimatePresence mode="sync" initial={false}>
        {toasts.map((toast) => (
          <RichToastCard
            key={toast.id}
            toast={toast}
            onClose={dismissToast}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};
