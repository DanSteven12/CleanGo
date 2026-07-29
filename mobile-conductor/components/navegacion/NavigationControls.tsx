import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Navigation } from 'lucide-react-native';

interface NavigationControlsProps {
  onRecenter: () => void;
}

export const NavigationControls = ({ onRecenter }: NavigationControlsProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onRecenter} activeOpacity={0.8}>
        <Navigation size={22} color="#0f172a" style={{ transform: [{ rotate: '45deg' }] }} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 140, // Above the bottom bar
    zIndex: 80,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
