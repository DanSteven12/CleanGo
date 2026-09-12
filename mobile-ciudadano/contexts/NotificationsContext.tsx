import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getMobileSocket } from '../services/socketService';
import { getUnreadCount, Notificacion } from '../services/notificacionesService';
import { useAuth } from './AuthContext';
import { onForegroundMessage } from '../services/fcmService';
import { ToastPayload } from '../components/ui/CleanGoToast';

interface NotificationsContextValue {
  unreadCount: number;
  newNotification: Notificacion | null;
  activeToast: ToastPayload | null;
  showToast: (toast: ToastPayload) => void;
  dismissToast: () => void;
  decrementUnreadCount: () => void;
  clearNewNotification: () => void;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number | ((prev: number) => number)) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCountState] = useState<number>(0);
  const [newNotification, setNewNotification] = useState<Notificacion | null>(null);
  const [activeToast, setActiveToast] = useState<ToastPayload | null>(null);

  const showToast = useCallback((toast: ToastPayload) => {
    setActiveToast(toast);
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const setUnreadCount = useCallback((value: number | ((prev: number) => number)) => {
    setUnreadCountState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      return Math.max(0, next);
    });
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCountState(0);
      return;
    }
    try {
      const count = await getUnreadCount();
      setUnreadCountState(Math.max(0, count));
    } catch {
      // Sesión expirada o red no disponible: silenciar para no generar warning
    }
  }, [isAuthenticated]);

  // Cargar el conteo inicial cuando se autentica
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      getUnreadCount()
        .then((count) => {
          if (isMounted) setUnreadCountState(Math.max(0, count));
        })
        .catch(() => {});
    } else {
      setUnreadCountState(0);
      setNewNotification(null);
      setActiveToast(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Listener del ciclo de vida de la app (Background -> Foreground)
  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        getUnreadCount()
          .then((count) => setUnreadCountState(Math.max(0, count)))
          .catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Suscribirse a eventos de Socket.IO y FCM Foreground
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getMobileSocket();
    if (!socket) return;

    const handleNotificacionNueva = (notificacion: Notificacion) => {
      setUnreadCountState((prev) => prev + 1);
      setNewNotification(notificacion);
      setActiveToast({
        id: notificacion.id,
        titulo: notificacion.titulo,
        mensaje: notificacion.mensaje,
        categoria: notificacion.categoria || 'AVISO',
        recorrido_id: notificacion.recorrido_id,
        fecha: notificacion.created_at || new Date().toISOString(),
      });
    };

    const handleReconnect = () => {
      getUnreadCount()
        .then((count) => setUnreadCountState(Math.max(0, count)))
        .catch(() => {});
    };

    socket.on('notificacion_nueva', handleNotificacionNueva);
    socket.on('connect', handleReconnect);

    // Etapa P4: Registrar listener de FCM en foreground
    const unsubscribeFCM = onForegroundMessage((_message) => {
      getUnreadCount()
        .then((count) => setUnreadCountState(Math.max(0, count)))
        .catch(() => {});
    });

    return () => {
      socket.off('notificacion_nueva', handleNotificacionNueva);
      socket.off('connect', handleReconnect);
      unsubscribeFCM();
    };
  }, [isAuthenticated]);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCountState((prev) => Math.max(0, prev - 1));
  }, []);

  const clearNewNotification = useCallback(() => {
    setNewNotification(null);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        newNotification,
        activeToast,
        showToast,
        dismissToast,
        decrementUnreadCount,
        clearNewNotification,
        refreshUnreadCount,
        setUnreadCount,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications debe usarse dentro de un NotificationsProvider');
  }
  return context;
}
