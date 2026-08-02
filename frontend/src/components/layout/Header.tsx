import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  title: string;
  subtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user } = useAuth();

  // Usar nombre del usuario autenticado si existe, sino valores por defecto
  const nombre = user?.nombre || 'M. Ramírez';
  const rol = 'Administrador'; // Se podría sacar del user si existiera el campo

  // Obtener iniciales (ej. M. Ramírez -> MR)
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 0) return 'MR';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const iniciales = getInitials(nombre);

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 2rem',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border, #E5E7EB)',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Izquierda: Subtítulo y Título */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        <span style={{
          fontSize: '0.8rem',
          color: '#6B7280', // Gris
          fontWeight: 500,
          letterSpacing: '0.01em',
          lineHeight: 1.2
        }}>
          {subtitle}
        </span>
        <h1 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#111827', // Oscuro
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          fontFamily: 'var(--font-display, inherit)'
        }}>
          {title}
        </h1>
      </div>

      {/* Derecha: Notificaciones y Perfil */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Botón Notificaciones */}
        <button
          aria-label="Notificaciones"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '1px solid var(--border, #E5E7EB)',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            color: '#4B5563',
            transition: 'background-color 0.15s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
        >
          <Bell size={20} />
        </button>

        {/* Perfil (Avatar + Nombre + Rol) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          {/* Avatar Circular */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1763A6, #152C40)', // Azul institucional CleanGo
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(23, 99, 166, 0.25)'
            }}
          >
            {iniciales}
          </div>
          
          {/* Nombre y Rol alineados verticalmente */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#111827',
              lineHeight: 1.2
            }}>
              {nombre}
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: '#6B7280',
              fontWeight: 400,
              lineHeight: 1.2,
              marginTop: '0.125rem'
            }}>
              {rol}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
