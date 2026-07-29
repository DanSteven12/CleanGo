import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    backgroundColor: '#064e3b', // Deep green for Google Maps-like nav header
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
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
    color: '#ffffff',
  },
  destinationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#a7f3d0',
    marginTop: 2,
  },
});
