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
  stats: Partial<SimulationStats>;
}

export interface RecorridoCacheEntry {
  recorridoId: number;
  recorridoData: any;
  streetGeometry: MapLatLng[];
  snapshot: RecorridoSnapshot | null;
  isCompleted: boolean;
}

interface RecorridoMapCacheValue {
  entry: RecorridoCacheEntry | null;
  setFromApi: (recorridoId: number, data: any) => void;
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

  const setFromApi = useCallback((recorridoId: number, data: any) => {
    if (!data) return;
    setEntry((prev) => {
      const sameRecorrido = prev?.recorridoId === recorridoId;
      const incomingGeom = mapGeometria(data.geometria);
      const streetGeometry =
        incomingGeom.length >= 2
          ? incomingGeom
          : (sameRecorrido ? prev!.streetGeometry : []);
      return {
        recorridoId,
        recorridoData: data,
        streetGeometry,
        snapshot: sameRecorrido ? prev!.snapshot : null,
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

  useEffect(() => {
    if (!isAuthenticated) {
      clear();
    }
  }, [isAuthenticated, clear]);

  const activeRecorridoId = entry?.recorridoId ?? null;
  
  useEffect(() => {
    if (!activeRecorridoId) return;
    const socket = getMobileSocket();
    socket.emit('unirse_a_recorrido', activeRecorridoId);

    const handleUbicacion = (data: any) => {
      if (data.recorridoId !== activeRecorridoId) return;
      const lat = Number(data.latitud);
      const lng = Number(data.longitud);
      if (isNaN(lat) || isNaN(lng)) return;
      
      setEntry((prev) => {
        if (!prev || prev.recorridoId !== activeRecorridoId) return prev;
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

    const handleFinalizado = (data: any) => {
      if (data.recorridoId !== activeRecorridoId) return;
      setEntry((prev) => {
        if (!prev || prev.recorridoId !== activeRecorridoId) return prev;
        return { ...prev, isCompleted: true };
      });
    };

    socket.on('ubicacion_actualizada', handleUbicacion);
    socket.on('recorrido_finalizado', handleFinalizado);
    return () => {
      socket.off('ubicacion_actualizada', handleUbicacion);
      socket.off('recorrido_finalizado', handleFinalizado);
      socket.emit('salir_de_recorrido', activeRecorridoId);
    };
  }, [activeRecorridoId]);

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
