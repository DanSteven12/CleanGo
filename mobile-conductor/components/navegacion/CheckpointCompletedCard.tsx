import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
        <CheckCircle2 size={24} color="#10b981" />
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
    backgroundColor: '#ffffff',
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  textContainer: {
    marginLeft: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
