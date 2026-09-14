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
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Bell,
  Info,
  AlertTriangle,
  Route,
  MessageSquare,
  ArrowLeft,
  Check,
  CheckCircle2,
  MoreVertical,
  Trash2,
  CheckCheck,
  X,
  History,
} from 'lucide-react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import {
  getNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
  Notificacion,
  NotificacionesPaginadasResponse,
} from '../services/notificacionesService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../contexts/NotificationsContext';
import AnimatedReanimated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { AnimatedPressable, CleanGoOrbitRadar } from '../components/ui';
import { getMobileSocket } from '../services/socketService';
import { onForegroundMessage } from '../services/fcmService';

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
function getRelativeTimeString(dateString: string): string {
  if (!dateString) return 'Hace un momento';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(diffInSeconds) || diffInSeconds < 0) return 'Hace un momento';
    if (diffInSeconds < 60) return 'Hace un momento';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Ayer';
    if (diffInDays < 7) return `Hace ${diffInDays} d`;

    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } catch {
    return 'Hace un momento';
  }
}

// ─── Helpers de Categoría ──────────────────────────────────────────────────
function getIconForCategory(categoria: string) {
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
}

function getIconBackground(categoria: string) {
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
}

// ─── Item Tarjeta de Notificación con Swipe ──────────────────────────────
function NotificationCardItem({
  item,
  index = 0,
  onPressCard,
  onMarcarLeida,
  onDelete,
  onOpenItemMenu,
}: {
  item: Notificacion;
  index?: number;
  onPressCard: (id: number, yaLeida: boolean) => void;
  onMarcarLeida: (id: number) => void;
  onDelete: (item: Notificacion) => void;
  onOpenItemMenu: (item: Notificacion) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);

  const isLongText = item.mensaje.length > 90;
  const isUnread = item.leida === 0;

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteRightAction}
        activeOpacity={0.85}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete(item);
        }}
      >
        <Animated.View
          style={[
            styles.deleteActionContent,
            { transform: [{ translateX: trans }] },
          ]}
        >
          <Trash2 size={22} color="#FFFFFF" />
          <Text style={styles.deleteActionText}>Eliminar</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <AnimatedReanimated.View
      entering={FadeInDown.duration(350).delay(Math.min(index * 45, 300))}
      exiting={FadeOutRight.duration(200)}
      layout={LinearTransition.springify()}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={2}
        overshootRight={false}
        containerStyle={styles.swipeableContainer}
      >
        <TouchableOpacity
          style={[styles.card, isUnread && styles.cardUnread]}
          activeOpacity={0.9}
          onPress={() => onPressCard(item.id, !isUnread)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getIconBackground(item.categoria) },
                ]}
              >
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

            <View style={styles.statusRow}>
              {isUnread ? (
                <View style={styles.unreadDot} />
              ) : (
                <Check size={16} color={T.textMuted} />
              )}
              <TouchableOpacity
                style={styles.moreButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => onOpenItemMenu(item)}
              >
                <MoreVertical size={20} color={T.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.messageContainer}>
            <Text
              style={styles.mensaje}
              numberOfLines={expanded ? undefined : 3}
            >
              {item.mensaje}
            </Text>

            {isLongText && (
              <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                style={styles.expandButton}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.expandText}>
                  {expanded ? 'Mostrar menos' : 'Mostrar más'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isUnread && (
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={() => onMarcarLeida(item.id)}
              activeOpacity={0.7}
            >
              <CheckCircle2 size={16} color={T.primary} style={{ marginRight: 6 }} />
              <Text style={styles.markReadText}>Marcar como leída</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Swipeable>
    </AnimatedReanimated.View>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────
export function NotificacionesScreen() {
  const router = useRouter();
  const {
    notificaciones: cachedNotificaciones,
    setNotificaciones: setCachedNotificaciones,
    newNotification,
    clearNewNotification,
    decrementUnreadCount,
    setUnreadCount,
  } = useNotifications();

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(cachedNotificaciones || []);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(cachedNotificaciones === null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState<Notificacion | null>(null);

  useEffect(() => {
    if (newNotification) {
      const updateFn = (prev: Notificacion[]) => {
        if (prev.find((n) => n.id === newNotification.id)) return prev;
        return [newNotification, ...prev];
      };
      setNotificaciones(updateFn);
      setCachedNotificaciones((prev) => (prev ? updateFn(prev) : [newNotification]));
      setTotal((prev) => prev + 1);
      clearNewNotification();
    }
  }, [newNotification, clearNewNotification, setCachedNotificaciones]);

  const cachedNotificacionesRef = useRef(cachedNotificaciones);
  cachedNotificacionesRef.current = cachedNotificaciones;

  const fetchNotificaciones = useCallback(async (pageToFetch = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    if (cachedNotificacionesRef.current === null && !isRefresh && pageToFetch === 1) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await getNotificaciones(pageToFetch, 10);
      let items: Notificacion[] = [];
      let totalCount = 0;
      let currentPage = 1;
      let totalPgs = 1;
      let more = false;

      if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
        const resp = response as NotificacionesPaginadasResponse;
        items = resp.data;
        totalCount = resp.total;
        currentPage = resp.page;
        totalPgs = resp.totalPages;
        more = resp.hasMore ?? (currentPage < totalPgs);
      } else if (Array.isArray(response)) {
        items = response;
        totalCount = response.length;
        currentPage = 1;
        totalPgs = 1;
        more = false;
      }

      if (pageToFetch === 1) {
        setNotificaciones(items);
        setCachedNotificaciones(items);
        const unread = items.filter((n) => n.leida === 0).length;
        setUnreadCount(unread);
      } else {
        const updateWithNewItems = (prev: Notificacion[]) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newItems = items.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newItems];
        };
        setNotificaciones(updateWithNewItems);
        setCachedNotificaciones((prev) => (prev ? updateWithNewItems(prev) : items));
      }

      setPage(currentPage);
      setTotalPages(totalPgs);
      setTotal(totalCount);
      setHasMore(more);
    } catch (err: any) {
      const mensaje =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'No se pudieron cargar las notificaciones.';
      setError(mensaje);
      if (cachedNotificacionesRef.current === null && pageToFetch === 1) {
        setNotificaciones([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [setCachedNotificaciones, setUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      if (isActive) {
        fetchNotificaciones(1);
      }
      return () => {
        isActive = false;
      };
    }, [fetchNotificaciones])
  );

  useEffect(() => {
    const socket = getMobileSocket();
    const onNueva = () => {
      fetchNotificaciones(1, false);
    };
    if (socket) {
      socket.on('notificacion_nueva', onNueva);
      socket.on('connect', onNueva);
    }

    const unsubscribeFcm = onForegroundMessage(() => {
      fetchNotificaciones(1, false);
    });

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchNotificaciones(1, false);
      }
    });

    return () => {
      if (socket) {
        socket.off('notificacion_nueva', onNueva);
        socket.off('connect', onNueva);
      }
      unsubscribeFcm();
      subscription.remove();
    };
  }, [fetchNotificaciones]);

  const handleMarcarLeida = async (id: number) => {
    const target = notificaciones.find((n) => n.id === id);
    if (!target || target.leida === 1) return;

    // Actualización optimista local y en caché
    const updateFn = (list: Notificacion[]) =>
      list.map((n) => (n.id === id ? { ...n, leida: 1 as const } : n));
    setNotificaciones(updateFn);
    setCachedNotificaciones((prev) => (prev ? updateFn(prev) : prev));
    decrementUnreadCount();

    try {
      await marcarComoLeida(id);
    } catch (err) {
      // Revertir ante fallo: recarga lista y re-sincroniza contador
      fetchNotificaciones(1);
    }
  };

  const handleMarcarTodasComoLeidas = async () => {
    setIsHeaderMenuOpen(false);
    const sinLeerCount = notificaciones.filter((n) => n.leida === 0).length;
    if (sinLeerCount === 0) return;

    // Actualización optimista atómica
    const updateFn = (list: Notificacion[]) => list.map((n) => ({ ...n, leida: 1 as const }));
    setNotificaciones(updateFn);
    setCachedNotificaciones((prev) => (prev ? updateFn(prev) : prev));
    setUnreadCount(0);

    try {
      await marcarTodasComoLeidas();
    } catch (err) {
      // Revertir ante fallo: recarga lista y re-sincroniza contador
      fetchNotificaciones(1);
    }
  };

  const handleEliminarNotificacion = async (item: Notificacion) => {
    setSelectedItemForMenu(null);

    if (item.leida === 0) {
      decrementUnreadCount();
    }

    // Actualización optimista local y en caché
    const updateFn = (list: Notificacion[]) => list.filter((n) => n.id !== item.id);
    setNotificaciones(updateFn);
    setCachedNotificaciones((prev) => (prev ? updateFn(prev) : prev));
    setTotal((prev) => Math.max(0, prev - 1));

    try {
      await eliminarNotificacion(item.id);
    } catch (err) {
      // Revertir ante fallo: recarga lista y re-sincroniza contador
      fetchNotificaciones(1);
    }
  };

  const handleCargarAnteriores = useCallback(() => {
    if (isLoadingMore || !hasMore || page >= totalPages) return;
    setIsLoadingMore(true);
    fetchNotificaciones(page + 1);
  }, [isLoadingMore, hasMore, page, totalPages, fetchNotificaciones]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.radarWrapper}>
          <CleanGoOrbitRadar />
        </View>
        <Text style={styles.emptyTitle}>
          {error ? 'No se pudieron cargar' : 'Sin notificaciones'}
        </Text>
        <Text style={styles.emptyText}>
          {error || 'No tienes avisos ni notificaciones en este momento.'}
        </Text>
        {error ? (
          <AnimatedPressable onPress={() => fetchNotificaciones(1, true)} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </AnimatedPressable>
        ) : null}
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <AnimatedPressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <ArrowLeft size={20} color={T.textH} strokeWidth={2.2} />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Notificaciones</Text>

          <AnimatedPressable
            style={styles.headerMoreButton}
            accessibilityRole="button"
            accessibilityLabel="Más opciones"
            onPress={() => setIsHeaderMenuOpen(true)}
          >
            <MoreVertical size={20} color={T.textH} strokeWidth={2.2} />
          </AnimatedPressable>
        </View>

        {/* ── Content ── */}
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={T.primary} />
            <Text style={styles.loadingText}>Cargando notificaciones...</Text>
          </View>
        ) : error && notificaciones.length === 0 ? (
          <View style={styles.center}>
            <AlertTriangle size={48} color={T.destructive} style={{ marginBottom: 16 }} />
            <Text style={styles.errorText}>{error}</Text>
            <AnimatedPressable style={styles.retryButton} onPress={() => fetchNotificaciones(1)}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <FlatList
            data={notificaciones}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <NotificationCardItem
                item={item}
                index={index}
                onPressCard={(id, yaLeida) => {
                  if (!yaLeida) handleMarcarLeida(id);
                }}
                onMarcarLeida={handleMarcarLeida}
                onDelete={handleEliminarNotificacion}
                onOpenItemMenu={(notif) => setSelectedItemForMenu(notif)}
              />
            )}
            ListFooterComponent={
              hasMore ? (
                <View style={styles.loadMoreWrapper}>
                  <AnimatedPressable
                    style={styles.loadMoreBtn}
                    onPress={handleCargarAnteriores}
                    disabled={isLoadingMore}
                    accessibilityRole="button"
                    accessibilityLabel="Ver notificaciones anteriores"
                  >
                    {isLoadingMore ? (
                      <View style={styles.loadMoreInner}>
                        <ActivityIndicator size="small" color={T.primary} />
                        <Text style={styles.loadMoreText}>Cargando avisos anteriores...</Text>
                      </View>
                    ) : (
                      <View style={styles.loadMoreInner}>
                        <History size={16} color={T.primary} />
                        <Text style={styles.loadMoreText}>
                          Ver notificaciones anteriores
                          {total > notificaciones.length ? ` (${total - notificaciones.length})` : ''}
                        </Text>
                      </View>
                    )}
                  </AnimatedPressable>
                </View>
              ) : notificaciones.length > 0 ? (
                <View style={styles.endOfListWrapper}>
                  <View style={styles.endOfListDot} />
                  <Text style={styles.endOfListText}>Estás al día con todos tus avisos</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[styles.listContent, notificaciones.length === 0 && styles.listEmpty]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchNotificaciones(1, true)}
                colors={[T.primary]}
              />
            }
          />
        )}

        {/* Modal Menú Encabezado (Tres Puntos Superior) */}
        <Modal
          visible={isHeaderMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsHeaderMenuOpen(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setIsHeaderMenuOpen(false)}>
            <View style={styles.headerMenuContainer}>
              <TouchableOpacity
                style={styles.menuOptionRow}
                activeOpacity={0.7}
                onPress={handleMarcarTodasComoLeidas}
              >
                <CheckCheck size={20} color={T.primary} />
                <Text style={styles.menuOptionText}>Marcar todas como leídas</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Modal Menú Opción Ítem (Tres Puntos de la Notificación) */}
        <Modal
          visible={Boolean(selectedItemForMenu)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedItemForMenu(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedItemForMenu(null)}>
            <View style={styles.itemMenuContainer}>
              <View style={styles.itemMenuHeader}>
                <Text style={styles.itemMenuTitle} numberOfLines={1}>
                  {selectedItemForMenu?.titulo}
                </Text>
                <TouchableOpacity onPress={() => setSelectedItemForMenu(null)}>
                  <X size={20} color={T.textMuted} />
                </TouchableOpacity>
              </View>

              {selectedItemForMenu && selectedItemForMenu.leida === 0 && (
                <TouchableOpacity
                  style={styles.menuOptionRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (selectedItemForMenu) {
                      handleMarcarLeida(selectedItemForMenu.id);
                      setSelectedItemForMenu(null);
                    }
                  }}
                >
                  <Check size={20} color={T.primary} />
                  <Text style={styles.menuOptionText}>Marcar como leída</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.menuOptionRow}
                activeOpacity={0.7}
                onPress={() => {
                  if (selectedItemForMenu) {
                    handleEliminarNotificacion(selectedItemForMenu);
                  }
                }}
              >
                <Trash2 size={20} color={T.destructive} />
                <Text style={[styles.menuOptionText, { color: T.destructive }]}>
                  Eliminar notificación
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: T.textMuted,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: T.textH,
  },
  headerMoreButton: {
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

  // List
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  listEmpty: {
    flex: 1,
  },

  // Swipeable
  swipeableContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
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
    borderColor: '#BAE6FD',
    backgroundColor: '#F8FAFC',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.primary,
  },
  moreButton: {
    padding: 2,
  },
  messageContainer: {
    marginTop: 4,
  },
  mensaje: {
    fontSize: 14,
    color: T.textBody,
    lineHeight: 20,
  },
  expandButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.primary,
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

  // Swipe Action
  deleteRightAction: {
    backgroundColor: T.destructive,
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  deleteActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 10,
  },
  radarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: T.textH,
  },
  emptyText: {
    fontSize: 13,
    color: T.textMuted,
    textAlign: 'center',
    lineHeight: 20,
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

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  headerMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  itemMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    gap: 12,
  },
  itemMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  itemMenuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textH,
    flex: 1,
    marginRight: 12,
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textH,
  },

  // Paginación Estilo Conductor
  loadMoreWrapper: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  loadMoreBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1763A6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  loadMoreInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadMoreText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: T.primary,
    letterSpacing: 0.2,
  },
  endOfListWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  endOfListDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  endOfListText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
  },
});
