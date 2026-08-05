import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import iconoCamion from '../../assets/images/icono.png';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Route,
  Map,
  MapPinned,
  Satellite,
  Calendar,
  Bell,
  FileWarning,
  Users,
  Truck,
  HardHat,
  ChevronDown,
  Clock,
  History,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { obtenerNotificacionesAdmin } from '../../services/notificacionesService';

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_KEY = 'cleango-sidebar-collapsed';
const SIDEBAR_EXPANDED_W = 240;
const SIDEBAR_COLLAPSED_W = 60;

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
  { id: 'nav-dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
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
      { id: 'nav-historial', label: 'Historial de Recorridos', to: '/historial', icon: History },
    ],
  },
  {
    id: 'group-calendario',
    label: 'Calendario',
    icon: Calendar,
    children: [
      { id: 'nav-calendario-vista', label: 'Vista General', to: '/calendario', icon: Calendar },
      { id: 'nav-horarios', label: 'Horarios Base', to: '/calendario/horarios', icon: Clock },
    ],
  },
];

const STANDALONE_SECONDARY: NavItem[] = [
  { id: 'nav-notificaciones', label: 'Notificaciones', to: '/notificaciones', icon: Bell },
  { id: 'nav-reportes', label: 'Reportes Ciudadanos', to: '/reportes', icon: FileWarning },
];

const STANDALONE_TERTIARY: NavItem[] = [
  { id: 'nav-usuarios', label: 'Usuarios', to: '/usuarios', icon: Users },
  { id: 'nav-camiones', label: 'Camiones', to: '/camiones', icon: Truck },
  { id: 'nav-conductores', label: 'Conductores', to: '/conductores', icon: HardHat },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function isPathActive(pathname: string, to: string): boolean {
  if (to === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(to);
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface SidebarTooltipProps {
  label: string;
  visible: boolean;
  children: React.ReactNode;
}

const SidebarTooltip: React.FC<SidebarTooltipProps> = ({ label, visible, children }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0 });
  const ref = useRef<HTMLDivElement>(null);

  if (!visible) return <>{children}</>;

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'contents' }}
      onMouseEnter={() => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          setPos({ top: rect.top + rect.height / 2 });
        }
        setShow(true);
      }}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: SIDEBAR_COLLAPSED_W + 8,
              top: pos.top,
              transform: 'translateY(-50%)',
              background: 'oklch(0.22 0.04 250)',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.3rem 0.625rem',
              borderRadius: '0.4rem',
              whiteSpace: 'nowrap',
              border: '1px solid oklch(0.32 0.05 250)',
              boxShadow: '0 4px 12px oklch(0.1 0.02 250 / 0.5)',
              zIndex: 9999,
              pointerEvents: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── SidebarLink ─────────────────────────────────────────────────────────────

interface SidebarLinkProps {
  item: NavItem;
  pathname: string;
  indented?: boolean;
  badge?: number;
  collapsed?: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({
  item,
  pathname,
  indented = false,
  badge = 0,
  collapsed = false,
}) => {
  const active = isPathActive(pathname, item.to);
  const Icon = item.icon;

  const link = (
    <Link
      id={item.id}
      to={item.to}
      title={collapsed ? item.label : undefined}
      data-active={active ? 'true' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '0.625rem',
        padding: '0.5rem',
        paddingLeft: collapsed ? '0' : indented ? '2.375rem' : '0.75rem',
        borderRadius: '0.625rem',
        textDecoration: 'none',
        fontSize: '0.8125rem',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--sidebar-accent-foreground)' : 'oklch(0.78 0.03 240)',
        background: active
          ? 'linear-gradient(135deg, oklch(0.52 0.14 250 / 0.8), oklch(0.42 0.08 200 / 0.8))'
          : 'transparent',
        transition: 'background 0.15s ease, color 0.15s ease',
        position: 'relative',
        letterSpacing: '-0.01em',
        justifyContent: collapsed ? 'center' : undefined,
        minWidth: 0,
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
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            style={{ lineHeight: 1.3, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && badge > 0 && (
        <span
          style={{
            background: 'var(--primary)',
            color: 'white',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '12px',
            lineHeight: 1,
            marginLeft: 'auto',
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
      {collapsed && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: 'var(--primary)',
            color: 'white',
            fontSize: '0.55rem',
            fontWeight: 700,
            padding: '1px 4px',
            borderRadius: '8px',
            lineHeight: 1,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );

  return (
    <SidebarTooltip label={item.label} visible={collapsed}>
      {link}
    </SidebarTooltip>
  );
};

// ─── CollapsibleGroup ─────────────────────────────────────────────────────────

interface CollapsibleGroupProps {
  group: NavGroup;
  pathname: string;
  sidebarCollapsed: boolean;
}

const CollapsibleGroup: React.FC<CollapsibleGroupProps> = ({
  group,
  pathname,
  sidebarCollapsed,
}) => {
  const isGroupActive = group.children.some((c) => isPathActive(pathname, c.to));
  const [open, setOpen] = useState(isGroupActive);
  const Icon = group.icon;

  useEffect(() => {
    if (isGroupActive) setOpen(true);
  }, [isGroupActive]);

  // When sidebar collapses, show all group items as flat icon list
  if (sidebarCollapsed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {group.children.map((child) => (
          <SidebarLink
            key={child.id}
            item={child}
            pathname={pathname}
            collapsed={true}
          />
        ))}
      </div>
    );
  }

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
        <span style={{ flex: 1, lineHeight: 1.3 }}>{group.label}</span>
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
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingTop: '2px' }}>
              {group.children.map((child) => (
                <SidebarLink key={child.id} item={child} pathname={pathname} indented />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Divider ─────────────────────────────────────────────────────────────────

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
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Persisted collapsed state
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    // Always start collapsed on mobile to match the CSS padding-left: 60px
    if (typeof window !== 'undefined' && window.innerWidth <= 767) return true;
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Auto-collapse when viewport shrinks to mobile; restore saved state when widening
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // Going mobile → force collapse (no localStorage write, just visual)
        setCollapsed(true);
      } else {
        // Going desktop → restore saved preference
        try {
          setCollapsed(localStorage.getItem(SIDEBAR_KEY) === 'true');
        } catch {
          setCollapsed(false);
        }
      }
    };
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      // Only persist on desktop; on mobile it's always collapsed
      if (window.innerWidth > 767) {
        try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch { /* noop */ }
      }
      return next;
    });
  };

  const fetchUnread = async () => {
    try {
      const unreadList = await obtenerNotificacionesAdmin({ leida: false });
      setUnreadCount(unreadList.summary?.unread ?? unreadList.data?.length ?? 0);
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
    }
  };

  useEffect(() => {
    fetchUnread();
    const handleRead = () => fetchUnread();
    window.addEventListener('notificacion-leida', handleRead);
    return () => window.removeEventListener('notificacion-leida', handleRead);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.nombre
    ? user.nombre.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  return (
    <motion.aside
      id="app-sidebar"
      animate={{ width: sidebarWidth, minWidth: sidebarWidth }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
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
      aria-label="Navegación principal"
    >
      {/* ── Brand + Toggle ──────────────────────────────── */}
      <div
        style={{
          padding: collapsed ? '0.875rem 0' : '1rem 1rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          borderBottom: '1px solid var(--sidebar-border)',
          flexShrink: 0,
          justifyContent: collapsed ? 'center' : undefined,
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: collapsed ? '36px' : '42px',
            height: collapsed ? '36px' : '42px',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 10px oklch(0.52 0.14 250 / 0.40)',
            transition: 'width 0.2s ease, height 0.2s ease',
          }}
        >
          <img src={iconoCamion} alt="CleanGo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* Wordmark – hidden when collapsed */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', minWidth: 0 }}
            >
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
                  whiteSpace: 'nowrap',
                }}
              >
                CleanGo
              </span>
              <span
                style={{
                  fontSize: '0.6rem',
                  color: 'oklch(0.52 0.04 250)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                Logística Urbana
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button – placed after wordmark when expanded, centered when collapsed */}
        {!collapsed && (
          <button
            id="sidebar-toggle-btn"
            onClick={toggleCollapsed}
            aria-label="Colapsar menú"
            title="Colapsar menú"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '0.375rem',
              color: 'oklch(0.52 0.04 250)',
              display: 'flex',
              alignItems: 'center',
              transition: 'background 0.15s ease, color 0.15s ease',
              marginLeft: 'auto',
              flexShrink: 0,
            }}
            className="sidebar-toggle-btn"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* Expand toggle when collapsed (full-width icon row) */}
      {collapsed && (
        <button
          id="sidebar-toggle-btn"
          onClick={toggleCollapsed}
          aria-label="Expandir menú"
          title="Expandir menú"
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--sidebar-border)',
            cursor: 'pointer',
            padding: '0.5rem 0',
            color: 'oklch(0.52 0.04 250)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease, color 0.15s ease',
            flexShrink: 0,
            width: '100%',
          }}
          className="sidebar-toggle-btn"
        >
          <PanelLeftOpen size={15} />
        </button>
      )}

      {/* ── Nav body ───────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: collapsed ? '0.75rem 0.375rem' : '0.75rem 0.625rem',
          gap: '1px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Dashboard */}
        {STANDALONE_TOP.map((item) => (
          <SidebarLink key={item.id} item={item} pathname={pathname} collapsed={collapsed} />
        ))}

        <Divider />

        {NAV_GROUPS.map((group) => (
          <CollapsibleGroup
            key={group.id}
            group={group}
            pathname={pathname}
            sidebarCollapsed={collapsed}
          />
        ))}

        <Divider />

        {STANDALONE_SECONDARY.map((item) => (
          <SidebarLink
            key={item.id}
            item={item}
            pathname={pathname}
            badge={item.id === 'nav-notificaciones' ? unreadCount : 0}
            collapsed={collapsed}
          />
        ))}

        <Divider />

        {STANDALONE_TERTIARY.map((item) => (
          <SidebarLink key={item.id} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* ── Footer: User info + logout ─────────────────── */}
      <div
        style={{
          padding: collapsed ? '0.75rem 0' : '0.75rem 1rem',
          borderTop: '1px solid var(--sidebar-border)',
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : '0.625rem',
          flexShrink: 0,
          background: 'oklch(0.19 0.035 250 / 0.5)',
          justifyContent: collapsed ? 'center' : undefined,
          overflow: 'hidden',
        }}
      >
        {/* Avatar */}
        <SidebarTooltip label={user?.nombre ?? 'Usuario'} visible={collapsed}>
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
              cursor: collapsed ? 'default' : undefined,
            }}
          >
            {initials}
          </div>
        </SidebarTooltip>

        {/* Name and email – hidden when collapsed */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, flex: 1, overflow: 'hidden' }}
            >
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
                {user?.nombre ?? 'Usuario'}
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
                {user?.correo ?? ''}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logout button – with tooltip when collapsed */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <button
                id="sidebar-logout-btn"
                onClick={handleLogout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.375rem',
                  borderRadius: '0.375rem',
                  color: 'oklch(0.52 0.04 250)',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.58 0.22 25 / 0.15)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.65 0.22 25)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.52 0.04 250)';
                }}
              >
                <LogOut size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* When collapsed: logout as centered icon with tooltip */}
        {collapsed && (
          <SidebarTooltip label="Cerrar sesión" visible={true}>
            <button
              id="sidebar-logout-btn"
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.375rem',
                borderRadius: '0.375rem',
                color: 'oklch(0.52 0.04 250)',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.58 0.22 25 / 0.15)';
                (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.65 0.22 25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.52 0.04 250)';
              }}
            >
              <LogOut size={15} />
            </button>
          </SidebarTooltip>
        )}
      </div>
    </motion.aside>
  );
};
