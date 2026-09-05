// mobile-conductor/app/_layout.tsx
/**
 * Layout raíz de la app móvil de Conductores.
 *
 * Responsabilidades:
 *  1. Envuelve toda la app con AuthProvider y SafeAreaProvider
 *  2. Implementa navegación protegida basada en el estado de autenticación:
 *       - Sin sesión  → redirige a /login
 *       - Con sesión  → muestra las pantallas protegidas
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
import { AsignacionProvider } from '../contexts/AsignacionContext';
import { registerBackgroundHandler, onForegroundMessage, onFcmTokenRefresh, handleNotificationOpen } from '../services/fcmService';

// El handler de background se registra en index.js (entry point).

// Prevenir que el Splash Screen se oculte automáticamente
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignorar errores si ya se previno */
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
      // Aquí podrías agregar actualización de contexto/estado si es necesario.
    });
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

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
      {/* Pantalla de login — pública */}
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />

      {/* Pantalla principal — protegida */}
      <Stack.Screen name="index" />

      {/* Mapa — protegida */}
      <Stack.Screen name="mapa/[id]" />
    </Stack>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  useEffect(() => {
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
    <SafeAreaProvider>
      <AuthProvider>
        {/* RecorridoMapCacheProvider vive aquí para sobrevivir al desmontaje
            de /mapa/[id] y mantener geometría, posición y socket activos
            mientras el usuario navega a otros tabs. */}
        <RecorridoMapCacheProvider>
          <AsignacionProvider>
            <ProtectedNavigator />
          </AsignacionProvider>
        </RecorridoMapCacheProvider>
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
