// mobile-ciudadano/screens/PerfilScreen.tsx
/**
 * Pantalla de Perfil del Ciudadano.
 *
 * Fuentes de datos:
 *  - Información del usuario: AuthContext (ya disponible, sin petición extra)
 *  - Reportes: reportesService.getMisReportes() en pantalla separada
 *
 * No realiza ninguna petición innecesaria a /me ni almacena
 * información sensible adicional.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Mail,
  Shield,
  Bell,
  MapPin,
  LogOut,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { LogoutModal } from '../components/LogoutModal';
import { AnimatedPressable } from '../components/ui';

// ─── Design Tokens (idénticos al resto de la app) ─────────────────────────────

const T = {
  primary: '#1763A6',
  primaryLight: '#E0F2FE',
  primaryDark: '#13528A',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  muted: '#94A3B8',
  destructive: '#DC2626',
  destructiveBg: '#FEF2F2',
  destructiveBorder: '#FECACA',
  success: '#16A34A',
  successBg: '#F0FDF4',
  warning: '#D97706',
  comingSoonBg: '#FFF7ED',
  comingSoonText: '#C2410C',
  comingSoonBorder: '#FED7AA',
  avatarBg: '#1763A6',
  avatarText: '#FFFFFF',
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
  disabled?: boolean;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  destructive?: boolean;
}

// ─── Componente MenuRow ───────────────────────────────────────────────────────

function MenuRow({
  icon,
  label,
  onPress,
  showChevron = true,
  disabled = false,
  badge,
  badgeColor,
  badgeBg,
  destructive = false,
}: MenuRowProps) {
  const labelColor = destructive ? T.destructive : disabled ? T.muted : T.textH;

  return (
    <AnimatedPressable
      style={[styles.menuRow, disabled && styles.menuRowDisabled]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <View style={[
        styles.menuRowIcon,
        destructive && { backgroundColor: T.destructiveBg },
        disabled && { backgroundColor: T.bgPage },
      ]}>
        {icon}
      </View>

      <Text style={[styles.menuRowLabel, { color: labelColor }]}>{label}</Text>

      <View style={styles.menuRowRight}>
        {badge ? (
          <View style={[
            styles.badge,
            {
              backgroundColor: badgeBg ?? T.comingSoonBg,
              borderColor: badgeColor ?? T.comingSoonBorder,
            },
          ]}>
            <Text style={[styles.badgeText, { color: badgeColor ?? T.comingSoonText }]}>
              {badge}
            </Text>
          </View>
        ) : null}
        {showChevron && !disabled && (
          <ChevronRight size={18} color={T.muted} strokeWidth={2} />
        )}
      </View>
    </AnimatedPressable>
  );
}

// ─── Componente SectionTitle ──────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return (
    <Text style={styles.sectionTitle}>{label}</Text>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function PerfilScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ── Avatar con iniciales ─────────────────────────────────────────────────────

  const getInitials = useCallback((nombre: string): string => {
    const parts = nombre.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  const handleConfirmLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  }, [logout]);

  // ── Navegación a Mis Zonas ───────────────────────────────────────────────────

  const handleMisZonas = useCallback(() => {
    router.push('/perfil/mis-zonas' as any);
  }, [router]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const initials = user ? getInitials(user.nombre) : '?';
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 8);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding + 110 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── Encabezado del Perfil ─────────────────────────────────────────── */}
        <Animated.View
          style={styles.headerCard}
          entering={FadeInDown.duration(400).springify().damping(20).stiffness(200)}
        >
          {/* Avatar circular con iniciales */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            {/* Indicador de estado activo */}
            <View style={styles.activeIndicator} />
          </View>

          {/* Saludo y datos del ciudadano */}
          <Text style={styles.greeting}>
            Hola, {user?.nombre ?? 'Ciudadano'}
          </Text>
          <Text style={styles.correo}>{user?.correo ?? ''}</Text>

          <View style={styles.rolBadge}>
            <Shield size={13} color={T.primary} strokeWidth={2.5} />
            <Text style={styles.rolText}>{user?.rol ?? 'Ciudadano'}</Text>
          </View>
        </Animated.View>

        {/* ── Contenido principal ──────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(80).springify().damping(20).stiffness(200)}
        >

          {/* SECCIÓN: Mi información */}
          <SectionTitle label="Mi información" />
          <View style={styles.card}>
            <MenuRow
              icon={<User size={20} color={T.primary} strokeWidth={2} />}
              label="Mis datos"
              onPress={() => router.push('/perfil/mis-datos' as any)}
            />
          </View>

          {/* SECCIÓN: Configuración */}
          <SectionTitle label="Configuración" />
          <View style={styles.card}>
            <MenuRow
              icon={<Bell size={20} color={T.primary} strokeWidth={2} />}
              label="Notificaciones"
              onPress={() => router.push('/perfil/notificaciones')}
              badge={unreadCount > 0 ? unreadCount.toString() : undefined}
              badgeBg={T.destructive}
              badgeColor="#FFF"
            />
            <View style={styles.divider} />
            <MenuRow
              icon={<MapPin size={20} color={T.primary} strokeWidth={2} />}
              label="Zonas de interés"
              onPress={handleMisZonas}
            />
            <View style={styles.divider} />
            <MenuRow
              icon={<Settings size={20} color={T.primary} strokeWidth={2} />}
              label="Preferencias"
              onPress={() => router.push('/perfil/preferencias')}
            />
          </View>

          {/* SECCIÓN: Sesión */}
          <SectionTitle label="Sesión" />
          <View style={styles.card}>
            <MenuRow
              icon={<LogOut size={20} color={T.destructive} strokeWidth={2} />}
              label="Cerrar sesión"
              onPress={handleLogout}
              showChevron={false}
              destructive
            />
          </View>

          {/* Versión de la app */}
          <Text style={styles.versionText}>CleanGo Ciudadanos · v1.0</Text>

        </Animated.View>
      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        userName={user?.nombre}
        userEmail={user?.correo}
        isLoading={isLoggingOut}
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 110,
  },

  // ── Header card ─────────────────────────────────────────────────────────────
  headerCard: {
    backgroundColor: T.bgCard,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    marginBottom: 24,
    // Sombra sutil
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: T.avatarBg,
    justifyContent: 'center',
    alignItems: 'center',
    // Sombra del avatar
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(23, 99, 166, 0.25)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: T.avatarText,
    letterSpacing: 1,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: T.bgCard,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: T.textH,
    marginBottom: 4,
    textAlign: 'center',
  },
  correo: {
    fontSize: 14,
    color: T.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  rolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(23, 99, 166, 0.2)',
  },
  rolText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.primary,
  },

  // ── Secciones ────────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: T.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },

  // ── Card genérico ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: T.bgCard,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginLeft: 56,
  },

  // ── Fila de información (solo lectura) ───────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  infoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: T.muted,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textH,
  },

  // ── Nota de solo lectura ─────────────────────────────────────────────────────
  readonlyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 4,
    gap: 6,
  },
  readonlyNoteText: {
    fontSize: 12,
    color: T.muted,
    flex: 1,
  },

  // ── MenuRow ──────────────────────────────────────────────────────────────────
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 56,
  },
  menuRowDisabled: {
    opacity: 0.7,
  },
  menuRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: T.textH,
  },
  menuRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // ── Badge "Próximamente" ─────────────────────────────────────────────────────
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Versión ──────────────────────────────────────────────────────────────────
  versionText: {
    fontSize: 12,
    color: T.muted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
});
