// mobile-ciudadano/app/_layout.tsx
/**
 * Layout raíz de la app móvil de Ciudadanos.
 *
 * El Stack de Expo Router debe existir desde el primer frame.
 * Si se oculta el splash nativo sin navigator montado, Android muestra
 * el fondo de la Activity (negro).
 */
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { Component, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { View, StyleSheet, LogBox, Animated } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { RecorridoMapCacheProvider } from '../contexts/RecorridoMapCache';
import { NotificationsProvider, useNotifications } from '../contexts/NotificationsContext';
import { AlertProvider } from '../contexts/AlertContext';
import { registerBackgroundHandler, onFcmTokenRefresh, handleNotificationOpen } from '../services/fcmService';
import { AnimatedSplashScreen } from '../components/splash/AnimatedSplashScreen';
import { CleanGoToast } from '../components/ui/CleanGoToast';

SplashScreen.preventAutoHideAsync().catch((err) => {
  console.log('[Splash] preventAutoHideAsync error:', err);
});

SystemUI.setBackgroundColorAsync('#F4F7FA').catch(() => {});

LogBox.ignoreLogs(['Error: undefined', 'undefined']);
LogBox.ignoreAllLogs(true);

class SplashErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.log('[Splash] render error:', error?.message, info?.componentStack);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function ProtectedNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inPublicScreen =
      segments[0] === 'login' ||
      segments[0] === 'register' ||
      segments[0] === 'forgot-password' ||
      segments[0] === 'reset-password';

    if (!isAuthenticated && !inPublicScreen) {
      router.replace('/login');
    } else if (isAuthenticated && inPublicScreen) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 150 }}>
      <Stack.Screen name="login" options={{ gestureEnabled: false, animation: 'none' }} />
      <Stack.Screen name="register" options={{ gestureEnabled: false, title: 'Registro', animation: 'none' }} />
      <Stack.Screen name="forgot-password" options={{ gestureEnabled: false, title: 'Recuperar Contraseña', animation: 'fade' }} />
      <Stack.Screen name="reset-password" options={{ gestureEnabled: false, title: 'Restablecer Contraseña', animation: 'fade' }} />
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="mapa/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="horarios/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="perfil/mis-zonas" options={{ title: 'Mis Zonas', animation: 'slide_from_right' }} />
      <Stack.Screen name="perfil/notificaciones" options={{ title: 'Notificaciones', animation: 'slide_from_right' }} />
      <Stack.Screen name="perfil/preferencias" options={{ title: 'Preferencias', animation: 'slide_from_right' }} />
    </Stack>
  );
}

function GlobalToastHost() {
  const { activeToast, dismissToast } = useNotifications();
  const router = useRouter();

  const handleToastPress = useCallback(() => {
    if (!activeToast) return;

    if (activeToast.onPress) {
      activeToast.onPress();
      return;
    }

    const cat = (activeToast.categoria || '').toUpperCase();
    if (activeToast.recorrido_id) {
      router.push(`/mapa/${activeToast.recorrido_id}` as any);
    } else if (cat === 'PROXIMIDAD' || cat === 'RECORRIDO' || cat === 'RETRASO') {
      router.push('/' as any);
    } else if (cat === 'REPORTE') {
      router.push('/reportes' as any);
    } else {
      router.push('/perfil/notificaciones' as any);
    }
  }, [activeToast, router]);

  if (!activeToast) return null;

  return (
    <CleanGoToast
      toast={{
        ...activeToast,
        onPress: handleToastPress,
      }}
      onDismiss={dismissToast}
    />
  );
}

function AppShell() {
  const [splashFinished, setSplashFinished] = useState(false);
  const [nativeHidden, setNativeHidden] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const hideNativeSplash = useCallback(() => {
    if (nativeHidden) return;
    setNativeHidden(true);
    SplashScreen.hideAsync().catch(() => {});
  }, [nativeHidden]);

  const handleSplashEnd = useCallback(() => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setSplashFinished(true);
    });
  }, [overlayOpacity]);

  const handleSplashError = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
    setSplashFinished(true);
  }, []);

  const showAnimatedSplash = !splashFinished;

  return (
    <View style={styles.root}>
      <ProtectedNavigator />
      <GlobalToastHost />
      {showAnimatedSplash && (
        <Animated.View style={[styles.splashOverlay, { opacity: overlayOpacity }]} pointerEvents="auto">
          <SplashErrorBoundary onError={handleSplashError}>
            <AnimatedSplashScreen onReady={hideNativeSplash} onAnimationEnd={handleSplashEnd} />
          </SplashErrorBoundary>
        </Animated.View>
      )}
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    registerBackgroundHandler();
    const unsubscribeTokenRefresh = onFcmTokenRefresh();
    const unsubscribeNotificationOpen = handleNotificationOpen();

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeNotificationOpen();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider style={styles.root}>
        <AuthProvider>
          <NotificationsProvider>
            <RecorridoMapCacheProvider>
              <AlertProvider>
                <AppShell />
              </AlertProvider>
            </RecorridoMapCacheProvider>
          </NotificationsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FA',
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 999,
    backgroundColor: '#F4F7FA',
  },
});
