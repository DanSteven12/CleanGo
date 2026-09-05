import '@expo/metro-runtime';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { registerBackgroundHandler } from './services/fcmService';

// Debe registrarse en el entry point, no dentro de React:
// "No task registered for key ReactNativeFirebaseMessagingHeadlessTask"
registerBackgroundHandler();

renderRootComponent(App);
