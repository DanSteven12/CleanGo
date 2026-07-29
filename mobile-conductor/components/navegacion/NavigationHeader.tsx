import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, Clock, TrendingUp, ChevronDown, ChevronUp, ArrowLeft, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

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
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.routeName} numberOfLines={1}>{rutaNombre}</Text>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: isCompleted ? '#3b82f6' : '#10b981' }]} />
              <Text style={styles.statusText}>{isCompleted ? 'Concluida' : 'En Ruta'}</Text>
            </View>
          </View>
          
          {expanded ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
        </TouchableOpacity>

        {expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            {/* ── Fila de 3 métricas: Conductor · Inicio/Transcurrido · Avance ── */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <View style={styles.statIconRow}>
                  <User size={12} color="#64748b" />
                  <Text style={styles.statLabel}>Conductor</Text>
                </View>
                <Text style={styles.statValue} numberOfLines={2}>{conductorNombre}</Text>
              </View>

              <View style={styles.statDividerV} />

              <View style={styles.statCol}>
                <View style={styles.statIconRow}>
                  <Clock size={12} color="#64748b" />
                  <Text style={styles.statLabel}>Inicio / Transcur.</Text>
                </View>
                <Text style={styles.statValue}>{horaInicio}</Text>
                <Text style={styles.statSubValue}>({tiempoTranscurrido})</Text>
              </View>

              <View style={styles.statDividerV} />

              <View style={styles.statCol}>
                <View style={styles.statIconRow}>
                  <TrendingUp size={12} color="#64748b" />
                  <Text style={styles.statLabel}>Avance</Text>
                </View>
                <Text style={styles.statValue}>{porcentajeAvance}%</Text>
                <Text style={styles.statSubValue}>({completados}/{totalCheckpoints})</Text>
              </View>
            </View>

            {/* ── Barra de progreso ── */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${porcentajeAvance}%`,
                    backgroundColor: isCompleted ? '#3b82f6' : '#10b981',
                  },
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
                    <Zap size={14} color="#f59e0b" />
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
    backgroundColor: '#f1f5f9',
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
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginRight: 8,
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
    color: '#065f46',
  },
  expandedContent: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#e2e8f0',
    marginHorizontal: 10,
    alignSelf: 'stretch',
    minHeight: 40,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 17,
  },
  statSubValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 15,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  speedDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
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
    color: '#475569',
  },
  speedDemoTag: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  speedChipActive: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  speedChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  speedChipTextActive: {
    color: '#b45309',
  },
});
