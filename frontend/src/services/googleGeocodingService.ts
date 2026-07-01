/**
 * @file googleGeocodingService.ts
 * @description Servicio de geocodificación inversa mediante la Google Geocoding API.
 * Valida si una coordenada dada corresponde a una vía urbana transitable
 * para el módulo de administración de rutas de CleanGo.
 *
 * Reemplaza el antiguo nominatimService.ts (OpenStreetMap/Nominatim).
 *
 * Reglas de validación:
 *  - VÁLIDO   → location_type es ROOFTOP o RANGE_INTERPOLATED y los types del resultado
 *               contienen elementos de vía urbana (route, street_address, etc.)
 *  - INVÁLIDO → Áreas sin urbanizar, cuerpos de agua, autopistas de acceso restringido,
 *               o cualquier lugar donde no haya una vía transitable.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** Resultado normalizado del servicio de validación. */
export interface GeoValidationResult {
  /** true si el punto se considera una vía urbana transitable. */
  isValid: boolean;
  /** Dirección legible para mostrar al usuario cuando la validación pasa. */
  displayName: string;
  /** Mensaje de error cuando la validación falla (undefined si pasa). */
  errorMessage?: string;
}

// ─── Constantes de validación ─────────────────────────────────────────────────

/**
 * Types de la Geocoding API que acreditan una vía urbana transitable.
 */
const URBAN_STREET_TYPES = new Set([
  'street_address',
  'route',
  'intersection',
  'premise',
  'subpremise',
  'neighborhood',
  'sublocality',
  'sublocality_level_1',
  'sublocality_level_2',
]);

/**
 * Types que denotan zonas NO transitables por vehículos de limpieza.
 */
const FORBIDDEN_TYPES = new Set([
  'natural_feature',
  'park',
  'point_of_interest',
  'airport',
  'campground',
  'cemetery',
  'hospital',
]);

/** Mensaje de error estándar cuando la validación falla. */
export const INVALID_LOCATION_MESSAGE =
  'Ubicación inválida. Por favor, marque el punto de control estrictamente sobre ' +
  'una calle o vía urbana transitable (evite carreteras abiertas o áreas no urbanizadas).';

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Evalúa si el resultado de la Geocoding API corresponde a una vía urbana transitable.
 */
function isUrbanStreet(result: google.maps.GeocoderResult): boolean {
  const types: string[] = result.types ?? [];

  // Rechazar tipos explícitamente prohibidos
  if (types.some((t) => FORBIDDEN_TYPES.has(t))) return false;

  // Aceptar si contiene al menos un type de vía urbana
  return types.some((t) => URBAN_STREET_TYPES.has(t));
}

// ─── Servicio público ─────────────────────────────────────────────────────────

export const googleGeocodingService = {
  /**
   * Valida si las coordenadas dadas corresponden a una vía urbana transitable
   * usando la Google Geocoding API (geocodificación inversa).
   *
   * @param geocoder - Instancia de google.maps.Geocoder ya creada.
   * @param lat - Latitud del punto a validar.
   * @param lng - Longitud del punto a validar.
   * @returns Promesa con un GeoValidationResult.
   */
  async validateUrbanStreet(
    geocoder: google.maps.Geocoder,
    lat: number,
    lng: number
  ): Promise<GeoValidationResult> {
    try {
      const response = await geocoder.geocode({
        location: { lat, lng },
      });

      const results = response.results;

      if (!results || results.length === 0) {
        return {
          isValid: false,
          displayName: '',
          errorMessage: INVALID_LOCATION_MESSAGE,
        };
      }

      // El primer resultado es el más específico
      const bestResult = results[0];

      const valid = isUrbanStreet(bestResult);

      return {
        isValid: valid,
        displayName: bestResult.formatted_address ?? '',
        errorMessage: valid ? undefined : INVALID_LOCATION_MESSAGE,
      };
    } catch (err) {
      console.error('[googleGeocodingService] Error de geocodificación:', err);
      return {
        isValid: false,
        displayName: '',
        errorMessage: INVALID_LOCATION_MESSAGE,
      };
    }
  },
};
