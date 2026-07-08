import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
      { id: 'nav-checkpoints', label: 'Checkpoints', to: '/asignaciones', icon: MapPinned },
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.5rem 0.75rem',
        paddingLeft: indented ? '2.25rem' : '0.75rem',
        borderRadius: '0.5rem',
        textDecoration: 'none',
        fontSize: '0.875rem',
        fontWeight: active ? 600 : 400,
        color: active
          ? 'var(--sidebar-accent-foreground)'
          : 'var(--sidebar-foreground)',
        background: active ? 'var(--sidebar-accent)' : 'transparent',
        transition: 'background 0.15s ease, color 0.15s ease',
        position: 'relative',
      }}
      className="sidebar-link"
    >
      <Icon
        size={16}
        style={{
          flexShrink: 0,
          color: active ? 'var(--sidebar-accent-foreground)' : 'oklch(0.65 0.04 250)',
          transition: 'color 0.15s ease',
        }}
      />
      <span style={{ lineHeight: 1.25, letterSpacing: '-0.01em' }}>{item.label}</span>
      {active && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: '3px',
            borderRadius: '0 2px 2px 0',
            background: 'var(--accent)',
          }}
        />
      )}
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
          borderRadius: '0.5rem',
          background: isGroupActive ? 'oklch(0.28 0.05 250 / 0.6)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: isGroupActive ? 'var(--sidebar-accent-foreground)' : 'var(--sidebar-foreground)',
          fontSize: '0.875rem',
          fontWeight: isGroupActive ? 600 : 500,
          textAlign: 'left',
          transition: 'background 0.15s ease, color 0.15s ease',
        }}
        className="sidebar-group-btn"
        aria-expanded={open}
      >
        <Icon
          size={16}
          style={{
            flexShrink: 0,
            color: isGroupActive ? 'var(--sidebar-accent-foreground)' : 'oklch(0.65 0.04 250)',
            transition: 'color 0.15s ease',
          }}
        />
        <span style={{ flex: 1, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
          {group.label}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            color: 'oklch(0.55 0.03 250)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
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
          padding: '1.25rem 1rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          borderBottom: '1px solid var(--sidebar-border)',
          flexShrink: 0,
        }}
      >
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
            fontSize: '16px',
            fontWeight: 'bold',
            flexShrink: 0,
          }}
        >
          ✨
        </span>
        <span
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          CleanGo
        </span>
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
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'oklch(0.35 0.08 250)',
            border: '1px solid var(--sidebar-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.75rem',
            color: 'oklch(0.85 0.05 250)',
            flexShrink: 0,
          }}
        >
          Adm
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--sidebar-foreground)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Administrador
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'oklch(0.55 0.03 250)',
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
