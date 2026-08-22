/**
 * Caché del recorrido activo a nivel de app.
 *
 * Sobrevive al desmontaje de /mapa/[id] para que:
 *  - la geometría y los checkpoints no se vuelvan a pedir al reentrar
 *  - el socket siga recibiendo ticks mientras el usuario está en otro menú
 *  - el mapa pueda pintar de inmediato la última posición conocida
 *
 * No interpola ni cambia la simulación: solo guarda el estado ya calculado
 * por el backend y el payload de GET /recorridos/activo.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { getMobileSocket } from '../services/socketService';
import type { SimulationStats } from '../hooks/useRouteSimulation';
import { useAuth } from './AuthContext';

export type MapLatLng = { latitude: number; longitude: number };

export interface RecorridoSnapshot {
  latitude: number;
  longitude: number;
  porcentajeAvance: number;
  heading: number;
  speedMultiplier: number;
  stats: Partial<SimulationStats>;
}

export interface RecorridoCacheEntry {
  asignacionId: number;
  recorridoData: any;
  streetGeometry: MapLatLng[];
  snapshot: RecorridoSnapshot | null;
  /** true cuando el backend notificó que el recorrido fue completado */
  isCompleted: boolean;
}

interface RecorridoMapCacheValue {
  entry: RecorridoCacheEntry | null;
  setFromApi: (asignacionId: number, data: any) => void;
  updateSnapshot: (partial: Partial<RecorridoSnapshot>) => void;
  clear: () => void;
}

const RecorridoMapCacheContext = createContext<RecorridoMapCacheValue | undefined>(undefined);

export function mapGeometria(raw: any[] | undefined): MapLatLng[] {
  if (!Array.isArray(raw) || raw.length < 2) return [];
  return raw.map((pt: any) => ({
    latitude: Number(pt.lat ?? pt.latitude),
    longitude: Number(pt.lng ?? pt.longitude),
  })).filter((p) => !isNaN(p.latitude) && !isNaN(p.longitude));
}

export function RecorridoMapCacheProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [entry, setEntry] = useState<RecorridoCacheEntry | null>(null);
  const entryRef = useRef<RecorridoCacheEntry | null>(null);
  entryRef.current = entry;

  const setFromApi = useCallback((asignacionId: number, data: any) => {
    if (!data) return;
    setEntry((prev) => {
      const sameRecorrido = prev?.recorridoData?.recorrido_id === data.recorrido_id;
      const incomingGeom = mapGeometria(data.geometria);
      const streetGeometry =
        incomingGeom.length >= 2
          ? incomingGeom
          : (sameRecorrido ? prev!.streetGeometry : []);
      return {
        asignacionId,
        recorridoData: data,
        streetGeometry,
        snapshot: sameRecorrido ? prev!.snapshot : prev?.asignacionId === asignacionId ? prev.snapshot : null,
        // Preservar isCompleted si es el mismo recorrido; reiniciar si es nuevo
        isCompleted: sameRecorrido ? (prev!.isCompleted ?? false) : false,
      };
    });
  }, []);

  const updateSnapshot = useCallback((partial: Partial<RecorridoSnapshot>) => {
    setEntry((prev) => {
      if (!prev) return prev;
      const base: RecorridoSnapshot = prev.snapshot ?? {
        latitude: 0,
        longitude: 0,
        porcentajeAvance: 0,
        heading: 0,
        speedMultiplier: 1,
        stats: {},
      };
      return {
        ...prev,
        snapshot: {
          ...base,
          ...partial,
          stats: { ...base.stats, ...partial.stats },
        },
      };
    });
  }, []);

  const clear = useCallback(() => {
    setEntry(null);
  }, []);

  // Limpiar caché automáticamente al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) {
      clear();
    }
  }, [isAuthenticated, clear]);

  // Mantener el socket unido al recorrido aunque el mapa se desmonte.
  const recorridoId = entry?.recorridoData?.recorrido_id ?? null;
  useEffect(() => {
    if (!recorridoId) return;
    const socket = getMobileSocket();
    socket.emit('unirse_a_recorrido', recorridoId);

    const handleUbicacion = (data: any) => {
      if (data.recorridoId !== recorridoId) return;
      const lat = Number(data.latitud);
      const lng = Number(data.longitud);
      if (isNaN(lat) || isNaN(lng)) return;
      setEntry((prev) => {
        if (!prev || prev.recorridoData?.recorrido_id !== recorridoId) return prev;
        const prevSnap = prev.snapshot;
        return {
          ...prev,
          snapshot: {
            latitude: lat,
            longitude: lng,
            porcentajeAvance: typeof data.porcentajeAvance === 'number'
              ? data.porcentajeAvance
              : (prevSnap?.porcentajeAvance ?? 0),
            heading: prevSnap?.heading ?? 0,
            speedMultiplier: data.velocidad || prevSnap?.speedMultiplier || 1,
            stats: {
              ...(prevSnap?.stats || {}),
              ultimoCheckpoint: data.ultimoCheckpoint,
              proximoCheckpoint: data.proximoCheckpoint,
              completados: data.completados,
              pendientes: data.pendientes,
              porcentajeAvance: data.porcentajeAvance,
              etaSegundos: data.etaSegundos,
              horaEstimada: data.horaEstimada,
              estadoDinamico: data.estadoDinamico,
            },
          },
        };
      });
    };

    // Escuchar finalización del recorrido mientras el mapa puede estar desmontado
    const handleFinalizado = (data: any) => {
      if (data.recorridoId !== recorridoId) return;
      setEntry((prev) => {
        if (!prev || prev.recorridoData?.recorrido_id !== recorridoId) return prev;
        return { ...prev, isCompleted: true };
      });
    };

    socket.on('ubicacion_actualizada', handleUbicacion);
    socket.on('recorrido_finalizado', handleFinalizado);
    return () => {
      socket.off('ubicacion_actualizada', handleUbicacion);
      socket.off('recorrido_finalizado', handleFinalizado);
      // Dejar la sala cuando el recorridoId cambia (nuevo recorrido) o el caché se limpia.
      // El hook useRouteSimulation NO emite esta señal para evitar desconectarse
      // al navegar a otro tab y volver.
      socket.emit('salir_de_recorrido', recorridoId);
    };
  }, [recorridoId]);

  const value = useMemo(
    () => ({ entry, setFromApi, updateSnapshot, clear }),
    [entry, setFromApi, updateSnapshot, clear]
  );

  return (
    <RecorridoMapCacheContext.Provider value={value}>
      {children}
    </RecorridoMapCacheContext.Provider>
  );
}

export function useRecorridoMapCache(): RecorridoMapCacheValue {
  const ctx = useContext(RecorridoMapCacheContext);
  if (!ctx) {
    throw new Error('useRecorridoMapCache debe usarse dentro de RecorridoMapCacheProvider');
  }
  return ctx;
}
