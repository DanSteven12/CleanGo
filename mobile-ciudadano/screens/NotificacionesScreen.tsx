import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Info, AlertTriangle, Route, MessageSquare, ArrowLeft, Check, CheckCircle2 } from 'lucide-react-native';
import { getNotificaciones, marcarComoLeida, Notificacion } from '../services/notificacionesService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../contexts/NotificationsContext';

const T = {
  primary: '#1763A6',
  primaryLight: '#E8F1F8',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#1E293B',
  textBody: '#334155',
  textMuted: '#64748B',
  border: '#E2E8F0',
  destructive: '#DC2626',
  warning: '#D97706',
  success: '#16A34A',
};

// ─── Utilidad para formato de fecha relativa ──────────────────────────────
function getRelativeTimeString(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Hace un momento';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Ayer';
  if (diffInDays < 7) return `Hace ${diffInDays} d`;
  
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// ─── Componente Principal ─────────────────────────────────────────────

export function NotificacionesScreen() {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { newNotification, clearNewNotification, decrementUnreadCount } = useNotifications();

  React.useEffect(() => {
    if (newNotification) {
      // Evitar duplicados por ID
      setNotificaciones((prev) => {
        if (prev.find((n) => n.id === newNotification.id)) return prev;
        return [newNotification, ...prev];
      });
      clearNewNotification();
    }
  }, [newNotification, clearNewNotification]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const data = await getNotificaciones();
      setNotificaciones(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar las notificaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      if (isActive) {
        loadData();
      }
      return () => {
        isActive = false;
      };
    }, [])
  );

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Refrescar lista si el usuario vuelve a la app y ya estaba en esta pantalla
        loadData(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleMarcarLeida = async (id: number) => {
    // Optimistic UI update
    setNotificaciones(prev => 
      prev.map(n => n.id === id ? { ...n, leida: 1 } : n)
    );
    try {
      await marcarComoLeida(id);
      decrementUnreadCount();
    } catch (err) {
      // Revertir si falla
      loadData();
    }
  };

  // ── Renderizado de Icono según Categoría ────────────────────────────
  const getIconForCategory = (categoria: string) => {
    switch (categoria) {
      case 'REPORTE':
        return <MessageSquare size={20} color={T.primary} />;
      case 'RECORRIDO':
      case 'RUTA':
        return <Route size={20} color={T.success} />;
      case 'AVISO':
        return <Info size={20} color={T.warning} />;
      default:
        return <Bell size={20} color={T.textMuted} />;
    }
  };

  const getIconBackground = (categoria: string) => {
    switch (categoria) {
      case 'REPORTE':
        return T.primaryLight;
      case 'RECORRIDO':
      case 'RUTA':
        return '#F0FDF4'; // bg-green-50
      case 'AVISO':
        return '#FEF3C7'; // bg-amber-50
      default:
        return T.bgPage;
    }
  };

  // ── Render Item ───────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Notificacion }) => {
    const isUnread = item.leida === 0;

    return (
      <View style={[styles.card, isUnread && styles.cardUnread]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconContainer, { backgroundColor: getIconBackground(item.categoria) }]}>
              {getIconForCategory(item.categoria)}
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.titulo} numberOfLines={2}>
                {item.titulo}
              </Text>
              <Text style={styles.fecha}>
                {getRelativeTimeString(item.created_at)}
              </Text>
            </View>
          </View>
          {isUnread ? (
            <View style={styles.unreadDot} />
          ) : (
            <Check size={16} color={T.textMuted} />
          )}
        </View>

        <Text style={styles.mensaje}>{item.mensaje}</Text>

        {isUnread && (
          <TouchableOpacity 
            style={styles.markReadButton}
            onPress={() => handleMarcarLeida(item.id)}
            activeOpacity={0.7}
          >
            <CheckCircle2 size={16} color={T.primary} style={{ marginRight: 6 }} />
            <Text style={styles.markReadText}>Marcar como leída</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <Bell size={32} color={T.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No tienes notificaciones</Text>
        <Text style={styles.emptyText}>
          Te avisaremos cuando haya actualizaciones sobre tus reportes o información importante.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <ArrowLeft size={24} color={T.textH} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
      </View>

      {/* ── Content ── */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AlertTriangle size={48} color={T.destructive} style={{ marginBottom: 16 }} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.listContent, notificaciones.length === 0 && styles.listEmpty]}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => loadData(true)} 
              colors={[T.primary]} 
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textH,
  },

  // List
  listContent: {
    padding: 16,
    gap: 12,
  },
  listEmpty: {
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: T.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    borderColor: '#BAE6FD', // light blue border
    backgroundColor: '#F8FAFC', // slightly different bg for unread
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
    paddingRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textH,
    marginBottom: 2,
  },
  fecha: {
    fontSize: 12,
    color: T.textMuted,
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.primary,
    marginTop: 6,
  },
  mensaje: {
    fontSize: 14,
    color: T.textBody,
    lineHeight: 20,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: T.primaryLight,
    borderRadius: 8,
  },
  markReadText: {
    color: T.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: T.textH,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: T.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Error State
  errorText: {
    fontSize: 16,
    color: T.textBody,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: T.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
