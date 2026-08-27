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

interface NotificationsContextValue {
  unreadCount: number;
  newNotification: Notificacion | null;
  decrementUnreadCount: () => void;
  clearNewNotification: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [newNotification, setNewNotification] = useState<Notificacion | null>(null);

  // Cargar el conteo inicial cuando se autentica
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      getUnreadCount()
        .then((count) => {
          if (isMounted) setUnreadCount(count);
        })
        .catch((err) => console.warn('Error obteniendo conteo de notificaciones:', err));
    } else {
      setUnreadCount(0);
      setNewNotification(null);
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
        // La app volvió al frente. Hacemos un ping REST.
        // Esto tiene el beneficio dual de sincronizar el contador global
        // y, si el token había expirado en background, dispara el interceptor de Axios
        // para refrescarlo silenciosamente, lo cual reparará las futuras reconexiones del Socket.
        getUnreadCount()
          .then((count) => setUnreadCount(count))
          .catch((err) => console.warn('Error sincronizando conteo on app resume:', err));
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Suscribirse a eventos de Socket.IO
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getMobileSocket();
    if (!socket) return;

    const handleNotificacionNueva = (notificacion: Notificacion) => {
      setUnreadCount((prev) => prev + 1);
      setNewNotification(notificacion);
    };

    const handleReconnect = () => {
      // Re-sincronizar el contador por si llegaron notificaciones mientras estaba desconectado
      getUnreadCount()
        .then((count) => setUnreadCount(count))
        .catch((err) => console.warn('Error re-sincronizando conteo:', err));
    };

    socket.on('notificacion_nueva', handleNotificacionNueva);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('notificacion_nueva', handleNotificacionNueva);
      socket.off('connect', handleReconnect);
    };
  }, [isAuthenticated]);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const clearNewNotification = useCallback(() => {
    setNewNotification(null);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        newNotification,
        decrementUnreadCount,
        clearNewNotification,
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
