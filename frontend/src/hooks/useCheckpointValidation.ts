/**
 * @file useCheckpointValidation.ts
 * @description Hook React que encapsula la lógica de validación de puntos de control
 * mediante la Google Geocoding API para el componente MapSelector de CleanGo.
 *
 * Responsabilidades:
 *  - Orquestar la llamada async a `googleGeocodingService.validateUrbanStreet`.
 *  - Gestionar los estados de carga, error y dirección resuelta.
 *  - Mantener la última posición válida para revertir el marcador si el drag falla.
 *  - Completamente agnóstico al proveedor de mapas (sin dependencias de Leaflet).
 */

import { useCallback, useRef } from 'react';
import {
  googleGeocodingService,
  type GeoValidationResult,
} from '../services/googleGeocodingService';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CheckpointValidationCallbacks {
  /** Invocado cuando se capturan unas coordenadas válidas. */
  onValidCoords: (lat: number, lng: number, displayName: string) => void;
  /** Invocado cuando la validación falla. */
  onInvalidLocation: (message: string) => void;
  /** Invocado mientras se espera la respuesta de la API. */
  onValidating?: (isValidating: boolean) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook de validación de checkpoint sobre Google Geocoding API.
 *
 * Uso:
 * ```ts
 * const { validate, lastValidPosition, setLastValidPosition } = useCheckpointValidation({
 *   onValidCoords: (lat, lng, name) => updateCoords(lat, lng),
 *   onInvalidLocation: (msg) => setErrorMessage(msg),
 *   onValidating: (v) => setIsValidating(v),
 * });
 * ```
 */
export function useCheckpointValidation(callbacks: CheckpointValidationCallbacks) {
  const { onValidCoords, onInvalidLocation, onValidating } = callbacks;

  /**
   * Referencia a la última posición {lat, lng} válida del marcador.
   * Se actualiza cada vez que una validación termina con éxito.
   * Se usa para revertir el marcador cuando un drag falla la validación.
   */
  const lastValidPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  /**
   * Inicializa la referencia de última posición válida.
   * Llamar tras posicionar el marcador en su lugar inicial.
   */
  const setLastValidPosition = useCallback((lat: number, lng: number) => {
    lastValidPositionRef.current = { lat, lng };
  }, []);

  /**
   * Ejecuta la validación de la Geocoding API para las coordenadas dadas.
   *
   * @param geocoder         - Instancia de google.maps.Geocoder
   * @param lat              - Latitud a validar
   * @param lng              - Longitud a validar
   * @returns La última posición válida si la validación falla (para revertir el marker),
   *          o null si la validación pasa.
   */
  const validate = useCallback(
    async (
      geocoder: google.maps.Geocoder,
      lat: number,
      lng: number
    ): Promise<{ lat: number; lng: number } | null> => {
      onValidating?.(true);

      let result: GeoValidationResult;
      try {
        result = await googleGeocodingService.validateUrbanStreet(geocoder, lat, lng);
      } finally {
        onValidating?.(false);
      }

      if (result.isValid) {
        lastValidPositionRef.current = { lat, lng };
        onValidCoords(lat, lng, result.displayName);
        return null; // no revert needed
      } else {
        onInvalidLocation(result.errorMessage!);
        return lastValidPositionRef.current; // caller should revert marker here
      }
    },
    [onValidCoords, onInvalidLocation, onValidating]
  );

  return {
    validate,
    setLastValidPosition,
    getLastValidPosition: () => lastValidPositionRef.current,
  };
}
