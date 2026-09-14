import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { obtenerNotificacionesAdmin } from '../../services/notificacionesService';

interface HeaderProps {
  title: string;
  subtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const nombre = user?.nombre || 'Administrador';
  const rol = 'Administrador';

  const fetchUnread = async () => {
    try {
      const unreadList = await obtenerNotificacionesAdmin({ leida: false });
      setUnreadCount(unreadList.summary?.unread ?? unreadList.data?.length ?? 0);
    } catch (error) {
      console.error('Error fetching unread notifications in Header:', error);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchUnread();
    const handleSync = () => fetchUnread();
    window.addEventListener('notificacion-leida', handleSync);
    window.addEventListener('notificacion-recibida', handleSync);
    return () => {
      window.removeEventListener('notificacion-leida', handleSync);
      window.removeEventListener('notificacion-recibida', handleSync);
    };
  }, [user]);

  const handleBellClick = () => {
    navigate('/notificaciones');
  };

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
        {/* Bell Button with Badge */}
        <button
          id="header-notifications-btn"
          aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
          title="Ver notificaciones"
          className="app-header__icon-btn"
          onClick={handleBellClick}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="app-header__badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
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

