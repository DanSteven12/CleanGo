// mobile-conductor/app/index.tsx
/**
 * Pantalla principal de la app móvil de Conductores.
 *
 * Implementa la navegación inferior (Bottom Navigation) como
 * estructura de navegación principal para las pantallas autenticadas.
 *
 * Tabs:
 *  1. Inicio       — Asignación del día, validación de identidad, inicio de recorrido
 *  2. Recorrido    — Acceso al mapa activo (si existe), estado vacío si no hay recorrido
 *  3. Notificaciones — Avisos del sistema
 *  4. Perfil       — Información del camión autenticado + logout
 *
 * El mapa (/mapa/[id]) es una pantalla de pila separada que ocupa
 * toda la pantalla y no muestra el bottom nav.
 *
 * Flujo de inicio de recorrido:
 *   Inicio (validación + AsignacionCard.onIniciar)
 *     → recorridosService.iniciarRecorrido()
 *     → navega automáticamente al tab Recorrido
 *     → Recorrido muestra botón "Ver mapa" → router.push('/mapa/[id]')
 */
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { theme } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { BottomTabBar, type TabName } from '../components/BottomTabBar';
import { InicioScreen } from '../screens/InicioScreen';
import { RecorridoScreen } from '../screens/RecorridoScreen';
import { NotificacionesScreen } from '../screens/NotificacionesScreen';
import { HistorialScreen } from '../screens/HistorialScreen';
import { PerfilScreen } from '../screens/PerfilScreen';

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

  /**
   * Callback que InicioScreen llama después de iniciar un recorrido
   * exitosamente. Cambia automáticamente al tab Recorrido.
   */
  const handleRecorridoIniciado = useCallback(() => {
    setVisitedTabs(prev => {
      const next = new Set(prev);
      next.add('recorrido');
      return next;
    });
    setActiveTab('recorrido');
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // Las pestañas se montan bajo demanda (lazy) y se mantienen vivas en memoria
  // con display: none una vez visitadas, evitando peticiones duplicadas.

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View style={[styles.tabContent, activeTab !== 'inicio' && styles.hidden]}>
          <InicioScreen onRecorridoIniciado={handleRecorridoIniciado} />
        </View>
        {visitedTabs.has('recorrido') && (
          <View style={[styles.tabContent, activeTab !== 'recorrido' && styles.hidden]}>
            <RecorridoScreen
              onGoToInicio={() => setActiveTab('inicio')}
              isFocused={activeTab === 'recorrido'}
            />
          </View>
        )}
        {visitedTabs.has('notificaciones') && (
          <View style={[styles.tabContent, activeTab !== 'notificaciones' && styles.hidden]}>
            <NotificacionesScreen />
          </View>
        )}
        {visitedTabs.has('historial') && (
          <View style={[styles.tabContent, activeTab !== 'historial' && styles.hidden]}>
            <HistorialScreen />
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
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
