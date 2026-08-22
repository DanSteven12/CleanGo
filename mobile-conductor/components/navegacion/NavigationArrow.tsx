import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../theme/colors';

/**
 * Marcador de navegación del camión.
 *
 * La flecha se dibuja siempre hacia ARRIBA (norte del viewBox).
 * En el mapa, la cámara ya rota con el rumbo de avance, así que el
 * marcador no debe volver a rotarse: si se aplica heading otra vez
 * (o un Path invertido 180°), la flecha se ve hacia atrás en pantalla.
 */
export const NavigationArrow = () => {
  return (
    <View style={styles.container}>
      <View style={styles.pulseRing} />
      <View style={styles.arrowContainer}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L20 22L12 18L4 22Z"
            fill={theme.colors.primaryForeground}
            stroke={theme.colors.primaryForeground}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </Svg>
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
    backgroundColor: `${theme.colors.success}4D`, // 30% opacity approximation
  },
  arrowContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primaryForeground,
    ...theme.shadows.card,
  },
});