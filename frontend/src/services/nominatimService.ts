/**
 * @file nominatimService.ts
 * @description Servicio de geocodificación inversa mediante la API gratuita de Nominatim
 * (OpenStreetMap). Proporciona validación estricta de vías urbanas transitables para el
 * módulo de administración de rutas de CleanGo.
 *
 * Reglas de validación:
 *  - VÁLIDO   → El objeto `address` contiene "road", "pedestrian", "path", etc.
 *  - INVÁLIDO → Autopistas, cuerpos de agua, zonas sin urbanizar o lugares donde las
 *               etiquetas de calle urbana están ausentes.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

/**
 * Subconjunto de propiedades que Nominatim devuelve dentro del objeto `address`.
 * Solo listamos los campos relevantes para la validación; el resto se ignora.
 */
export interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  path?: string;
  footway?: string;
  cycleway?: string;
  residential?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_block?: string;
  [key: string]: string | undefined;
}

/** Respuesta completa de la API de Nominatim (campos relevantes solamente). */
export interface NominatimResponse {
  display_name: string;
  address: NominatimAddress;
  /** Tipo OSM del elemento (p. ej. "residential", "motorway", "water") */
  type?: string;
  /** Clase OSM del elemento (p. ej. "highway", "waterway") */
  class?: string;
  error?: string;
}

/** Resultado normalizado que devuelve el servicio. */
export interface ValidationResult {
  /** true si el punto se considera una vía urbana transitable. */
  isValid: boolean;
  /** Dirección legible para mostrar al usuario cuando la validación pasa. */
  displayName: string;
  /** Mensaje de error específico cuando la validación falla (undefined si pasa). */
  errorMessage?: string;
}

// ─── Constantes de validación ─────────────────────────────────────────────────

/**
 * Claves del objeto `address` que acreditan una vía urbana transitable.
 * Al menos una de estas debe estar presente en la respuesta de Nominatim.
 */
const URBAN_STREET_KEYS: (keyof NominatimAddress)[] = [
  'road',
  'pedestrian',
  'path',
  'footway',
  'cycleway',
  'residential',
];

/**
 * Claves que refuerzan el contexto urbano cuando se acompañan de URBAN_STREET_KEYS.
 * Se usan como validación secundaria (plazas, callejones sin nombre oficial, etc.).
 */
const URBAN_CONTEXT_KEYS: (keyof NominatimAddress)[] = [
  'suburb',
  'neighbourhood',
  'quarter',
  'city_block',
];

/**
 * Tipos/clases OSM que denotan elementos NO transitables por vehículos de limpieza.
 * Si `type` o `class` de la respuesta coincide con alguno, el punto es rechazado.
 */
const FORBIDDEN_TYPES = new Set([
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'water',
  'bay',
  'sea',
  'ocean',
  'coastline',
  'wetland',
  'farmland',
  'farmyard',
  'forest',
  'wood',
  'scrub',
  'heath',
  'grassland',
  'bare_rock',
  'sand',
  'beach',
]);

/** Mensaje de error estándar para el administrador cuando la validación falla. */
export const INVALID_LOCATION_MESSAGE =
  'Ubicación inválida. Por favor, marque el punto de control estrictamente sobre ' +
  'una calle o vía urbana transitable (evite carreteras abiertas o áreas no urbanizadas).';

// ─── Helpers privados ─────────────────────────────────────────────────────────

/**
 * Construye la URL de la API de Nominatim para geocodificación inversa.
 * Se usa `zoom=18` para obtener detalles a nivel de calle.
 */
function buildNominatimUrl(lat: number, lng: number): string {
  return (
    `https://nominatim.openstreetmap.org/reverse` +
    `?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
  );
}

/**
 * Evalúa si la respuesta de Nominatim corresponde a una vía urbana transitable.
 *
 * Lógica en tres pasos:
 * 1. Rechaza si `type` o `class` cae en FORBIDDEN_TYPES (autopistas, agua, etc.).
 * 2. Aprueba si alguna clave de URBAN_STREET_KEYS existe en `address`.
 * 3. Aprueba como contexto urbano si existe alguna clave de URBAN_CONTEXT_KEYS.
 */
function isUrbanStreet(response: NominatimResponse): boolean {
  const { address, type, class: osmClass } = response;

  // Paso 1 — Rechazo explícito por tipo/clase OSM no transitable
  if (type && FORBIDDEN_TYPES.has(type)) return false;
  if (osmClass && FORBIDDEN_TYPES.has(osmClass)) return false;

  // Paso 2 — Validación primaria: al menos una clave de vía urbana presente
  const hasPrimaryStreetKey = URBAN_STREET_KEYS.some((key) => Boolean(address?.[key]));
  if (hasPrimaryStreetKey) return true;

  // Paso 3 — Validación secundaria: contexto urbano sin calle explícita
  const hasUrbanContext = URBAN_CONTEXT_KEYS.some((key) => Boolean(address?.[key]));
  return hasUrbanContext;
}

// ─── Servicio público ─────────────────────────────────────────────────────────

export const nominatimService = {
  /**
   * Valida si las coordenadas dadas corresponden a una vía urbana transitable
   * consultando la API de geocodificación inversa de Nominatim.
   *
   * Maneja correctamente:
   * - Errores HTTP (429 rate-limit, 5xx servidor caído)
   * - Respuestas vacías de Nominatim (coords en alta mar, desiertos, etc.)
   * - Errores de red o JSON inválido via try/catch
   *
   * @param lat - Latitud del punto a validar.
   * @param lng - Longitud del punto a validar.
   * @returns Promesa con un {@link ValidationResult}.
   */
  async validateUrbanStreet(lat: number, lng: number): Promise<ValidationResult> {
    const url = buildNominatimUrl(lat, lng);

    try {
      const response = await fetch(url, {
        headers: {
          // Nominatim exige un User-Agent identificativo para cumplir su política de uso.
          'User-Agent': 'CleanGo-Admin/1.0 (contacto@cleango.mx)',
          Accept: 'application/json',
        },
      });

      // Manejo de errores HTTP (429 = rate-limit, 5xx = caída del servidor)
      if (!response.ok) {
        console.error(`[nominatimService] HTTP ${response.status} al consultar Nominatim.`);
        return { isValid: false, displayName: '', errorMessage: INVALID_LOCATION_MESSAGE };
      }

      const data: NominatimResponse = await response.json();

      // Nominatim devuelve { error: "..." } cuando no encuentra nada en las coords
      if (data.error) {
        return { isValid: false, displayName: '', errorMessage: INVALID_LOCATION_MESSAGE };
      }

      const valid = isUrbanStreet(data);

      return {
        isValid: valid,
        displayName: data.display_name ?? '',
        errorMessage: valid ? undefined : INVALID_LOCATION_MESSAGE,
      };
    } catch (err) {
      // Red caída, timeout, CORS o JSON malformado
      console.error('[nominatimService] Error de red o parseo JSON:', err);
      return { isValid: false, displayName: '', errorMessage: INVALID_LOCATION_MESSAGE };
    }
  },
};
