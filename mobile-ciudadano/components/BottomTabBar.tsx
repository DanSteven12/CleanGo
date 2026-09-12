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
import { Home, CalendarClock, AlertTriangle, User } from 'lucide-react-native';

const T = {
  bgCard: '#FFFFFF',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

export type TabName = 'inicio' | 'horarios' | 'reportes' | 'perfil';

interface Tab {
  name: TabName;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  color: string;
  lightBg: string;
}

const TABS: Tab[] = [
  { name: 'inicio', label: 'Inicio', Icon: Home, color: '#1763A6', lightBg: 'rgba(23, 99, 166, 0.14)' },
  { name: 'horarios', label: 'Horarios', Icon: CalendarClock, color: '#0D9488', lightBg: 'rgba(13, 148, 136, 0.14)' },
  { name: 'reportes', label: 'Reportes', Icon: AlertTriangle, color: '#D97706', lightBg: 'rgba(217, 119, 6, 0.14)' },
  { name: 'perfil', label: 'Perfil', Icon: User, color: '#0284C7', lightBg: 'rgba(2, 132, 199, 0.14)' },
];

interface AnimatedTabItemProps {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
}

function AnimatedTabItem({ tab, isActive, onPress }: AnimatedTabItemProps) {
  const { label, Icon, color, lightBg } = tab;

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
      hitSlop={{ top: 16, bottom: 12, left: 8, right: 8 }}
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
}

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
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
});

