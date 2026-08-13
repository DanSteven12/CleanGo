import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { recorridosService } from '../../services/recorridosService';
import { useRouteSimulation, Checkpoint } from '../../hooks/useRouteSimulation';
import { NavigationArrow } from '../../components/navegacion/NavigationArrow';
import { TurnInstructionCard } from '../../components/navegacion/TurnInstructionCard';
import { NavigationHeader } from '../../components/navegacion/NavigationHeader';
import { NavigationBottomBar } from '../../components/navegacion/NavigationBottomBar';
import { CheckpointCompletedCard } from '../../components/navegacion/CheckpointCompletedCard';
import { NavigationControls } from '../../components/navegacion/NavigationControls';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type LatLng = { latitude: number; longitude: number };

// ─── Helpers geométricos ──────────────────────────────────────────────────────

/** Distancia Haversine en km entre dos puntos geográficos. */
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Bearing geodésico exacto entre dos puntos (fórmula Haversine).
 * Resultado en [0, 360).
 */
const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
};

/**
 * Normaliza la diferencia de ángulo al rango (-180, 180] para garantizar
 * que la rotación siempre tome el camino más corto.
 * Elimina el bug donde girar de 350° → 10° rotaría 340° hacia atrás.
 */
const shortestAngleDelta = (from: number, to: number): number => {
  return ((to - from + 540) % 360) - 180;
};

/**
 * Normaliza un ángulo al rango [0, 360).
 * Necesario para pasarlo a la prop `rotation` del Marker de react-native-maps.
 */
const normalizeAngle = (angle: number): number => ((angle % 360) + 360) % 360;

/**
 * Calcula el heading usando los puntos vecinos de streetGeometry alrededor
 * de `idx`. Promedia hasta `lookahead` puntos hacia adelante para suavizar
 * curvas pronunciadas sin introducir latencia perceptible.
 *
 * Esto es superior al bearing entre dos snappedPositions del socket porque:
 * - usa la dirección real de la calle, no el vector entre dos ticks de 1s.
 * - no tiene vibraciones cuando el backend envía el mismo punto varias veces.
 * - no genera saltos de 180° en vueltas en U.
 */
const getHeadingFromGeometry = (
  geometry: LatLng[],
  idx: number,
  lookahead = 4
): number => {
  const n = geometry.length;
  if (n < 2) return 0;

  // Buscar el siguiente punto distinto (puede haber puntos duplicados en el polyline)
  let targetIdx = Math.min(idx + lookahead, n - 1);
  while (targetIdx > idx && targetIdx < n) {
    const dx = geometry[targetIdx].latitude - geometry[idx].latitude;
    const dy = geometry[targetIdx].longitude - geometry[idx].longitude;
    if (dx * dx + dy * dy > 1e-12) break;
    targetIdx--;
  }

  // Si el punto más próximo hacia adelante no existe, usar el punto anterior
  if (targetIdx === idx && idx > 0) {
    return getBearing(
      geometry[idx - 1].latitude,
      geometry[idx - 1].longitude,
      geometry[idx].latitude,
      geometry[idx].longitude,
    );
  }

  return getBearing(
    geometry[idx].latitude,
    geometry[idx].longitude,
    geometry[targetIdx].latitude,
    geometry[targetIdx].longitude,
  );
};

/**
 * Busca el índice del punto más cercano en `geometry` a `pos`, restringiendo
 * la búsqueda a la ventana [startIdx - back, startIdx + forward].
 * Usa distancia en metros (no grados²) para precisión uniforme en cualquier latitud.
 */
const findClosestIdx = (
  geometry: LatLng[],
  pos: LatLng,
  startIdx: number,
  back = 5,
  forward = 80
): number => {
  const n = geometry.length;
  if (n === 0) return 0;

  const lo = Math.max(0, startIdx - back);
  const hi = Math.min(n - 1, startIdx + forward);

  let minDist = Infinity;
  let bestIdx = startIdx;

  for (let i = lo; i <= hi; i++) {
    const p = geometry[i];
    const dlat = (p.latitude - pos.latitude) * 111320;
    const dlng = (p.longitude - pos.longitude) * 111320 * Math.cos(pos.latitude * Math.PI / 180);
    const dist = dlat * dlat + dlng * dlng;
    if (dist < minDist) {
      minDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
};

/**
 * Calcula la distancia acumulada sobre una geometría para interpolación
 */
function buildCumulativeDistances(path: LatLng[]): number[] {
  const cumulative: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const dlat = (path[i].latitude - path[i - 1].latitude) * 111320;
    const dlng = (path[i].longitude - path[i - 1].longitude) * 111320 * Math.cos(path[i - 1].latitude * Math.PI / 180);
    cumulative.push(cumulative[i - 1] + Math.sqrt(dlat * dlat + dlng * dlng));
  }
  return cumulative;
}

/**
 * Devuelve la coordenada exacta correspondiente a un porcentaje [0, 1] de avance
 */
function interpolateOnPath(
  path: LatLng[],
  cumulative: number[],
  progress: number
): LatLng {
  if (path.length === 0) return { latitude: 0, longitude: 0 };
  if (path.length === 1) return path[0];

  const totalDist = cumulative[cumulative.length - 1];
  if (totalDist === 0) return path[0];

  const targetDist = Math.max(0, Math.min(progress, 1)) * totalDist;

  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= targetDist) lo = mid;
    else hi = mid;
  }

  const segLen = cumulative[hi] - cumulative[lo];
  if (segLen === 0) return path[lo];

  const t = (targetDist - cumulative[lo]) / segLen;
  return {
    latitude: path[lo].latitude + (path[hi].latitude - path[lo].latitude) * t,
    longitude: path[lo].longitude + (path[hi].longitude - path[lo].longitude) * t,
  };
}

// ─── Constante de tick (debe coincidir con TICK_RATE_MS del backend) ──────────
const TICK_MS = 1000;

// ─── Componente principal ─────────────────────────────────────────────────────

const MapaRecorridoScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(true); // true desde el inicio: omitir fitToCoordinates, la cámara de navegación se encarga

  const [isLoading, setIsLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [recorridoData, setRecorridoData] = useState<any | null>(null);

  // Estado modificado para asegurar la carga del SVG en Android
  const [trackVehicleChanges, setTrackVehicleChanges] = useState(true);

  // La única fuente de verdad para la geometría de la ruta
  const [streetGeometry, setStreetGeometry] = useState<LatLng[]>([]);
  const cumDistancesRef = useRef<number[]>([]);

  // Refs: no causan re-render, se usan solo en efectos y handlers
  const isFollowingRef = useRef(true);  // true desde el inicio: la cámara sigue al camión inmediatamente al primer tick
  const hasMountedCameraRef = useRef(false);
  const lastSnappedIdxRef = useRef(0); // avance monotónico sobre streetGeometry

  // ── Carga del recorrido ────────────────────────────────────────────────────
  const fetchRecorridoActivo = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await recorridosService.getRecorridoActivo(Number(id));
      console.log('[DEBUG FRONTEND] Datos recibidos de getRecorridoActivo');
      console.log('[DEBUG FRONTEND] data.geometria length:', data?.geometria?.length);
      if (data?.geometria && data.geometria.length > 0) {
        console.log('[DEBUG FRONTEND] primeros 5:', data.geometria.slice(0, 5));
        console.log('[DEBUG FRONTEND] ultimos 5:', data.geometria.slice(-5));
      }
      setRecorridoData(data);
    } catch (error) {
      console.error('Error al cargar recorrido activo:', error);
      Alert.alert(
        'Sin recorrido activo',
        'No se encontró un recorrido en progreso para esta asignación.',
        [{ text: 'Volver', onPress: () => router.replace('/') }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchRecorridoActivo();
  }, [fetchRecorridoActivo]);

  const checkpoints: Checkpoint[] = recorridoData?.checkpoints || [];

  // ── Simulación (socket): NO se toca su lógica ──────────────────────────────
  const {
    currentPosition,
    speedMultiplier,
    setSpeedMultiplier,
    isCompleted,
    stats,
  } = useRouteSimulation({
    recorridoId: recorridoData?.recorrido_id || null,
    checkpoints,
    horaInicio: recorridoData?.hora_inicio || null,
    rutaId: recorridoData?.ruta_id,
  });

  // ── Coordenadas para los markers de checkpoint (memoizado, no cambia en cada tick) ──
  const checkpointCoords = useMemo<LatLng[]>(() =>
    checkpoints
      .map((c) => ({ latitude: Number(c.latitud), longitude: Number(c.longitud) }))
      .filter((c) => !isNaN(c.latitude) && !isNaN(c.longitude)),
    [checkpoints]
  );

  // ── Carga de geometría real (desde Backend) ────────────────────────────────
  useEffect(() => {
    console.log('[DEBUG FRONTEND] useEffect de streetGeometry disparado. recorridoData?.geometria length:', recorridoData?.geometria?.length);
    if (recorridoData?.geometria && Array.isArray(recorridoData.geometria) && recorridoData.geometria.length >= 2) {
      console.log('[DEBUG FRONTEND] Setting streetGeometry con length:', recorridoData.geometria.length);
      const mappedGeometry = recorridoData.geometria.map((pt: any) => ({
        latitude: pt.lat ?? pt.latitude,
        longitude: pt.lng ?? pt.longitude
      }));
      setStreetGeometry(mappedGeometry);
      cumDistancesRef.current = buildCumulativeDistances(mappedGeometry);
      lastSnappedIdxRef.current = 0;
    } else {
      console.log('[DEBUG FRONTEND] NO se seteo streetGeometry. Condiciones no cumplidas o geometria vacia.');
    }
  }, [recorridoData?.geometria]);

  // ── Estados e interpolación visual (60 FPS) ───────────────────────────────
  const [displayPosition, setDisplayPosition] = useState<LatLng | null>(null);
  // `displayHeading` se pasa al Marker como `rotation` (prop de react-native-maps).
  // Usar [0, 360) porque la prop `rotation` del Marker lo espera así.
  const [displayHeading, setDisplayHeading] = useState(0);

  // Refs para la interpolación lineal basada en tiempo
  const startPosRef = useRef<LatLng | null>(null);
  const startHeadingRef = useRef<number>(0);
  const targetPosRef = useRef<LatLng | null>(null);
  const targetHeadingRef = useRef<number>(0);      // heading acumulado (puede superar 360 para tomar el camino corto)
  const tickStartTimeRef = useRef<number>(0);
  const animPosRef = useRef<LatLng | null>(null);
  const animHeadingRef = useRef<number>(0);        // heading animado (acumulado, mismo espacio que target)
  const isFirstTickRef = useRef<boolean>(true);

  // ── Throttle de cámara ─────────────────────────────────────────────────────
  // La cámara se actualiza máximo 1 vez cada 100ms para no saturar el hilo nativo.
  const lastCameraUpdateRef = useRef<number>(0);
  const CAMERA_THROTTLE_MS = 100;

  // ── Tracker de renderización SVG ───────────────────────────────────────────
  useEffect(() => {
    if (displayPosition) {
      // Mantiene tracksViewChanges en true un instante para que el SVG se dibuje completamente.
      // Luego lo apaga (false) para que las actualizaciones a 60FPS no maten el rendimiento.
      const timer = setTimeout(() => {
        setTrackVehicleChanges(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [!!displayPosition]);

  // ── Actualización de destino al recibir evento del socket / posición ───────
  // Note: dependemos de 'stats.porcentajeAvance' porque es nuestra fuente de verdad unificada
  useEffect(() => {
    if (!currentPosition) return;

    if (streetGeometry.length < 2 || cumDistancesRef.current.length < 2) {
      // Sin geometría: usar posición directa del socket
      targetPosRef.current = currentPosition;
      if (!animPosRef.current) {
        animPosRef.current = currentPosition;
        startPosRef.current = currentPosition;
        setDisplayPosition(currentPosition);
      }
      return;
    }

    const porcentaje = typeof stats.porcentajeAvance === 'number' ? stats.porcentajeAvance / 100 : 0;
    const snapped = interpolateOnPath(streetGeometry, cumDistancesRef.current, porcentaje);

    // Encontrar en qué índice geométrico cae aproximadamente la posición
    const totalDist = cumDistancesRef.current[cumDistancesRef.current.length - 1];
    const targetDist = porcentaje * totalDist;
    let bestIdx = 0;
    while (bestIdx < cumDistancesRef.current.length - 1 && cumDistancesRef.current[bestIdx] <= targetDist) {
      bestIdx++;
    }
    if (bestIdx > 0 && Math.abs(cumDistancesRef.current[bestIdx - 1] - targetDist) < Math.abs(cumDistancesRef.current[bestIdx] - targetDist)) {
      bestIdx--;
    }
    lastSnappedIdxRef.current = bestIdx;

    // Heading desde geometría real (lookahead=4). Siempre toma el camino más corto.
    const rawHeading = getHeadingFromGeometry(streetGeometry, bestIdx, 4);
    const prevHeading = targetHeadingRef.current;
    const delta = shortestAngleDelta(prevHeading, rawHeading);
    const newAccumulatedHeading = prevHeading + delta; // espacio acumulado para interpolación suave

    if (isFirstTickRef.current || !animPosRef.current) {
      // Primer tick: posicionar directamente sin animar
      isFirstTickRef.current = false;
      animPosRef.current = snapped;
      animHeadingRef.current = newAccumulatedHeading;
      startPosRef.current = snapped;
      startHeadingRef.current = newAccumulatedHeading;
      targetPosRef.current = snapped;
      targetHeadingRef.current = newAccumulatedHeading;
      tickStartTimeRef.current = Date.now();
      setDisplayPosition(snapped);
      setDisplayHeading(normalizeAngle(newAccumulatedHeading));
    } else {
      // Registrar estado de partida desde la posición animada actual
      startPosRef.current = { ...animPosRef.current };
      startHeadingRef.current = animHeadingRef.current;
      targetPosRef.current = snapped;
      targetHeadingRef.current = newAccumulatedHeading;
      tickStartTimeRef.current = Date.now();
    }
  }, [stats.porcentajeAvance, streetGeometry, currentPosition]);

  // ── Bucle continuo a 60 FPS: Interpolador visual lineal (Basado en tiempo) ─
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const target = targetPosRef.current;
      const start = startPosRef.current;
      const animPos = animPosRef.current;

      if (target && start && tickStartTimeRef.current > 0) {
        const elapsed = Date.now() - tickStartTimeRef.current;
        const progress = Math.min(elapsed / TICK_MS, 1);

        const nextLat = start.latitude + (target.latitude - start.latitude) * progress;
        const nextLng = start.longitude + (target.longitude - start.longitude) * progress;
        const nextHeading = startHeadingRef.current + (targetHeadingRef.current - startHeadingRef.current) * progress;

        const newAnimPos = { latitude: nextLat, longitude: nextLng };
        animPosRef.current = newAnimPos;
        animHeadingRef.current = nextHeading;

        const normalizedHeading = normalizeAngle(nextHeading);

        setDisplayPosition(newAnimPos);
        setDisplayHeading(normalizedHeading);

        // ── Actualización de cámara (throttled a 100ms) ─────────────────────
        const now = Date.now();
        if (now - lastCameraUpdateRef.current >= CAMERA_THROTTLE_MS && isFollowingRef.current && mapRef.current) {
          lastCameraUpdateRef.current = now;

          if (!hasMountedCameraRef.current) {
            hasMountedCameraRef.current = true;
            // Primera vez: animar suavemente con zoom y pitch de navegación
            mapRef.current.animateCamera(
              {
                center: newAnimPos,
                zoom: 18.5,
                heading: normalizedHeading,
                pitch: 60, // perspectiva de navegación 3D profunda
              },
              { duration: 600 }
            );
          } else {
            // Seguimiento continuo: setCamera para máxima fluidez (sin cola de animación)
            mapRef.current.setCamera({
              center: newAnimPos,
              heading: normalizedHeading,
              pitch: 60,
              zoom: 18.5,
            });
          }
        }
      } else if (animPos) {
        // Antes del primer tick: mostrar posición inicial
        setDisplayPosition(animPos);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ── Handlers de negocio (sin cambios) ─────────────────────────────────────
  const handleSpeedChange = (mult: number) => {
    setSpeedMultiplier(mult);
    if (recorridoData?.recorrido_id) {
      recorridosService.cambiarVelocidad(recorridoData.recorrido_id, mult).catch((err) => {
        console.error('[Velocidad] Error al cambiar velocidad en backend:', err);
      });
    }
  };

  const handleFinalizar = async () => {
    if (!recorridoData?.recorrido_id) return;

    Alert.alert(
      'Finalizar Recorrido',
      '¿Estás seguro de que deseas finalizar este recorrido? Esta acción registrará el fin del servicio.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, finalizar',
          style: 'default',
          onPress: async () => {
            try {
              setIsFinishing(true);
              await recorridosService.finalizarRecorrido(recorridoData.recorrido_id);
              Alert.alert('Recorrido Concluido', 'El recorrido ha sido finalizado exitosamente.', [
                { text: 'Aceptar', onPress: () => router.replace('/') },
              ]);
            } catch (error) {
              console.error('Error finalizando recorrido:', error);
              Alert.alert('Error', 'Hubo un problema al finalizar el recorrido.');
            } finally {
              setIsFinishing(false);
            }
          },
        },
      ]
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading || !recorridoData) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Cargando mapa GPS y ruta de recolección...</Text>
      </SafeAreaView>
    );
  }

  // ── Valores derivados para el render ──────────────────────────────────────

  const lat0 = Number(checkpoints[0]?.latitud);
  const lng0 = Number(checkpoints[0]?.longitud);
  const safeLat = !isNaN(lat0) && lat0 !== 0 ? lat0 : 19.4326;
  const safeLng = !isNaN(lng0) && lng0 !== 0 ? lng0 : -99.1332;

  const initialRegion: Region = {
    latitude: currentPosition && !isNaN(currentPosition.latitude) ? currentPosition.latitude : safeLat,
    longitude: currentPosition && !isNaN(currentPosition.longitude) ? currentPosition.longitude : safeLng,
    latitudeDelta: 0.004,  // ~400 m de radio — zoom de navegación inicial
    longitudeDelta: 0.004,
  };

  const formattedHoraInicio = recorridoData.hora_inicio
    ? new Date(recorridoData.hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const etaMinutos = Math.ceil(stats.etaSegundos / 60);

  // Distancia restante aproximada desde el vehículo hacia el fin de ruta
  let distanciaRestanteStr = '0 m';
  if (currentPosition && checkpoints.length > 0 && !isCompleted) {
    let totalKm = 0;
    const completadosIdx = Math.max(0, stats.completados - 1);
    const nextCp = checkpoints[Math.min(completadosIdx + 1, checkpoints.length - 1)];
    if (nextCp) {
      totalKm += getDistanceKm(
        currentPosition.latitude,
        currentPosition.longitude,
        Number(nextCp.latitud),
        Number(nextCp.longitud)
      );
      for (let i = completadosIdx + 1; i < checkpoints.length - 1; i++) {
        totalKm += getDistanceKm(
          Number(checkpoints[i].latitud),
          Number(checkpoints[i].longitud),
          Number(checkpoints[i + 1].latitud),
          Number(checkpoints[i + 1].longitud)
        );
      }
    }
    distanciaRestanteStr = totalKm >= 1
      ? `${totalKm.toFixed(1)} km`
      : `${Math.round(totalKm * 1000)} m`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* 1. Turn Instruction Card */}
      {!isCompleted && (
        <TurnInstructionCard
          distancia={distanciaRestanteStr}
          proximoDestino={stats.proximoCheckpoint}
        />
      )}

      {/* 2. Navigation Header */}
      <NavigationHeader
        rutaNombre={recorridoData.ruta_nombre}
        numeroEconomico={recorridoData.numero_economico}
        conductorNombre={recorridoData.conductor_nombre}
        horaInicio={formattedHoraInicio}
        tiempoTranscurrido={stats.tiempoTranscurrido}
        porcentajeAvance={stats.porcentajeAvance}
        completados={stats.completados}
        totalCheckpoints={checkpoints.length}
        isCompleted={isCompleted}
        speedMultiplier={speedMultiplier}
        onSpeedChange={handleSpeedChange}
      />

      {/* 3. Checkpoint Completion Toast */}
      <CheckpointCompletedCard
        completados={stats.completados}
        ultimoCheckpoint={stats.ultimoCheckpoint}
      />

      {/* 4. Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {checkpointCoords.length > 1 && (
          <Polyline
            coordinates={streetGeometry.length > 1 ? streetGeometry : checkpointCoords}
            strokeColor="#10b981"
            strokeWidth={6}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Markers de checkpoint */}
        {checkpoints.map((cp, idx) => {
          const isStart = idx === 0;
          const isEnd = idx === checkpoints.length - 1;
          const isNext = !isCompleted && stats.proximoCheckpoint === (cp.nombre || `Punto ${cp.orden}`);

          let markerBg = '#475569';
          let borderColor = '#94a3b8';
          let markerSize = 22;

          if (isStart) {
            markerBg = '#10b981'; borderColor = '#ffffff';
          } else if (isEnd) {
            markerBg = '#ef4444'; borderColor = '#ffffff';
          } else if (isNext) {
            markerBg = '#f59e0b'; borderColor = '#ffffff'; markerSize = 28;
          }

          const lat = Number(cp.latitud);
          const lng = Number(cp.longitud);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={`cp-${cp.id}`}
              coordinate={{ latitude: lat, longitude: lng }}
              zIndex={isNext ? 100 : idx}
            >
              <View style={[
                styles.cpMarker,
                {
                  backgroundColor: markerBg,
                  borderColor,
                  width: markerSize,
                  height: markerSize,
                  borderRadius: markerSize / 2,
                },
                isNext && styles.cpMarkerNext,
              ]}>
                <Text style={[styles.cpMarkerText, isNext && { fontSize: 12 }]}>
                  {isStart ? 'A' : isEnd ? 'B' : cp.orden}
                </Text>
              </View>
            </Marker>
          );
        })}

        {/* 
          Marcador del camión (AQUÍ SE APLICÓ LA CORRECCIÓN DE TRACKSVIEWCHANGES) 
        */}
        {displayPosition && !isNaN(displayPosition.latitude) && !isNaN(displayPosition.longitude) && (
          <Marker
            coordinate={displayPosition}
            zIndex={999}
            flat={true}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={displayHeading}
            tracksViewChanges={trackVehicleChanges}
          >
            <NavigationArrow />
          </Marker>
        )}
      </MapView>

      {/* 5. Floating Controls */}
      {displayPosition && (
        <NavigationControls
          onRecenter={() => {
            isFollowingRef.current = true;
            if (animPosRef.current) {
              mapRef.current?.animateCamera({
                center: animPosRef.current,
                zoom: 17,
                heading: normalizeAngle(animHeadingRef.current),
                pitch: 30,
              }, { duration: 600 });
            }
          }}
        />
      )}

      {/* 6. Bottom Bar */}
      <NavigationBottomBar
        etaMinutos={etaMinutos}
        distanciaRestanteStr={distanciaRestanteStr}
        horaEstimada={stats.horaEstimada}
        isCompleted={isCompleted}
        isFinishing={isFinishing}
        onFinalizar={handleFinalizar}
      />
    </View>
  );
};

export default MapaRecorridoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 15,
  },
  cpMarker: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  cpMarkerNext: {
    borderWidth: 3,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  cpMarkerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
});