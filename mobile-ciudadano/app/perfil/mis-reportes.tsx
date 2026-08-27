// mobile-ciudadano/app/perfil/mis-reportes.tsx
/**
 * Pantalla de historial de reportes del ciudadano autenticado.
 *
 * Accede desde: Perfil → "Mis reportes"
 * Endpoint: GET /api/ciudadano/reportes (reutiliza reportesService.getMisReportes)
 * El backend garantiza que solo se devuelven los reportes del usuario autenticado.
 *
 * Estados:
 *  - loading: ActivityIndicator centralizado
 *  - datos: FlatList con tarjetas de reporte
 *  - vacío: empty state con icono y mensaje
 *  - error: mensaje + botón "Reintentar"
 *
 * Navegación:
 *  - Tap en tarjeta → /reportes/:id (pantalla de detalle existente)
 *  - Botón back → regresa al Perfil
 *  - useFocusEffect: refresca la lista cada vez que se vuelve a esta pantalla
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  RefreshCw,
} from 'lucide-react-native';
import { reportesService, ReporteCiudadano } from '../../services/reportesService';

// ─── Design Tokens (idénticos al resto de la app) ─────────────────────────────

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  muted: '#94A3B8',
  pending: '#F59E0B',
  pendingBg: '#FFFBEB',
  process: '#3B82F6',
  processBg: '#EFF6FF',
  closed: '#10B981',
  closedBg: '#F0FDF4',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusColor(estado: string): string {
  switch (estado) {
    case 'Pendiente': return T.pending;
    case 'En proceso': return T.process;
    case 'Cerrado': return T.closed;
    default: return T.muted;
  }
}

function getStatusBg(estado: string): string {
  switch (estado) {
    case 'Pendiente': return T.pendingBg;
    case 'En proceso': return T.processBg;
    case 'Cerrado': return T.closedBg;
    default: return '#F8FAFC';
  }
}

function getStatusIcon(estado: string, color: string): React.ReactNode {
  switch (estado) {
    case 'Pendiente':
      return <Clock size={14} color={color} strokeWidth={2.5} />;
    case 'En proceso':
      return <ActivityIndicator size="small" color={color} />;
    case 'Cerrado':
      return <CheckCircle2 size={14} color={color} strokeWidth={2.5} />;
    default:
      return <Clock size={14} color={color} strokeWidth={2.5} />;
  }
}

function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Componente: Tarjeta de Reporte ──────────────────────────────────────────

interface ReporteCardProps {
  item: ReporteCiudadano;
  onPress: () => void;
}

function ReporteCard({ item, onPress }: ReporteCardProps) {
  const statusColor = getStatusColor(item.estado);
  const statusBg = getStatusBg(item.estado);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Reporte: ${item.tipo_reporte}, estado: ${item.estado}`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.tipo_reporte}
        </Text>
        <View style={[
          styles.statusBadge,
          { borderColor: statusColor, backgroundColor: statusBg },
        ]}>
          {getStatusIcon(item.estado, statusColor)}
          <Text style={[styles.statusText, { color: statusColor }]}>
            {item.estado}
          </Text>
        </View>
      </View>

      {item.descripcion ? (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.descripcion}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.cardFooterLeft}>
          <Clock size={13} color={T.muted} strokeWidth={2} />
          <Text style={styles.dateText}>{formatDate(item.fecha_reporte)}</Text>
        </View>
        {item.direccion_referencia ? (
          <Text style={styles.locationText} numberOfLines={1}>
            📍 {item.direccion_referencia}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function MisReportesScreen() {
  const router = useRouter();

  const [reportes, setReportes] = useState<ReporteCiudadano[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch de reportes ─────────────────────────────────────────────────────

  const fetchReportes = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await reportesService.getMisReportes();
      setReportes(data);
    } catch {
      setError('No pudimos cargar tus reportes. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refrescar cada vez que la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      fetchReportes();
    }, [fetchReportes])
  );

  const handleRefresh = useCallback(() => {
    fetchReportes(true);
  }, [fetchReportes]);

  // ── Navegar al detalle ────────────────────────────────────────────────────

  const handleReportePress = useCallback((id: number) => {
    router.push(`/reportes/${id}` as any);
  }, [router]);

  // ── Navegar a crear reporte ────────────────────────────────────────────────

  const handleCrear = useCallback(() => {
    router.push('/reportes/crear' as any);
  }, [router]);

  // ── Renderizar tarjeta ────────────────────────────────────────────────────

  const renderItem = useCallback(({ item }: { item: ReporteCiudadano }) => (
    <ReporteCard
      item={item}
      onPress={() => handleReportePress(item.id)}
    />
  ), [handleReportePress]);

  const keyExtractor = useCallback((item: ReporteCiudadano) => item.id.toString(), []);

  // ── Empty / Error states ──────────────────────────────────────────────────

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={styles.loadingText}>Cargando reportes...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconBg}>
            <AlertCircle size={36} color={T.muted} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>¡Ups!</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchReportes()}
            activeOpacity={0.8}
          >
            <RefreshCw size={16} color="#FFF" strokeWidth={2.5} />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Lista vacía
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIconBg}>
          <FileText size={36} color={T.muted} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>Sin reportes todavía</Text>
        <Text style={styles.emptyText}>
          Cuando envíes un reporte aparecerá aquí.
        </Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleCrear}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFF" strokeWidth={2.5} />
          <Text style={styles.createBtnText}>Crear mi primer reporte</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Header ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Volver al perfil"
        >
          <ArrowLeft size={24} color={T.textH} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Reportes</Text>
        {/* Espaciador para centrar el título */}
        <View style={{ width: 40 }} />
      </View>

      {/* Contador de reportes */}
      {!loading && !error && reportes.length > 0 && (
        <View style={styles.countBar}>
          <Text style={styles.countText}>
            {reportes.length} {reportes.length === 1 ? 'reporte' : 'reportes'} encontrados
          </Text>
        </View>
      )}

      {/* Lista */}
      <FlatList
        data={loading ? [] : reportes}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          (loading || error || reportes.length === 0) && styles.listContentCenter,
        ]}
        ListEmptyComponent={renderEmpty}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
        // Evita warnings de VirtualizedList anidado:
        // Esta FlatList es el único ScrollView en esta pantalla
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {/* FAB — Crear nuevo reporte */}
      {!loading && !error && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCrear}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Crear nuevo reporte"
        >
          <Plus size={24} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: T.bgPage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textH,
  },

  // ── Contador ─────────────────────────────────────────────────────────────────
  countBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  countText: {
    fontSize: 13,
    color: T.muted,
    fontWeight: '500',
  },

  // ── Lista ────────────────────────────────────────────────────────────────────
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  listContentCenter: {
    justifyContent: 'center',
    alignItems: 'stretch',
  },

  // ── Tarjeta de reporte ───────────────────────────────────────────────────────
  card: {
    backgroundColor: T.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textH,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 13,
    color: T.text,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 10,
    gap: 8,
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    color: T.muted,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 12,
    color: T.muted,
    flex: 1,
    textAlign: 'right',
  },

  // ── Empty / Error states ─────────────────────────────────────────────────────
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  loadingText: {
    fontSize: 15,
    color: T.muted,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textH,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: T.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── FAB ─────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: T.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
