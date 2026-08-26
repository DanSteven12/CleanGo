import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const theme = {
  colors: {
    primary: '#1763A6',
    success: '#16A34A',
    successText: '#16A34A',
    card: '#FFFFFF',
    textMuted: '#64748B',
    textH: '#0F172A',
    border: '#E2E8F0',
  }
};

interface CheckpointCompletedCardProps {
  completados: number;
  ultimoCheckpoint: string;
}

export const CheckpointCompletedCard = ({ completados, ultimoCheckpoint }: CheckpointCompletedCardProps) => {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const insets = useSafeAreaInsets();
  
  // Track previous value to only trigger on increase
  const prevCompletados = useRef(completados);

  useEffect(() => {
    if (completados > prevCompletados.current) {
      // Checkpoint was reached! Show toast
      setVisible(true);
      
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Hide after 3 seconds
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: -20,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start(() => setVisible(false));
        }, 3000);
      });
    }
    prevCompletados.current = completados;
  }, [completados]);

  if (!visible) return null;

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <Animated.View style={[styles.container, { top: insets.top + 100, opacity, transform: [{ translateY }] }]}>
      <View style={styles.card}>
        <CheckCircle2 size={24} color={theme.colors.success} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Checkpoint completado</Text>
          <Text style={styles.timeText}>Llegada: {timeString}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 110,
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#B7DFB5', // Verde definido, más contraste que successBg (#dcfce7)
  },
  textContainer: {
    marginLeft: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.successText,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
