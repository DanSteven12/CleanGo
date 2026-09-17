// mobile-conductor/app/_layout.tsx
/**
 * Layout raíz de la app móvil de Conductores.
 *
 * El Stack de Expo Router debe existir desde el primer frame.
 * Si se oculta el splash nativo sin navigator montado, Android muestra
 * el fondo de la Activity (negro).
 */
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { RecorridoMapCacheProvider } from '../contexts/RecorridoMapCache';
import { AsignacionProvider } from '../contexts/AsignacionContext';
import { AlertProvider } from '../contexts/AlertContext';
import { registerBackgroundHandler, onForegroundMessage, onFcmTokenRefresh, handleNotificationOpen } from '../services/fcmService';

// Prevenir que el Splash Screen se oculte automáticamente
SplashScreen.preventAutoHideAsync().catch((err) => {
  console.log('[Splash] preventAutoHideAsync error:', err);
});

SystemUI.setBackgroundColorAsync('#F4F7FA').catch(() => {});

// Ignorar advertencias espurias
LogBox.ignoreLogs(['Error: undefined', 'undefined']);
LogBox.ignoreAllLogs(true);



// ─── Componente de navegación protegida ───────────────────────────────────────

/**
 * Encargado de redirigir basándose en el estado de autenticación.
 * Separado del layout para poder usar useAuth() dentro del Provider.
 */
function ProtectedNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return; // Esperar a que termine la restauración de sesión

    const inLoginScreen = segments[0] === 'login';

    if (!isAuthenticated && !inLoginScreen) {
      // Sin sesión — redirigir a login
      router.replace('/login');
    } else if (isAuthenticated && inLoginScreen) {
      // Con sesión — redirigir a pantalla principal
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Suscribirse a mensajes de foreground mientras la app está protegida
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = onForegroundMessage((message) => {
      // La notificación local ya se maneja internamente en fcmService.ts
    });
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Pantalla de login — pública */}
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />

      {/* Pantalla principal — protegida */}
      <Stack.Screen name="index" />

      {/* Mapa — protegida */}
      <Stack.Screen name="mapa/[id]" />
    </Stack>
  );
}

// ─── App Shell con Splash Animado Overlay ─────────────────────────────────────

function AppShell() {
  useEffect(() => {
    // Ocultar el splash nativo en cuanto el navigator esté montado
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <ProtectedNavigator />
    </View>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  useEffect(() => {
    registerBackgroundHandler();

    // Activar listener de rotación silenciosa de token FCM.
    const unsubscribeTokenRefresh = onFcmTokenRefresh();

    // Manejar apertura de notificación desde estado TERMINADO/BACKGROUND.
    const unsubscribeNotificationOpen = handleNotificationOpen();

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeNotificationOpen();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider style={styles.root}>
        <AlertProvider>
          <AuthProvider>
            {/* RecorridoMapCacheProvider vive aquí para sobrevivir al desmontaje
                de /mapa/[id] y mantener geometría, posición y socket activos
                mientras el usuario navega a otros tabs. */}
            <RecorridoMapCacheProvider>
              <AsignacionProvider>
                <AppShell />
              </AsignacionProvider>
            </RecorridoMapCacheProvider>
          </AuthProvider>
        </AlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FA',
  },
});
