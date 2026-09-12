import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface LocationResult {
  location: Location.LocationObject | null;
  error: string | null;
}

/**
 * Obtiene la ubicación del dispositivo de forma ultra rápida:
 * 1. Ejecuta verificaciones de permisos y servicios en paralelo.
 * 2. Consulta la última posición en caché del OS (obtenida en < 50ms).
 * 3. Si no hay caché previa, solicita la posición actual con precisión optimizada.
 */
export async function obtenerUbicacionActual(): Promise<LocationResult> {
  try {
    // 1. Verificación paralela de servicios y permisos existentes (ejecuta en ~30ms)
    const [servicesEnabled, currentPerm] = await Promise.all([
      Location.hasServicesEnabledAsync().catch(() => true),
      Location.getForegroundPermissionsAsync().catch(() => ({ status: 'undetermined' } as Location.PermissionResponse)),
    ]);

    // Si los servicios están desactivados, solicitar activación en Android
    if (!servicesEnabled) {
      if (Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          return {
            location: null,
            error: 'Activa el GPS / ubicación en tu dispositivo.',
          };
        }
      } else {
        return {
          location: null,
          error: 'Activa la ubicación en los ajustes del dispositivo.',
        };
      }
    }

    // Solicitar permiso solo si aún no ha sido concedido
    let status = currentPerm.status;
    if (status !== 'granted') {
      const requested = await Location.requestForegroundPermissionsAsync();
      status = requested.status;
    }

    if (status !== 'granted') {
      return {
        location: null,
        error: 'Permiso de ubicación denegado.',
      };
    }

    // 2. Comprobar caché del sistema (retorna casi instantáneamente)
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 900000, // 15 minutos de antigüedad máxima
      });
      if (lastKnown) {
        return { location: lastKnown, error: null };
      }
    } catch {
      // Si no hay caché disponible, continuamos con la lectura directa
    }

    // 3. Obtener posición actual directa si la caché estaba vacía
    const freshLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return { location: freshLocation, error: null };
  } catch (err: any) {
    console.warn('[Location] Error obteniendo ubicación:', err?.message);
    
    // Intento final de emergencia con precisión baja/rápida
    try {
      const emergencyLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Lowest,
      });
      if (emergencyLoc) {
        return { location: emergencyLoc, error: null };
      }
    } catch {
      // Ignore
    }

    return {
      location: null,
      error: 'No se pudo obtener la ubicación. Verifica tu señal GPS.',
    };
  }
}
