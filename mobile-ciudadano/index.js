import '@expo/metro-runtime';
import * as SplashScreen from 'expo-splash-screen';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { registerBackgroundHandler } from './services/fcmService';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Handler de notificaciones en background (entry point absoluto).
registerBackgroundHandler();

renderRootComponent(App);
