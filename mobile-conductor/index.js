import '@expo/metro-runtime';
import * as SplashScreen from 'expo-splash-screen';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { registerBackgroundHandler } from './services/fcmService';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Debe registrarse en el entry point, no dentro de React:
// "No task registered for key ReactNativeFirebaseMessagingHeadlessTask"
registerBackgroundHandler();

renderRootComponent(App);
