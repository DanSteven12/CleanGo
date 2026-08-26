import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GarbageTruckIcon } from './GarbageTruckIcon';

/**
 * Marcador del recolector.
 * El dibujo mira al ESTE (cabina a la derecha), igual que el icono de la web.
 * El Marker aplica `heading - 90` para que el Norte quede hacia arriba.
 */
export const NavigationArrow = () => {
  return (
    <View style={styles.container}>
      <GarbageTruckIcon size={56} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
  },
});
