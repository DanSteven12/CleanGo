// mobile-conductor/app/_layout.tsx
/**
 * Layout raíz de la app móvil de Conductores.
 *
 * Responsabilidades:
 *  1. Envuelve toda la app con AuthProvider y SafeAreaProvider
 *  2. Implementa navegación protegida basada en el estado de autenticación:
 *       - Sin sesión  → redirige a /login
 *       - Con sesión  → muestra las pantallas protegidas
 *  3. Muestra un indicador de carga durante la restauración de sesión
 *     (evita el flash de pantalla equivocada al arrancar)
 *  4. Registra las pantallas en el Stack de Expo Router
 */
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Prevenir que el Splash Screen se oculte automáticamente
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignorar errores si ya se previno */
});

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

  // Mostrar loader durante la restauración de sesión
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1763A6" />
      </View>
    );
  }

  return null; // La navegación ya está configurada en el Stack
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  useEffect(() => {
    console.log('[Mobile Startup] Root Layout montado correctamente');
    SplashScreen.hideAsync().catch((err) => {
      console.warn('[Mobile Startup] Error al ocultar Splash Screen:', err);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  return (
    <>
      <ProtectedNavigator />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Pantalla de login — pública */}
        <Stack.Screen name="login" options={{ gestureEnabled: false }} />

        {/* Pantalla principal — protegida */}
        <Stack.Screen name="index" />

        {/* Mapa — protegida */}
        <Stack.Screen name="mapa/[id]" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});
