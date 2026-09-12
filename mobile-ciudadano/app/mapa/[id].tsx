import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { recorridosService } from '../../services/recorridosService';
import { useAuth } from '../../contexts/AuthContext';
import { useRouteSimulation, Checkpoint } from '../../hooks/useRouteSimulation';
import { NavigationArrow } from '../../components/mapa/NavigationArrow';
import { GarbageTruckIcon } from '../../components/mapa/GarbageTruckIcon';
import { useRecorridoMapCache } from '../../contexts/RecorridoMapCache';
import { ArrowLeft, MapPin, CheckCircle2 } from 'lucide-react-native';
import { useAlert } from '../../contexts/AlertContext';

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  success: '#16A34A',
};

type LatLng = { latitude: number; longitude: number };

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

const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
};

const shortestAngleDelta = (from: number, to: number): number => {
  return ((to - from + 540) % 360) - 180;
};

const normalizeAngle = (angle: number): number => ((angle % 360) + 360) % 360;

const getHeadingFromGeometry = (geometry: LatLng[], idx: number): number => {
  const n = geometry.length;
  if (n < 2) return 0;

  let targetIdx = idx + 1;
  while (targetIdx < n) {
    const dx = geometry[targetIdx].latitude - geometry[idx].latitude;
    const dy = geometry[targetIdx].longitude - geometry[idx].longitude;
    if (dx * dx + dy * dy > 1e-12) {
      return getBearing(
        geometry[idx].latitude,
        geometry[idx].longitude,
        geometry[targetIdx].latitude,
        geometry[targetIdx].longitude
      );
    }
    targetIdx++;
  }

  let prevIdx = idx - 1;
  while (prevIdx >= 0) {
    const dx = geometry[idx].latitude - geometry[prevIdx].latitude;
    const dy = geometry[idx].longitude - geometry[prevIdx].longitude;
    if (dx * dx + dy * dy > 1e-12) {
      return getBearing(
        geometry[prevIdx].latitude,
        geometry[prevIdx].longitude,
        geometry[idx].latitude,
        geometry[idx].longitude
      );
    }
    prevIdx--;
  }

  return 0;
};

/** Gira hacia el siguiente tramo al acercarse al vértice, como en el mapa web. */
const getHeadingAlongRoute = (
  geometry: LatLng[],
  idx: number,
  tOnSegment: number
): number => {
  const current = getHeadingFromGeometry(geometry, idx);
  const nextIdx = Math.min(idx + 1, geometry.length - 1);
  if (nextIdx === idx || tOnSegment < 0.55) return current;

  const next = getHeadingFromGeometry(geometry, nextIdx);
  const k = Math.min(1, (tOnSegment - 0.55) / 0.45);
  return current + shortestAngleDelta(current, next) * k;
};

function buildCumulativeDistances(path: LatLng[]): number[] {
  const cumulative: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const dlat = (path[i].latitude - path[i - 1].latitude) * 111320;
    const dlng = (path[i].longitude - path[i - 1].longitude) * 111320 * Math.cos(path[i - 1].latitude * Math.PI / 180);
    cumulative.push(cumulative[i - 1] + Math.sqrt(dlat * dlat + dlng * dlng));
  }
  return cumulative;
}

function interpolateOnPath(path: LatLng[], cumulative: number[], progress: number): LatLng {
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

function splitGeometryAtProgress(
  path: LatLng[],
  cumulative: number[],
  progress01: number,
  currentPos: LatLng
): { traveled: LatLng[]; remaining: LatLng[] } {
  if (path.length < 2 || cumulative.length !== path.length) {
    return { traveled: path, remaining: [] };
  }
  const totalDist = cumulative[cumulative.length - 1];
  if (totalDist <= 0) {
    return { traveled: path, remaining: [] };
  }

  const targetDist = Math.max(0, Math.min(progress01, 1)) * totalDist;
  let nextIdx = 0;
  while (nextIdx < path.length - 1 && cumulative[nextIdx] < targetDist - 1e-6) {
    nextIdx++;
  }

  const traveled =
    nextIdx <= 0 ? [path[0], currentPos] : [...path.slice(0, nextIdx), currentPos];
  const remaining = [currentPos, ...path.slice(nextIdx)];

  return { traveled, remaining };
}

const TICK_MS = 1000;

export default function CiudadanoMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showError } = useAlert();
  const mapRef = useRef<MapView | null>(null);

  const cache = useRecorridoMapCache();

  const hasCachedData =
    cache.entry?.recorridoId === Number(id) &&
    cache.entry?.recorridoData != null;

  const mountSnapshotRef = useRef(hasCachedData ? cache.entry!.snapshot : null);
  const snapshotPos = mountSnapshotRef.current
    ? { latitude: mountSnapshotRef.current.latitude, longitude: mountSnapshotRef.current.longitude }
    : null;
  const snapshotPct = mountSnapshotRef.current ? mountSnapshotRef.current.porcentajeAvance / 100 : 0;
  const snapshotHeading = mountSnapshotRef.current ? mountSnapshotRef.current.heading : 0;

  const [isLoading, setIsLoading] = useState(!hasCachedData);
  const [recorridoData, setRecorridoData] = useState<any | null>(
    hasCachedData ? cache.entry!.recorridoData : null
  );

  const _initialGeom = hasCachedData ? cache.entry!.streetGeometry : [];
  const [streetGeometry, setStreetGeometry] = useState<LatLng[]>(_initialGeom);
  const streetGeometryRef = useRef<LatLng[]>(_initialGeom);
  const cumDistancesRef = useRef<number[]>(
    _initialGeom.length >= 2 ? buildCumulativeDistances(_initialGeom) : []
  );

  const isFollowingRef = useRef(true);
  const hasMountedCameraRef = useRef(!!mountSnapshotRef.current);
  const lastSnappedIdxRef = useRef(0);

  const fetchRecorridoDetalle = useCallback(async () => {
    if (!id || !isAuthenticated) return;
    try {
      if (!hasCachedData) {
        setIsLoading(true);
      }
      const data = await recorridosService.getRecorridoDetalle(Number(id));
      cache.setFromApi(Number(id), data);
      setRecorridoData(data);
    } catch (error: any) {
      console.warn(`[Mapa] No se pudo obtener el recorrido ${id}:`, error?.message);
      showError(
        'Recorrido no encontrado',
        'Este recorrido ya no está disponible o no existe.',
        () => router.replace('/')
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, isAuthenticated, router, cache.setFromApi, hasCachedData, showError]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecorridoDetalle();
    }
  }, [fetchRecorridoDetalle, isAuthenticated]);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={T.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const checkpoints: Checkpoint[] = recorridoData?.checkpoints || [];

  const {
    currentPosition,
    isCompleted: hookIsCompleted,
    stats,
  } = useRouteSimulation({
    checkpoints,
  });

  const isCompleted =
    hookIsCompleted ||
    (cache.entry?.isCompleted ?? false) ||
    recorridoData?.estado === 'Completado';

  const checkpointCoords = useMemo<LatLng[]>(() =>
    checkpoints
      .map((c) => ({ latitude: Number(c.latitud), longitude: Number(c.longitud) }))
      .filter((c) => !isNaN(c.latitude) && !isNaN(c.longitude)),
    [checkpoints]
  );

  useEffect(() => {
    if (recorridoData?.geometria && Array.isArray(recorridoData.geometria) && recorridoData.geometria.length >= 2) {
      const mappedGeometry = recorridoData.geometria.map((pt: any) => ({
        latitude: pt.lat ?? pt.latitude,
        longitude: pt.lng ?? pt.longitude
      }));
      setStreetGeometry(mappedGeometry);
      streetGeometryRef.current = mappedGeometry;
      cumDistancesRef.current = buildCumulativeDistances(mappedGeometry);
      lastSnappedIdxRef.current = 0;
    }
  }, [recorridoData?.geometria]);

  const [displayPosition, setDisplayPosition] = useState<LatLng | null>(snapshotPos);
  const [displayHeading, setDisplayHeading] = useState(snapshotHeading);
  const [displayProgress, setDisplayProgress] = useState(snapshotPct);

  const startPosRef = useRef<LatLng | null>(snapshotPos);
  const startHeadingRef = useRef<number>(snapshotHeading);
  const targetPosRef = useRef<LatLng | null>(snapshotPos);
  const targetHeadingRef = useRef<number>(snapshotHeading);
  const startPercentageRef = useRef<number>(snapshotPct);
  const targetPercentageRef = useRef<number>(snapshotPct);
  const tickStartTimeRef = useRef<number>(0);
  const animPosRef = useRef<LatLng | null>(snapshotPos);
  const animHeadingRef = useRef<number>(snapshotHeading);
  const animPercentageRef = useRef<number>(snapshotPct);
  const isFirstTickRef = useRef<boolean>(!snapshotPos);

  const lastCameraUpdateRef = useRef<number>(0);
  const CAMERA_THROTTLE_MS = 100;

  const lastHeadingRef = useRef<number>(snapshotHeading);
  const updateSnapshotRef = useRef(cache.updateSnapshot);
  updateSnapshotRef.current = cache.updateSnapshot;

  useEffect(() => {
    if (!currentPosition) return;

    if (streetGeometry.length < 2 || cumDistancesRef.current.length < 2) {
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

    const totalDist = cumDistancesRef.current[cumDistancesRef.current.length - 1];
    const targetDist = Math.max(0, Math.min(porcentaje, 1)) * totalDist;

    let segStart = 0;
    let segEnd = cumDistancesRef.current.length - 1;
    while (segStart < segEnd - 1) {
      const mid = (segStart + segEnd) >> 1;
      if (cumDistancesRef.current[mid] <= targetDist) segStart = mid;
      else segEnd = mid;
    }
    const segLen = cumDistancesRef.current[segEnd] - cumDistancesRef.current[segStart];
    const tOnSegment = segLen <= 0 ? 1 : (targetDist - cumDistancesRef.current[segStart]) / segLen;
    lastSnappedIdxRef.current = segStart;

    const rawHeading = getHeadingAlongRoute(streetGeometry, segStart, tOnSegment);
    const prevHeading = targetHeadingRef.current;
    const delta = shortestAngleDelta(prevHeading, rawHeading);
    const newAccumulatedHeading = prevHeading + delta;

    if (isFirstTickRef.current || !animPosRef.current) {
      isFirstTickRef.current = false;
      animPosRef.current = snapped;
      animHeadingRef.current = newAccumulatedHeading;
      animPercentageRef.current = porcentaje;
      startPosRef.current = snapped;
      startHeadingRef.current = newAccumulatedHeading;
      startPercentageRef.current = porcentaje;
      targetPosRef.current = snapped;
      targetHeadingRef.current = newAccumulatedHeading;
      targetPercentageRef.current = porcentaje;
      tickStartTimeRef.current = Date.now();
      setDisplayPosition(snapped);
      setDisplayHeading(normalizeAngle(newAccumulatedHeading));
      setDisplayProgress(porcentaje);
    } else {
      startPosRef.current = { ...animPosRef.current };
      startHeadingRef.current = animHeadingRef.current;
      startPercentageRef.current = animPercentageRef.current;
      targetPosRef.current = snapped;
      targetHeadingRef.current = newAccumulatedHeading;
      targetPercentageRef.current = porcentaje;
      tickStartTimeRef.current = Date.now();
    }
  }, [stats.porcentajeAvance, streetGeometry, currentPosition]);

  useEffect(() => {
    let animId: number;

    const loop = () => {
      const target = targetPosRef.current;
      const start = startPosRef.current;
      const animPos = animPosRef.current;

      if (target && start && tickStartTimeRef.current > 0) {
        const elapsed = Date.now() - tickStartTimeRef.current;
        const progress = Math.min(elapsed / TICK_MS, 1);

        const nextPct =
          startPercentageRef.current +
          (targetPercentageRef.current - startPercentageRef.current) * progress;

        const geom = streetGeometryRef.current;
        const cum = cumDistancesRef.current;
        const newAnimPos =
          geom.length >= 2 && cum.length === geom.length
            ? interpolateOnPath(geom, cum, nextPct)
            : {
              latitude: start.latitude + (target.latitude - start.latitude) * progress,
              longitude: start.longitude + (target.longitude - start.longitude) * progress,
            };
        const nextHeading =
          startHeadingRef.current +
          shortestAngleDelta(startHeadingRef.current, targetHeadingRef.current) * progress;

        animPosRef.current = newAnimPos;
        animHeadingRef.current = nextHeading;
        animPercentageRef.current = nextPct;

        const normalizedHeading = normalizeAngle(nextHeading);
        lastHeadingRef.current = normalizedHeading;

        setDisplayPosition(newAnimPos);
        setDisplayHeading(normalizedHeading);
        setDisplayProgress(nextPct);

        const now = Date.now();
        if (now - lastCameraUpdateRef.current >= CAMERA_THROTTLE_MS && isFollowingRef.current && mapRef.current) {
          lastCameraUpdateRef.current = now;

          if (!hasMountedCameraRef.current) {
            hasMountedCameraRef.current = true;
            mapRef.current.animateCamera(
              {
                center: newAnimPos,
                zoom: 17,
                heading: 0,
                pitch: 0,
              },
              { duration: 600 }
            );
          } else {
            mapRef.current.setCamera({
              center: newAnimPos,
              heading: 0,
              pitch: 0,
              zoom: 17,
            });
          }
        }
      } else if (animPos) {
        setDisplayPosition(animPos);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    return () => {
      updateSnapshotRef.current({ heading: lastHeadingRef.current });
    };
  }, []);

  // Estado finalizado se gestiona directamente en la tarjeta inferior (Opción 1)

  if (isLoading || !recorridoData) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={T.primary} />
        <Text style={styles.loadingText}>Conectando con el camión...</Text>
      </SafeAreaView>
    );
  }

  const lat0 = Number(checkpoints[0]?.latitud);
  const lng0 = Number(checkpoints[0]?.longitud);
  const safeLat = !isNaN(lat0) && lat0 !== 0 ? lat0 : 19.4326;
  const safeLng = !isNaN(lng0) && lng0 !== 0 ? lng0 : -99.1332;

  const initialRegion: Region = {
    latitude:
      currentPosition && !isNaN(currentPosition.latitude)
        ? currentPosition.latitude
        : (snapshotPos?.latitude ?? safeLat),
    longitude:
      currentPosition && !isNaN(currentPosition.longitude)
        ? currentPosition.longitude
        : (snapshotPos?.longitude ?? safeLng),
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  };

  const hasLiveSplit =
    streetGeometry.length > 1 &&
    !!displayPosition &&
    cumDistancesRef.current.length === streetGeometry.length;

  let traveledCoords: LatLng[] = [];
  let remainingCoords: LatLng[] = [];

  if (hasLiveSplit && displayPosition) {
    if (isCompleted) {
      traveledCoords = streetGeometry;
    } else {
      const split = splitGeometryAtProgress(
        streetGeometry,
        cumDistancesRef.current,
        displayProgress,
        displayPosition
      );
      traveledCoords = split.traveled;
      remainingCoords = split.remaining;
    }
  }
  const fallbackRoute = !hasLiveSplit && (streetGeometry.length > 1 ? streetGeometry : checkpointCoords);

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

  return (
    <View style={styles.container}>

      {/* 1. Header (Atrás + Título) */}
      <View style={styles.topHeader}>
        <SafeAreaView edges={['top']} />
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <ArrowLeft size={20} color={T.textH} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.routeTitle}>{recorridoData.ruta_nombre}</Text>
            <Text style={styles.routeSubtitle}>Camión {recorridoData.numero_economico}</Text>
          </View>
        </View>
      </View>

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
        {fallbackRoute && fallbackRoute.length > 1 && (
          <Polyline
            coordinates={fallbackRoute}
            strokeColor="#94A3B8"
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        )}
        {remainingCoords.length > 1 && (
          <Polyline
            coordinates={remainingCoords}
            strokeColor="#94A3B8"
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
            zIndex={1}
          />
        )}
        {traveledCoords.length > 1 && (
          <Polyline
            coordinates={traveledCoords}
            strokeColor={T.success}
            strokeWidth={6}
            lineJoin="round"
            lineCap="round"
            zIndex={2}
          />
        )}

        {/* Checkpoints discretos */}
        {checkpoints.map((cp, idx) => {
          const cpLat = Number(cp.latitud);
          const cpLng = Number(cp.longitud);
          if (isNaN(cpLat) || isNaN(cpLng)) return null;

          const isCompletedCp = idx < stats.completados;
          const isNextCp = idx === stats.completados;

          let color = '#CBD5E1';
          let size = 8;

          if (isCompletedCp) {
            color = '#94A3B8';
          } else if (isNextCp) {
            color = T.primary;
            size = 14;
          }

          return (
            <Marker
              key={`cp-${cp.id}`}
              coordinate={{ latitude: cpLat, longitude: cpLng }}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={isNextCp ? 10 : 3}
            >
              <View style={[styles.discreteCheckpoint, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]} />
            </Marker>
          );
        })}

        {/* Vehículo animado */}
        {displayPosition && (
          <Marker
            coordinate={displayPosition}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={normalizeAngle(displayHeading - 90)}
            flat={true}
            zIndex={100}
            tracksViewChanges={false}
          >
            <NavigationArrow />
          </Marker>
        )}
      </MapView>

      {/* Botón para centrar mapa */}
      <View style={styles.floatingControls}>
        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => {
            if (displayPosition && mapRef.current) {
              mapRef.current.animateCamera({
                center: displayPosition,
                zoom: 17,
                heading: 0,
                pitch: 0,
              });
            }
          }}
        >
          <MapPin size={22} color={T.primary} />
        </TouchableOpacity>
      </View>

      {/* 5. Footer con ETA o Estado Finalizado */}
      <View style={styles.footer}>
        <View style={styles.footerDragIndicator} />
        <View style={styles.footerContent}>
          {isCompleted ? (
            <View style={styles.completedContainer}>
              <View style={styles.completedHeaderRow}>
                <View style={styles.completedIconBadge}>
                  <CheckCircle2 size={26} color={T.success} />
                </View>
                <View style={styles.completedTextContainer}>
                  <Text style={styles.completedTitle}>¡Recorrido Finalizado!</Text>
                  <Text style={styles.completedSubtitle}>
                    La recolección de esta ruta ha sido completada.
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.completedButton}
                activeOpacity={0.8}
                onPress={() => {
                  cache.clear();
                  router.replace('/');
                }}
              >
                <Text style={styles.completedButtonText}>Volver al inicio</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.etaRow}>
                <View style={styles.etaTextContainer}>
                  <Text style={styles.etaLabel}>Llega aproximadamente en</Text>
                  <Text style={styles.etaValue}>
                    {stats.etaSegundos > 0 ? (
                      stats.etaSegundos < 60 ? 'Menos de 1 min' : `${Math.ceil(stats.etaSegundos / 60)} min`
                    ) : 'Calculando...'}
                  </Text>
                </View>
                <View style={styles.truckIconContainer}>
                  <GarbageTruckIcon size={52} />
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.secondaryInfo}>
                <Text style={styles.nextCheckpointText} numberOfLines={1}>
                  {stats.proximoCheckpoint ? `Próximo: ${stats.proximoCheckpoint}` : 'En camino...'}
                </Text>
              </View>

              {/* Barra de progreso discreta */}
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, stats.porcentajeAvance))}%` }]} />
              </View>
            </>
          )}
        </View>
        <SafeAreaView edges={['bottom']} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bgPage,
  },
  loadingText: {
    marginTop: 16,
    color: T.text,
    fontSize: 16,
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitles: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.textH,
  },
  routeSubtitle: {
    fontSize: 14,
    color: T.text,
    marginTop: 2,
  },
  discreteCheckpoint: {
    borderWidth: 1,
    borderColor: '#FFF',
  },
  floatingControls: {
    position: 'absolute',
    bottom: 240, // Ajustado para estar encima del footer
    right: 16,
    zIndex: 10,
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 20,
  },
  footerDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  footerContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaTextContainer: {
    flex: 1,
  },
  etaLabel: {
    fontSize: 14,
    color: T.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  etaValue: {
    fontSize: 32,
    fontWeight: '800',
    color: T.textH,
  },
  truckIconContainer: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  secondaryInfo: {
    marginBottom: 16,
  },
  nextCheckpointText: {
    fontSize: 15,
    color: T.text,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: T.success,
    borderRadius: 3,
  },
  completedContainer: {
    paddingTop: 4,
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  completedTextContainer: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textH,
  },
  completedSubtitle: {
    fontSize: 13,
    color: T.text,
    marginTop: 2,
    lineHeight: 18,
  },
  completedButton: {
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
