import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AsignacionCard } from '../components/AsignacionCard';
import { recorridosService } from '../services/recorridosService';

export default function HomeScreen() {
  const router = useRouter();
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
          if (!a.estatus_recorrido) return true; // Si no tiene estatus explícito, mostrarlo por defecto
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
      // Necesitamos el recorrido_id activo
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
        <Text style={styles.title}>Mis Asignaciones</Text>
        <Text style={styles.subtitle}>Recorridos pendientes y activos de hoy</Text>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
