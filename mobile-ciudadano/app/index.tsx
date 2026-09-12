import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { BottomTabBar, type TabName } from '../components/BottomTabBar';
import { InicioScreen } from '../screens/InicioScreen';
import { HorariosScreen } from '../screens/HorariosScreen';
import { ReportesScreen } from '../screens/ReportesScreen';
import { PerfilScreen } from '../screens/PerfilScreen';

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
};

export default function HomeScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('inicio');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabName>>(() => new Set(['inicio']));

  const handleTabPress = useCallback((tab: TabName) => {
    setActiveTab(tab);
    const mountTab = () => {
      setVisitedTabs(prev => {
        if (prev.has(tab)) return prev;
        const next = new Set(prev);
        next.add(tab);
        return next;
      });
    };
    const ric = (
      globalThis as typeof globalThis & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(mountTab, { timeout: 250 });
    } else {
      requestAnimationFrame(mountTab);
    }
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={T.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View style={[styles.tabContent, activeTab !== 'inicio' && styles.hidden]}>
          <InicioScreen isActive={activeTab === 'inicio'} />
        </View>
        {visitedTabs.has('horarios') && (
          <View style={[styles.tabContent, activeTab !== 'horarios' && styles.hidden]}>
            <HorariosScreen />
          </View>
        )}
        {visitedTabs.has('reportes') && (
          <View style={[styles.tabContent, activeTab !== 'reportes' && styles.hidden]}>
            <ReportesScreen isActive={activeTab === 'reportes'} />
          </View>
        )}
        {visitedTabs.has('perfil') && (
          <View style={[styles.tabContent, activeTab !== 'perfil' && styles.hidden]}>
            <PerfilScreen />
          </View>
        )}
      </View>
      <BottomTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  center: {
    flex: 1,
    backgroundColor: T.bgPage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
