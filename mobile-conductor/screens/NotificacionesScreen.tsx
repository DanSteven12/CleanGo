// mobile-conductor/screens/NotificacionesScreen.tsx
/**
 * Pantalla de Notificaciones — Tab del Bottom Navigation para Conductores.
 *
 * Características:
 *  - Estilo visual equivalente a la vista de ciudadanos.
 *  - Indicador de tiempo relativo ("Hace un momento", "Hace 1 m", "Hace 2 h", "Hace 3 d").
 *  - Punto azul en tarjetas no leídas + botón "(✓) Marcar como leída".
 *  - Clic en cualquier parte de la tarjeta para marcar como leída.
 *  - Menú de tres puntos ("...") en encabezado para "Marcar todas como leídas".
 *  - Deslizar tarjeta hacia la izquierda para eliminar (estilo Facebook) + opción de eliminar en menú de tres puntos de cada ítem.
 *  - Expansión/colapso de mensaje ("Mostrar más" / "Mostrar menos").
 *  - Sincronización en tiempo real vía Socket.IO y FCM.
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
  AppState,
  Modal,
  Pressable,
  Animated,
  type AppStateStatus,
} from 'react-native';
import {
  Bell,
  CheckCircle2,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  Megaphone,
  MoreVertical,
  Trash2,
  X,
  History,
  Clock,
} from 'lucide-react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import api from '../services/api';
import { getMobileSocket } from '../services/socketService';
import { onForegroundMessage } from '../services/fcmService';
import { AnimatedCard, AnimatedPressable, CleanGoOrbitRadar } from '../components/ui';
import { theme } from '../theme/colors';

interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'AUTOMATICA' | 'MANUAL';
  categoria: 'REPORTE' | 'RECORRIDO' | 'RUTA' | 'AVISO';
  destinatario: 'CIUDADANOS' | 'CONDUCTORES' | 'AMBOS';
  leida: boolean;
  created_at: string;
}

export interface NotificacionesResponse {
  data: Notificacion[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

function getCategoriaIcon(categoria: string, leida: boolean) {
  const size = 18;
  const color = leida ? '#94A3B8' : '#D97706';

  switch (categoria) {
    case 'RECORRIDO':
      return <CheckCircle2 size={size} color={leida ? '#94A3B8' : theme.colors.primary} />;
    case 'RUTA':
      return <AlertTriangle size={size} color={leida ? '#94A3B8' : '#EAB308'} />;
    case 'AVISO':
      return <Megaphone size={size} color={leida ? '#94A3B8' : theme.colors.primary} />;
    default:
      return <Info size={size} color={color} />;
  }
}

function formatHaceCuanto(fechaIso: string): string {
  if (!fechaIso) return 'Hace un momento';
  try {
    const fecha = new Date(fechaIso);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'Hace un momento';

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHoras = Math.floor(diffMins / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffSecs < 60) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} m`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias < 7) return `Hace ${diffDias} d`;

    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return 'Hace un momento';
  }
}

function NotificationCardItem({
  item,
  onPressCard,
  onMarcarLeida,
  onDelete,
  onOpenItemMenu,
}: {
  item: Notificacion;
  onPressCard: (id: number, leida: boolean) => void;
  onMarcarLeida: (id: number) => void;
  onDelete: (id: number) => void;
  onOpenItemMenu: (item: Notificacion) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);

  const isLongText = item.mensaje.length > 90;
  const leida = Boolean(item.leida);

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
          onDelete(item.id);
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
        style={[styles.card, leida && styles.cardLeida]}
        activeOpacity={0.9}
        onPress={() => onPressCard(item.id, leida)}
      >
        <View style={styles.cardHeaderRow}>
          {/* Icon Box */}
          <View style={[styles.iconWrapper, leida && styles.iconWrapperLeida]}>
            {getCategoriaIcon(item.categoria, leida)}
          </View>

          {/* Title and Time */}
          <View style={styles.titleColumn}>
            <Text style={[styles.cardTitle, leida && styles.cardTitleLeida]} numberOfLines={2}>
              {item.titulo}
            </Text>
            <Text style={styles.cardFecha}>{formatHaceCuanto(item.created_at)}</Text>
          </View>

          {/* Right Status: Dot or Checkmark + 3 dots menu */}
          <View style={styles.statusRow}>
            {leida ? (
              <Check size={18} color="#94A3B8" />
            ) : (
              <View style={styles.unreadDot} />
            )}

            <TouchableOpacity
              style={styles.moreButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => onOpenItemMenu(item)}
            >
              <MoreVertical size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text
            style={[styles.cardMensaje, leida && styles.cardMensajeLeida]}
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

        {/* Marcar como leída Button at Bottom of Unread Card */}
        {!leida && (
          <TouchableOpacity
            style={styles.marcarLeidaBtn}
            activeOpacity={0.8}
            onPress={() => onMarcarLeida(item.id)}
          >
            <CheckCircle2 size={16} color="#0284C7" />
            <Text style={styles.marcarLeidaBtnText}>Marcar como leída</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

export function NotificacionesScreen() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState<Notificacion | null>(null);

  const fetchNotificaciones = useCallback(async (pageToFetch = 1, isRefresh = false) => {
    try {
      setError(null);
      const response = await api.get<NotificacionesResponse | Notificacion[]>('/device/notificaciones', {
        params: { page: pageToFetch, limit: 10 },
      });

      const payload = response.data;
      let items: Notificacion[] = [];
      let totalCount = 0;
      let currentPage = 1;
      let totalPgs = 1;
      let more = false;

      if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as any).data)) {
        const resp = payload as NotificacionesResponse;
        items = resp.data;
        totalCount = resp.total;
        currentPage = resp.page;
        totalPgs = resp.totalPages;
        more = resp.hasMore ?? (currentPage < totalPgs);
      } else if (Array.isArray(payload)) {
        items = payload;
        totalCount = payload.length;
        currentPage = 1;
        totalPgs = 1;
        more = false;
      }

      if (pageToFetch === 1) {
        setNotificaciones(items);
      } else {
        setNotificaciones((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newItems = items.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newItems];
        });
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
      if (pageToFetch === 1) {
        setNotificaciones([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNotificaciones(1);
  }, [fetchNotificaciones]);

  useEffect(() => {
    const socket = getMobileSocket();
    const onNueva = () => {
      fetchNotificaciones(1, false);
    };
    socket.on('notificacion_nueva', onNueva);
    socket.on('connect', onNueva);

    const unsubscribeFcm = onForegroundMessage(() => {
      fetchNotificaciones(1, false);
    });

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        fetchNotificaciones(1, false);
      }
    };
    const appSub = AppState.addEventListener('change', onAppState);

    return () => {
      socket.off('notificacion_nueva', onNueva);
      socket.off('connect', onNueva);
      unsubscribeFcm();
      appSub.remove();
    };
  }, [fetchNotificaciones]);

  const marcarLeida = useCallback(async (id: number, yaLeida: boolean) => {
    if (yaLeida) return;
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
    try {
      await api.patch(`/device/notificaciones/${id}/leida`);
    } catch {
      // Si falla, se corregirá en el próximo refresh
    }
  }, []);

  const marcarTodasComoLeidas = useCallback(async () => {
    setIsHeaderMenuOpen(false);
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    try {
      await api.patch('/device/notificaciones/marcar-todas-leidas');
    } catch {
      fetchNotificaciones(1);
    }
  }, [fetchNotificaciones]);

  const eliminarNotificacion = useCallback(async (id: number) => {
    setSelectedItemForMenu(null);
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    try {
      await api.delete(`/device/notificaciones/${id}`);
    } catch {
      fetchNotificaciones(1);
    }
  }, [fetchNotificaciones]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchNotificaciones(1, true);
  }, [fetchNotificaciones]);

  const handleCargarAnteriores = useCallback(() => {
    if (isLoadingMore || !hasMore || page >= totalPages) return;
    setIsLoadingMore(true);
    fetchNotificaciones(page + 1);
  }, [isLoadingMore, hasMore, page, totalPages, fetchNotificaciones]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando notificaciones...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Notificaciones</Text>
          <TouchableOpacity
            style={styles.headerMoreButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setIsHeaderMenuOpen(true)}
          >
            <MoreVertical size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={notificaciones}
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
        renderItem={({ item, index }) => (
          <AnimatedCard index={index} staggerMs={35}>
            <NotificationCardItem
              item={item}
              onPressCard={marcarLeida}
              onMarcarLeida={(id) => marcarLeida(id, false)}
              onDelete={eliminarNotificacion}
              onOpenItemMenu={(notif) => setSelectedItemForMenu(notif)}
            />
          </AnimatedCard>
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
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.loadMoreText}>Cargando avisos anteriores...</Text>
                  </View>
                ) : (
                  <View style={styles.loadMoreInner}>
                    <History size={16} color={theme.colors.primary} />
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.radarWrapper}>
              <CleanGoOrbitRadar />
            </View>
            <Text style={styles.emptyTitle}>
              {error ? 'No se pudieron cargar' : 'Sin notificaciones'}
            </Text>
            <Text style={styles.emptyText}>
              {error || 'No hay avisos disponibles en este momento.'}
            </Text>
            {error ? (
              <AnimatedPressable onPress={handleRefresh} style={styles.retryButton}>
                <Text style={styles.retryText}>Reintentar</Text>
              </AnimatedPressable>
            ) : null}
          </View>
        }
      />

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
              onPress={marcarTodasComoLeidas}
            >
              <CheckCheck size={20} color={theme.colors.primary} />
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
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedItemForMenu && !selectedItemForMenu.leida && (
              <TouchableOpacity
                style={styles.menuOptionRow}
                activeOpacity={0.7}
                onPress={() => {
                  if (selectedItemForMenu) {
                    marcarLeida(selectedItemForMenu.id, false);
                    setSelectedItemForMenu(null);
                  }
                }}
              >
                <Check size={20} color={theme.colors.primary} />
                <Text style={styles.menuOptionText}>Marcar como leída</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menuOptionRow}
              activeOpacity={0.7}
              onPress={() => {
                if (selectedItemForMenu) {
                  eliminarNotificacion(selectedItemForMenu.id);
                }
              }}
            >
              <Trash2 size={20} color="#EF4444" />
              <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>
                Eliminar notificación
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerMoreButton: {
    padding: 4,
    borderRadius: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  swipeableContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeida: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    elevation: 0,
    shadowOpacity: 0,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapperLeida: {
    backgroundColor: '#F1F5F9',
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  cardTitleLeida: {
    color: '#475569',
    fontWeight: '600',
  },
  cardFecha: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#0284C7',
  },
  moreButton: {
    padding: 2,
  },
  messageContainer: {
    marginTop: 10,
  },
  cardMensaje: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  cardMensajeLeida: {
    color: '#64748B',
  },
  expandButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  marcarLeidaBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  marcarLeidaBtnText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 13,
  },
  deleteRightAction: {
    backgroundColor: '#EF4444',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#0F172A',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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
    color: '#0F172A',
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
    color: '#0F172A',
  },

  // Paginación Estilo Facebook
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
    color: theme.colors.primary,
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
