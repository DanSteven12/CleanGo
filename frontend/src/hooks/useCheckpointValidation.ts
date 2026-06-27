/**
 * @file useCheckpointValidation.ts
 * @description Hook React que encapsula la lógica de validación de puntos de control
 * mediante Nominatim para el componente MapSelector de CleanGo.
 *
 * Responsabilidades:
 *  - Orquestar la llamada async a `nominatimService.validateUrbanStreet`.
 *  - Gestionar los estados de carga, error y dirección resuelta.
 *  - Adjuntar los event listeners de Leaflet ("click" en mapa, "dragend" en marcador).
 *  - Revertir la posición del marcador si el drag termina en una ubicación inválida.
 */

import { useCallback, useRef } from 'react';
import L from 'leaflet';
import { nominatimService } from '../services/nominatimService';

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** Callbacks que el componente padre debe proveer al hook. */
export interface CheckpointValidationCallbacks {
  /** Invocado cuando se capturan unas coordenadas válidas (clic o dragend). */
  onValidCoords: (lat: number, lng: number, displayName: string) => void;
  /** Invocado cuando la validación falla (muestra el error al admin). */
  onInvalidLocation: (message: string) => void;
  /** Invocado mientras se espera la respuesta de Nominatim. */
  onValidating?: (isValidating: boolean) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook que adjunta la lógica de validación Nominatim a un mapa Leaflet y a un
 * marcador arrastrable existentes.
 *
 * Uso típico dentro de un `useEffect` de inicialización del mapa:
 *
 * ```ts
 * const { attachMapListeners, attachMarkerListeners } = useCheckpointValidation({
 *   onValidCoords: (lat, lng, name) => updateCoords(lat, lng),
 *   onInvalidLocation: (msg) => setErrorMessage(msg),
 *   onValidating: (v) => setIsValidating(v),
 * });
 *
 * // Tras crear el mapa y el marcador:
 * attachMapListeners(mapInstance);
 * attachMarkerListeners(markerInstance);
 * ```
 */
export function useCheckpointValidation(callbacks: CheckpointValidationCallbacks) {
  const { onValidCoords, onInvalidLocation, onValidating } = callbacks;

  /**
   * Referencia a la última posición válida del marcador.
   * Se actualiza cada vez que una validación termina con éxito.
   * Se usa para revertir el marcador cuando un drag falla la validación.
   */
  const lastValidLatLngRef = useRef<L.LatLng | null>(null);

  /**
   * Ejecuta la validación de Nominatim para las coordenadas dadas.
   * Notifica al padre el resultado y, si hay un marcador y el drag falló,
   * lo revierte a la última posición válida.
   *
   * @param lat             - Latitud a validar.
   * @param lng             - Longitud a validar.
   * @param markerToRevert  - Si se provee, se revierte al fallar la validación.
   */
  const validate = useCallback(
    async (lat: number, lng: number, markerToRevert?: L.Marker) => {
      // Señalizar inicio de validación
      onValidating?.(true);

      const result = await nominatimService.validateUrbanStreet(lat, lng);

      // Señalizar fin de validación
      onValidating?.(false);

      if (result.isValid) {
        // Actualizar la referencia de última posición válida
        lastValidLatLngRef.current = L.latLng(lat, lng);
        onValidCoords(lat, lng, result.displayName);
      } else {
        // Revertir el marcador si venía de un evento dragend
        if (markerToRevert && lastValidLatLngRef.current) {
          markerToRevert.setLatLng(lastValidLatLngRef.current);
        }
        onInvalidLocation(result.errorMessage!);
      }
    },
    [onValidCoords, onInvalidLocation, onValidating]
  );

  /**
   * Adjunta el listener `click` al mapa Leaflet.
   * Al hacer clic, captura las coordenadas y dispara la validación asíncrona.
   *
   * @param map - Instancia del mapa Leaflet ya inicializada.
   * @returns Función de limpieza para remover el listener.
   */
  const attachMapListeners = useCallback(
    (map: L.Map) => {
      /**
       * Handler del evento 'click' del mapa.
       * Es asíncrono internamente pero el listener de Leaflet lo maneja
       * correctamente porque no necesita el valor de retorno.
       */
      const onMapClick = (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        // Fire-and-forget; los errores son capturados dentro de `validate`
        void validate(lat, lng);
      };

      map.on('click', onMapClick);

      // Devolver una función de cleanup para usar en el return del useEffect
      return () => {
        map.off('click', onMapClick);
      };
    },
    [validate]
  );

  /**
   * Adjunta el listener `dragend` al marcador Leaflet arrastrable.
   * Al soltar el marcador, valida la nueva posición; si falla, revierte.
   *
   * Implementa la estrategia de "guardar posición previa al drag":
   *  - `dragstart` → guarda la posición actual en `lastValidLatLngRef` (si no hay una ya).
   *  - `dragend`   → valida la nueva posición y revierte si es inválida.
   *
   * @param marker - Instancia del marcador Leaflet (`{ draggable: true }`).
   * @returns Función de limpieza para remover los listeners.
   */
  const attachMarkerListeners = useCallback(
    (marker: L.Marker) => {
      /**
       * Antes de arrastrar, aseguramos que la ref tenga la posición actual
       * para poder revertir a ella si el destino del drag no es válido.
       */
      const onDragStart = () => {
        if (!lastValidLatLngRef.current) {
          lastValidLatLngRef.current = marker.getLatLng();
        }
      };

      /**
       * Al terminar el arrastre, captura la nueva posición y valida.
       * Si la validación falla, `validate` revierte el marcador.
       */
      const onDragEnd = () => {
        const { lat, lng } = marker.getLatLng();
        void validate(lat, lng, marker);
      };

      marker.on('dragstart', onDragStart);
      marker.on('dragend', onDragEnd);

      return () => {
        marker.off('dragstart', onDragStart);
        marker.off('dragend', onDragEnd);
      };
    },
    [validate]
  );

  /**
   * Inicializa la referencia de última posición válida con unas coordenadas conocidas.
   * Llamar tras posicionar el marcador en su lugar inicial (centro del mapa, etc.)
   * para garantizar que siempre haya un punto de reversión disponible.
   *
   * @param lat - Latitud inicial.
   * @param lng - Longitud inicial.
   */
  const initLastValidPosition = useCallback((lat: number, lng: number) => {
    lastValidLatLngRef.current = L.latLng(lat, lng);
  }, []);

  return {
    attachMapListeners,
    attachMarkerListeners,
    initLastValidPosition,
  };
}
