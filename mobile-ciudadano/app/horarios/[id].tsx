import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, Calendar } from 'lucide-react-native';
import { horariosService, RutaConHorarios } from '../../services/horariosService';

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  muted: '#94A3B8',
};

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function HorarioDetalleScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [data, setData] = useState<RutaConHorarios | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await horariosService.getHorariosByRuta(Number(id));
        setData(res);
      } catch (err) {
        setError('No se pudo cargar la información de la ruta.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    // timeStr format usually "17:00:00"
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${minutes} ${ampm}`;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={styles.loadingText}>Cargando horarios...</Text>
        </View>
      );
    }

    if (error || !data) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Ruta no encontrada'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Regresar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Determine active days
    const activeDaysSet = new Set(data.horarios.map(h => h.dia_semana));

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.routeHeader}>
          <Text style={styles.routeTitle}>{data.ruta.nombre}</Text>
          {data.ruta.descripcion && (
            <Text style={styles.routeDesc}>{data.ruta.descripcion}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendario Semanal</Text>
          <View style={styles.weekContainer}>
            {WEEK_DAYS.map(day => {
              const isActive = activeDaysSet.has(day as any);
              return (
                <View key={day} style={styles.dayColumn}>
                  <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>
                    {day.charAt(0)}
                  </Text>
                  <View style={[styles.dayDot, isActive && styles.dayDotActive]} />
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horarios Programados</Text>
          {data.horarios.length === 0 ? (
            <View style={styles.emptyCard}>
              <Calendar size={32} color={T.muted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyCardText}>No hay horarios registrados para esta ruta.</Text>
            </View>
          ) : (
            data.horarios.map(horario => (
              <View key={horario.id} style={styles.scheduleCard}>
                <View style={styles.scheduleDay}>
                  <Text style={styles.scheduleDayText}>{horario.dia_semana}</Text>
                </View>
                <View style={styles.scheduleTime}>
                  <Clock size={16} color={T.text} style={{ marginRight: 6 }} />
                  <Text style={styles.scheduleTimeText}>
                    {formatTime(horario.hora_inicio_estimada)} - {formatTime(horario.hora_fin_estimada)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={T.textH} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Horario de recolección</Text>
        <View style={{ width: 40 }} />
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.textH,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: T.text,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: T.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  routeHeader: {
    marginBottom: 24,
  },
  routeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: T.textH,
    marginBottom: 8,
  },
  routeDesc: {
    fontSize: 15,
    color: T.text,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.textH,
    marginBottom: 16,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: T.bgCard,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: T.muted,
    marginBottom: 8,
  },
  dayLabelActive: {
    color: T.textH,
  },
  dayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: T.border,
    backgroundColor: 'transparent',
  },
  dayDotActive: {
    borderColor: T.primary,
    backgroundColor: T.primary,
  },
  scheduleCard: {
    backgroundColor: T.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  scheduleDay: {
    marginBottom: 8,
  },
  scheduleDayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: T.textH,
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleTimeText: {
    fontSize: 15,
    color: T.text,
  },
  emptyCard: {
    backgroundColor: T.bgCard,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  emptyCardText: {
    fontSize: 15,
    color: T.text,
    textAlign: 'center',
  }
});
