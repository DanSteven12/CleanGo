// mobile-conductor/services/fcmService.ts
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
  }).catch(() => {});
}

export type { RemoteMessage };

export type FcmPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface FcmTokenResult {
  token: string | null;
  permissionStatus: FcmPermissionStatus;
  error?: string;
}

export async function getFcmToken(): Promise<FcmTokenResult> {
  if (Platform.OS !== 'android') {
    console.info('[FCM] getFcmToken omitido: actualmente soportado en Android.');
    return { token: null, permissionStatus: 'undetermined' };
  }

  try {
    const messagingInstance = getMessaging();

    await Notifications.requestPermissionsAsync().catch(() => undefined);
    await registerDeviceForRemoteMessages(messagingInstance).catch(() => undefined);

    const authStatus = await requestPermission(messagingInstance);
    const isGranted =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!isGranted) {
      console.warn('[FCM] Permiso denegado. AuthorizationStatus:', authStatus);
      return { token: null, permissionStatus: 'denied' };
    }

    const token = await getToken(messagingInstance);

    if (token) {
      console.log(`[FCM] Token obtenido (...${token.slice(-8)})`);
      registerFcmTokenInBackend(token, 'android').catch(() => {});
      return { token, permissionStatus: 'granted' };
    }

    return { token: null, permissionStatus: 'granted', error: 'Token vacío' };
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.warn('[FCM] Advertencia al obtener el token FCM:', message);
    return { token: null, permissionStatus: 'undetermined', error: message };
  }
}

export function onFcmTokenRefresh(onRefresh?: (token: string) => void): () => void {
  if (Platform.OS !== 'android') return () => {};

  try {
    const messagingInstance = getMessaging();
    return onTokenRefresh(messagingInstance, (token: string) => {
      console.log('[FCM] Token renovado. Re-registrando en backend...');
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
      console.log('[FCM] Mensaje en foreground (ID):', message.messageId);

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
        },
        trigger: null,
      }).catch(() => undefined);

      foregroundCallbacks.forEach((cb) => cb(message));
    });
  } catch (err: any) {
    console.warn('[FCM] Error al registrar onForegroundMessage:', err?.message || err);
  }
}

export function onForegroundMessage(callback: (message: RemoteMessage) => void): () => void {
  if (Platform.OS !== 'android') return () => {};
  ensureForegroundListener();
  foregroundCallbacks.add(callback);
  return () => {
    foregroundCallbacks.delete(callback);
  };
}

export function registerBackgroundHandler(): void {
  if (Platform.OS !== 'android') return;

  try {
    const messagingInstance = getMessaging();
    setBackgroundMessageHandler(messagingInstance, async (message: RemoteMessage) => {
      console.log('[FCM] Mensaje en background/terminated (ID):', message.messageId);
    });
  } catch (err: any) {
    console.warn('[FCM] Error al registrar registerBackgroundHandler:', err?.message || err);
  }
}

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
      .catch((err: any) => console.log('[FCM] getInitialNotification error:', err));

    return onNotificationOpenedApp(messagingInstance, (message: RemoteMessage) => {
      console.log('[FCM] App abierta desde notificación (background). ID:', message.messageId);
    });
  } catch (err: any) {
    console.warn('[FCM] Error al registrar handleNotificationOpen:', err?.message || err);
    return () => {};
  }
}
