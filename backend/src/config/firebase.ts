// backend/src/config/firebase.ts
import * as admin from 'firebase-admin';

/**
 * Inicializa Firebase Admin SDK si aún no lo está.
 * Utiliza variables de entorno seguras para evitar exponer credenciales en el código fuente.
 */
export function initializeFirebaseAdmin(): void {
  // Evitar inicializar múltiples veces si el módulo se recarga en desarrollo (ts-node-dev)
  if (admin.apps.length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase Admin] Advertencia: Faltan credenciales en el .env. Firebase Push desactivado.');
    return;
  }

  // Parsear saltos de línea codificados si vienen como string simple (común en CI/CD y Hostinger)
  privateKey = privateKey.replace(/\\n/g, '\n');

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('[Firebase Admin] Inicializado correctamente.');
  } catch (error) {
    console.error('[Firebase Admin] Error al inicializar:', error);
  }
}

/**
 * Devuelve la instancia de Messaging.
 */
export function getMessaging() {
  return admin.messaging();
}
