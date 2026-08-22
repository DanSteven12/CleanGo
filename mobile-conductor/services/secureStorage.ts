// mobile-conductor/services/secureStorage.ts
/**
 * Wrapper sobre expo-secure-store para almacenar tokens y datos del camión
 * autenticado de forma segura en el dispositivo.
 *
 * SecureStore cifra los valores usando el Keystore (Android) o el Keychain (iOS).
 * No usar AsyncStorage directamente para tokens sensibles.
 */
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'cg_device_access_token',
  REFRESH_TOKEN: 'cg_device_refresh_token',
  CAMION_DATA: 'cg_device_camion_data',
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

// ─── Camión data ──────────────────────────────────────────────────────────────

export interface StoredCamion {
  camion_id: number;
  numero_economico: string;
  placa: string;
  usuario_dispositivo: string;
  estado: string;
}

export async function saveCamionData(camion: StoredCamion): Promise<void> {
  await SecureStore.setItemAsync(KEYS.CAMION_DATA, JSON.stringify(camion));
}

export async function getCamionData(): Promise<StoredCamion | null> {
  const raw = await SecureStore.getItemAsync(KEYS.CAMION_DATA);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredCamion;
  } catch {
    return null;
  }
}

export async function clearCamionData(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.CAMION_DATA);
}

// ─── Limpieza total de sesión ─────────────────────────────────────────────────

export async function clearAllSession(): Promise<void> {
  await Promise.all([clearTokens(), clearCamionData()]);
}
