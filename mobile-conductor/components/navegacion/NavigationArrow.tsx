import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Navigation } from 'lucide-react-native';

interface NavigationArrowProps {
  heading: number;
}

export const NavigationArrow = ({ heading }: NavigationArrowProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.pulseRing} />
      <View style={[styles.arrowContainer, { transform: [{ rotate: `${heading}deg` }] }]}>
        <Navigation size={28} color="#ffffff" fill="#ffffff" style={{ transform: [{ translateY: -2 }] }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  pulseRing: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(16, 185, 129, 0.35)',
  },
  arrowContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
});
