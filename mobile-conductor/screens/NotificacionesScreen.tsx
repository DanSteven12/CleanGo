// mobile-conductor/app/screens/NotificacionesScreen.tsx
/**
 * Pantalla de Notificaciones — Tab 3 del Bottom Navigation.
 *
 * Consulta las notificaciones del sistema dirigidas a conductores.
 * Usa el endpoint existente de notificaciones si el conductor
 * está asociado al camión autenticado.
 *
 * Por ahora muestra las notificaciones generales del sistema
 * con tipo destinatario CONDUCTORES o AMBOS.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Bell, CheckCircle, Info, AlertTriangle, Megaphone } from 'lucide-react-native';
import api from '../services/api';
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

function getCategoriaIcon(categoria: string, leida: boolean) {
  const color = leida ? theme.colors.textMuted : theme.colors.primary;
  const size = 20;
  switch (categoria) {
    case 'RECORRIDO':
      return <CheckCircle size={size} color={color} />;
    case 'RUTA':
      return <AlertTriangle size={size} color={leida ? theme.colors.textMuted : theme.colors.warning} />;
    case 'AVISO':
      return <Megaphone size={size} color={color} />;
    default:
      return <Info size={size} color={color} />;
  }
}

function formatFecha(fecha: string): string {
  try {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fecha;
  }
}

export function NotificacionesScreen() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotificaciones = useCallback(async () => {
    try {
      setError(null);
      // El endpoint de notificaciones requiere auth de usuario Web (cookie).
      // Para la app móvil, se consultan solo las notificaciones públicas
      // dirigidas a conductores usando el Bearer token del dispositivo.
      // Si el endpoint no acepta el token de dispositivo, se muestra placeholder.
      const response = await api.get<Notificacion[]>('/notificaciones');
      const todas = Array.isArray(response.data) ? response.data : [];
      // Filtrar solo las notificaciones relevantes para conductores
      const paraCondutores = todas.filter(
        (n) => n.destinatario === 'CONDUCTORES' || n.destinatario === 'AMBOS'
      );
      setNotificaciones(paraCondutores);
    } catch {
      // El endpoint de notificaciones usa authMiddleware (usuario Web).
      // Para dispositivos, mostramos estado vacío sin error crítico.
      setNotificaciones([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotificaciones();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando notificaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.title}>Notificaciones</Text>
        <Text style={styles.subtitle}>Avisos del sistema</Text>
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
        renderItem={({ item }) => (
          <View style={[styles.card, item.leida && styles.cardLeida]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                {getCategoriaIcon(item.categoria, item.leida)}
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, item.leida && styles.cardTitleLeida]} numberOfLines={2}>
                    {item.titulo}
                  </Text>
                  {!item.leida && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardMensaje} numberOfLines={3}>
                  {item.mensaje}
                </Text>
                <Text style={styles.cardFecha}>{formatFecha(item.created_at)}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bell size={44} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Sin notificaciones</Text>
            <Text style={styles.emptyText}>
              No hay avisos disponibles en este momento.
            </Text>
          </View>
        }
      />
    </View>
  );
}

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
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardLeida: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 20,
  },
  cardTitleLeida: {
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 5,
    flexShrink: 0,
  },
  cardMensaje: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  cardFecha: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
