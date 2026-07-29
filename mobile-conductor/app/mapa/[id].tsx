import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
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

// Función auxiliar para calcular distancia con fórmula Haversine (en km)
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Función auxiliar para calcular el heading (orientación)
const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const MapaRecorridoScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [recorridoData, setRecorridoData] = useState<any | null>(null);

  const [heading, setHeading] = useState(0);
  const prevPosRef = useRef<{ latitude: number; longitude: number } | null>(null);
  // Refs para el modo seguimiento automático (Cambios 2 y 3)
  const isFollowingRef = useRef(false);
  const hasMountedCameraRef = useRef(false);

  const fetchRecorridoActivo = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await recorridosService.getRecorridoActivo(Number(id));
      console.log('[MAPA] Datos recibidos:', data?.ruta_nombre, 'Checkpoints:', data?.checkpoints?.length);
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
  
  const {
    currentPosition,
    speedMultiplier, // Mantenemos para compatibilidad con useRouteSimulation
    setSpeedMultiplier, // Mantenemos
    isCompleted,
    stats,
  } = useRouteSimulation({
    recorridoId: recorridoData?.recorrido_id || null,
    checkpoints,
    horaInicio: recorridoData?.hora_inicio || null,
    rutaId: recorridoData?.ruta_id,
  });

  // Calcular heading y manejar cámara automática (Cambios 2 y 3)
  useEffect(() => {
    if (!currentPosition) return;

    // Cambio 2: posicionamiento inicial de la cámara en el primer fix de posición
    if (!hasMountedCameraRef.current) {
      hasMountedCameraRef.current = true;
      isFollowingRef.current = true;
      setTimeout(() => {
        mapRef.current?.animateCamera(
          { center: currentPosition, zoom: 17, heading: 0 },
          { duration: 800 }
        );
      }, 900); // espera a que el mapa esté listo
    }

    if (prevPosRef.current) {
      const { latitude: lat1, longitude: lon1 } = prevPosRef.current;
      const { latitude: lat2, longitude: lon2 } = currentPosition;
      if (lat1 !== lat2 || lon1 !== lon2) {
        const newHeading = getBearing(lat1, lon1, lat2, lon2);
        setHeading(newHeading);
        // Cambio 3: seguimiento automático con rotación cuando el vehículo se mueve
        if (isFollowingRef.current && mapRef.current) {
          mapRef.current.animateCamera(
            { center: currentPosition, heading: newHeading },
            { duration: 350 }
          );
        }
      }
    }
    prevPosRef.current = currentPosition;
  }, [currentPosition]);

  // Ajustar la cámara inicial a los checkpoints una vez que cargan, sin bucles imperativos continuos
  useEffect(() => {
    if (checkpoints.length > 0 && mapRef.current && !hasCenteredRef.current) {
      const coords = checkpoints
        .map((c) => ({
          latitude: Number(c.latitud),
          longitude: Number(c.longitud),
        }))
        .filter((c) => !isNaN(c.latitude) && !isNaN(c.longitude));

      if (coords.length > 0) {
        hasCenteredRef.current = true;
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 70, right: 70, bottom: 250, left: 70 },
            animated: true,
          });
        }, 600);
      }
    }
  }, [checkpoints]);

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

  if (isLoading || !recorridoData) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Cargando mapa GPS y ruta de recolección...</Text>
      </SafeAreaView>
    );
  }

  const polylineCoords = checkpoints
    .map((c) => ({
      latitude: Number(c.latitud),
      longitude: Number(c.longitud),
    }))
    .filter((c) => !isNaN(c.latitude) && !isNaN(c.longitude));

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
    if (totalKm >= 1) {
      distanciaRestanteStr = `${totalKm.toFixed(1)} km`;
    } else {
      distanciaRestanteStr = `${Math.round(totalKm * 1000)} m`;
    }
  }

  return (
    <View style={styles.container}>
      {/* 1. Turn Instruction Card (Google Maps style top bar) */}
      {!isCompleted && (
        <TurnInstructionCard 
          distancia={distanciaRestanteStr}
          proximoDestino={stats.proximoCheckpoint}
        />
      )}

      {/* 2. Navigation Header (Compact info) */}
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
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#10b981"
            strokeWidth={6}
          />
        )}

        {checkpoints.map((cp, idx) => {
          const isStart = idx === 0;
          const isEnd = idx === checkpoints.length - 1;
          const isNext = !isCompleted && stats.proximoCheckpoint === (cp.nombre || `Punto ${cp.orden}`);

          let markerBg = '#475569';
          let borderColor = '#94a3b8';
          let markerSize = 22;

          if (isStart) {
            markerBg = '#10b981';
            borderColor = '#ffffff';
          } else if (isEnd) {
            markerBg = '#ef4444';
            borderColor = '#ffffff';
          } else if (isNext) {
            markerBg = '#f59e0b';
            borderColor = '#ffffff';
            markerSize = 28;
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

        {currentPosition && !isNaN(currentPosition.latitude) && !isNaN(currentPosition.longitude) && (
          <Marker
            coordinate={currentPosition}
            zIndex={999}
            flat={true}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <NavigationArrow heading={heading} />
          </Marker>
        )}
      </MapView>

      {/* 5. Floating Controls */}
      {currentPosition && (
        <NavigationControls 
          onRecenter={() => {
            // Reactiva el seguimiento automático (Cambio 3)
            isFollowingRef.current = true;
            mapRef.current?.animateCamera({
              center: currentPosition,
              zoom: 17,
              heading: heading,
            }, { duration: 600 });
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
