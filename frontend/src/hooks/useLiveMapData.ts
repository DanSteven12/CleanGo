import { useState, useCallback, useEffect, useRef } from 'react';
import type { AsignacionRecord } from '../types/routes';
import { getSocket } from '../services/socketService';

const ETA_MINUTES_PER_SEGMENT = 5;

export interface LiveStats {
  ultimoCheckpoint: string;
  proximoCheckpoint: string;
  completados: number;
  pendientes: number;
  porcentajeAvance: number;
  etaSegundos: number;
  horaEstimada: string;
  estadoDinamico: 'Pendiente' | 'En Progreso' | 'Retrasado' | 'Completado';
}

export const useLiveMapData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeRecorridos, setActiveRecorridos] = useState<any[]>([]);
  const [activeAsignaciones, setActiveAsignaciones] = useState<Record<number, AsignacionRecord>>({});
  const [statsMap, setStatsMap] = useState<Record<number, LiveStats>>({});
  const recorridosCompletadosRef = useRef<Set<number>>(new Set());

  const fetchActiveRoutes = useCallback(async () => {
    try {
      const res = await fetch('/api/asignaciones');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AsignacionRecord[] = await res.json();

      const activeAsigs = data.filter(a => a.estatus_recorrido === 'En Progreso' || a.estatus_recorrido === 'En progreso');

      const loadedRecorridos: any[] = [];
      const asigMap: Record<number, AsignacionRecord> = {};
      const newStatsMap: Record<number, LiveStats> = {};
      const now = Date.now();

      await Promise.all(activeAsigs.map(async (asig) => {
        try {
          const recRes = await fetch(`/api/recorridos/activo/${asig.id}`);
          if (recRes.ok) {
            const recData = await recRes.json();
            const recorridoId = recData.recorrido_id;
            loadedRecorridos.push(recData);
            asigMap[recorridoId] = asig;

            const completadosCount = recData.checkpoints?.filter((c: any) => c.estado === 'Completado').length || (recData.checkpoints?.length > 0 ? 1 : 0);
            const totalCps = recData.checkpoints?.length || 1;
            const pendientesCount = Math.max(0, totalCps - completadosCount);
            const totalSegmentos = Math.max(0, totalCps - 1);
            const etaInicialMs = pendientesCount * ETA_MINUTES_PER_SEGMENT * 60 * 1000;
            const etaInicialSecs = Math.floor(etaInicialMs / 1000);
            const horaLlegadaInicial = new Date(now + etaInicialMs).toLocaleTimeString();

            const isCompleted = completadosCount === totalCps && totalCps > 0;
            const porcentaje = totalSegmentos > 0 ? Math.min(Math.round(((completadosCount - (totalCps > 0 ? 1 : 0)) / totalSegmentos) * 100), 100) : (isCompleted ? 100 : 0);

            newStatsMap[recorridoId] = {
              ultimoCheckpoint: recData.checkpoints?.[0]?.nombre || 'Base / Salida',
              proximoCheckpoint: recData.checkpoints?.[1]?.nombre || 'Iniciando...',
              completados: completadosCount,
              pendientes: pendientesCount,
              porcentajeAvance: isCompleted ? 100 : porcentaje,
              etaSegundos: isCompleted ? 0 : etaInicialSecs,
              horaEstimada: horaLlegadaInicial,
              estadoDinamico: isCompleted ? 'Completado' : 'En Progreso'
            };
          }
        } catch (err) {
          console.error(`Error loading active route for asignacion ${asig.id}:`, err);
        }
      }));

      setActiveRecorridos(loadedRecorridos);
      setActiveAsignaciones(asigMap);
      setStatsMap(prev => {
        const merged: Record<number, LiveStats> = { ...prev };
        for (const [id, st] of Object.entries(newStatsMap)) {
          const numId = Number(id);
          if (!merged[numId] || merged[numId].estadoDinamico === 'Completado') {
            merged[numId] = st;
          }
        }
        return merged;
      });
    } catch (e) {
      console.error('[useLiveMapData] fetchActiveRoutes:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveRoutes();
  }, [fetchActiveRoutes]);

  useEffect(() => {
    const socket = getSocket();

    const handleNuevoRecorrido = () => fetchActiveRoutes();
    const handleRecorridoFinalizadoGlobal = () => fetchActiveRoutes();
    const handleCheckpointGlobal = () => fetchActiveRoutes();

    socket.on('nuevo_recorrido_iniciado', handleNuevoRecorrido);
    socket.on('recorrido_finalizado', handleRecorridoFinalizadoGlobal);
    socket.on('checkpoint_actualizado', handleCheckpointGlobal);
    socket.on('checkpoint_alcanzado', handleCheckpointGlobal);

    return () => {
      socket.off('nuevo_recorrido_iniciado', handleNuevoRecorrido);
      socket.off('recorrido_finalizado', handleRecorridoFinalizadoGlobal);
      socket.off('checkpoint_actualizado', handleCheckpointGlobal);
      socket.off('checkpoint_alcanzado', handleCheckpointGlobal);
    };
  }, [fetchActiveRoutes]);

  const handleStatsUpdate = useCallback((recorridoId: number, newStats: LiveStats) => {
    if (recorridosCompletadosRef.current.has(recorridoId)) return;

    const isCompleted = newStats.estadoDinamico === 'Completado' || 
                        newStats.porcentajeAvance >= 100 || 
                        (newStats.pendientes === 0 && newStats.completados > 0);

    if (isCompleted) {
      recorridosCompletadosRef.current.add(recorridoId);
      setStatsMap(prev => ({
        ...prev,
        [recorridoId]: {
          ...newStats,
          porcentajeAvance: 100,
          completados: newStats.completados,
          pendientes: 0,
          etaSegundos: 0,
          horaEstimada: new Date().toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
          }),
          estadoDinamico: 'Completado'
        }
      }));
      return;
    }

    setStatsMap(prev => ({ ...prev, [recorridoId]: newStats }));
  }, []);

  return {
    isLoading,
    activeRecorridos,
    activeAsignaciones,
    statsMap,
    handleStatsUpdate
  };
};
