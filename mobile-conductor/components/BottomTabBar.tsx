// mobile-conductor/components/BottomTabBar.tsx
/**
 * Barra de Navegación Inferior Flotante (Floating Bottom Tab Bar) para la app móvil de Conductores.
 *
 * Características:
 *  - Diseño flotante estilo cápsula (Pill Shape) con elevación y bordes suaves idéntico a Mobile Ciudadano.
 *  - Micro-animaciones fluidas con react-native-reanimated (elevación y escala en pestaña activa).
 *  - Indicador circular luminoso (Glow Halo) adaptado a cada color temático.
 *  - Punto indicador dinámico inferior animado con resorte (Spring).
 *  - Soporte para insignia (Badge) de notificaciones no leídas.
 *  - Integración completa y segura con Safe Area Insets.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, MapPin, Bell, History, User } from 'lucide-react-native';

const T = {
  bgCard: '#FFFFFF',
  textMuted: '#64748B',
  border: '#E2E8F0',
  destructive: '#DC2626',
};

export type TabName = 'inicio' | 'recorrido' | 'notificaciones' | 'historial' | 'perfil';

interface Tab {
  name: TabName;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  color: string;
  lightBg: string;
}

const TABS: Tab[] = [
  { name: 'inicio', label: 'Inicio', Icon: Home, color: '#1763A6', lightBg: 'rgba(23, 99, 166, 0.14)' },
  { name: 'recorrido', label: 'Recorrido', Icon: MapPin, color: '#0D9488', lightBg: 'rgba(13, 148, 136, 0.14)' },
  { name: 'notificaciones', label: 'Avisos', Icon: Bell, color: '#D97706', lightBg: 'rgba(217, 119, 6, 0.14)' },
  { name: 'historial', label: 'Historial', Icon: History, color: '#7C3AED', lightBg: 'rgba(124, 58, 237, 0.14)' },
  { name: 'perfil', label: 'Perfil', Icon: User, color: '#0284C7', lightBg: 'rgba(2, 132, 199, 0.14)' },
];

interface AnimatedTabItemProps {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
  notificationCount?: number;
}

function AnimatedTabItem({ tab, isActive, onPress, notificationCount = 0 }: AnimatedTabItemProps) {
  const { name, label, Icon, color, lightBg } = tab;

  const translateY = useSharedValue(isActive ? -5 : 0);
  const scale = useSharedValue(isActive ? 1.08 : 1);
  const dotScale = useSharedValue(isActive ? 1 : 0);
  const dotOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    if (isActive) {
      translateY.value = withSpring(-5, { damping: 14, stiffness: 300 });
      scale.value = withSpring(1.08, { damping: 14, stiffness: 300 });
      dotScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      dotOpacity.value = withTiming(1, { duration: 150 });
    } else {
      translateY.value = withSpring(0, { damping: 18, stiffness: 300 });
      scale.value = withSpring(1, { damping: 18, stiffness: 300 });
      dotScale.value = withTiming(0, { duration: 150 });
      dotOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isActive, translateY, scale, dotScale, dotOpacity]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(isActive ? 1.02 : 0.94, { damping: 15, stiffness: 350 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(isActive ? 1.08 : 1, { damping: 15, stiffness: 350 });
  };

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 16, bottom: 12, left: 6, right: 6 }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.iconLift, animatedIconStyle]} pointerEvents="none">
        <View
          style={[
            styles.iconCircle,
            isActive && {
              backgroundColor: lightBg,
              borderColor: color + '35',
              borderWidth: 1.5,
              shadowColor: color,
              shadowOpacity: 0.18,
              shadowRadius: 5,
              elevation: 4,
            },
          ]}
        >
          <Icon
            size={22}
            color={isActive ? color : T.textMuted}
            strokeWidth={isActive ? 2.4 : 1.8}
          />
          {name === 'notificaciones' && notificationCount > 0 && (
            <View style={styles.badge} pointerEvents="none">
              <Text style={styles.badgeText}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      <Text
        style={[styles.label, isActive && { color, fontWeight: '700' }]}
        pointerEvents="none"
        numberOfLines={1}
      >
        {label}
      </Text>

      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: color },
          animatedDotStyle,
        ]}
        pointerEvents="none"
      />
    </Pressable>
  );
}

interface BottomTabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  notificationCount?: number;
}

export function BottomTabBar({ activeTab, onTabPress, notificationCount = 0 }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomMargin = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 10);

  return (
    <View style={[styles.outerWrapper, { marginBottom: bottomMargin }]}>
      <View style={styles.floatingBar}>
        {TABS.map((tab) => (
          <AnimatedTabItem
            key={tab.name}
            tab={tab}
            isActive={activeTab === tab.name}
            onPress={() => onTabPress(tab.name)}
            notificationCount={notificationCount}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    overflow: 'visible',
    zIndex: 20,
    backgroundColor: 'transparent',
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: T.bgCard,
    borderRadius: 30,
    paddingVertical: 8,
    minHeight: 64,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'visible',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    overflow: 'visible',
  },
  iconLift: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    zIndex: 3,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 3 },
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: T.textMuted,
    letterSpacing: 0.2,
  },
  dot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -4,
    backgroundColor: T.destructive,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
});
