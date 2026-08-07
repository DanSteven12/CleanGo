import React, { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { getSocket } from '../../services/socketService';
import type { LiveStats } from '../../hooks/useLiveMapData';
import { fetchRouteGeometry } from '../../utils/mapUtils';

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

const getBearing = (start: {lat: number; lng: number}, end: {lat: number; lng: number}) => {
  const startLat = (start.lat * Math.PI) / 180;
  const startLng = (start.lng * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;
  const endLng = (end.lng * Math.PI) / 180;
  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

const lerpBearing = (start: number, end: number, t: number) => {
  let delta = end - start;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return start + delta * t;
};

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

  const truckIconRef = useRef<HTMLImageElement | null>(null);
  const animationIntervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPosRef = useRef<{lat: number; lng: number} | null>(null);
  const targetPosRef = useRef<{lat: number; lng: number} | null>(null);
  const currentBearingRef = useRef<number>(0);
  const targetBearingRef = useRef<number>(0);

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
      iconImg.style.transition = 'none'; // Evitar conflictos CSS con LERP

      truckIconRef.current = iconImg;

      truckDiv.appendChild(pulseDiv);
      truckDiv.appendChild(iconImg);

      camionMarkerRef.current = new markerLib.AdvancedMarkerElement({
        position: initialPos, map, title: 'Camión',
        content: truckDiv,
        zIndex: 999
      });
      currentPosRef.current = initialPos;
    } else if (camionMarkerRef.current && !isNaN(initialPos.lat)) {
      camionMarkerRef.current.position = initialPos; // AdvancedMarkerElement usa .position
      currentPosRef.current = initialPos;
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
      if (animationIntervalId.current) {
        clearInterval(animationIntervalId.current);
      }
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

    // Animación continua mediante persecución suave (chase algorithm)
    const startAnimationLoop = () => {
      if (animationIntervalId.current) return;
      
      animationIntervalId.current = setInterval(() => {
        if (!currentPosRef.current || !targetPosRef.current || !camionMarkerRef.current) return;
        
        // Factor de suavizado (0.05 = 5% de la distancia restante por cada frame de 50ms)
        // Esto crea un movimiento continuo y fluido que nunca se detiene bruscamente.
        const LERP_FACTOR = 0.05;

        const lat = lerp(currentPosRef.current.lat, targetPosRef.current.lat, LERP_FACTOR);
        const lng = lerp(currentPosRef.current.lng, targetPosRef.current.lng, LERP_FACTOR);
        
        currentPosRef.current = { lat, lng };
        camionMarkerRef.current.position = currentPosRef.current;

        if (truckIconRef.current) {
          const bearing = lerpBearing(currentBearingRef.current, targetBearingRef.current, LERP_FACTOR);
          currentBearingRef.current = bearing;
          truckIconRef.current.style.transform = `rotate(${bearing}deg)`;
        }
      }, 50); // 20 FPS (suficiente para un mapa sin saturar el hilo principal)
    };

    const updateMarkerPosition = (newPos: {lat: number; lng: number}) => {
      if (!currentPosRef.current) {
        // Primera ubicación
        currentPosRef.current = newPos;
        targetPosRef.current = newPos;
        if (camionMarkerRef.current) camionMarkerRef.current.position = newPos;
        startAnimationLoop();
        return;
      }

      // Calculamos hacia dónde debe mirar el camión basado en su posición actual y el nuevo destino
      const newBearing = getBearing(currentPosRef.current, newPos);
      const distLat = Math.abs(currentPosRef.current.lat - newPos.lat);
      const distLng = Math.abs(currentPosRef.current.lng - newPos.lng);
      
      const isSignificantMove = distLat > 0.000005 || distLng > 0.000005;
      if (isSignificantMove) {
          targetBearingRef.current = newBearing;
      }

      // Simplemente actualizamos el target. El setInterval se encargará de perseguirlo suavemente.
      targetPosRef.current = newPos;
    };

    const handleUbicacion = (data: any) => {
      if (data.recorridoId !== recorridoId) return;

      const currentPos = { lat: Number(data.latitud), lng: Number(data.longitud) };

      if (progressPolylineRef.current && fullPathRef.current.length > 0) {
        // Encontrar el punto más cercano SOBRE la geometría real de calles
        const geom = fullPathRef.current;
        const closestIdx = findClosestPointIndex(geom, currentPos, lastIdxRef.current, 150);
        lastIdxRef.current = closestIdx;

        // Posicionar el camión de forma animada (LERP + requestAnimationFrame)
        updateMarkerPosition(geom[closestIdx]);

        progressPolylineRef.current.traveled.setPath(geom.slice(0, closestIdx + 1));
        progressPolylineRef.current.remaining.setPath(geom.slice(closestIdx));
      } else if (camionMarkerRef.current) {
        // Fallback: usar coordenadas brutas mientras la geometría de calles carga
        updateMarkerPosition(currentPos);
      }

      onStatsUpdateRef.current(recorridoId, data);
    };

    const handleFinalizado = (data: any) => {
      if (data.recorridoId !== recorridoId) return;
      if (fullPathRef.current.length > 0 && camionMarkerRef.current) {
        const geom = fullPathRef.current;
        const lastPos = geom[geom.length - 1];
        updateMarkerPosition(lastPos);
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
