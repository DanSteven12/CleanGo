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
  let delta = ((to - from + 540) % 360) - 180;
  return delta;
};

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
    // Distancia euclidiana en metros (normalizar longitud por cos(lat))
    const dlat = (p.latitude - pos.latitude) * 111320;
    const dlng = (p.longitude - pos.longitude) * 111320 * Math.cos(pos.latitude * Math.PI / 180);
    const dist = dlat * dlat + dlng * dlng; // metros² (sin raíz para comparar)
    if (dist < minDist) {
      minDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
};

// ─── Componente principal ─────────────────────────────────────────────────────

const MapaRecorridoScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [recorridoData, setRecorridoData] = useState<any | null>(null);

  // La única fuente de verdad para la geometría de la ruta
  const [streetGeometry, setStreetGeometry] = useState<LatLng[]>([]);

  // Refs: no causan re-render, se usan solo en efectos y handlers
  const isFollowingRef = useRef(false);
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
  // El backend envía el encodedPolyline ya decodificado como {lat, lng}[] 
  // para evitar que la app móvil consuma directamente la API de Google Routes.
  useEffect(() => {
    console.log('[DEBUG FRONTEND] useEffect de streetGeometry disparado. recorridoData?.geometria length:', recorridoData?.geometria?.length);
    if (recorridoData?.geometria && Array.isArray(recorridoData.geometria) && recorridoData.geometria.length >= 2) {
      console.log('[DEBUG FRONTEND] Setting streetGeometry con length:', recorridoData.geometria.length);
      // Mapear {lat, lng} del backend a {latitude, longitude} para react-native-maps
      const mappedGeometry = recorridoData.geometria.map((pt: any) => ({
        latitude: pt.lat ?? pt.latitude,
        longitude: pt.lng ?? pt.longitude
      }));
      setStreetGeometry(mappedGeometry);
      lastSnappedIdxRef.current = 0; // resetear al inicio cuando llega nueva geometría
    } else {
      console.log('[DEBUG FRONTEND] NO se seteo streetGeometry. Condiciones no cumplidas o geometria vacia.');
    }
  }, [recorridoData?.geometria]);

  // ── Snapping + Heading desde geometría (el núcleo de la corrección) ────────
  //
  // PROBLEMA ANTERIOR:
  //   • heading = getBearing(prevSnapped, currentSnapped)
  //     → bearing entre dos ticks de socket = vector ruidoso de hasta cientos de metros
  //     → genera vibraciones, saltos de 180° y rotaciones erróneas en curvas
  //
  // SOLUCIÓN ACTUAL:
  //   • heading = getHeadingFromGeometry(streetGeometry, bestIdx, lookahead=4)
  //     → usa la dirección REAL de la calle en el punto donde está el camión
  //     → suavizado natural por el lookahead: promedia la dirección en los próximos ~4 puntos
  //     → sin vibraciones aunque el socket envíe la misma coordenada varias veces
  // Estados e interpolación visual (60 FPS sin saltos ni congelamientos)
  const [displayPosition, setDisplayPosition] = useState<LatLng | null>(null);
  const [displayHeading, setDisplayHeading] = useState(0);

  const targetPosRef = useRef<LatLng | null>(null);
  const targetHeadingRef = useRef<number>(0);
  const animPosRef = useRef<LatLng | null>(null);
  const animHeadingRef = useRef<number>(0);

  // Refs para interpolación lineal basada en tiempo
  const startPosRef = useRef<LatLng | null>(null);
  const startHeadingRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // ── Actualización de destino al recibir evento del socket / posición ───────
  useEffect(() => {
    if (!currentPosition) return;
    if (streetGeometry.length < 2) {
      targetPosRef.current = currentPosition;
      if (!animPosRef.current) {
        animPosRef.current = currentPosition;
        setDisplayPosition(currentPosition);
      }
      return;
    }

    // Encontrar el punto más cercano en la geometría real
    const bestIdx = findClosestIdx(
      streetGeometry,
      currentPosition,
      lastSnappedIdxRef.current
    );
    lastSnappedIdxRef.current = bestIdx;

    const snapped = streetGeometry[bestIdx];
    const rawHeading = getHeadingFromGeometry(streetGeometry, bestIdx, 4);
    const prevHeading = targetHeadingRef.current;
    const delta = shortestAngleDelta(prevHeading, rawHeading);
    const newHeading = prevHeading + delta;

    if (!animPosRef.current) {
      animPosRef.current = snapped;
      animHeadingRef.current = newHeading;
      setDisplayPosition(snapped);
      setDisplayHeading(newHeading);
    } else {
      // Registrar estado inicial y tiempo de inicio para la nueva animación
      startPosRef.current = { ...animPosRef.current };
      startHeadingRef.current = animHeadingRef.current;
      startTimeRef.current = Date.now();
    }

    targetPosRef.current = snapped;
    targetHeadingRef.current = newHeading;
  }, [currentPosition, streetGeometry]);

  // ── Bucle continuo a 60 FPS: Interpolador visual lineal (Basado en tiempo) ─
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const targetPos = targetPosRef.current;
      const startPos = startPosRef.current;
      const targetHeading = targetHeadingRef.current;
      const startHeading = startHeadingRef.current;
      const startTime = startTimeRef.current;
      const animPos = animPosRef.current;

      if (targetPos && startPos && startTime) {
        const now = Date.now();
        const elapsed = now - startTime;
        
        // Progreso lineal de 0 a 1 sobre 1 segundo (1000ms, coincide con el tick del servidor)
        const progress = Math.min(elapsed / 1000, 1);
        
        const nextLat = startPos.latitude + (targetPos.latitude - startPos.latitude) * progress;
        const nextLng = startPos.longitude + (targetPos.longitude - startPos.longitude) * progress;
        const nextHeading = startHeading + (targetHeading - startHeading) * progress;

        const newAnimPos = { latitude: nextLat, longitude: nextLng };
        animPosRef.current = newAnimPos;
        animHeadingRef.current = nextHeading;

        setDisplayPosition(newAnimPos);
        setDisplayHeading(nextHeading);

        // Primera posición: centrar cámara
        if (!hasMountedCameraRef.current) {
          hasMountedCameraRef.current = true;
          isFollowingRef.current = true;
          mapRef.current?.animateCamera(
            { center: newAnimPos, zoom: 17, heading: nextHeading },
            { duration: 500 }
          );
        } else if (isFollowingRef.current && mapRef.current) {
          // Seguimiento de cámara continuo y fluido
          mapRef.current.setCamera({
            center: newAnimPos,
            heading: nextHeading,
          });
        }
      } else if (targetPos && animPos && !startPos) {
        // Fallback en el primer instante antes del primer tick
        setDisplayPosition(animPos);
        setDisplayHeading(animHeadingRef.current);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ── Cámara inicial: fitToCoordinates sobre checkpoints ────────────────────
  useEffect(() => {
    if (checkpoints.length > 0 && mapRef.current && !hasCenteredRef.current) {
      if (checkpointCoords.length > 0) {
        hasCenteredRef.current = true;
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(checkpointCoords, {
            edgePadding: { top: 70, right: 70, bottom: 250, left: 70 },
            animated: true,
          });
        }, 600);
      }
    }
  }, [checkpoints, checkpointCoords]);

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
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  const formattedHoraInicio = recorridoData.hora_inicio
    ? new Date(recorridoData.hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const etaMinutos = Math.ceil(stats.etaSegundos / 60);

  // Distancia restante aproximada desde el vehículo hacia el fin de ruta (lógica de negocio intacta)
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
      >
        {/*
          Polyline: usa streetGeometry (Routes API) como única fuente.
          Fallback a checkpointCoords solo si la geometría aún no cargó.
          NO se simplifica ni recorta: se pasa el array completo tal como
          lo devuelve decodePolyline() en routeGeometryCache.ts.
        */}
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

        {/* Marcador del camión: Posición e inclinación interpoladas a 60 FPS */}
        {displayPosition && !isNaN(displayPosition.latitude) && !isNaN(displayPosition.longitude) && (
          <Marker
            coordinate={displayPosition}
            zIndex={999}
            flat={true}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
          >
            <NavigationArrow heading={displayHeading} />
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
                heading: animHeadingRef.current,
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
