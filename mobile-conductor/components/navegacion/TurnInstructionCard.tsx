import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/colors';

interface TurnInstructionCardProps {
  distancia: string;
  proximoDestino: string;
}

export const TurnInstructionCard = ({ distancia, proximoDestino }: TurnInstructionCardProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { top: insets.top + 16 }]}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          {/* Arrow pointing up for "straight ahead" or next point */}
          <Navigation size={32} color="#ffffff" fill="#ffffff" style={{ transform: [{ rotate: '0deg' }] }} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.distanceText}>{distancia}</Text>
          <Text style={styles.destinationText} numberOfLines={1}>
            {proximoDestino}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  card: {
    backgroundColor: theme.colors.success,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    ...theme.shadows.card,
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  distanceText: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primaryForeground,
  },
  destinationText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
