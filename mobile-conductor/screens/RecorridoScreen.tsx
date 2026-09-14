// mobile-conductor/screens/RecorridoScreen.tsx
/**
 * Pantalla de Recorrido — Tab 2 del Bottom Navigation.
 *
 * Responsabilidad: operación activa del recorrido.
 *
 * Si existe un recorrido activo (estatus "En progreso"):
 *   → Muestra la ruta, progreso y botón para abrir el MAPA EXISTENTE (/mapa/[id])
 *   → El mapa, movimiento, checkpoints y finalización los maneja mapa/[id].tsx
 *     (no se duplica ninguna de esas lógicas)
 *
 * Si NO existe recorrido activo:
 *   → Estado vacío sencillo con enlace a Inicio
 *   → NO muestra botón de "Iniciar recorrido" (eso es responsabilidad de Inicio)
 *
 * Fuente de datos: GET /api/device/auth/asignacion
 *   El camion_id viene del token JWT — nunca del cliente.
 */
import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Clock, Navigation, AlertCircle, ArrowRight } from 'lucide-react-native';
import { useAsignacionGlobal } from '../contexts/AsignacionContext';
import { AnimatedCard, AnimatedPressable, PulsingBeacon, CleanGoOrbitRadar } from '../components/ui';
import { theme } from '../theme/colors';

interface RecorridoScreenProps {
  /** Llamado cuando el usuario presiona "Ir a Inicio" desde el estado vacío. */
  onGoToInicio?: () => void;
  /** Si la pantalla está actualmente visible (tab activo). */
  isFocused?: boolean;
}

function formatHora(hora: string | null | undefined): string {
  if (!hora) return '—';
  return hora.slice(0, 5);
}

export function RecorridoScreen({ onGoToInicio, isFocused }: RecorridoScreenProps) {
  const router = useRouter();

  // Consumir datos del contexto global
  const { asignacionActual: asignacion, isLoading, isRefreshing, refreshData } = useAsignacionGlobal();

  // Refrescar al enfocar el tab para tener el estatus más reciente
  useEffect(() => {
    if (isFocused) {
      refreshData(false);
    }
  }, [isFocused, refreshData]);

  const handleRefresh = useCallback(() => {
    refreshData(true);
  }, [refreshData]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando estado del recorrido...</Text>
      </View>
    );
  }

  const tieneRecorridoActivo =
    asignacion &&
    (asignacion.estatus_recorrido === 'En progreso' ||
      asignacion.estatus_recorrido === 'En Progreso');

  // ── Estado vacío: sin recorrido activo ─────────────────────────────────────
  if (!tieneRecorridoActivo || !asignacion) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.emptyContainer}>
          <View style={styles.radarWrapper}>
            <CleanGoOrbitRadar />
          </View>

          <Text style={styles.emptyTitle}>Sin recorrido activo</Text>
          <Text style={styles.emptyText}>
            Tu recorrido aparecerá aquí automáticamente cuando inicies una asignación.
          </Text>

          {/* Enlace a Inicio para iniciar el recorrido */}
          <AnimatedPressable
            style={styles.goToInicioBtn}
            onPress={() => onGoToInicio?.()}
            accessibilityLabel="Ir a Inicio para iniciar recorrido"
          >
            <Text style={styles.goToInicioBtnText}>Ir a Inicio</Text>
            <ArrowRight size={16} color={theme.colors.primary} />
          </AnimatedPressable>
        </View>
      </ScrollView>
    );
  }

  // ── Recorrido activo ───────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Indicador de estado con PulsingBeacon animado */}
      <View style={styles.statusBanner}>
        <PulsingBeacon color="#10B981" size={8} pulseScale={2.2} />
        <Text style={styles.statusText}>Recorrido en progreso</Text>
      </View>

      {/* Tarjeta de ruta animada */}
      <AnimatedCard index={0}>
        <View style={styles.card}>
          <View style={styles.rutaHeader}>
            <View
              style={[styles.rutaDot, { backgroundColor: asignacion.ruta_color || '#3b82f6' }]}
            />
            <Text style={styles.rutaNombre}>{asignacion.ruta_nombre}</Text>
            <View style={styles.estatusBadge}>
              <Text style={styles.estatusText}>{asignacion.estatus_recorrido}</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Clock size={14} color={theme.colors.textMuted} />
              <Text style={styles.infoLabel}>Horario</Text>
              <Text style={styles.infoValue}>
                {formatHora(asignacion.horario_inicio)} — {formatHora(asignacion.horario_fin)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Navigation size={14} color={theme.colors.textMuted} />
              <Text style={styles.infoLabel}>Conductor</Text>
              <Text style={styles.infoValue}>{asignacion.conductor_nombre || '—'}</Text>
            </View>
          </View>
        </View>
      </AnimatedCard>

      {/* Acceso al mapa interactivo con AnimatedPressable */}
      <AnimatedCard index={1}>
        <AnimatedPressable
          style={styles.btnMapa}
          onPress={() =>
            router.push({
              pathname: '/mapa/[id]' as any,
              params: { id: String(asignacion.id) },
            })
          }
        >
          <MapPin size={22} color="#fff" />
          <Text style={styles.btnMapaText}>Abrir mapa en vivo</Text>
          <ArrowRight size={18} color="#ffffff88" />
        </AnimatedPressable>
      </AnimatedCard>

      <Text style={styles.mapaHint}>
        El mapa muestra la posición del camión, checkpoints y progreso en tiempo real.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
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
  // ── Estado vacío ────────────────────────────────────────────────────────────
  emptyScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 12,
  },
  radarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  goToInicioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.activeBg,
  },
  goToInicioBtnPressed: {
    opacity: 0.7,
  },
  goToInicioBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  // ── Recorrido activo ────────────────────────────────────────────────────────
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.successBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.successText,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  rutaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  rutaDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rutaNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  estatusBadge: {
    backgroundColor: theme.colors.activeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  estatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.activeText,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  btnMapa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  btnMapaText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryForeground,
    textAlign: 'center',
  },
  mapaHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
