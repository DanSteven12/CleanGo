// mobile-conductor/screens/HistorialScreen.tsx
/**
 * Pantalla de Historial de Recorridos — Tab 5 del Bottom Navigation.
 *
 * Muestra únicamente los recorridos completados del camión autenticado.
 * El backend identifica el camión desde el JWT — nunca desde parámetros del cliente.
 *
 * Características:
 *  - Lista paginada de recorridos (20 por página)
 *  - Pull-to-refresh para actualizar
 *  - Carga incremental al llegar al final de la lista
 *  - Estado vacío cuando el camión no tiene recorridos
 *  - Estado de error con botón "Reintentar"
 *  - Solo lectura — sin acciones de modificación ni eliminación
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { History, ClipboardX } from 'lucide-react-native';
import { HistorialCard } from '../components/HistorialCard';
import { recorridosService } from '../services/recorridosService';
import type { RecorridoHistorial } from '../services/recorridosService';
import { theme } from '../theme/colors';

// ─── Component ────────────────────────────────────────────────────────────────

export function HistorialScreen() {
  const [recorridos, setRecorridos] = useState<RecorridoHistorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Evitar llamadas duplicadas al cargar más
  const isLoadingMoreRef = useRef(false);

  // ─── Carga inicial / refresh ─────────────────────────────────────────────────

  const fetchHistorial = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      const data = await recorridosService.getHistorial(1);
      setRecorridos(data.data);
      setPage(1);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo cargar el historial. Verifica tu conexión.';
      setError(msg);
      if (isRefresh) {
        // En refresh, conservar datos anteriores para no dejar pantalla vacía
        setRecorridos((prev) => prev);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  // ─── Pull-to-refresh ─────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchHistorial(true);
  }, [fetchHistorial]);

  // ─── Paginación: cargar más al llegar al final ───────────────────────────────

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || page >= totalPages) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;
      const data = await recorridosService.getHistorial(nextPage);
      setRecorridos((prev) => [...prev, ...data.data]);
      setPage(nextPage);
      setTotalPages(data.totalPages);
    } catch {
      // Silenciar error de paginación — el usuario puede hacer pull-to-refresh
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [page, totalPages]);

  // ─── Estados especiales ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  if (error && recorridos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Historial</Text>
          <Text style={styles.subtitle}>Recorridos completados</Text>
        </View>
        <View style={styles.center}>
          <ClipboardX size={44} color="#cbd5e1" />
          <Text style={styles.errorTitle}>No se pudo cargar</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setIsLoading(true);
              fetchHistorial();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Render principal ────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Encabezado fijo */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrapper}>
            <History size={20} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>Historial</Text>
            <Text style={styles.subtitle}>Recorridos completados</Text>
          </View>
        </View>
        {total > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{total}</Text>
          </View>
        )}
      </View>

      {/* Lista de recorridos */}
      <FlatList
        data={recorridos}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => <HistorialCard recorrido={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <History size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Sin recorridos aún</Text>
            <Text style={styles.emptyText}>
              Los recorridos completados por este camión aparecerán aquí.
            </Text>
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.activeBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    color: theme.colors.primaryForeground,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: theme.colors.primaryForeground,
    fontSize: 14,
    fontWeight: '700',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
