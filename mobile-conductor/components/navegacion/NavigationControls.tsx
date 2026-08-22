import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { theme } from '../../theme/colors';

interface NavigationControlsProps {
  onRecenter: () => void;
}

export const NavigationControls = ({ onRecenter }: NavigationControlsProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.fab} onPress={onRecenter} activeOpacity={0.8}>
        <Navigation size={22} color={theme.colors.text} style={{ transform: [{ rotate: '45deg' }] }} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 110,
    zIndex: 90,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
});
