import React, { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { getSocket } from '../../services/socketService';
import type { LiveStats } from '../../hooks/useLiveMapData';
import { fetchRouteGeometry, buildCumulativeDistances, interpolateOnPath } from '../../utils/mapUtils';

// ─── Helpers geométricos ──────────────────────────────────────────────────────

/**
 * Bearing geodésico entre dos puntos. Resultado en [0, 360).
 */
const getBearing = (start: { lat: number; lng: number }, end: { lat: number; lng: number }): number => {
  const startLat = (start.lat * Math.PI) / 180;
  const startLng = (start.lng * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;
  const endLng = (end.lng * Math.PI) / 180;
  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

/**
 * Interpolación de ángulo tomando siempre el camino más corto.
 * Elimina el bug de 359° → 0° que da una vuelta completa.
 */
const lerpBearing = (from: number, to: number, t: number): number => {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return from + delta * t;
};

/**
 * Calcula el heading usando los puntos vecinos de la geometría real (lookahead).
 * Esto es superior al bearing entre posiciones del socket porque:
 * - usa la dirección REAL de la calle, no el vector entre dos ticks ruidosos
 * - no vibra cuando el socket envía la misma coordenada varias veces
 */
const getHeadingFromGeometry = (
  path: { lat: number; lng: number }[],
  idx: number,
  lookahead = 4
): number => {
  const n = path.length;
  if (n < 2) return 0;

  let targetIdx = Math.min(idx + lookahead, n - 1);
  while (targetIdx > idx) {
    const dx = path[targetIdx].lat - path[idx].lat;
    const dy = path[targetIdx].lng - path[idx].lng;
    if (dx * dx + dy * dy > 1e-12) break;
    targetIdx--;
  }

  if (targetIdx === idx && idx > 0) {
    return getBearing(path[idx - 1], path[idx]);
  }
  return getBearing(path[idx], path[targetIdx]);
};

/**
 * Índice del punto más cercano en `path` a `pos`, con ventana de búsqueda.
 * Monotónico: no retrocede más allá de `back` posiciones.
 */
function findClosestPointIndex(
  path: { lat: number; lng: number }[],
  pos: { lat: number; lng: number },
  startIndex: number,
  back = 10,
  forward = 150
): number {
  if (path.length === 0) return 0;
  const lo = Math.max(0, startIndex - back);
  const hi = Math.min(path.length - 1, startIndex + forward);
  let minDist = Infinity;
  let bestIndex = startIndex;
  for (let i = lo; i <= hi; i++) {
    const p = path[i];
    const dx = p.lat - pos.lat;
    const dy = p.lng - pos.lng;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
}

// ─── Constante de tick (debe coincidir con TICK_RATE_MS del backend) ──────────
const TICK_MS = 1000;

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface LiveMapSimulationProps {
  checkpoints: any[];
  color?: string;
  recorridoId: number;
  onStatsUpdate: (recorridoId: number, stats: LiveStats) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const LiveMapSimulation: React.FC<LiveMapSimulationProps> = React.memo(
  ({ checkpoints, color, recorridoId, onStatsUpdate }) => {
    const map = useMap();
    const mapsLib = useMapsLibrary('maps');
    const markerLib = useMapsLibrary('marker');

    // ── Refs de mapa/marker ────────────────────────────────────────────────────
    const camionMarkerRef = useRef<any>(null);
    const progressPolylineRef = useRef<{ traveled: any; remaining: any } | null>(null);
    const fullPathRef = useRef<{ lat: number; lng: number }[]>([]);
    const cumDistancesRef = useRef<number[]>([]);
    const lastIdxRef = useRef<number>(0);
    const truckIconRef = useRef<HTMLImageElement | null>(null);

    // ── Refs de animación (interpolación lineal basada en tiempo) ─────────────
    // NO usamos setInterval — todo corre en el loop de requestAnimationFrame.
    //
    // Cuando llega un tick del socket guardamos:
    //   startPos / startHeading : posición animada en ese instante
    //   targetPos / targetHeading: nueva posición objetivo
    //   tickStartTime            : timestamp del instante en que llegó el tick
    //
    // En cada frame calculamos:
    //   progress = clamp( (now - tickStartTime) / TICK_MS , 0, 1 )
    //   animPos  = lerp(startPos, targetPos, progress)
    //
    // Esto garantiza que el camión llegue exactamente al destino en TICK_MS ms,
    // sin pausas, sin saltos, sin importar la velocidad configurada en el backend.
    const startPosRef = useRef<{ lat: number; lng: number } | null>(null);
    const startHeadingRef = useRef<number>(0);
    const targetPosRef = useRef<{ lat: number; lng: number } | null>(null);
    const targetHeadingRef = useRef<number>(0);
    const tickStartTimeRef = useRef<number>(0);
    const animPosRef = useRef<{ lat: number; lng: number } | null>(null);
    const animHeadingRef = useRef<number>(0);
    const startPercentageRef = useRef<number>(0);
    const targetPercentageRef = useRef<number>(0);
    const animPercentageRef = useRef<number>(0);
    const rafIdRef = useRef<number>(0);
    const isFirstTickRef = useRef<boolean>(true);

    const onStatsUpdateRef = useRef(onStatsUpdate);
    useEffect(() => {
      onStatsUpdateRef.current = onStatsUpdate;
    }, [onStatsUpdate]);

    // ── Effect 1: inicialización estática del mapa (una sola vez) ─────────────
    useEffect(() => {
      if (!map || !mapsLib || !markerLib || checkpoints.length === 0) return;
      let isActive = true;

      const googleMaps = (window as any).google.maps;
      const bounds = new googleMaps.LatLngBounds();
      const checkpointCoords: { lat: number; lng: number }[] = [];
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
          title: cp.nombre || `Checkpoint ${cp.orden}`,
        });
        markers.push(marker);
      });

      if (checkpointCoords.length > 0) {
        map.fitBounds(bounds);
      }

      const routeColor = color || '#6366f1';

      const polylineTraveled = new googleMaps.Polyline({
        path: [], geodesic: true, strokeColor: routeColor,
        strokeOpacity: 1.0, strokeWeight: 5, zIndex: 2, map,
      });
      const polylineRemaining = new googleMaps.Polyline({
        path: [], geodesic: true, strokeColor: routeColor,
        strokeOpacity: 0.3, strokeWeight: 4, zIndex: 1, map,
      });
      progressPolylineRef.current = { traveled: polylineTraveled, remaining: polylineRemaining };

      // Posición inicial: último checkpoint completado
      const completedCount = checkpoints.filter((cp: any) => cp.estado === 'Completado').length;
      const lastCompletedCp = completedCount > 0 ? checkpoints[completedCount - 1] : checkpoints[0];
      const initialPos = {
        lat: Number(lastCompletedCp?.latitud),
        lng: Number(lastCompletedCp?.longitud),
      };

      // Crear marcador del camión (ancla centrada sobre la ruta, no tipo pin)
      if (!camionMarkerRef.current && !isNaN(initialPos.lat)) {
        // outerWrapper: desplaza el contenido hacia abajo 50% de su propia altura.
        // AdvancedMarkerElement ancla por defecto en el centro-inferior (como pin).
        // Con translateY(50%) el CENTRO visual del ícono queda sobre la coordenada del mapa.
        const outerWrapper = document.createElement('div');
        outerWrapper.style.cssText = [
          'display:block',
          'transform:translateY(50%)', // compensa el anclaje inferior del AdvancedMarkerElement
        ].join(';');

        // truckDiv: el elemento que se rota. transform-origin en el centro = rota sobre la coordenada.
        const truckDiv = document.createElement('div');
        truckDiv.style.cssText = [
          'width:36px',
          'height:36px',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'position:relative',
          'transform-origin:center center',
        ].join(';');

        // Halo de pulso (detrás del ícono)
        const pulseDiv = document.createElement('div');
        pulseDiv.className = 'pulse-dot';
        pulseDiv.style.cssText = [
          'position:absolute',
          'width:32px',
          'height:32px',
          'border-radius:50%',
          'background:rgba(23,99,166,0.22)',
        ].join(';');

        // Ícono del camión (imagen original)
        const iconImg = document.createElement('img');
        iconImg.src = 'https://maps.google.com/mapfiles/kml/shapes/truck.png';
        iconImg.style.cssText = [
          'width:28px',
          'height:28px',
          'position:relative',
          'z-index:1',
        ].join(';');

        // truckIconRef = truckDiv: el loop rAF aplica la rotación aquí
        truckIconRef.current = truckDiv as any;

        truckDiv.appendChild(pulseDiv);
        truckDiv.appendChild(iconImg);
        outerWrapper.appendChild(truckDiv);

        camionMarkerRef.current = new markerLib.AdvancedMarkerElement({
          position: initialPos, map, title: 'Camión',
          content: outerWrapper, zIndex: 999,
        });
        animPosRef.current = initialPos;
      } else if (camionMarkerRef.current && !isNaN(initialPos.lat)) {
        camionMarkerRef.current.position = initialPos;
        animPosRef.current = initialPos;
      }

      // Cargar geometría real de calles
      fetchRouteGeometry(checkpointCoords).then((geom) => {
        if (!isActive) return;
        fullPathRef.current = geom;
        cumDistancesRef.current = buildCumulativeDistances(geom);
        if (!isNaN(initialPos.lat) && geom.length >= 2) {
          // El inicio suele ser 0% de todos modos
          polylineTraveled.setPath(geom.slice(0, 1));
          polylineRemaining.setPath(geom);
        }
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
          camionMarkerRef.current.map = null;
          camionMarkerRef.current = null;
        }
      };
    }, [map, mapsLib, markerLib, checkpoints, color]);

    // ── Effect 2: loop de animación continuo a 60 FPS (requestAnimationFrame) ─
    //
    // Este loop corre de forma independiente y consume los datos de los refs.
    // No tiene dependencias de React — se monta una sola vez y corre hasta el
    // desmontaje del componente.
    //
    // Calcula progress = elapsed / TICK_MS (lineal, 0→1 en exactamente 1 segundo).
    // Esto hace que el camión recorra de forma CONTINUA y PROPORCIONAL todo el
    // trecho entre el punto anterior y el siguiente en cada segundo de tick.
    // Si el backend aumenta la velocidad, las posiciones objetivo estarán más
    // alejadas entre sí, y el camión avanzará más rápido — sin saltos.
    useEffect(() => {
      const loop = () => {
        const target = targetPosRef.current;
        const start = startPosRef.current;
        const animPos = animPosRef.current;

        if (target && start && tickStartTimeRef.current > 0) {
          const elapsed = Date.now() - tickStartTimeRef.current;
          // Clampear progress a [0, 1]: el camión llega exactamente al destino
          // cuando elapsed >= TICK_MS, y luego permanece ahí hasta el siguiente tick.
          const progress = Math.min(elapsed / TICK_MS, 1);

          const newLat = start.lat + (target.lat - start.lat) * progress;
          const newLng = start.lng + (target.lng - start.lng) * progress;
          const newPos = { lat: newLat, lng: newLng };
          const newHeading = lerpBearing(startHeadingRef.current, targetHeadingRef.current, progress);
          const newPercentage = startPercentageRef.current + (targetPercentageRef.current - startPercentageRef.current) * progress;

          animPosRef.current = newPos;
          animHeadingRef.current = newHeading;
          animPercentageRef.current = newPercentage;

          // Actualizar polylines de progreso animadas a 60FPS
          const geom = fullPathRef.current;
          const cumDists = cumDistancesRef.current;
          if (progressPolylineRef.current && geom.length >= 2 && cumDists.length === geom.length) {
            const totalDist = cumDists[cumDists.length - 1];
            const targetDist = newPercentage * totalDist;
            let closestIdx = 0;
            while (closestIdx < cumDists.length - 1 && cumDists[closestIdx] <= targetDist) {
              closestIdx++;
            }
            if (closestIdx > 0 && Math.abs(cumDists[closestIdx - 1] - targetDist) < Math.abs(cumDists[closestIdx] - targetDist)) {
              closestIdx--;
            }
            // Agregamos el newPos animado como el último punto visible de la línea
            progressPolylineRef.current.traveled.setPath([...geom.slice(0, closestIdx + 1), newPos]);
            progressPolylineRef.current.remaining.setPath([newPos, ...geom.slice(closestIdx + 1)]);
          }

          // Actualizar posición y rotación del marcador
          if (camionMarkerRef.current) {
            camionMarkerRef.current.position = newPos;
          }
          if (truckIconRef.current) {
            // truck.png apunta al ESTE (90°) por defecto en los iconos de Google KML.
            // Restamos 90° para que heading=0° (Norte) lo oriente hacia arriba,
            // heading=90° (Este) lo deje apuntando a la derecha, etc.
            (truckIconRef.current as any).style.transform = `rotate(${newHeading - 90}deg)`;
          }
        } else if (animPos && camionMarkerRef.current) {
          // Antes del primer tick: mantener posición inicial
          camionMarkerRef.current.position = animPos;
        }

        rafIdRef.current = requestAnimationFrame(loop);
      };

      rafIdRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafIdRef.current);
    }, []);

    // ── Effect 3: Socket.IO — recibir ticks y actualizar targets ──────────────
    useEffect(() => {
      if (!map || !mapsLib || checkpoints.length === 0) return;

      const socket = getSocket();
      socket.emit('unirse_a_recorrido', recorridoId);

      const handleUbicacion = (data: any) => {
        if (data.recorridoId !== recorridoId) return;

        const rawPos = { lat: Number(data.latitud), lng: Number(data.longitud) };
        const porcentaje = typeof data.porcentajeAvance === 'number' ? data.porcentajeAvance / 100 : 0;

        let snappedPos = rawPos;
        let newHeading = targetHeadingRef.current; // conservar heading anterior por defecto

        const geom = fullPathRef.current;
        const cumDists = cumDistancesRef.current;

        if (geom.length >= 2 && cumDists.length === geom.length) {
          // ── NUEVO: Usar porcentaje global como única fuente de verdad ──
          snappedPos = interpolateOnPath(geom, cumDists, porcentaje);

          // Encontrar en qué índice geométrico cae aproximadamente la posición para polylines y heading
          const totalDist = cumDists[cumDists.length - 1];
          const targetDist = porcentaje * totalDist;
          let closestIdx = 0;
          while (closestIdx < cumDists.length - 1 && cumDists[closestIdx] <= targetDist) {
            closestIdx++;
          }
          if (closestIdx > 0 && Math.abs(cumDists[closestIdx - 1] - targetDist) < Math.abs(cumDists[closestIdx] - targetDist)) {
            closestIdx--;
          }
          lastIdxRef.current = closestIdx;

          // Heading desde geometría real (lookahead=4 puntos)
          const rawHeading = getHeadingFromGeometry(geom, closestIdx, 4);
          const prevHeading = targetHeadingRef.current;
          let delta = rawHeading - prevHeading;
          while (delta > 180) delta -= 360;
          while (delta < -180) delta += 360;
          newHeading = prevHeading + delta;
        }

        if (isFirstTickRef.current) {
          // Primer tick: posicionar directamente sin animar
          isFirstTickRef.current = false;
          animPosRef.current = snappedPos;
          animHeadingRef.current = newHeading;
          animPercentageRef.current = porcentaje;
          startPosRef.current = snappedPos;
          startHeadingRef.current = newHeading;
          startPercentageRef.current = porcentaje;
          targetPosRef.current = snappedPos;
          targetHeadingRef.current = newHeading;
          targetPercentageRef.current = porcentaje;
          tickStartTimeRef.current = Date.now();
        } else {
          // Ticks siguientes: registrar punto de partida de la nueva animación
          // El loop de rAF tomará estos valores en el próximo frame
          startPosRef.current = animPosRef.current;
          startHeadingRef.current = animHeadingRef.current;
          startPercentageRef.current = animPercentageRef.current;
          targetPosRef.current = snappedPos;
          targetHeadingRef.current = newHeading;
          targetPercentageRef.current = porcentaje;
          tickStartTimeRef.current = Date.now();
        }

        onStatsUpdateRef.current(recorridoId, data);
      };

      const handleFinalizado = (data: any) => {
        if (data.recorridoId !== recorridoId) return;
        const geom = fullPathRef.current;
        if (geom.length > 0) {
          const lastPos = geom[geom.length - 1];
          // Animar hasta el último punto
          startPosRef.current = animPosRef.current;
          startHeadingRef.current = animHeadingRef.current;
          targetPosRef.current = lastPos;
          tickStartTimeRef.current = Date.now();
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
  }
);
