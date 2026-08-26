import { useRecorridoMapCache } from '../contexts/RecorridoMapCache';

export interface Checkpoint {
  id: number;
  nombre: string;
  latitud: number | string;
  longitud: number | string;
  orden: number;
}

export interface SimulationStats {
  ultimoCheckpoint: string;
  proximoCheckpoint: string;
  completados: number;
  pendientes: number;
  porcentajeAvance: number;
  etaSegundos: number;
  horaEstimada: string;
  tiempoTranscurrido: string;
  estadoDinamico: 'En Progreso' | 'Retrasado' | 'Completado';
}

interface UseRouteSimulationProps {
  checkpoints: Checkpoint[];
}

export function useRouteSimulation({ checkpoints }: UseRouteSimulationProps) {
  const cache = useRecorridoMapCache();
  const snapshot = cache.entry?.snapshot;

  const currentPosition = snapshot
    ? { latitude: snapshot.latitude, longitude: snapshot.longitude }
    : checkpoints.length > 0
    ? { latitude: Number(checkpoints[0].latitud), longitude: Number(checkpoints[0].longitud) }
    : null;

  const isCompleted = cache.entry?.isCompleted ?? false;

  const fallbackCompletados = checkpoints.length > 0 ? 1 : 0;
  const fallbackPendientes = Math.max(0, checkpoints.length - fallbackCompletados);

  const stats: SimulationStats = {
    ultimoCheckpoint: snapshot?.stats?.ultimoCheckpoint ?? 'Inicio',
    proximoCheckpoint: snapshot?.stats?.proximoCheckpoint ?? 'Calculando...',
    completados: snapshot?.stats?.completados ?? fallbackCompletados,
    pendientes: snapshot?.stats?.pendientes ?? fallbackPendientes,
    porcentajeAvance: snapshot?.stats?.porcentajeAvance ?? (snapshot?.porcentajeAvance ?? 0),
    etaSegundos: snapshot?.stats?.etaSegundos ?? 0,
    horaEstimada: snapshot?.stats?.horaEstimada ?? '--:--',
    tiempoTranscurrido: snapshot?.stats?.tiempoTranscurrido ?? '00:00:00', // Now it's just static or retrieved from backend since it's removed from UI anyway
    estadoDinamico: snapshot?.stats?.estadoDinamico ?? 'En Progreso',
  };

  return {
    currentPosition,
    isCompleted,
    stats,
  };
}
