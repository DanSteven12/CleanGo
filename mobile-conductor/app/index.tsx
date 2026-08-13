// mobile-conductor/app/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AsignacionCard } from '../components/AsignacionCard';
import { recorridosService } from '../services/recorridosService';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { camion, logout } = useAuth();
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [finishingId, setFinishingId] = useState<number | null>(null);

  const fetchAsignaciones = useCallback(async () => {
    try {
      const data = await recorridosService.getAsignaciones();
      // Validar que data sea un arreglo antes de filtrar
      if (Array.isArray(data)) {
        const filtradas = data.filter((a: any) => {
          if (!a.estatus_recorrido) return true;
          const estatus = a.estatus_recorrido.toString().toLowerCase().trim();
          return estatus === 'pendiente' || estatus === 'en progreso' || estatus === 'en_progreso' || estatus === 'en progreso';
        });
        setAsignaciones(filtradas);
      } else {
        console.warn('[HomeScreen] Respuesta de asignaciones no es un arreglo:', data);
        setAsignaciones([]);
      }
    } catch (error: any) {
      console.error('Error fetching asignaciones:', error);
      const detailMsg = error?.response?.data?.message || error?.message || 'Error de conexión con el servidor.';
      Alert.alert('Error al cargar asignaciones', detailMsg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAsignaciones();
  }, [fetchAsignaciones]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAsignaciones();
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar la sesión de este dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleIniciarRecorrido = async (asignacion: any, conductorRealNombre?: string) => {
    setStartingId(asignacion.id);
    try {
      await recorridosService.iniciarRecorrido(asignacion.id, asignacion.ruta_id, conductorRealNombre);
      Alert.alert('Éxito', 'Recorrido iniciado correctamente.', [
        { text: 'Abrir Mapa', onPress: () => router.push({ pathname: '/mapa/[id]' as any, params: { id: String(asignacion.id) } }) }
      ]);
      fetchAsignaciones();
    } catch (error) {
      console.error('Error al iniciar recorrido:', error);
      Alert.alert('Error', 'No se pudo iniciar el recorrido.');
    } finally {
      setStartingId(null);
    }
  };

  const handleFinalizarRecorrido = async (asignacion: any) => {
    setFinishingId(asignacion.id);
    try {
      const recorridoActivo = await recorridosService.getRecorridoActivo(asignacion.id);
      if (!recorridoActivo || !recorridoActivo.recorrido_id) {
        throw new Error('No se encontró el recorrido activo.');
      }

      await recorridosService.finalizarRecorrido(recorridoActivo.recorrido_id);
      Alert.alert('Éxito', 'Recorrido finalizado correctamente.');
      fetchAsignaciones();
    } catch (error) {
      console.error('Error al finalizar recorrido:', error);
      Alert.alert('Error', 'No se pudo finalizar el recorrido.');
    } finally {
      setFinishingId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1763A6" />
        <Text style={styles.loadingText}>Cargando asignaciones...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Mis Asignaciones</Text>
          <Text style={styles.subtitle}>Recorridos pendientes y activos de hoy</Text>
          {/* Info del camión autenticado */}
          {camion && (
            <View style={styles.camionBadge}>
              <Text style={styles.camionBadgeText}>
                🚛 {camion.numero_economico} · {camion.placa}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutIcon}>⏻</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={asignaciones}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#1763A6']} />
        }
        renderItem={({ item }) => (
          <AsignacionCard
            asignacion={item}
            isStarting={startingId === item.id}
            isFinishing={finishingId === item.id}
            onIniciar={(conductor) => handleIniciarRecorrido(item, conductor)}
            onFinalizar={() => handleFinalizarRecorrido(item)}
            onVerMapa={() => router.push({ pathname: '/mapa/[id]' as any, params: { id: String(item.id) } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>No tienes asignaciones pendientes.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  camionBadge: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  camionBadgeText: {
    fontSize: 12,
    color: '#1763A6',
    fontWeight: '600',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 4,
  },
  logoutIcon: {
    fontSize: 18,
    color: '#ef4444',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
});
