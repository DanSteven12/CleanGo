import { useState, useEffect, useCallback, useRef } from 'react';
import { getMobileSocket } from '../services/socketService';

export interface Checkpoint {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
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
  recorridoId: number | null;
  checkpoints: Checkpoint[];
  horaInicio?: string | null;
  rutaId?: number;
}

export function useRouteSimulation({
  recorridoId,
  checkpoints,
  horaInicio,
}: UseRouteSimulationProps) {
  const [currentPosition, setCurrentPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [stats, setStats] = useState<SimulationStats>({
    ultimoCheckpoint: 'Inicio',
    proximoCheckpoint: 'Calculando...',
    completados: checkpoints.length > 0 ? 1 : 0,
    pendientes: Math.max(0, checkpoints.length - (checkpoints.length > 0 ? 1 : 0)),
    porcentajeAvance: 0,
    etaSegundos: 0,
    horaEstimada: '--:--',
    tiempoTranscurrido: '00:00:00',
    estadoDinamico: 'En Progreso',
  });

  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (horaInicio) {
      const parsed = new Date(horaInicio).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        startTimeRef.current = parsed;
      }
    }
  }, [horaInicio]);

  // Posición inicial
  useEffect(() => {
    if (checkpoints && checkpoints.length > 0 && !currentPosition) {
      const first = checkpoints[0];
      setCurrentPosition({
        latitude: Number(first.latitud),
        longitude: Number(first.longitud),
      });
    }
  }, [checkpoints]);

  const formatElapsedTime = useCallback((startMs: number) => {
    const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Timer local para el reloj de "tiempo transcurrido" en pantalla
  useEffect(() => {
    if (!recorridoId || isCompleted) return;
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        tiempoTranscurrido: formatElapsedTime(startTimeRef.current),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [recorridoId, isCompleted, formatElapsedTime]);

  // Suscripción al Socket del Backend
  useEffect(() => {
    if (!recorridoId) return;

    const socket = getMobileSocket();
    // Nos unimos a la sala del recorrido
    socket.emit('unirse_a_recorrido', recorridoId);

    const handleUbicacion = (data: any) => {
      if (data.recorridoId !== recorridoId) return;

      if (typeof data.latitud === 'number' && typeof data.longitud === 'number') {
        setCurrentPosition({ latitude: data.latitud, longitude: data.longitud });
      }

      if (data.velocidad) {
        setSpeedMultiplier(data.velocidad);
      }

      setStats((prev) => ({
        ...prev,
        ultimoCheckpoint: data.ultimoCheckpoint || prev.ultimoCheckpoint,
        proximoCheckpoint: data.proximoCheckpoint || prev.proximoCheckpoint,
        completados: data.completados ?? prev.completados,
        pendientes: data.pendientes ?? prev.pendientes,
        porcentajeAvance: data.porcentajeAvance ?? prev.porcentajeAvance,
        etaSegundos: data.etaSegundos ?? prev.etaSegundos,
        horaEstimada: data.horaEstimada || prev.horaEstimada,
        estadoDinamico: data.estadoDinamico || prev.estadoDinamico,
        tiempoTranscurrido: formatElapsedTime(startTimeRef.current), // actualizar con la hora real
      }));
    };

    const handleFinalizado = (data: any) => {
      if (data.recorridoId !== recorridoId) return;
      setIsCompleted(true);
      setStats((prev) => ({
        ...prev,
        ultimoCheckpoint: data.ultimoCheckpoint || prev.ultimoCheckpoint,
        proximoCheckpoint: data.proximoCheckpoint || prev.proximoCheckpoint,
        completados: data.completados ?? prev.completados,
        pendientes: data.pendientes ?? prev.pendientes,
        porcentajeAvance: data.porcentajeAvance ?? prev.porcentajeAvance,
        etaSegundos: data.etaSegundos ?? prev.etaSegundos,
        horaEstimada: data.horaEstimada || prev.horaEstimada,
        estadoDinamico: data.estadoDinamico || prev.estadoDinamico,
      }));
    };

    const handleVelocidad = (data: any) => {
      if (data.recorridoId !== recorridoId) return;
      if (data.velocidad) {
        setSpeedMultiplier(data.velocidad);
      }
    };

    socket.on('ubicacion_actualizada', handleUbicacion);
    socket.on('recorrido_finalizado', handleFinalizado);
    socket.on('velocidad_simulacion_actualizada', handleVelocidad);

    return () => {
      // No emitir 'salir_de_recorrido': el RecorridoMapCacheProvider mantiene
      // la sala activa mientras el recorrido está en progreso, incluso cuando
      // el mapa se desmonta al navegar a otro tab. La sala solo se abandona
      // cuando el caché se limpia (cache.clear()) al finalizar el recorrido.
      socket.off('ubicacion_actualizada', handleUbicacion);
      socket.off('recorrido_finalizado', handleFinalizado);
      socket.off('velocidad_simulacion_actualizada', handleVelocidad);
    };
  }, [recorridoId, formatElapsedTime]);

  return {
    currentPosition,
    speedMultiplier,
    setSpeedMultiplier,
    isCompleted,
    stats,
  };
}
