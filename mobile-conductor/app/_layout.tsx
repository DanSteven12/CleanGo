import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Prevenir que el Splash Screen se oculte automáticamente antes de completar la carga inicial
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignorar errores si ya se previno */
});

export default function RootLayout() {
  useEffect(() => {
    console.log('[Mobile Startup] Root Layout montado correctamente');
    SplashScreen.hideAsync().catch((err) => {
      console.warn('[Mobile Startup] Error al ocultar Splash Screen:', err);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </SafeAreaProvider>
  );
}

