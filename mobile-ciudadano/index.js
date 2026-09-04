import '@expo/metro-runtime';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { registerBackgroundHandler } from './services/fcmService';

// Registramos el handler de notificaciones en background de Firebase
// en el root entry point absoluto para evitar el error:
// "No task registered for key ReactNativeFirebaseMessagingHeadlessTask"
registerBackgroundHandler();

renderRootComponent(App);
