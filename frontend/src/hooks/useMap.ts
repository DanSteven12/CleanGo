import { useState, useEffect, useCallback } from 'react';
import { type Checkpoint, type RouteStats, mapService } from '../services/mapService';

const STORAGE_KEY = "cleanGoState";

export const useMap = () => {
  // Load persisted state
  const persisted = typeof window !== "undefined" ? JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") : {};
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(persisted.checkpoints ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(persisted.selectedId ?? null);
  const [stats, setStats] = useState<RouteStats>(persisted.stats ?? { totalDistanceKm: 0, estimatedTimeMinutes: 0 });
  const [routeName, setRouteName] = useState<string>(persisted.routeName ?? "Ruta Centro");
  const [routeDescription, setRouteDescription] = useState<string>(persisted.routeDescription ?? "Centro de Ocosingo");
  const [routeZone, setRouteZone] = useState<string>(persisted.routeZone ?? "Centro Ocosingo");

  // Persist state on any change
  useEffect(() => {
    const data = {
      checkpoints,
      selectedId,
      stats,
      routeName,
      routeDescription,
      routeZone,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [checkpoints, selectedId, stats, routeName, routeDescription, routeZone]);

  // Auto‑calculate stats when checkpoints change
  useEffect(() => {
    const updatedStats = mapService.calculateRouteStats(checkpoints);
    setStats(updatedStats);
  }, [checkpoints]);

  const selectCheckpoint = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const addCheckpoint = useCallback((checkpoint: Omit<Checkpoint, 'id'>) => {
    const newCheckpoint: Checkpoint = { ...checkpoint, id: Date.now().toString(), obligatorio: true };
    setCheckpoints(prev => [...prev, newCheckpoint]);
    setSelectedId(newCheckpoint.id);
  }, []);

  const removeCheckpoint = useCallback((id: string) => {
    setCheckpoints(prev => prev.filter(cp => cp.id !== id));
    setSelectedId(prev => (prev === id ? null : prev));
  }, []);

  // Toggle mandatory flag for a checkpoint
  const toggleCheckpointMandatory = useCallback((id: string) => {
    setCheckpoints(prev =>
      prev.map(cp => (cp.id === id ? { ...cp, obligatorio: !cp.obligatorio } : cp))
    );
  }, []);

  const updateCheckpointStatus = useCallback((id: string, status: Checkpoint['status']) => {
    setCheckpoints(prev =>
      prev.map(cp => (cp.id === id ? { ...cp, status } : cp))
    );
  }, []);

  const optimizeRouteOrder = useCallback(() => {
    setCheckpoints(prev => mapService.optimizeRoute(prev));
  }, []);

  const resetRoute = useCallback(() => {
    setCheckpoints([]);
    setSelectedId(null);
    setRouteName("Ruta Centro");
    setRouteDescription("Centro de Ocosingo");
  }, []);

  return {
    checkpoints,
    selectedId,
    stats,
    routeName,
    routeDescription,
    routeZone,
    selectCheckpoint,
    addCheckpoint,
    removeCheckpoint,
    updateCheckpointStatus,
    toggleCheckpointMandatory,
    optimizeRouteOrder,
    resetRoute,
    setRouteZone,
    setRouteName,
    setRouteDescription,
    // Alias for status update to match Sidebar prop
    onUpdateCheckpointStatus: updateCheckpointStatus,
  };
};
