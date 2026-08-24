// mobile-ciudadano/services/secureStorage.ts
/**
 * Wrapper sobre expo-secure-store para almacenar tokens y datos del ciudadano
 * autenticado de forma segura en el dispositivo.
 *
 * SecureStore cifra los valores usando el Keystore (Android) o el Keychain (iOS).
 * No usar AsyncStorage directamente para tokens sensibles.
 *
 * Adaptado de mobile-conductor/services/secureStorage.ts:
 *  - Keys renombradas: 'cg_device_*' → 'cg_citizen_*'
 *  - CamionData reemplazado por UserData (ciudadano)
 */
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'cg_citizen_access_token',
  REFRESH_TOKEN: 'cg_citizen_refresh_token',
  USER_DATA: 'cg_citizen_user_data',
} as const;

// ─── Tokens ───────────────────────────────────────────────────────────────────

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
  ]);
}

// ─── User data ────────────────────────────────────────────────────────────────

export interface StoredUser {
  id: number;
  nombre: string;
  correo: string;
  rol: 'Ciudadano';
}

export async function saveUserData(user: StoredUser): Promise<void> {
  await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(user));
}

export async function getUserData(): Promise<StoredUser | null> {
  const raw = await SecureStore.getItemAsync(KEYS.USER_DATA);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function clearUserData(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.USER_DATA);
}

// ─── Limpieza total de sesión ─────────────────────────────────────────────────

export async function clearAllSession(): Promise<void> {
  await Promise.all([clearTokens(), clearUserData()]);
}
