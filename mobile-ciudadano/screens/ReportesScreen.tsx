import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { reportesService, ReporteCiudadano } from '../services/reportesService';

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

export function ReportesScreen() {
  const router = useRouter();
  const [reportes, setReportes] = useState<ReporteCiudadano[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportesService.getMisReportes();
      setReportes(data);
    } catch (err) {
      setError('No pudimos cargar tus reportes. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReportes();
    }, [fetchReportes])
  );

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
      case 'Pendiente': return <Clock size={16} color={color} />;
      case 'En proceso': return <ActivityIndicator size="small" color={color} />;
      case 'Cerrado': return <CheckCircle2 size={16} color={color} />;
      default: return <Clock size={16} color={color} />;
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderItem = ({ item }: { item: ReporteCiudadano }) => {
    const statusColor = getStatusColor(item.estado);

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/reportes/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.tipo_reporte}</Text>
          <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: `${statusColor}15` }]}>
            {getStatusIcon(item.estado, statusColor)}
            <Text style={[styles.statusText, { color: statusColor }]}>{item.estado}</Text>
          </View>
        </View>
        {item.descripcion && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.descripcion}
          </Text>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{formatDate(item.fecha_reporte)}</Text>
          {item.direccion_referencia && (
            <Text style={styles.locationText} numberOfLines={1}>📍 {item.direccion_referencia}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={styles.emptyText}>Cargando reportes...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>¡Ups!</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchReportes}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (reportes.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Sin reportes</Text>
          <Text style={styles.emptyText}>Aún no tienes reportes ciudadanos. Cuando crees uno, aparecerá aquí.</Text>
          <TouchableOpacity 
            style={styles.createFirstBtn}
            onPress={() => router.push('/reportes/crear')}
          >
            <Text style={styles.createFirstBtnText}>Crear mi primer reporte</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Reportes</Text>
        <Text style={styles.subtitle}>Historial de tus reportes ciudadanos.</Text>
      </View>

      <FlatList
        data={reportes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        onRefresh={fetchReportes}
        refreshing={loading && reportes.length > 0}
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/reportes/crear')}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: T.textH,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: T.text,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: T.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: T.textH,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: T.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 12,
  },
  dateText: {
    fontSize: 13,
    color: T.muted,
  },
  locationText: {
    fontSize: 13,
    color: T.muted,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: T.textH,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: T.text,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  retryBtn: {
    backgroundColor: T.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  createFirstBtn: {
    backgroundColor: T.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createFirstBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: T.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
});
