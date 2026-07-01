import React from 'react';

type Module = 'gestion-rutas' | 'asignacion-rutas';

interface MainLayoutProps {
  children: React.ReactNode;
  activeModule: Module;
  onNavigate: (module: Module) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, activeModule, onNavigate }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text-h)',
      }}
    >
      {/* Navigation Header */}
      <header
        style={{
          height: '70px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel-bg)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #aa3bff 0%, #7a1dff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            ✨
          </span>
          <span
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, #aa3bff 0%, #7a1dff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            CleanGo
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <NavButton
            id="nav-gestion-rutas"
            label="Gestión de Rutas"
            icon="🗺️"
            active={activeModule === 'gestion-rutas'}
            onClick={() => onNavigate('gestion-rutas')}
          />
          <NavButton
            id="nav-asignacion-rutas"
            label="Asignación de Rutas"
            icon="📋"
            active={activeModule === 'asignacion-rutas'}
            onClick={() => onNavigate('asignacion-rutas')}
          />
        </nav>

        {/* User avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '14px',
              color: 'var(--accent)',
            }}
          >
            Adm
          </div>
        </div>
      </header>

      {/* Page title bar */}
      <div
        style={{
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel-bg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
        }}
      >
        <span style={{ fontSize: '1rem' }}>
          {activeModule === 'gestion-rutas' ? '🗺️' : '📋'}
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-h)',
          }}
        >
          {activeModule === 'gestion-rutas' ? 'Gestión de Rutas' : 'Asignación de Rutas'}
        </h1>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text)',
            marginLeft: '0.25rem',
          }}
        >
          {activeModule === 'gestion-rutas'
            ? '— Crea y administra rutas con sus puntos de control'
            : '— Asigna rutas a camiones y conductores'}
        </span>
      </div>

      {/* Main content */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
};

// ─── NavButton ─────────────────────────────────────────────────────────────────

interface NavButtonProps {
  id: string;
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ id, label, icon, active, onClick }) => (
  <button
    id={id}
    onClick={onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.4rem 0.85rem',
      borderRadius: '0.5rem',
      border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
      background: active ? 'var(--accent-bg)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text)',
      fontWeight: active ? 700 : 500,
      fontSize: '0.875rem',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={e => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bg)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
      }
    }}
    onMouseLeave={e => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
      }
    }}
  >
    <span style={{ fontSize: '1rem' }}>{icon}</span>
    {label}
  </button>
);
