// backend/src/utils/geo.ts
// ─────────────────────────────────────────────────────────────────────────────
// Utilidades geográficas puras.
// Sin dependencias externas. Sin efectos secundarios.
// ─────────────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Calcula la distancia real entre dos coordenadas geográficas (WGS-84)
 * usando la fórmula de Haversine.
 *
 * Precisión suficiente para distancias ≤ 50 km (error < 0.5%).
 * No requiere corrección por elipsoide para el rango de uso previsto (≤ 2 km).
 *
 * @param lat1 Latitud del punto A en grados decimales.
 * @param lng1 Longitud del punto A en grados decimales.
 * @param lat2 Latitud del punto B en grados decimales.
 * @param lng2 Longitud del punto B en grados decimales.
 * @returns Distancia en metros (número positivo).
 *
 * @example
 * haversineMeters(19.4326, -99.1332, 19.4350, -99.1310); // ~326 m aprox.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Verifica si un punto está dentro de un radio dado de otro punto.
 * Atajos matemáticos previos a Haversine (Bounding Box) se aplican fuera,
 * a nivel de consulta SQL. Esta función es el paso de confirmación final.
 *
 * @param lat1        Latitud del punto de referencia (ej. posición del camión).
 * @param lng1        Longitud del punto de referencia.
 * @param lat2        Latitud del punto candidato (ej. zona de interés).
 * @param lng2        Longitud del punto candidato.
 * @param radioMetros Radio máximo permitido en metros.
 * @returns `true` si la distancia real es ≤ radioMetros.
 */
export function estaDentroDelRadio(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radioMetros: number
): boolean {
  return haversineMeters(lat1, lng1, lat2, lng2) <= radioMetros;
}
