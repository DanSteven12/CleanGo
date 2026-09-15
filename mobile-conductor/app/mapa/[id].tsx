import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { recorridosService } from '../../services/recorridosService';
import { useAuth } from '../../contexts/AuthContext';
import { useRouteSimulation, Checkpoint } from '../../hooks/useRouteSimulation';
import { NavigationArrow } from '../../components/navegacion/NavigationArrow';
import { TurnInstructionCard } from '../../components/navegacion/TurnInstructionCard';
import { NavigationHeader } from '../../components/navegacion/NavigationHeader';
import { NavigationBottomBar } from '../../components/navegacion/NavigationBottomBar';
import { CheckpointCompletedCard } from '../../components/navegacion/CheckpointCompletedCard';
import { NavigationControls } from '../../components/navegacion/NavigationControls';
import { theme } from '../../theme/colors';
import { useRecorridoMapCache } from '../../contexts/RecorridoMapCache';
import { useAsignacionGlobal } from '../../contexts/AsignacionContext';
import { useAlert } from '../../contexts/AlertContext';

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
  idx: number
): number => {
  const n = geometry.length;
  if (n < 2) return 0;

  // Buscar el siguiente punto distinto hacia adelante para obtener la dirección exacta del segmento actual
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

  // Si estamos al final y no hay puntos distintos hacia adelante, buscar hacia atrás
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

/**
 * Parte la geometría en tramo recorrido / restante según el % interpolado,
 * igual que LiveMapSimulation en web. Así la línea sólida termina en el
 * camión y no se adelanta al siguiente checkpoint.
 */
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
  // Vértices estrictamente detrás del camión; el último punto es currentPos.
  let nextIdx = 0;
  while (nextIdx < path.length - 1 && cumulative[nextIdx] < targetDist - 1e-6) {
    nextIdx++;
  }

  const traveled =
    nextIdx <= 0 ? [path[0], currentPos] : [...path.slice(0, nextIdx), currentPos];
  const remaining = [currentPos, ...path.slice(nextIdx)];

  return { traveled, remaining };
}

// ─── Constante de tick (debe coincidir con TICK_RATE_MS del backend) ──────────
const TICK_MS = 1000;

// ─── Componente principal ─────────────────────────────────────────────────────

const MapaRecorridoScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showConfirm, showSuccess, showError, showWarning } = useAlert();
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(true); // true desde el inicio: omitir fitToCoordinates, la cámara de navegación se encarga

  // ── Caché de recorrido activo ──────────────────────────────────────────────
  // El proveedor vive en _layout.tsx y sobrevive al desmontaje de esta pantalla.
  // Permite omitir el fetch HTTP y restaurar la posición inmediatamente al re-entrar.
  const cache = useRecorridoMapCache();
  const { refreshData } = useAsignacionGlobal();

  // hasCachedData: verdadero si el caché ya tiene datos del recorrido al montar.
  // Capturado en un ref para que el useEffect de carga no re-dispare si el caché
  // cambia por un tick del socket mientras el mapa está visible.
  const hasCachedData =
    cache.entry?.asignacionId === Number(id) &&
    cache.entry?.recorridoData != null;
  const hadCachedDataOnMount = useRef(hasCachedData);

  // Snapshot capturado en el momento del montaje para inicializar la animación.
  // Usar useRef para que el valor no cambie con re-renders del socket.
  const mountSnapshotRef = useRef(hasCachedData ? cache.entry!.snapshot : null);
  const snapshotPos = mountSnapshotRef.current
    ? { latitude: mountSnapshotRef.current.latitude, longitude: mountSnapshotRef.current.longitude }
    : null;
  const snapshotPct = mountSnapshotRef.current ? mountSnapshotRef.current.porcentajeAvance / 100 : 0;
  const snapshotHeading = mountSnapshotRef.current ? mountSnapshotRef.current.heading : 0;

  // isLoading: false si ya hay datos en caché → sin spinner al re-entrar al mapa
  const [isLoading, setIsLoading] = useState(!hasCachedData);
  const [isFinishing, setIsFinishing] = useState(false);
  // recorridoData: inicializado desde caché si está disponible
  const [recorridoData, setRecorridoData] = useState<any | null>(
    hasCachedData ? cache.entry!.recorridoData : null
  );

  // trackVehicleChanges: always true while displayPosition is valid.
  // Never permanently lock it off — doing so stops the SVG re-rendering on Android.
  const trackVehicleChanges = true;

  // La única fuente de verdad para la geometría de la ruta;
  // inicializada desde caché para evitar el flash de mapa sin ruta al re-entrar
  const _initialGeom = hasCachedData ? cache.entry!.streetGeometry : [];
  const [streetGeometry, setStreetGeometry] = useState<LatLng[]>(_initialGeom);
  const streetGeometryRef = useRef<LatLng[]>(_initialGeom);
  const cumDistancesRef = useRef<number[]>(
    _initialGeom.length >= 2 ? buildCumulativeDistances(_initialGeom) : []
  );

  // Refs: no causan re-render, se usan solo en efectos y handlers
  const isFollowingRef = useRef(true);  // true desde el inicio: la cámara sigue al camión inmediatamente al primer tick
  // Si hay snapshot, la cámara ya está posicionada → omitir la animación inicial de 600ms
  const hasMountedCameraRef = useRef(!!mountSnapshotRef.current);
  const lastSnappedIdxRef = useRef(0); // avance monotónico sobre streetGeometry

  // ── Carga del recorrido ────────────────────────────────────────────────────
  const fetchRecorridoActivo = useCallback(async (isBackground = false) => {
    if (!id || !isAuthenticated) return;
    try {
      if (!isBackground) {
        setIsLoading(true);
      }
      const data = await recorridosService.getRecorridoActivo(Number(id));
      console.log('[DEBUG FRONTEND] Datos recibidos de getRecorridoActivo');
      console.log('[DEBUG FRONTEND] data.geometria length:', data?.geometria?.length);
      if (data?.geometria && data.geometria.length > 0) {
        console.log('[DEBUG FRONTEND] primeros 5:', data.geometria.slice(0, 5));
        console.log('[DEBUG FRONTEND] ultimos 5:', data.geometria.slice(-5));
      }
      // Guardar en caché para que al re-entrar al mapa no se repita el fetch HTTP
      cache.setFromApi(Number(id), data);
      setRecorridoData(data);
    } catch (error) {
      console.error('Error al cargar recorrido activo:', error);
      if (!isBackground) {
        showWarning(
          'Sin recorrido activo',
          'No se encontró un recorrido en progreso para esta asignación.',
          () => {
            router.replace('/');
          },
          { confirmText: 'Volver al Inicio' }
        );
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, [id, isAuthenticated, router, cache.setFromApi]);

  // Si hay datos en caché al montar, omitir el spinner bloqueante pero actualizar en background.
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecorridoActivo(hadCachedDataOnMount.current);
    }
  }, [fetchRecorridoActivo, isAuthenticated]);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const checkpoints: Checkpoint[] = recorridoData?.checkpoints || [];

  // ── Simulación (socket): NO se toca su lógica ──────────────────────────────
  const {
    currentPosition,
    speedMultiplier,
    setSpeedMultiplier,
    isCompleted: hookIsCompleted,
    stats,
  } = useRouteSimulation({
    recorridoId: recorridoData?.recorrido_id || null,
    checkpoints,
    horaInicio: recorridoData?.hora_inicio || null,
    rutaId: recorridoData?.ruta_id,
    initialSnapshot: mountSnapshotRef.current,
  });
  // isCompleted combinado: del hook (socket directo) o del caché
  // (recorrido finalizado por el backend mientras el mapa estaba oculto)
  const isCompleted = hookIsCompleted || (cache.entry?.isCompleted ?? false);

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
      streetGeometryRef.current = mappedGeometry;
      cumDistancesRef.current = buildCumulativeDistances(mappedGeometry);
      lastSnappedIdxRef.current = 0;
    } else {
      console.log('[DEBUG FRONTEND] NO se seteo streetGeometry. Condiciones no cumplidas o geometria vacia.');
    }
  }, [recorridoData?.geometria]);

  // ── Estados e interpolación visual (60 FPS) ───────────────────────────────
  // Estados de visualización inicializados desde el snapshot del caché (si existe).
  // Esto elimina el flash de posición vacía al re-entrar con un recorrido en progreso.
  const [displayPosition, setDisplayPosition] = useState<LatLng | null>(snapshotPos);
  // `displayHeading` se pasa al Marker como `rotation` (prop de react-native-maps).
  // Usar [0, 360) porque la prop `rotation` del Marker lo espera así.
  const [displayHeading, setDisplayHeading] = useState(snapshotHeading);
  // Progreso interpolado [0, 1] para recortar la polyline (no el % crudo del socket).
  const [displayProgress, setDisplayProgress] = useState(snapshotPct);

  // Refs para la interpolación lineal basada en tiempo;
  // inicializados desde snapshot para que la animación arranque desde la posición correcta.
  const startPosRef = useRef<LatLng | null>(snapshotPos);
  const startHeadingRef = useRef<number>(snapshotHeading);
  const targetPosRef = useRef<LatLng | null>(snapshotPos);
  const targetHeadingRef = useRef<number>(snapshotHeading);
  const startPercentageRef = useRef<number>(snapshotPct);
  const targetPercentageRef = useRef<number>(snapshotPct);
  // If we have a snapshot, seed tickStartTimeRef to now so the 60FPS loop
  // enters the animation branch immediately (no waiting for first socket tick).
  const tickStartTimeRef = useRef<number>(snapshotPos ? Date.now() : 0);
  const animPosRef = useRef<LatLng | null>(snapshotPos);
  const animHeadingRef = useRef<number>(snapshotHeading);
  const animPercentageRef = useRef<number>(snapshotPct);
  // isFirstTickRef: false si hay snapshot para no teleportar al camión al primer tick
  const isFirstTickRef = useRef<boolean>(!snapshotPos);

  // ── Throttle de cámara ─────────────────────────────────────────────────────
  // La cámara se actualiza máximo 1 vez cada 100ms para no saturar el hilo nativo.
  const lastCameraUpdateRef = useRef<number>(0);
  const CAMERA_THROTTLE_MS = 100;

  // ── Refs para persistencia del heading al salir del mapa ──────────────────
  // lastHeadingRef: el último heading animado. Se guarda en el caché al desmontar
  // para que al re-entrar la flecha apunte correctamente desde el primer frame.
  const lastHeadingRef = useRef<number>(snapshotHeading);
  // updateSnapshotRef: captura estable del callback del caché para el cleanup
  // (evita el problema de stale closure en efectos con deps vacías).
  const updateSnapshotRef = useRef(cache.updateSnapshot);
  // Actualizar en cada render para que el cleanup siempre use la versión más reciente
  updateSnapshotRef.current = cache.updateSnapshot;

  // tracksViewChanges is kept always-true (see declaration above).
  // Removing the old timer that turned it off — that was causing the arrow
  // to disappear on Android after 800 ms when the socket was slow.

  // ── Posición inicial inmediata (sin snapshot, sin esperar al socket) ───────
  // Al cargar el recorrido por primera vez (sin caché) la flecha aparece de
  // inmediato en el primer punto de la geometría / primer checkpoint.
  // Esto evita el "mapa vacío" durante la espera del primer tick del socket.
  useEffect(() => {
    // Solo actuar si aún no hay posición animada (primera entrada, sin snapshot)
    if (animPosRef.current) return;
    // Necesitamos al menos recorridoData para saber dónde colocar la flecha
    if (!recorridoData) return;

    let seedPos: LatLng | null = null;
    let seedHeading = 0;

    const geom = streetGeometryRef.current;
    if (geom.length >= 2) {
      // Usar el primer punto de la geometría y calcular heading inicial
      seedPos = geom[0];
      seedHeading = getHeadingFromGeometry(geom, 0);
    } else {
      // Sin geometría: usar el primer checkpoint
      const firstCp = recorridoData.checkpoints?.[0];
      if (firstCp) {
        const lat = Number(firstCp.latitud);
        const lng = Number(firstCp.longitud);
        if (!isNaN(lat) && !isNaN(lng)) {
          seedPos = { latitude: lat, longitude: lng };
        }
      }
    }

    if (!seedPos) return;

    animPosRef.current = seedPos;
    animHeadingRef.current = seedHeading;
    startPosRef.current = seedPos;
    startHeadingRef.current = seedHeading;
    targetPosRef.current = seedPos;
    targetHeadingRef.current = seedHeading;
    // Seed tickStartTimeRef so the 60FPS loop immediately enters the draw branch
    tickStartTimeRef.current = Date.now();
    setDisplayPosition(seedPos);
    setDisplayHeading(normalizeAngle(seedHeading));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorridoData, streetGeometry]);

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

    // Encontrar el segmento exacto sobre el que está el camión actualmente
    const totalDist = cumDistancesRef.current[cumDistancesRef.current.length - 1];
    const targetDist = Math.max(0, Math.min(porcentaje, 1)) * totalDist;
    
    let segStart = 0;
    let segEnd = cumDistancesRef.current.length - 1;
    while (segStart < segEnd - 1) {
      const mid = (segStart + segEnd) >> 1;
      if (cumDistancesRef.current[mid] <= targetDist) segStart = mid;
      else segEnd = mid;
    }
    lastSnappedIdxRef.current = segStart;

    // Heading desde el inicio del segmento actual hacia el siguiente punto distinto.
    // Garantiza que la flecha apunte en la dirección de la calle actual y solo gire al cambiar físicamente de calle.
    const rawHeading = getHeadingFromGeometry(streetGeometry, segStart);
    const prevHeading = targetHeadingRef.current;
    const delta = shortestAngleDelta(prevHeading, rawHeading);
    const newAccumulatedHeading = prevHeading + delta; // espacio acumulado para interpolación suave

    const currentAnimPct = animPercentageRef.current;
    const pctDiff = typeof currentAnimPct === 'number' ? Math.abs(porcentaje - currentAnimPct) : 1;
    // Si es el primer tick, no hay posición previa o hay un salto notable (> 0.03, ej. reingreso al mapa tras varios minutos):
    // posicionamos inmediatamente en el punto exacto en vivo sin animar lentamente desde la posición vieja.
    const shouldSnapDirectly = isFirstTickRef.current || !animPosRef.current || pctDiff > 0.03;

    if (shouldSnapDirectly) {
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

      // Sincronizar cámara inmediatamente con la nueva posición
      if (isFollowingRef.current && mapRef.current) {
        mapRef.current.setCamera({
          center: snapped,
          heading: normalizeAngle(newAccumulatedHeading),
          pitch: 60,
          zoom: 18.5,
        });
      }
    } else {
      // Registrar estado de partida desde la posición animada actual
      startPosRef.current = animPosRef.current
        ? { latitude: animPosRef.current.latitude, longitude: animPosRef.current.longitude }
        : snapped;
      startHeadingRef.current = animHeadingRef.current;
      startPercentageRef.current = animPercentageRef.current;
      targetPosRef.current = snapped;
      targetHeadingRef.current = newAccumulatedHeading;
      targetPercentageRef.current = porcentaje;
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

        const nextPct =
          startPercentageRef.current +
          (targetPercentageRef.current - startPercentageRef.current) * progress;

        const geom = streetGeometryRef.current;
        const cum = cumDistancesRef.current;
        // Posición SIEMPRE sobre la geometría, no en la cuerda entre ticks.
        // A x2/x4/x8 el % salta más, pero camión y línea recortada van juntos.
        const newAnimPos =
          geom.length >= 2 && cum.length === geom.length
            ? interpolateOnPath(geom, cum, nextPct)
            : {
                latitude: start.latitude + (target.latitude - start.latitude) * progress,
                longitude: start.longitude + (target.longitude - start.longitude) * progress,
              };
        const nextHeading =
          startHeadingRef.current +
          (targetHeadingRef.current - startHeadingRef.current) * progress;

        animPosRef.current = newAnimPos;
        animHeadingRef.current = nextHeading;
        animPercentageRef.current = nextPct;

        const normalizedHeading = normalizeAngle(nextHeading);
        lastHeadingRef.current = normalizedHeading; // persiste el heading para el caché al desmontar

        setDisplayPosition(newAnimPos);
        setDisplayHeading(normalizedHeading);
        setDisplayProgress(nextPct);

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
        // Antes del primer tick del socket: mostrar posición y heading del snapshot/caché
        // para que la flecha aparezca inmediatamente sin esperar al socket.
        setDisplayPosition(animPos);
        setDisplayHeading(normalizeAngle(animHeadingRef.current));
        setDisplayProgress(animPercentageRef.current);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ── Guardar heading en caché al desmontar el mapa ─────────────────────────
  // Permite que al re-entrar, la flecha apunte en la dirección correcta desde
  // el primer frame, sin esperar el próximo tick del socket (1 segundo).
  useEffect(() => {
    return () => {
      // updateSnapshotRef.current es siempre fresco gracias a la asignación
      // en el render anterior; evita la stale closure sin añadir deps.
      updateSnapshotRef.current({ heading: lastHeadingRef.current });
    };
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

  const handleFinalizar = () => {
    if (!recorridoData?.recorrido_id) return;

    showConfirm({
      title: 'Finalizar Recorrido',
      message:
        '¿Estás seguro de que deseas finalizar este recorrido? Esta acción registrará el fin del servicio y concluirá el rastreo GPS.',
      confirmText: 'Sí, finalizar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          setIsFinishing(true);
          await recorridosService.finalizarRecorrido(recorridoData.recorrido_id);
          // Actualizar contexto global
          await refreshData(false);
          // Alerta con diseño elegante de confirmación de fin de recorrido
          showSuccess(
            '¡Recorrido Concluido!',
            'El recorrido ha sido finalizado exitosamente. Excelente trabajo.',
            () => {
              cache.clear();
              router.replace('/');
            },
            {
              confirmText: 'Volver al Inicio',
            }
          );
        } catch (error) {
          console.error('Error finalizando recorrido:', error);
          showError(
            'Error al finalizar',
            'Hubo un problema al finalizar el recorrido en el servidor. Por favor intenta de nuevo.'
          );
        } finally {
          setIsFinishing(false);
        }
      },
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading || !recorridoData) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
    // Prioridad: posición actual del socket → snapshot del caché → primer checkpoint
    latitude:
      currentPosition && !isNaN(currentPosition.latitude)
        ? currentPosition.latitude
        : (snapshotPos?.latitude ?? safeLat),
    longitude:
      currentPosition && !isNaN(currentPosition.longitude)
        ? currentPosition.longitude
        : (snapshotPos?.longitude ?? safeLng),
    latitudeDelta: 0.004,  // ~400 m de radio — zoom de navegación inicial
    longitudeDelta: 0.004,
  };

  const formattedHoraInicio = recorridoData.hora_inicio
    ? new Date(recorridoData.hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

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
            strokeColor={theme.colors.success}
            strokeWidth={6}
            lineJoin="round"
            lineCap="round"
            zIndex={2}
          />
        )}

        {/* Markers de checkpoint */}
        {checkpoints.map((cp, idx) => {
          const isStart = idx === 0;
          const isEnd = idx === checkpoints.length - 1;
          const isNext = !isCompleted && stats.proximoCheckpoint === (cp.nombre || `Punto ${cp.orden}`);

          let markerBg = theme.colors.textMuted;
          let borderColor = theme.colors.border;
          let markerSize = 22;

          if (isStart) {
            markerBg = theme.colors.success; borderColor = '#ffffff';
          } else if (isEnd) {
            markerBg = theme.colors.destructive; borderColor = '#ffffff';
          } else if (isNext) {
            markerBg = theme.colors.warning; borderColor = '#ffffff'; markerSize = 28;
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
            // Billboard: el ícono queda anclado a la pantalla (flecha siempre arriba).
            // La cámara ya lleva el heading de la calle; rotar el Marker otra vez
            // (flat + rotation) lo dibuja 180° hacia atrás en Android.
            flat={false}
            anchor={{ x: 0.5, y: 0.5 }}
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
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textMuted,
    fontSize: 15,
  },
  cpMarker: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  cpMarkerNext: {
    borderWidth: 3,
    shadowColor: theme.colors.warning,
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