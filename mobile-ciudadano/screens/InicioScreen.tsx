import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { recorridosService, CiudadanoRecorridoActivo } from '../services/recorridosService';
import { MapPin } from 'lucide-react-native';
import { GarbageTruckIcon } from '../components/mapa/GarbageTruckIcon';

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  destructive: '#DC2626',
  success: '#16A34A',
};

export function InicioScreen() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const [activos, setActivos] = useState<CiudadanoRecorridoActivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivos = useCallback(async () => {
    try {
      const data = await recorridosService.getRecorridosActivos();
      setActivos(data);
    } catch (err) {
      console.error('Error fetching recorridos activos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchActivos();
      const interval = setInterval(fetchActivos, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchActivos]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivos();
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={styles.emptyText}>Buscando camiones activos...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={{ marginBottom: 16 }}>
          <GarbageTruckIcon size={88} />
        </View>
        <Text style={styles.emptyTitle}>No hay recorridos activos</Text>
        <Text style={styles.emptyText}>En este momento no hay camiones de recolección realizando su ruta.</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: CiudadanoRecorridoActivo }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/mapa/${item.recorrido_id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.routeBadge}>
          <MapPin size={14} color="#FFF" />
          <Text style={styles.routeBadgeText}>{item.ruta_nombre}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
          <Text style={[styles.statusText, { color: T.success }]}>En Camino</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.truckRow}>
          <GarbageTruckIcon size={44} />
          <Text style={styles.truckText}>Camión No. {item.numero_economico}</Text>
        </View>
        <Text style={styles.coloniasText} numberOfLines={2}>
          {item.colonias || 'Todas las colonias asignadas a la ruta'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.nombre}</Text>
          <Text style={styles.subtitle}>Sigue la ruta de tu camión en vivo</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activos}
        keyExtractor={(item) => item.recorrido_id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.primary]} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: T.textH,
  },
  subtitle: {
    fontSize: 14,
    color: T.text,
    marginTop: 4,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  logoutText: {
    color: T.text,
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  card: {
    backgroundColor: T.bgCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  routeBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardBody: {},
  truckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  truckText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.textH,
    flex: 1,
  },
  coloniasText: {
    fontSize: 14,
    color: T.text,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.textH,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: T.text,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
});
