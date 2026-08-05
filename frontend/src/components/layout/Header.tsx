import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  title: string;
  subtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user } = useAuth();

  const nombre = user?.nombre || 'Administrador';
  const rol = 'Administrador';

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 0) return 'AD';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const iniciales = getInitials(nombre);

  return (
    <header className="app-header">
      {/* Left: Subtitle + Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
        <span className="app-header__subtitle">{subtitle}</span>
        <h1 className="app-header__title">{title}</h1>
      </div>

      {/* Right: Notifications + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        {/* Bell */}
        <button
          aria-label="Notificaciones"
          className="app-header__icon-btn"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
        >
          <Bell size={18} />
        </button>

        {/* Avatar */}
        <div className="app-header__avatar">{iniciales}</div>

        {/* Name + role — hidden on small screens via CSS */}
        <div className="app-header__user-info">
          <span className="app-header__user-name">{nombre}</span>
          <span className="app-header__user-role">{rol}</span>
        </div>
      </div>
    </header>
  );
};
