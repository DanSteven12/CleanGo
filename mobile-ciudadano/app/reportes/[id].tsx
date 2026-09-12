import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBackendBaseUrl } from '../../services/api';
import { ArrowLeft, Clock, MapPin, CheckCircle2, AlertCircle, Settings } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { reportesService, ReporteCiudadano } from '../../services/reportesService';
import { AnimatedPressable } from '../../components/ui';

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  muted: '#94A3B8',
  pending: '#F59E0B',
  process: '#3B82F6',
  closed: '#10B981',
};

const BACKEND_URL = getBackendBaseUrl();

export default function ReporteDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [reporte, setReporte] = useState<ReporteCiudadano | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReporte = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportesService.getReporteById(Number(id));
      setReporte(data);
    } catch (err) {
      setError('No pudimos cargar la información del reporte.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchReporte();
    }
  }, [id, fetchReporte]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendiente': return T.pending;
      case 'En proceso': return T.process;
      case 'Cerrado': return T.closed;
      default: return T.muted;
    }
  };

  const getStatusIcon = (status: string, color: string) => {
    switch (status) {
      case 'Pendiente': return <Clock size={20} color={color} />;
      case 'En proceso': return <Settings size={20} color={color} />;
      case 'Cerrado': return <CheckCircle2 size={20} color={color} />;
      default: return <Clock size={20} color={color} />;
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={T.primary} />
      </SafeAreaView>
    );
  }

  if (error || !reporte) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
        <AlertCircle size={48} color={T.muted} style={{ marginBottom: 16 }} />
        <Text style={styles.errorTitle}>¡Ups!</Text>
        <Text style={styles.errorText}>{error || 'Reporte no encontrado'}</Text>
        <AnimatedPressable
          style={styles.backBtnError}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={styles.backBtnText}>Volver</Text>
        </AnimatedPressable>
      </SafeAreaView>
    );
  }

  const statusColor = getStatusColor(reporte.estado);
  const imageUrl = reporte.fotografia 
    ? (reporte.fotografia.startsWith('http') ? reporte.fotografia : `${BACKEND_URL}${reporte.fotografia}`)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <ArrowLeft size={20} color={T.textH} strokeWidth={2.2} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Detalle del Reporte</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.ScrollView
        entering={FadeInDown.duration(380).springify().damping(20)}
        contentContainerStyle={styles.scrollContent}
      >
        
        <View style={styles.mainCard}>
          <Text style={styles.reportType}>{reporte.tipo_reporte}</Text>
          <View style={styles.dateRow}>
            <Clock size={16} color={T.muted} />
            <Text style={styles.dateText}>{formatDate(reporte.fecha_reporte)}</Text>
          </View>

          <View style={[styles.statusBox, { backgroundColor: `${statusColor}10`, borderColor: statusColor }]}>
            {getStatusIcon(reporte.estado, statusColor)}
            <View style={styles.statusTextBox}>
              <Text style={[styles.statusLabel, { color: statusColor }]}>Estado actual</Text>
              <Text style={[styles.statusValue, { color: statusColor }]}>{reporte.estado}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <View style={styles.sectionBox}>
            <Text style={reporte.descripcion ? styles.descriptionText : styles.emptyText}>
              {reporte.descripcion || 'Sin comentarios adicionales.'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <View style={styles.sectionBox}>
            <View style={styles.locationRow}>
              <MapPin size={20} color={T.primary} />
              <Text style={styles.locationText}>
                {reporte.direccion_referencia || 'Ubicación GPS adjunta'}
              </Text>
            </View>
            <Text style={styles.coordsText}>
              Lat: {reporte.latitud}, Lng: {reporte.longitud}
            </Text>
          </View>
        </View>

        {imageUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidencia</Text>
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.evidenceImage}
              resizeMode="cover"
            />
          </View>
        )}

      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: T.bgPage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textH,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mainCard: {
    backgroundColor: T.bgCard,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  reportType: {
    fontSize: 22,
    fontWeight: '700',
    color: T.textH,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 14,
    color: T.muted,
    marginLeft: 6,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusTextBox: {
    marginLeft: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: T.textH,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionBox: {
    backgroundColor: T.bgCard,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  descriptionText: {
    fontSize: 15,
    color: T.text,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 15,
    color: T.muted,
    fontStyle: 'italic',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 15,
    color: T.textH,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  coordsText: {
    fontSize: 13,
    color: T.muted,
    marginLeft: 28,
  },
  evidenceImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textH,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: T.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  backBtnError: {
    backgroundColor: T.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
