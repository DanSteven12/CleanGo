import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import iconoCamion from "../../assets/images/icono.png";
import {
  LayoutDashboard,
  Route,
  Map,
  MapPinned,
  Satellite,
  History,
  Calendar,
  Bell,
  BarChart3,
  Users,
  Truck,
  HardHat,
  TriangleAlert,
  ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type IconProps = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  strokeWidth?: number;
};

interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: React.FC<IconProps>;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.FC<IconProps>;
  children: NavItem[];
}

// ─── Navigation config ────────────────────────────────────────────────────────

const STANDALONE_TOP: NavItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', to: '/', icon: LayoutDashboard },
];

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'group-rutas',
    label: 'Rutas y Checkpoints',
    icon: Route,
    children: [
      { id: 'nav-rutas', label: 'Rutas', to: '/rutas', icon: Map },
      { id: 'nav-checkpoints', label: 'Asignaciones', to: '/asignaciones', icon: MapPinned },
    ],
  },
  {
    id: 'group-operacion',
    label: 'Operación en Vivo',
    icon: Satellite,
    children: [
      { id: 'nav-mapa-vivo', label: 'Mapa en Vivo', to: '/mapa-vivo', icon: Map },
      { id: 'nav-historial', label: 'Historial', to: '/historial', icon: History },
    ],
  },
];

const STANDALONE_SECONDARY: NavItem[] = [
  { id: 'nav-calendario', label: 'Calendario', to: '/calendario', icon: Calendar },
  { id: 'nav-notificaciones', label: 'Notificaciones', to: '/notificaciones', icon: Bell },
  { id: 'nav-reportes', label: 'Reportes', to: '/reportes', icon: BarChart3 },
];

const STANDALONE_TERTIARY: NavItem[] = [
  { id: 'nav-usuarios', label: 'Usuarios', to: '/usuarios', icon: Users },
  { id: 'nav-camiones', label: 'Camiones', to: '/camiones', icon: Truck },
  { id: 'nav-conductores', label: 'Conductores', to: '/conductores', icon: HardHat },
];

const STANDALONE_QUATERNARY: NavItem[] = [
  { id: 'nav-incidencias', label: 'Incidencias', to: '/incidencias', icon: TriangleAlert },
  { id: 'nav-auditoria', label: 'Auditoría', to: '/auditoria', icon: History },
];

// ─── Helper: is path active ──────────────────────────────────────────────────

function isPathActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname.startsWith(to);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SidebarLinkProps {
  item: NavItem;
  pathname: string;
  indented?: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ item, pathname, indented = false }) => {
  const active = isPathActive(pathname, item.to);
  const Icon = item.icon;

  return (
    <Link
      id={item.id}
      to={item.to}
      title={item.label}
      data-active={active ? 'true' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.5rem 0.75rem',
        paddingLeft: indented ? '2.375rem' : '0.75rem',
        borderRadius: '0.625rem',
        textDecoration: 'none',
        fontSize: '0.8125rem',
        fontWeight: active ? 600 : 400,
        color: active
          ? 'var(--sidebar-accent-foreground)'
          : 'oklch(0.78 0.03 240)',
        background: active
          ? 'linear-gradient(135deg, oklch(0.52 0.14 250 / 0.8), oklch(0.42 0.08 200 / 0.8))'
          : 'transparent',
        transition: 'background 0.15s ease, color 0.15s ease',
        position: 'relative',
        letterSpacing: '-0.01em',
      }}
      className="sidebar-link"
    >
      {active && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '18%',
            bottom: '18%',
            width: '3px',
            borderRadius: '0 3px 3px 0',
            background: 'var(--accent)',
            boxShadow: '0 0 8px oklch(0.72 0.18 138 / 0.6)',
          }}
        />
      )}
      <Icon
        size={15}
        style={{
          flexShrink: 0,
          color: active ? 'var(--accent)' : 'oklch(0.62 0.04 250)',
          transition: 'color 0.15s ease',
        }}
      />
      <span style={{ lineHeight: 1.3 }}>{item.label}</span>
    </Link>
  );
};

interface CollapsibleGroupProps {
  group: NavGroup;
  pathname: string;
}

const CollapsibleGroup: React.FC<CollapsibleGroupProps> = ({ group, pathname }) => {
  const isGroupActive = group.children.some((c) => isPathActive(pathname, c.to));
  const [open, setOpen] = useState(isGroupActive);
  const Icon = group.icon;

  // Auto-open when navigating into this group
  useEffect(() => {
    if (isGroupActive) setOpen(true);
  }, [isGroupActive]);

  return (
    <div>
      {/* Group header */}
      <button
        id={group.id}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          width: '100%',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.625rem',
          background: isGroupActive ? 'oklch(0.30 0.06 250 / 0.55)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: isGroupActive ? 'var(--sidebar-accent-foreground)' : 'oklch(0.78 0.03 240)',
          fontSize: '0.8125rem',
          fontWeight: isGroupActive ? 600 : 500,
          textAlign: 'left',
          transition: 'background 0.15s ease, color 0.15s ease',
          letterSpacing: '-0.01em',
        }}
        className="sidebar-group-btn"
        aria-expanded={open}
      >
        <Icon
          size={15}
          style={{
            flexShrink: 0,
            color: isGroupActive ? 'var(--accent)' : 'oklch(0.62 0.04 250)',
            transition: 'color 0.15s ease',
          }}
        />
        <span style={{ flex: 1, lineHeight: 1.3 }}>
          {group.label}
        </span>
        <ChevronDown
          size={13}
          style={{
            flexShrink: 0,
            color: 'oklch(0.52 0.03 250)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </button>

      {/* Collapsible children */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: open ? `${group.children.length * 44}px` : '0px',
          transition: 'max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingTop: '2px' }}>
          {group.children.map((child) => (
            <SidebarLink key={child.id} item={child} pathname={pathname} indented />
          ))}
        </div>
      </div>
    </div>
  );
};

const Divider: React.FC = () => (
  <div
    style={{
      height: '1px',
      background: 'var(--sidebar-border)',
      margin: '0.5rem 0',
      flexShrink: 0,
    }}
  />
);

// ─── Main AppSidebar ──────────────────────────────────────────────────────────

export const AppSidebar: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <aside
      id="app-sidebar"
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* ── Brand ─────────────────────────────────────── */}
      <div
        style={{
          padding: '1.125rem 1rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          borderBottom: '1px solid var(--sidebar-border)',
          flexShrink: 0,
        }}
      >
        {/* Logo mark (NUEVO: Imagen en lugar de SVG) */}
        <div
          style={{
            width: '58px', // Ligeramente más grande para que luzca bien el círculo
            height: '58px',
            borderRadius: '50%', // Lo hace un círculo perfecto
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 10px oklch(0.52 0.14 250 / 0.40)', // Conservé tu sombra
          }}
        >
          <img
            src={iconoCamion}
            alt="CleanGo"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Wordmark (SE QUEDA EXACTAMENTE IGUAL) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, oklch(0.82 0.08 240) 0%, #90BF49 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.15,
            }}
          >
            CleanGo
          </span>
          <span style={{ fontSize: '0.6rem', color: 'oklch(0.52 0.04 250)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, lineHeight: 1 }}>
            Logística Urbana
          </span>
        </div>
      </div>

      {/* ── Nav body ──────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '0.75rem 0.625rem',
          gap: '1px',
          overflowY: 'auto',
        }}
      >
        {/* Dashboard */}
        {STANDALONE_TOP.map((item) => (
          <SidebarLink key={item.id} item={item} pathname={pathname} />
        ))}

        {/* ── Groups: Rutas y Checkpoints / Operación en Vivo */}
        <Divider />
        {NAV_GROUPS.map((group) => (
          <CollapsibleGroup key={group.id} group={group} pathname={pathname} />
        ))}

        {/* ── Calendario / Notificaciones / Reportes */}
        <Divider />
        {STANDALONE_SECONDARY.map((item) => (
          <SidebarLink key={item.id} item={item} pathname={pathname} />
        ))}

        {/* ── Usuarios / Camiones / Conductores */}
        <Divider />
        {STANDALONE_TERTIARY.map((item) => (
          <SidebarLink key={item.id} item={item} pathname={pathname} />
        ))}

        {/* ── Incidencias / Auditoría */}
        <Divider />
        {STANDALONE_QUATERNARY.map((item) => (
          <SidebarLink key={item.id} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* ── Footer: User avatar ───────────────────────── */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--sidebar-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          flexShrink: 0,
          background: 'oklch(0.19 0.035 250 / 0.5)',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1763A6, #152C40)',
            border: '1.5px solid oklch(0.42 0.07 250)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'white',
            flexShrink: 0,
            letterSpacing: '-0.02em',
          }}
        >
          A
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--sidebar-foreground)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}
          >
            Administrador
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              color: 'oklch(0.52 0.04 250)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            admin@cleango.mx
          </span>
        </div>
      </div>
    </aside>
  );
};
