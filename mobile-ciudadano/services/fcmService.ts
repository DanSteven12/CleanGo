// mobile-ciudadano/services/fcmService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Utilidad para obtener y registrar el FCM Device Token en Android.
// Usa la API modular de @react-native-firebase/messaging v26+.
// P2: Solicita permisos y obtiene el token.
// P5: Registra el token en el backend tras obtenerlo y en cada renovación.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getMessaging,
  requestPermission,
  getToken,
  onTokenRefresh,
  onMessage,
  setBackgroundMessageHandler,
  getInitialNotification,
  onNotificationOpenedApp,
  registerDeviceForRemoteMessages,
  AuthorizationStatus,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerFcmTokenInBackend } from './authService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Avisos CleanGo',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1763A6',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  }).catch(() => {});
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type { RemoteMessage };

export type FcmPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface FcmTokenResult {
  token: string | null;
  permissionStatus: FcmPermissionStatus;
  error?: string;
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Obtiene el FCM Device Token del dispositivo Android.
 *
 * Flujo:
 *  1. Solicitar permisos al usuario (Android ≥ 13 muestra diálogo).
 *  2. Si se concedieron, obtener el token de FCM.
 *  3. Retornar el token + estado del permiso.
 *
 * Solo habilitado para Android. iOS requiere APNs.
 *
 * @returns FcmTokenResult con el token (o null si no se pudo obtener).
 */
export async function getFcmToken(): Promise<FcmTokenResult> {
  if (Platform.OS !== 'android') {
    console.info('[FCM] getFcmToken omitido: solo soportado en Android por ahora.');
    return { token: null, permissionStatus: 'undetermined' };
  }

  try {
    const messagingInstance = getMessaging();

    await Notifications.requestPermissionsAsync().catch(() => undefined);
    await registerDeviceForRemoteMessages(messagingInstance).catch(() => undefined);

    // 1. Solicitar permiso
    const authStatus = await requestPermission(messagingInstance);
    const isGranted =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!isGranted) {
      console.warn('[FCM] Permiso denegado. AuthorizationStatus:', authStatus);
      return { token: null, permissionStatus: 'denied' };
    }

    console.log('[FCM] Permiso concedido. AuthorizationStatus:', authStatus);

    // 2. Obtener el token FCM
    const token = await getToken(messagingInstance);

    if (token) {
      console.log('[FCM] Token obtenido correctamente (P2).');
      // P5: Registrar silenciosamente en el backend (no bloquea, no lanza error al caller)
      registerFcmTokenInBackend(token, 'android').catch(() => {});
      return { token, permissionStatus: 'granted' };
    } else {
      console.warn('[FCM] Token vacío recibido de Firebase.');
      return { token: null, permissionStatus: 'granted', error: 'Token vacío' };
    }
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.error('[FCM] Error al obtener el token:', message);
    return { token: null, permissionStatus: 'undetermined', error: message };
  }
}

/**
 * Registra un listener que se ejecuta cuando Firebase renueva el token FCM.
 * Retorna la función `unsubscribe` para limpiar el listener.
 *
 * P5: También registra el token renovado en el backend silenciosamente.
 *
 * @param onRefresh Callback opcional con el nuevo token
 */
export function onFcmTokenRefresh(onRefresh?: (token: string) => void): () => void {
  if (Platform.OS !== 'android') return () => {};

  try {
    const messagingInstance = getMessaging();
    return onTokenRefresh(messagingInstance, (token: string) => {
      console.log('[FCM] Token renovado por Firebase. Re-registrando en backend...');
      // P5: Actualizar en backend silenciosamente
      registerFcmTokenInBackend(token, 'android').catch(() => {});
      onRefresh?.(token);
    });
  } catch (err: any) {
    console.warn('[FCM] Error al registrar onFcmTokenRefresh:', err?.message || err);
    return () => {};
  }
}

const foregroundCallbacks = new Set<(message: RemoteMessage) => void>();
let unsubscribeForegroundNative: (() => void) | null = null;

function ensureForegroundListener(): void {
  if (Platform.OS !== 'android' || unsubscribeForegroundNative) return;

  try {
    const messagingInstance = getMessaging();
    unsubscribeForegroundNative = onMessage(messagingInstance, async (message: RemoteMessage) => {
      console.log('[FCM] Mensaje recibido en foreground (ID):', message.messageId);

      const title =
        message.notification?.title ||
        (typeof message.data?.titulo === 'string' ? message.data.titulo : 'Nueva notificación');
      const body =
        message.notification?.body ||
        (typeof message.data?.mensaje === 'string' ? message.data.mensaje : '');

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: message.data,
          sound: true,
          color: '#1763A6',
        },
        trigger: null,
      }).catch(() => undefined);

      foregroundCallbacks.forEach((cb) => cb(message));
    });
  } catch (err: any) {
    console.warn('[FCM] Error al registrar onForegroundMessage:', err?.message || err);
  }
}

/**
 * Registra un listener para recibir mensajes cuando la app está en FOREGROUND (abierta en pantalla).
 * Además de ejecutar el callback, dispara un banner emergente nativo mediante Expo Notifications.
 *
 * @param callback Función a ejecutar con el payload del mensaje
 * @returns Función para limpiar el listener (unsubscribe)
 */
export function onForegroundMessage(callback: (message: RemoteMessage) => void): () => void {
  if (Platform.OS !== 'android') return () => {};
  ensureForegroundListener();
  foregroundCallbacks.add(callback);
  return () => {
    foregroundCallbacks.delete(callback);
  };
}

/**
 * Registra un manejador para recibir mensajes cuando la app está en BACKGROUND o CERRADA (Terminated).
 * Este manejador corre "headlessly" fuera del ciclo de vida de React.
 * Si el mensaje contiene "notification", Android pintará automáticamente la alerta en la barra superior.
 */
export function registerBackgroundHandler(): void {
  if (Platform.OS !== 'android') return;

  try {
    const messagingInstance = getMessaging();
    setBackgroundMessageHandler(messagingInstance, async (message: RemoteMessage) => {
      console.log('[FCM] Mensaje recibido en background/terminated (ID):', message.messageId);
    });
  } catch (err: any) {
    console.warn('[FCM] Error al registrar registerBackgroundHandler:', err?.message || err);
  }
}

/**
 * Maneja la apertura de la app al tocar una notificación FCM.
 *
 * Cubre dos casos:
 *  - App TERMINADA: la notificación que abrió la app (getInitialNotification)
 *  - App en BACKGROUND: listener continuo de toques en notificaciones (onNotificationOpenedApp)
 *
 * @returns Función de limpieza para el listener de background.
 */
export function handleNotificationOpen(): () => void {
  if (Platform.OS !== 'android') return () => {};

  try {
    const messagingInstance = getMessaging();

    getInitialNotification(messagingInstance)
      .then((message: RemoteMessage | null) => {
        if (message) {
          console.log('[FCM] App abierta desde notificación (terminated). ID:', message.messageId);
        }
      })
      .catch((err: any) => {
        console.log('[FCM] getInitialNotification error:', err);
      });

    return onNotificationOpenedApp(messagingInstance, (message: RemoteMessage) => {
      console.log('[FCM] App abierta desde notificación (background). ID:', message.messageId);
    });
  } catch (err: any) {
    console.warn('[FCM] Error al registrar handleNotificationOpen:', err?.message || err);
    return () => {};
  }
}

