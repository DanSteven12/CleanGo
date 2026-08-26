import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CalendarClock, AlertTriangle, User } from 'lucide-react-native';

const T = {
  primary: '#1763A6',
  bgCard: '#FFFFFF',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

export type TabName = 'inicio' | 'horarios' | 'reportes' | 'perfil';

interface Tab {
  name: TabName;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

const TABS: Tab[] = [
  { name: 'inicio', label: 'Inicio', Icon: Home },
  { name: 'horarios', label: 'Horarios', Icon: CalendarClock },
  { name: 'reportes', label: 'Reportes', Icon: AlertTriangle },
  { name: 'perfil', label: 'Perfil', Icon: User },
];

interface BottomTabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 8);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {TABS.map(({ name, label, Icon }) => {
        const isActive = activeTab === name;
        const color = isActive ? T.primary : T.textMuted;

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
            {isActive && <View style={[styles.activeIndicator, { backgroundColor: T.primary }]} pointerEvents="none" />}

            <View style={styles.iconWrapper} pointerEvents="none">
              <Icon size={23} color={color} strokeWidth={isActive ? 2.5 : 1.8} />
            </View>

            <Text
              style={[styles.label, isActive && { color: T.primary, fontWeight: '700' }]}
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
    backgroundColor: T.bgCard,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
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
    color: T.textMuted,
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
});
