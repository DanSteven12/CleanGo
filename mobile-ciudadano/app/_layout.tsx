// mobile-ciudadano/app/_layout.tsx
/**
 * Layout raíz de la app móvil de Ciudadanos.
 *
 * Responsabilidades:
 *  1. Envuelve toda la app con AuthProvider y SafeAreaProvider
 *  2. Implementa navegación protegida basada en el estado de autenticación:
 *       - Sin sesión  → redirige a /login
 *       - Con sesión  → muestra las pantallas protegidas (index)
 *  3. Mantiene el Splash Screen nativo hasta resolver el arranque
 *     (evita el flash de pantalla equivocada)
 *  4. Registra las pantallas en el Stack de Expo Router
 */
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { RecorridoMapCacheProvider } from '../contexts/RecorridoMapCache';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { registerBackgroundHandler, onFcmTokenRefresh, handleNotificationOpen } from '../services/fcmService';

// Prevenir que el Splash Screen se oculte automáticamente
SplashScreen.preventAutoHideAsync().catch((err) => {
  console.log('[Splash] preventAutoHideAsync error:', err);
});

// Ignorar advertencias espurias de Dev Client con Firebase Messaging
LogBox.ignoreLogs(['Error: undefined', 'undefined']);

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

    // Ocultar el Splash Screen una vez resuelto el estado de autenticación
    SplashScreen.hideAsync().catch(() => {});

    // Check if the current route is in a public area where unauthenticated users can be
    const inPublicScreen = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'forgot-password' || segments[0] === 'reset-password';

    if (!isAuthenticated && !inPublicScreen) {
      // Sin sesión — redirigir a login
      router.replace('/login');
    } else if (isAuthenticated && inPublicScreen) {
      // Con sesión — redirigir a pantalla principal
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Mantener el fondo del splash mientras se resuelve la sesión
  // (el splash nativo cubre esta vista hasta hideAsync).
  if (isLoading) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName={isAuthenticated ? 'index' : 'login'}
    >
      {/* Pantallas públicas */}
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="register" options={{ gestureEnabled: false, title: 'Registro' }} />
      <Stack.Screen name="forgot-password" options={{ gestureEnabled: false, title: 'Recuperar Contraseña' }} />
      <Stack.Screen name="reset-password" options={{ gestureEnabled: false, title: 'Restablecer Contraseña' }} />

      {/* Pantalla principal — protegida */}
      <Stack.Screen name="index" />

      {/* Pantallas protegidas - detalle */}
      <Stack.Screen name="mapa/[id]" />
      <Stack.Screen name="horarios/[id]" />
      <Stack.Screen name="perfil/mis-reportes" options={{ title: 'Mis Reportes' }} />
      <Stack.Screen name="perfil/mis-zonas" options={{ title: 'Mis Zonas' }} />
      <Stack.Screen name="perfil/notificaciones" options={{ title: 'Notificaciones' }} />
    </Stack>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  useEffect(() => {
    // P5: Activar listener de rotación silenciosa de token FCM.
    const unsubscribeTokenRefresh = onFcmTokenRefresh();

    // P4/P5: Manejar apertura de notificación desde estado TERMINADO.
    // getInitialNotification() devuelve el mensaje que abrió la app (o null).
    // Consumirlo evita el "Error: undefined" en React Native DevTools.
    handleNotificationOpen();

    return () => {
      unsubscribeTokenRefresh();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationsProvider>
          <RecorridoMapCacheProvider>
            <ProtectedNavigator />
          </RecorridoMapCacheProvider>
        </NotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
