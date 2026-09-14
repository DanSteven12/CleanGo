// mobile-conductor/app/screens/InicioScreen.tsx
/**
 * Pantalla de Inicio — Tab 1 del Bottom Navigation.
 *
 * Muestra:
 *  - Saludo con datos del camión autenticado
 *  - Lista de asignaciones del día (pendientes y en progreso)
 *  - Controles para iniciar/finalizar recorrido
 *  - Acceso rápido al mapa del recorrido activo
 *
 * Extrae el contenido original de app/index.tsx para mantenerse
 * como pantalla de trabajo principal del conductor.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AsignacionCard } from '../components/AsignacionCard';
import { recorridosService } from '../services/recorridosService';
import { useAuth } from '../contexts/AuthContext';
import { useRecorridoMapCache } from '../contexts/RecorridoMapCache';
import { useAsignacionGlobal } from '../contexts/AsignacionContext';
import { useAlert } from '../contexts/AlertContext';
import { AnimatedCard, CleanGoOrbitRadar } from '../components/ui';
import { theme } from '../theme/colors';

interface InicioScreenProps {
  /** Llamado después de iniciar un recorrido exitosamente. Cambia el tab activo a Recorrido. */
  onRecorridoIniciado?: () => void;
}

export function InicioScreen({ onRecorridoIniciado }: InicioScreenProps) {
  const router = useRouter();
  const { camion } = useAuth();
  const cache = useRecorridoMapCache();
  const { showAlert, showError, showSuccess, showWarning, showConfirm } = useAlert();
  
  // Consumir datos del contexto global
  const { asignaciones, isLoading, isRefreshing, refreshData } = useAsignacionGlobal();

  const [startingId, setStartingId] = useState<number | null>(null);
  const [finishingId, setFinishingId] = useState<number | null>(null);

  const handleRefresh = () => {
    refreshData(true);
  };

  const handleIniciarRecorrido = async (asignacion: any, conductorRealNombre?: string) => {
    setStartingId(asignacion.id);
    try {
      const response = await recorridosService.iniciarRecorrido(
        asignacion.id,
        asignacion.ruta_id,
        conductorRealNombre
      );

      // Precargar el caché con la respuesta de /iniciar más los datos de la asignación
      // ya disponibles en memoria. Así, /mapa/[id] encontrará el caché listo al montar
      // y NO ejecutará GET /api/recorridos/activo/:asignacion_id.
      // hora_inicio se aproxima a la hora actual (el backend la fija en el mismo request).
      if (response?.recorrido_id) {
        cache.setFromApi(asignacion.id, {
          recorrido_id: response.recorrido_id,
          hora_inicio:  new Date().toISOString(),
          estado:       'En progreso',
          ruta_id:      asignacion.ruta_id,
          ruta_nombre:  asignacion.ruta_nombre,
          color:        response.color ?? asignacion.ruta_color,
          numero_economico: asignacion.numero_economico,
          conductor_nombre: asignacion.conductor_nombre,
          checkpoints:  response.checkpoints,
          geometria:    response.geometria,
        });
      }

      // Actualizar lista y contexto global antes de navegar
      await refreshData(false);
      // Navegar automáticamente al mapa del recorrido activo
      router.push({
        pathname: '/mapa/[id]' as any,
        params: { id: String(asignacion.id) },
      });
      // Cambiar el tab activo a Recorrido para cuando el usuario regrese del mapa
      onRecorridoIniciado?.();
    } catch (error: any) {
      if (error.response?.data?.error) {
        showWarning('Aviso', error.response.data.error);
      } else {
        showError('Error al iniciar', 'No se pudo iniciar el recorrido. Verifica tu conexión a internet.');
      }
    } finally {
      setStartingId(null);
    }
  };

  const handleFinalizarRecorrido = (asignacion: any) => {
    showConfirm({
      title: 'Finalizar Recorrido',
      message: `¿Estás seguro de finalizar el recorrido de la ruta "${asignacion.ruta_nombre}"? Esta acción registrará el fin del servicio.`,
      confirmText: 'Sí, finalizar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setFinishingId(asignacion.id);
        try {
          const recorridoActivo = await recorridosService.getRecorridoActivo(asignacion.id);
          if (!recorridoActivo?.recorrido_id) {
            throw new Error('No se encontró el recorrido activo.');
          }
          await recorridosService.finalizarRecorrido(recorridoActivo.recorrido_id);
          showSuccess('¡Recorrido Concluido!', 'El recorrido se ha completado exitosamente.');
          await refreshData(false);
        } catch {
          showError('Error', 'No se pudo finalizar el recorrido en el servidor.');
        } finally {
          setFinishingId(null);
        }
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando asignaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Bienvenido 👋
          </Text>
          <Text style={styles.title}>Mis Asignaciones</Text>
          <Text style={styles.subtitle}>Recorridos pendientes y activos de hoy</Text>
          {camion && (
            <View style={styles.camionBadge}>
              <Text style={styles.camionBadgeText}>
                🚛 {camion.numero_economico} · {camion.placa}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Lista de asignaciones */}
      <FlatList
        data={asignaciones}
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
          <AnimatedCard index={index} staggerMs={40}>
            <AsignacionCard
              asignacion={item}
              isStarting={startingId === item.id}
              isFinishing={finishingId === item.id}
              onIniciar={(conductor) => handleIniciarRecorrido(item, conductor)}
              onFinalizar={() => handleFinalizarRecorrido(item)}
              onVerMapa={() =>
                router.push({
                  pathname: '/mapa/[id]' as any,
                  params: { id: String(item.id) },
                })
              }
            />
          </AnimatedCard>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.radarWrapper}>
              <CleanGoOrbitRadar />
            </View>
            <Text style={styles.emptyTitle}>Todo al día</Text>
            <Text style={styles.emptyText}>No tienes asignaciones pendientes o activas por el momento.</Text>
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
    backgroundColor: theme.colors.background,
    gap: 12,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  greeting: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  camionBadge: {
    marginTop: 8,
    backgroundColor: theme.colors.activeBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  camionBadgeText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 40,
    gap: 8,
  },
  radarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: '85%',
    lineHeight: 20,
  },
});
