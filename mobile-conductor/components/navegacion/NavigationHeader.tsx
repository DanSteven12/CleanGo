import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, Clock, TrendingUp, ChevronDown, ChevronUp, ArrowLeft, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../theme/colors';

interface NavigationHeaderProps {
  rutaNombre: string;
  numeroEconomico: string;
  conductorNombre: string;
  horaInicio: string;
  tiempoTranscurrido: string;
  porcentajeAvance: number;
  completados: number;
  totalCheckpoints: number;
  isCompleted: boolean;
  speedMultiplier?: number;
  onSpeedChange?: (speed: number) => void;
}

const SPEED_OPTIONS = [1, 2, 5, 10] as const;

export const NavigationHeader = ({
  rutaNombre,
  numeroEconomico,
  conductorNombre,
  horaInicio,
  tiempoTranscurrido,
  porcentajeAvance,
  completados,
  totalCheckpoints,
  isCompleted,
  speedMultiplier = 1,
  onSpeedChange,
}: NavigationHeaderProps) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <View style={[styles.container, { top: insets.top + 110 }]}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.headerRow} onPress={toggleExpand} activeOpacity={0.8}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.routeName} numberOfLines={1}>{rutaNombre}</Text>
          <View
            style={[
              styles.statusPill,
              isCompleted ? styles.statusPillCompleted : styles.statusPillActive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isCompleted ? theme.colors.primary : theme.colors.success },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                isCompleted ? styles.statusTextCompleted : styles.statusTextActive,
              ]}
            >
              {isCompleted ? 'Concluida' : 'En Ruta'}
            </Text>
          </View>
          </View>
          
          {expanded ? <ChevronUp size={20} color={theme.colors.textMuted} /> : <ChevronDown size={20} color={theme.colors.textMuted} />}
        </TouchableOpacity>

        {expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            {/* ── Fila de 3 métricas: Conductor · Inicio/Transcurrido · Avance ── */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <View style={styles.statIconRow}>
                  <User size={12} color={theme.colors.textMuted} />
                  <Text style={styles.statLabel}>Conductor</Text>
                </View>
                <Text style={styles.statValue} numberOfLines={2}>{conductorNombre}</Text>
              </View>

              <View style={styles.statDividerV} />

              <View style={styles.statCol}>
                <View style={styles.statIconRow}>
                  <Clock size={12} color={theme.colors.textMuted} />
                  <Text style={styles.statLabel}>Inicio / Transcur.</Text>
                </View>
                <Text style={styles.statValue}>{horaInicio}</Text>
                <Text style={styles.statSubValue}>({tiempoTranscurrido})</Text>
              </View>

              <View style={styles.statDividerV} />

              <View style={styles.statCol}>
                <View style={styles.statIconRow}>
                  <TrendingUp size={12} color={theme.colors.textMuted} />
                  <Text style={styles.statLabel}>Avance</Text>
                </View>
                <Text style={styles.statValue}>{porcentajeAvance}%</Text>
                <Text style={styles.statSubValue}>({completados}/{totalCheckpoints})</Text>
              </View>
            </View>

            {/* ── Barra de progreso ── */}
            <View style={styles.progressBarBg}>
              {/* Gradiente institucional azul→verde, igual que la web */}
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${porcentajeAvance}%` as any,
                  },
                  isCompleted && styles.progressBarFillCompleted,
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>{porcentajeAvance}%</Text>

            {/* ── Velocidad de simulación ── */}
            {!isCompleted && onSpeedChange && (
              <>
                <View style={styles.speedDivider} />
                <View style={styles.speedSection}>
                  <View style={styles.speedLabelRow}>
                    <Zap size={14} color={theme.colors.warning} />
                    <Text style={styles.speedLabel}>
                      Velocidad de simulación{' '}
                      <Text style={styles.speedDemoTag}>(Demo)</Text>
                    </Text>
                  </View>
                  <View style={styles.speedChipsRow}>
                  {SPEED_OPTIONS.map((mult) => {
                      const isActive = speedMultiplier === mult;
                      return (
                        <TouchableOpacity
                          key={mult}
                          style={[styles.speedChip, isActive && styles.speedChipActive]}
                          onPress={() => onSpeedChange(mult)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.speedChipText, isActive && styles.speedChipTextActive]}>
                            {mult}x
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 90,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  // En Ruta → verde
  statusPillActive: {
    backgroundColor: theme.colors.successBg,
    borderColor: '#B7DFB5',
  },
  // Concluida → azul primario (igual que los badges azules de la web)
  statusPillCompleted: {
    backgroundColor: theme.colors.activeBg,
    borderColor: '#BFDBFE',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextActive: {
    color: theme.colors.successText,
  },
  statusTextCompleted: {
    color: theme.colors.primary,
  },
  expandedContent: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.background,
    marginBottom: 12,
  },
  // ── Stats row (3 columns) ──────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 0,
  },
  statCol: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statDividerV: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 10,
    alignSelf: 'stretch',
    minHeight: 40,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 17,
  },
  statSubValue: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
    lineHeight: 15,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    // Gradiente institucional azul→verde, igual que la web (linear-gradient(90deg, #1763A6, #90BF49))
    // React Native no soporta gradientes directamente sin expo-linear-gradient,
    // así que usamos el azul primario como valor sólido, se alinea con el primario de la web.
    backgroundColor: theme.colors.primary,
  },
  // Cuando el recorrido está completado, la barra se pone verde (estado final)
  progressBarFillCompleted: {
    backgroundColor: theme.colors.success,
  },
  speedDivider: {
    height: 1,
    backgroundColor: theme.colors.background,
    marginTop: 12,
    marginBottom: 10,
  },
  speedSection: {
    gap: 8,
  },
  speedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  speedDemoTag: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  speedChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  speedChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // Chip activo → azul primario, alineado con los estilos de selección de la web
  speedChipActive: {
    backgroundColor: theme.colors.activeBg,
    borderColor: theme.colors.primary,
  },
  speedChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  speedChipTextActive: {
    color: theme.colors.primary,
  },
});
