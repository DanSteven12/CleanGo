import React, { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { getSocket } from '../../services/socketService';
import type { LiveStats } from '../../hooks/useLiveMapData';
import { fetchRouteGeometry } from '../../utils/mapUtils';

function findClosestPointIndex(path: {lat: number; lng: number}[], pos: {lat: number; lng: number}, startIndex: number, searchWindow = 200): number {
  if (path.length === 0) return 0;
  let minDistance = Infinity;
  let bestIndex = startIndex;
  const endIndex = Math.min(path.length, startIndex + searchWindow);
  
  for (let i = Math.max(0, startIndex - 50); i < endIndex; i++) {
    const p = path[i];
    const dx = p.lat - pos.lat;
    const dy = p.lng - pos.lng;
    const dist = dx * dx + dy * dy;
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
}

interface LiveMapSimulationProps {
  checkpoints: any[];
  color?: string;
  recorridoId: number;
  onStatsUpdate: (recorridoId: number, stats: LiveStats) => void;
}

export const LiveMapSimulation: React.FC<LiveMapSimulationProps> = React.memo(({ checkpoints, color, recorridoId, onStatsUpdate }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const markerLib = useMapsLibrary('marker');

  const camionMarkerRef = useRef<any>(null);
  const progressPolylineRef = useRef<{ traveled: any; remaining: any } | null>(null);
  const fullPathRef = useRef<{lat: number; lng: number}[]>([]);
  const lastIdxRef = useRef<number>(0);

  const onStatsUpdateRef = useRef(onStatsUpdate);
  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate;
  }, [onStatsUpdate]);

  // Effect para dibujar el mapa estático y los checkpoints (solo 1 vez)
  useEffect(() => {
    if (!map || !mapsLib || !markerLib || checkpoints.length === 0) return;
    let isActive = true;

    const googleMaps = (window as any).google.maps;
    const bounds = new googleMaps.LatLngBounds();
    const checkpointCoords: any[] = [];
    const markers: any[] = [];

    checkpoints.forEach((cp: any) => {
      const lat = Number(cp.latitud);
      const lng = Number(cp.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const latLng = { lat, lng };
      bounds.extend(latLng);
      checkpointCoords.push(latLng);

      const marker = new googleMaps.Marker({
        position: latLng,
        map,
        title: cp.nombre || `Checkpoint ${cp.orden}`
      });
      markers.push(marker);
    });

    if (checkpointCoords.length > 0) {
      map.fitBounds(bounds);
    }

    const routeColor = color || '#6366f1';
    
    const polylineTraveled = new googleMaps.Polyline({
      path: [], geodesic: true, strokeColor: routeColor,
      strokeOpacity: 1.0, strokeWeight: 5, zIndex: 2, map
    });

    const polylineRemaining = new googleMaps.Polyline({
      path: [], geodesic: true, strokeColor: routeColor,
      strokeOpacity: 0.3, strokeWeight: 4, zIndex: 1, map
    });

    progressPolylineRef.current = { traveled: polylineTraveled, remaining: polylineRemaining };

    const completedCount = checkpoints.filter((cp: any) => cp.estado === 'Completado').length;
    const lastCompletedCp = completedCount > 0 ? checkpoints[completedCount - 1] : checkpoints[0];
    const initialPos = { lat: Number(lastCompletedCp?.latitud), lng: Number(lastCompletedCp?.longitud) };

    if (!camionMarkerRef.current && !isNaN(initialPos.lat)) {
      const truckDiv = document.createElement('div');
      // Contenedor principal para el marcador
      truckDiv.style.width = '36px';
      truckDiv.style.height = '36px';
      truckDiv.style.display = 'flex';
      truckDiv.style.alignItems = 'center';
      truckDiv.style.justifyContent = 'center';
      
      // Elemento de fondo con la animación pulse-dot
      const pulseDiv = document.createElement('div');
      pulseDiv.className = 'pulse-dot';
      pulseDiv.style.position = 'absolute';
      pulseDiv.style.width = '24px';
      pulseDiv.style.height = '24px';
      pulseDiv.style.borderRadius = '50%';
      pulseDiv.style.backgroundColor = 'rgba(23, 99, 166, 0.2)'; // Color base sutil
      pulseDiv.style.color = 'rgba(23, 99, 166, 0.5)'; // Color para el boxShadow de pulse-ring
      
      // Icono de camión por encima del pulso
      const iconImg = document.createElement('img');
      iconImg.src = 'https://maps.google.com/mapfiles/kml/shapes/truck.png';
      iconImg.style.width = '24px';
      iconImg.style.height = '24px';
      iconImg.style.position = 'relative';
      iconImg.style.zIndex = '1';

      truckDiv.appendChild(pulseDiv);
      truckDiv.appendChild(iconImg);

      camionMarkerRef.current = new markerLib.AdvancedMarkerElement({
        position: initialPos, map, title: 'Camión',
        content: truckDiv,
        zIndex: 999
      });
    } else if (camionMarkerRef.current && !isNaN(initialPos.lat)) {
      camionMarkerRef.current.position = initialPos; // AdvancedMarkerElement usa .position
    }

    // Obtener y aplicar la geometría real de las calles
    fetchRouteGeometry(checkpointCoords).then(geom => {
      if (!isActive) return;
      fullPathRef.current = geom;
      
      let closestIdx = 0;
      if (!isNaN(initialPos.lat)) {
        closestIdx = findClosestPointIndex(geom, initialPos, 0, geom.length);
        lastIdxRef.current = closestIdx;
      }
      
      polylineTraveled.setPath(geom.slice(0, closestIdx + 1));
      polylineRemaining.setPath(geom.slice(closestIdx));
    });

    return () => {
      isActive = false;
      if (progressPolylineRef.current) {
        progressPolylineRef.current.traveled.setMap(null);
        progressPolylineRef.current.remaining.setMap(null);
        progressPolylineRef.current = null;
      }
      markers.forEach((m: any) => m.setMap(null));

      if (camionMarkerRef.current) {
        camionMarkerRef.current.map = null; // AdvancedMarkerElement usa .map = null
        camionMarkerRef.current = null;
      }
    };
  }, [map, mapsLib, markerLib, checkpoints, color]);

  // Effect para manejar la conexión WebSocket en tiempo real
  useEffect(() => {
    if (!map || !mapsLib || checkpoints.length === 0) return;

    const socket = getSocket();

    // Conectar a la sala específica del recorrido
    socket.emit('unirse_a_recorrido', recorridoId);

    const handleUbicacion = (data: any) => {
      if (data.recorridoId !== recorridoId) return;

      const currentPos = { lat: Number(data.latitud), lng: Number(data.longitud) };

      if (camionMarkerRef.current) {
        camionMarkerRef.current.position = currentPos;
      }

      if (progressPolylineRef.current && fullPathRef.current.length > 0) {
        const geom = fullPathRef.current;
        const closestIdx = findClosestPointIndex(geom, currentPos, lastIdxRef.current, 150);
        lastIdxRef.current = closestIdx;
        
        progressPolylineRef.current.traveled.setPath(geom.slice(0, closestIdx + 1));
        progressPolylineRef.current.remaining.setPath(geom.slice(closestIdx));
      }

      onStatsUpdateRef.current(recorridoId, data);
    };

    const handleFinalizado = (data: any) => {
      if (data.recorridoId !== recorridoId) return;
      if (fullPathRef.current.length > 0 && camionMarkerRef.current) {
        const geom = fullPathRef.current;
        const lastPos = geom[geom.length - 1];
        camionMarkerRef.current.position = lastPos;
        if (progressPolylineRef.current) {
          progressPolylineRef.current.traveled.setPath(geom);
          progressPolylineRef.current.remaining.setPath([lastPos]);
        }
      }
      onStatsUpdateRef.current(recorridoId, data);
    };

    socket.on('ubicacion_actualizada', handleUbicacion);
    socket.on('recorrido_finalizado', handleFinalizado);

    return () => {
      socket.emit('salir_de_recorrido', recorridoId);
      socket.off('ubicacion_actualizada', handleUbicacion);
      socket.off('recorrido_finalizado', handleFinalizado);
    };
  }, [map, mapsLib, recorridoId, checkpoints]);

  return null;
});
