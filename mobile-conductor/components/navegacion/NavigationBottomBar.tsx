import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/colors';

interface NavigationBottomBarProps {
  etaMinutos: number;
  distanciaRestanteStr: string;
  horaEstimada: string;
  isCompleted: boolean;
  isFinishing: boolean;
  onFinalizar: () => void;
}

export const NavigationBottomBar = ({
  etaMinutos,
  distanciaRestanteStr,
  horaEstimada,
  isCompleted,
  isFinishing,
  onFinalizar,
}: NavigationBottomBarProps) => {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom + 8, 16);
  
  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <View style={styles.metricsRow}>
        <View style={styles.etaContainer}>
          <Text style={[styles.etaText, isCompleted && { color: theme.colors.success }]}>
            {isCompleted ? '0 min' : `${etaMinutos} min`}
          </Text>
          <View style={styles.subMetricsRow}>
            <Text style={styles.subMetricText}>{distanciaRestanteStr}</Text>
            <View style={styles.dot} />
            <Text style={styles.subMetricText}>{horaEstimada}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.finishButton, isCompleted && styles.finishButtonPulse]} 
          onPress={onFinalizar}
          disabled={isFinishing}
        >
          {isFinishing ? (
            <ActivityIndicator color={theme.colors.primaryForeground} size="small" />
          ) : (
            <Text style={styles.finishButtonText}>Finalizar</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {isCompleted && (
        <View style={styles.completedAlert}>
          <CheckCircle2 size={16} color={theme.colors.successText} />
          <Text style={styles.completedAlertText}>
            Destino alcanzado. Puede finalizar el recorrido.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.card,
    zIndex: 90,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaContainer: {
    flex: 1,
  },
  etaText: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text, // Usually dark in light mode, or green if we want Google Maps style
    marginBottom: 4,
  },
  subMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subMetricText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
  finishButton: {
    backgroundColor: theme.colors.destructive,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  finishButtonPulse: {
    backgroundColor: theme.colors.success,
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  finishButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: 16,
    fontWeight: '700',
  },
  completedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successBg,
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.successBg, // Or slightly darker
  },
  completedAlertText: {
    marginLeft: 8,
    fontSize: 13,
    color: theme.colors.successText,
    fontWeight: '600',
  },
});
