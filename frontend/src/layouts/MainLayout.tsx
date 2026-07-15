import React from 'react';
import { AppSidebar } from '../components/layout/AppSidebar';

// ─── Props ─────────────────────────────────────────────────────────────────────
// Legacy props kept to avoid breaking App.tsx call-sites.
type Module = 'gestion-rutas' | 'asignacion-rutas' | 'mapa-vivo' | 'historial-recorridos' | 'calendario';

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
        className="bg-grid"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflowX: 'hidden',
          minHeight: '100vh',
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

