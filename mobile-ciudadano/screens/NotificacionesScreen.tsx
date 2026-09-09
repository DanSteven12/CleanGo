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
} from 'lucide-react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import {
  getNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
  Notificacion,
} from '../services/notificacionesService';
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
  onPressCard,
  onMarcarLeida,
  onDelete,
  onOpenItemMenu,
}: {
  item: Notificacion;
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
  );
}

// ─── Componente Principal ─────────────────────────────────────────────
export function NotificacionesScreen() {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState<Notificacion | null>(null);

  const { newNotification, clearNewNotification, decrementUnreadCount } = useNotifications();

  useEffect(() => {
    if (newNotification) {
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
      setNotificaciones(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar las notificaciones');
      setNotificaciones([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      if (isActive) {
        loadData();
      }
      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadData(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleMarcarLeida = async (id: number) => {
    const target = notificaciones.find((n) => n.id === id);
    if (!target || target.leida === 1) return;

    // Actualización optimista
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: 1 } : n))
    );
    decrementUnreadCount();

    try {
      await marcarComoLeida(id);
    } catch (err) {
      // Revertir ante fallo
      loadData();
    }
  };

  const handleMarcarTodasComoLeidas = async () => {
    setIsHeaderMenuOpen(false);
    const sinLeerCount = notificaciones.filter((n) => n.leida === 0).length;
    if (sinLeerCount === 0) return;

    // Actualización optimista
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: 1 })));
    for (let i = 0; i < sinLeerCount; i++) {
      decrementUnreadCount();
    }

    try {
      await marcarTodasComoLeidas();
    } catch (err) {
      loadData();
    }
  };

  const handleEliminarNotificacion = async (item: Notificacion) => {
    setSelectedItemForMenu(null);

    if (item.leida === 0) {
      decrementUnreadCount();
    }

    // Actualización optimista
    setNotificaciones((prev) => prev.filter((n) => n.id !== item.id));

    try {
      await eliminarNotificacion(item.id);
    } catch (err) {
      loadData();
    }
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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

          <TouchableOpacity
            style={styles.headerMoreButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setIsHeaderMenuOpen(true)}
          >
            <MoreVertical size={24} color={T.textH} />
          </TouchableOpacity>
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
            renderItem={({ item }) => (
              <NotificationCardItem
                item={item}
                onPressCard={(id, yaLeida) => {
                  if (!yaLeida) handleMarcarLeida(id);
                }}
                onMarcarLeida={handleMarcarLeida}
                onDelete={handleEliminarNotificacion}
                onOpenItemMenu={(notif) => setSelectedItemForMenu(notif)}
              />
            )}
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
    paddingRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: T.textH,
  },
  headerMoreButton: {
    padding: 4,
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
});
