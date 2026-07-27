import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { Truck, User, Clock, CheckCircle2, Navigation, Zap, ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { recorridosService } from '../../services/recorridosService';
import { getMobileSocket } from '../../services/socketService';
import { useRouteSimulation, Checkpoint } from '../../hooks/useRouteSimulation';

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

const MapaRecorridoScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [recorridoData, setRecorridoData] = useState<any | null>(null);

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Cabecera Superior con botón de retorno */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
          <ArrowLeft size={20} color="#0f172a" />
          <Text style={styles.backButtonText}>Mis Asignaciones</Text>
        </TouchableOpacity>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.statusText}>{isCompleted ? 'Ruta Concluida' : 'GPS Activo'}</Text>
        </View>
      </View>

      {/* Tarjeta Superior de Información Compacta */}
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <View style={styles.routeBadge}>
            <View style={[styles.routeDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.routeName} numberOfLines={1}>{recorridoData.ruta_nombre}</Text>
          </View>
          <View style={styles.ecoBadge}>
            <Truck size={14} color="#10b981" />
            <Text style={styles.ecoText}>{recorridoData.numero_economico}</Text>
          </View>
        </View>

        <Text style={styles.coloniasText} numberOfLines={1}>
          📍 {recorridoData.colonias}
        </Text>

        <View style={styles.divider} />

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <User size={13} color="#64748b" />
            <Text style={styles.statLabel}>Conductor</Text>
            <Text style={styles.statValue} numberOfLines={1}>{recorridoData.conductor_nombre}</Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={13} color="#64748b" />
            <Text style={styles.statLabel}>Inicio / Transcur.</Text>
            <Text style={styles.statValue}>{formattedHoraInicio} ({stats.tiempoTranscurrido})</Text>
          </View>
          <View style={styles.statItem}>
            <ShieldCheck size={13} color="#64748b" />
            <Text style={styles.statLabel}>Avance</Text>
            <Text style={styles.statValue}>{Math.round(stats.porcentajeAvance)}% ({stats.completados}/{checkpoints.length})</Text>
          </View>
        </View>

        {/* Barra de progreso visual */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${stats.porcentajeAvance}%`, backgroundColor: '#10b981' }]} />
        </View>

        {/* Selector de velocidad configurable (Demo) */}
        <View style={styles.speedSection}>
          <View style={styles.speedLabelRow}>
            <Zap size={14} color="#f59e0b" />
            <Text style={styles.speedLabel}>Velocidad Simulación (Demo):</Text>
          </View>
          <View style={styles.speedButtonsRow}>
            {[1, 2, 5, 10].map((mult) => (
              <TouchableOpacity
                key={mult}
                style={[styles.speedBtn, speedMultiplier === mult && styles.speedBtnActive]}
                onPress={() => {
                  setSpeedMultiplier(mult);
                  if (recorridoData?.recorrido_id) {
                    recorridosService.cambiarVelocidad(recorridoData.recorrido_id, mult).catch((err) => {
                      console.error('[Velocidad] Error al cambiar velocidad en backend:', err);
                    });
                  }
                }}
              >
                <Text style={[styles.speedBtnText, speedMultiplier === mult && styles.speedBtnTextActive]}>
                  {mult}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Contenedor del Mapa GPS */}
      <View style={styles.mapContainer}>
        {/* Renderizado del mapa estándar sin estilos oscuros ni bucles de cámara que bloqueen teselas */}
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          region={currentPosition && !isNaN(currentPosition.latitude) ? {
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          } : undefined}
          showsUserLocation={false}
          showsCompass={true}
          toolbarEnabled={false}
        >
          {/* Polilínea de la ruta en verde distintivo de CleanGo */}
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor="#10b981"
              strokeWidth={6}
            />
          )}

          {/* Marcadores de Checkpoints */}
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
              markerBg = '#f59e0b'; // Resaltado ámbar brillante para el próximo punto
              borderColor = '#fef3c7';
              markerSize = 28;
            }

            const lat = Number(cp.latitud);
            const lng = Number(cp.longitud);

            if (isNaN(lat) || isNaN(lng)) return null;

            return (
              <Marker
                key={`cp-${cp.id}`}
                coordinate={{ latitude: lat, longitude: lng }}
                title={isNext ? `⚡ PRÓXIMO: ${cp.nombre || `Punto ${cp.orden}`}` : (cp.nombre || `Punto ${cp.orden}`)}
                description={isStart ? 'Inicio de Ruta' : isEnd ? 'Fin de Ruta' : isNext ? 'Siguiente punto de recolección' : `Punto ${cp.orden}`}
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

          {/* Marcador del Camión GPS (Posición actual en vivo, sincronizada con backend) */}
          {currentPosition && !isNaN(currentPosition.latitude) && !isNaN(currentPosition.longitude) && (
            <Marker
              coordinate={currentPosition}
              title="Camión CleanGo (En Ruta)"
              description={`Avance: ${stats.porcentajeAvance}% - ETA: ${etaMinutos} min`}
              zIndex={999}
              flat={true}
            >
              <View style={styles.truckMarkerContainer}>
                <View style={styles.truckMarkerPulse} />
                <View style={styles.truckMarkerInner}>
                  <Truck size={20} color="#ffffff" />
                </View>
              </View>
            </Marker>
          )}
        </MapView>

        {/* Botón flotante para recentrar y reorientar la cámara GPS en perspectiva 3D */}
        {currentPosition && (
          <TouchableOpacity
            style={styles.recenterButton}
            onPress={() => {
              mapRef.current?.animateCamera({
                center: currentPosition,
                pitch: 45,
                zoom: 16,
              }, { duration: 600 });
            }}
          >
            <Navigation size={22} color="#10b981" style={{ transform: [{ rotate: '45deg' }] }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Panel Inferior Flotante Tipo Navegación GPS Profesional */}
      <View style={styles.gpsNavPanel}>
        {/* Banner de Próximo Checkpoint */}
        <View style={styles.nextCpBanner}>
          <View style={styles.nextCpIconBox}>
            <Navigation size={20} color="#ffffff" style={{ transform: [{ rotate: '45deg' }] }} />
          </View>
          <View style={styles.nextCpTextBox}>
            <Text style={styles.nextCpLabel}>PRÓXIMO CHECKPOINT</Text>
            <Text style={styles.nextCpName} numberOfLines={1}>{stats.proximoCheckpoint}</Text>
          </View>
        </View>

        {/* Métricas de Navegación: ETA, Distancia y Hora Estimada */}
        <View style={styles.navMetricsRow}>
          <View style={styles.primaryMetric}>
            <Text style={styles.etaTimeText}>{isCompleted ? '0 min' : `${etaMinutos} min`}</Text>
            <View style={styles.metricSeparator} />
            <Text style={styles.distText}>{distanciaRestanteStr}</Text>
            <View style={styles.metricSeparator} />
            <View style={styles.etaClockRow}>
              <Clock size={14} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.clockText}>{stats.horaEstimada}</Text>
            </View>
          </View>
        </View>

        {/* Alerta si la ruta ha concluido */}
        {isCompleted && (
          <View style={styles.completedAlert}>
            <CheckCircle2 size={18} color="#065f46" />
            <Text style={styles.completedAlertText}>
              El vehículo ha llegado al destino final. La ruta concluyó.
            </Text>
          </View>
        )}

        {/* Botón de Acción Principal */}
        <TouchableOpacity
          style={[styles.finishButton, isCompleted && styles.finishButtonPulse]}
          onPress={handleFinalizar}
          disabled={isFinishing}
        >
          {isFinishing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <CheckCircle2 size={20} color="#ffffff" style={styles.finishBtnIcon} />
              <Text style={styles.finishButtonText}>Finalizar recorrido</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  routeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  ecoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ecoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 4,
  },
  coloniasText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '32%',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 2.5,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  speedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  speedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
    marginLeft: 4,
  },
  speedButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
    backgroundColor: '#fef3c7',
  },
  speedBtnActive: {
    backgroundColor: '#f59e0b',
  },
  speedBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  speedBtnTextActive: {
    color: '#ffffff',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  cpMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
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
  truckMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
  },
  truckMarkerPulse: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(16, 185, 129, 0.35)',
  },
  truckMarkerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  gpsNavPanel: {
    backgroundColor: '#0f172a',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  nextCpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  nextCpIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nextCpTextBox: {
    flex: 1,
  },
  nextCpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a7f3d0',
    letterSpacing: 0.5,
  },
  nextCpName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  navMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  primaryMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  etaTimeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10b981',
  },
  metricSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    marginHorizontal: 10,
  },
  distText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  etaClockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  completedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  completedAlertText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065f46',
    marginLeft: 8,
    flex: 1,
  },
  finishButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  finishButtonPulse: {
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#34d399',
  },
  finishBtnIcon: {
    marginRight: 8,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
