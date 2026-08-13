import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Navigation } from 'lucide-react-native';

/**
 * Marcador de navegación del camión para react-native-maps.
 *
 * IMPORTANTE: La rotación NO se aplica aquí. El componente padre (Marker)
 * debe usar la prop `rotation={heading}` de react-native-maps para que
 * el mapa integre correctamente el heading con el sistema de coordenadas
 * geográficas (teniendo en cuenta la orientación de la cámara).
 *
 * Si la rotación se aplica con CSS/transform interno, el ícono rota
 * respecto al píxel de pantalla, no respecto al norte geográfico,
 * lo que produce orientaciones incorrectas cuando la cámara gira.
 */
export const NavigationArrow = () => {
  return (
    <View style={styles.container}>
      <View style={styles.pulseRing} />
      <View style={styles.arrowContainer}>
        {/* El ícono Navigation de Lucide apunta a 45° (arriba-derecha) por defecto.
            Rotamos -45° para que apunte perfectamente recto hacia ARRIBA. 
            CORRECCIÓN: Se envuelve el SVG en un View para evitar bugs de transform en Android */}
        <View style={{ transform: [{ translateY: -1 }, { rotate: '-45deg' }] }}>
          <Navigation size={26} color="#ffffff" fill="#ffffff" />
        </View>
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
    backgroundColor: 'rgba(16, 185, 129, 0.30)',
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