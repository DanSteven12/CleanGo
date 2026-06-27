import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
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

        {/* Desktop Nav Links */}
        <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a
            href="#dashboard"
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            Dashboard
          </a>
          <a
            href="#routes"
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--accent)',
              textDecoration: 'none',
            }}
          >
            Route Optimizer
          </a>
          <a
            href="#jobs"
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            Cleaning Jobs
          </a>
          <a
            href="#settings"
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            Settings
          </a>
        </nav>

        {/* User Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right', display: 'none' /* hidden on mobile */ }}>
            <div style={{ fontSize: '13px', fontWeight: '600' }}>Operator Team</div>
            <div style={{ fontSize: '11px', color: 'var(--text)' }}>Austin South</div>
          </div>
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
            TX
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
};
