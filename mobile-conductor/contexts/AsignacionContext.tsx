import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { recorridosService } from '../services/recorridosService';
import { getAsignacionActual } from '../services/camionService';
import type { AsignacionActual } from '../services/camionService';
import { useAuth } from './AuthContext';

interface AsignacionContextData {
  asignaciones: any[];
  asignacionActual: AsignacionActual | null;
  isLoading: boolean;
  isRefreshing: boolean;
  /** Actualiza las asignaciones y la asignación actual en paralelo */
  refreshData: (showRefreshIndicator?: boolean) => Promise<void>;
  /** Limpia el estado interno (útil al hacer logout) */
  clearData: () => void;
}

const AsignacionContext = createContext<AsignacionContextData | undefined>(undefined);

export function AsignacionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, camion } = useAuth();
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [asignacionActual, setAsignacionActual] = useState<AsignacionActual | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAsignacionesData = useCallback(async () => {
    try {
      const data = await recorridosService.getAsignaciones();
      if (Array.isArray(data)) {
        const filtradas = data.filter((a: any) => {
          // Asegurar que pertenezca al camión autenticado
          if (camion?.camion_id && a.camion_id && a.camion_id !== camion.camion_id) {
            return false;
          }
          if (camion?.numero_economico && a.numero_economico && a.numero_economico !== camion.numero_economico) {
            return false;
          }
          if (!a.estatus_recorrido) return true;
          const estatus = a.estatus_recorrido.toString().toLowerCase().trim();
          return (
            estatus === 'pendiente' ||
            estatus === 'en progreso' ||
            estatus === 'en_progreso'
          );
        });
        setAsignaciones(filtradas);
      } else {
        setAsignaciones([]);
      }
    } catch (error) {
      console.error('Error al cargar asignaciones:', error);
      setAsignaciones([]);
    }
  }, [camion?.camion_id, camion?.numero_economico]);

  const fetchAsignacionActualData = useCallback(async () => {
    try {
      const data = await getAsignacionActual();
      setAsignacionActual(data);
    } catch (error) {
      console.error('Error al cargar asignación actual:', error);
      setAsignacionActual(null);
    }
  }, []);

  const refreshData = useCallback(async (showRefreshIndicator = true) => {
    if (!isAuthenticated) return;
    
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }

    try {
      // Ejecutar en paralelo para mayor rapidez
      await Promise.all([
        fetchAsignacionesData(),
        fetchAsignacionActualData(),
      ]);
    } catch (err) {
      console.error('[AsignacionContext] Error al actualizar datos:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchAsignacionesData, fetchAsignacionActualData, isAuthenticated]);

  const clearData = useCallback(() => {
    setAsignaciones([]);
    setAsignacionActual(null);
  }, []);

  // Cargar datos iniciales al autenticarse
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      refreshData(false); // No mostrar el refresh de UI en la carga inicial
    } else {
      // Limpiar datos Y bajar isLoading para que las pantallas no queden
      // mostrando el spinner si la sesión se invalida o al hacer logout.
      clearData();
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshData, clearData]);

  return (
    <AsignacionContext.Provider
      value={{
        asignaciones,
        asignacionActual,
        isLoading,
        isRefreshing,
        refreshData,
        clearData,
      }}
    >
      {children}
    </AsignacionContext.Provider>
  );
}

export function useAsignacionGlobal(): AsignacionContextData {
  const context = useContext(AsignacionContext);
  if (context === undefined) {
    throw new Error('useAsignacionGlobal debe usarse dentro de un AsignacionProvider');
  }
  return context;
}
