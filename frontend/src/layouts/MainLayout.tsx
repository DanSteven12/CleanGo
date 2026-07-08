import React from 'react';
import { AppSidebar } from '../components/layout/AppSidebar';

// ─── Props ─────────────────────────────────────────────────────────────────────
// Legacy props kept to avoid breaking App.tsx call-sites. They are no longer
// used for rendering (navigation is driven by the router via AppSidebar), but
// are accepted to maintain backward compatibility without touching App.tsx.

type Module = 'gestion-rutas' | 'asignacion-rutas' | 'mapa-vivo' | 'historial-recorridos';

interface MainLayoutProps {
  children: React.ReactNode;
  activeModule: Module;
  onNavigate: (module: Module) => void;
}

// ─── MainLayout ────────────────────────────────────────────────────────────────

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text-h)',
      }}
    >
      {/* ── Sidebar ──────────────────────────────────── */}
      <AppSidebar />

      {/* ── Main content area ────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflowX: 'hidden',
        }}
      >
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
