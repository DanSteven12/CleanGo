// mobile-conductor/components/BottomTabBar.tsx
/**
 * Bottom Tab Bar con Navegación Curvada Animada para la app móvil de Conductores.
 *
 * Características:
 *  - Línea azul continua en el BORDE INFERIOR (bottom) a lo largo de toda la barra.
 *  - Alineación sub-píxel perfecta entre la línea recta y la curva (0 escalones o baches).
 *  - El arco se eleva lo suficiente para pasar por encima del icono activo.
 *  - Colores corporativos CleanGo (Azul primario #1763A6).
 *  - Integración completa con Safe Area.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

const CURVE_WIDTH = 92;
const CURVE_HEIGHT = 62;

export function BottomTabBar({ activeTab, onTabPress, notificationCount = 0 }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 6);

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const activeIndex = TABS.findIndex((t) => t.name === activeTab);

  // Valor animado del índice de tab (0 a 4)
  const animIndex = useRef(new Animated.Value(activeIndex < 0 ? 0 : activeIndex)).current;

  // Animaciones individuales para los íconos
  const iconAnimValues = useRef(TABS.map((_, i) => new Animated.Value(i === activeIndex ? 1 : 0))).current;

  useEffect(() => {
    const targetIdx = activeIndex < 0 ? 0 : activeIndex;

    // Animar la curva hacia el tab destino
    Animated.spring(animIndex, {
      toValue: targetIdx,
      useNativeDriver: false,
      tension: 68,
      friction: 10,
    }).start();

    // Animar activación e iluminación de íconos
    iconAnimValues.forEach((animVal, i) => {
      Animated.spring(animVal, {
        toValue: i === targetIdx ? 1 : 0,
        useNativeDriver: true,
        tension: 80,
        friction: 9,
      }).start();
    });
  }, [activeIndex, animIndex, iconAnimValues]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== containerWidth) {
      setContainerWidth(w);
    }
  };

  const tabWidth = containerWidth > 0 ? containerWidth / TABS.length : 0;

  // Interpolación de la posición X del centro de la curva
  const translateX = animIndex.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => (i + 0.5) * tabWidth - CURVE_WIDTH / 2),
  });

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPadding }]} onLayout={handleLayout}>
      {/* Indicador con Línea Azul Continua + Alineación Perfecta de la Curva */}
      {containerWidth > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Línea azul primaria continua en la parte inferior */}
          <View style={[styles.bottomLineBase, { backgroundColor: theme.colors.primary, bottom: bottomPadding }]} />

          {/* Arco/Curva animada alineada milimétricamente con la línea base */}
          <Animated.View
            style={[
              styles.curveWrapper,
              {
                bottom: bottomPadding,
                transform: [{ translateX }],
              },
            ]}
          >
            <Svg width={CURVE_WIDTH} height={CURVE_HEIGHT + 8} viewBox="-46 -64 92 72">
              {/* Máscara de fondo blanco que tapa la línea recta debajo de la curva */}
              <Path
                d="M -46 6 L -46 -1.75 C -30 -1.75 -20 -58 0 -58 C 20 -58 30 -1.75 46 -1.75 L 46 6 Z"
                fill={theme.colors.card}
              />
              {/* Trazo del arco azul primario alineado a y = -1.75 con tangente horizontal pura */}
              <Path
                d="M -46 -1.75 C -30 -1.75 -20 -58 0 -58 C 20 -58 30 -1.75 46 -1.75"
                fill="none"
                stroke={theme.colors.primary}
                strokeWidth={3.5}
                strokeLinecap="butt"
              />
            </Svg>
          </Animated.View>
        </View>
      )}

      {/* Ítems del Tab Bar */}
      {TABS.map(({ name, label, Icon }, index) => {
        const isActive = activeTab === name;
        const iconAnim = iconAnimValues[index];

        const scale = iconAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.12],
        });

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
            android_ripple={{
              color: 'rgba(23, 99, 166, 0.12)',
              borderless: true,
              radius: 32,
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
          >
            <Animated.View
              style={[
                styles.iconWrapper,
                {
                  transform: [{ scale }],
                },
              ]}
              pointerEvents="none"
            >
              <Icon size={22} color={color} strokeWidth={isActive ? 2.5 : 1.8} />

              {/* Badge de notificaciones */}
              {name === 'notificaciones' && notificationCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.destructive }]} pointerEvents="none">
                  <Text style={styles.badgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </Animated.View>

            <Text
              style={[
                styles.label,
                isActive && styles.labelActive,
              ]}
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
  wrapper: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    paddingTop: 8,
    position: 'relative',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    ...theme.shadows.header,
  },
  bottomLineBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3.5,
  },
  curveWrapper: {
    position: 'absolute',
    left: 0,
    width: CURVE_WIDTH,
    height: CURVE_HEIGHT + 6,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 52,
    position: 'relative',
    zIndex: 2,
  },
  tabPressed: {
    opacity: 0.75,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  labelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
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
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
});
