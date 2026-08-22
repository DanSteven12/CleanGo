// mobile-conductor/components/BottomTabBar.tsx
/**
 * Bottom Tab Bar de la app móvil de Conductores.
 *
 * Tabs: Inicio | Recorrido | Notificaciones | Perfil
 *
 * Optimizado para alta respuesta táctil en Android e iOS:
 *  - Usa useSafeAreaInsets para respetar la barra de gestos/botones de Android e iOS
 *  - Pressable con hitSlop amplio y feedback táctil inmediato
 *  - pointerEvents="none" en elementos hijos para evitar bloqueo de eventos
 */
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, MapPin, Bell, User, History } from 'lucide-react-native';
import { theme } from '../theme/colors';

export type TabName = 'inicio' | 'recorrido' | 'notificaciones' | 'historial' | 'perfil';

interface Tab {
  name: TabName;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

const TABS: Tab[] = [
  { name: 'inicio', label: 'Inicio', Icon: Home },
  { name: 'recorrido', label: 'Recorrido', Icon: MapPin },
  { name: 'notificaciones', label: 'Avisos', Icon: Bell },
  { name: 'historial', label: 'Historial', Icon: History },
  { name: 'perfil', label: 'Perfil', Icon: User },
];

interface BottomTabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  notificationCount?: number;
}

export function BottomTabBar({ activeTab, onTabPress, notificationCount = 0 }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Asegurar suficiente padding inferior para que no choque con la barra de gestos de Android / Home indicator de iOS
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 8);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {TABS.map(({ name, label, Icon }) => {
        const isActive = activeTab === name;
        const color = isActive ? theme.colors.primary : theme.colors.textMuted;

        return (
          <Pressable
            key={name}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.tabPressed,
            ]}
            onPress={() => onTabPress(name)}
            hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
            pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
            android_ripple={{
              color: 'rgba(23, 99, 166, 0.12)',
              borderless: true,
              radius: 32,
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
          >
            {/* Indicador de tab activo en la parte superior */}
            {isActive && <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} pointerEvents="none" />}

            <View style={styles.iconWrapper} pointerEvents="none">
              <Icon size={23} color={color} strokeWidth={isActive ? 2.5 : 1.8} />
              {/* Badge de notificaciones */}
              {name === 'notificaciones' && notificationCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.destructive }]} pointerEvents="none">
                  <Text style={styles.badgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={[styles.label, isActive && { color: theme.colors.primary, fontWeight: '700' }]}
              pointerEvents="none"
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    ...theme.shadows.header,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 52,
    position: 'relative',
  },
  tabPressed: {
    opacity: 0.7,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
    letterSpacing: 0.2,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
