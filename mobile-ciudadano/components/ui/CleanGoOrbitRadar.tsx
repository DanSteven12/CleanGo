import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import {
  Recycle,
  MapPin,
  BarChart2,
  Navigation,
  Monitor,
  Building2,
  Trash2,
  Truck,
  Map,
} from 'lucide-react-native';

const cleangoIcon = require('../../assets/images/cleango-icon.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_SIZE = Math.min(SCREEN_WIDTH * 0.85, 320);
const CENTER = CONTAINER_SIZE / 2;

// Radios de las órbitas
const ORBIT_INNER_RADIUS = CONTAINER_SIZE * 0.28; // ~89px
const ORBIT_OUTER_RADIUS = CONTAINER_SIZE * 0.42; // ~134px
const CENTER_ORB_SIZE = CONTAINER_SIZE * 0.34;    // ~108px

interface SatelliteConfig {
  id: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  angle: number; // en grados
  orbitRadius: number;
  size: number;
  iconSize: number;
  glowColor: string;
  badgeBg: string;
  iconColor: string;
  orbitIndex: 'inner' | 'outer';
}

const SATELLITES: SatelliteConfig[] = [
  // ── Órbita Exterior (5 satélites) ──────────────────────────────────────────
  {
    id: 'recycle',
    icon: Recycle,
    angle: 90, // Arriba
    orbitRadius: ORBIT_OUTER_RADIUS,
    size: 34,
    iconSize: 17,
    glowColor: 'rgba(16, 185, 129, 0.45)',
    badgeBg: '#132F2B',
    iconColor: '#34D399',
    orbitIndex: 'outer',
  },
  {
    id: 'barchart',
    icon: BarChart2,
    angle: 20, // Derecha superior
    orbitRadius: ORBIT_OUTER_RADIUS,
    size: 32,
    iconSize: 16,
    glowColor: 'rgba(59, 130, 246, 0.45)',
    badgeBg: '#142742',
    iconColor: '#60A5FA',
    orbitIndex: 'outer',
  },
  {
    id: 'monitor',
    icon: Monitor,
    angle: 305, // Derecha inferior
    orbitRadius: ORBIT_OUTER_RADIUS,
    size: 34,
    iconSize: 17,
    glowColor: 'rgba(16, 185, 129, 0.4)',
    badgeBg: '#142E28',
    iconColor: '#34D399',
    orbitIndex: 'outer',
  },
  {
    id: 'building',
    icon: Building2,
    angle: 235, // Izquierda inferior
    orbitRadius: ORBIT_OUTER_RADIUS,
    size: 32,
    iconSize: 16,
    glowColor: 'rgba(132, 204, 22, 0.45)',
    badgeBg: '#1C331B',
    iconColor: '#A3E635',
    orbitIndex: 'outer',
  },
  {
    id: 'map',
    icon: Map,
    angle: 165, // Izquierda superior
    orbitRadius: ORBIT_OUTER_RADIUS,
    size: 34,
    iconSize: 17,
    glowColor: 'rgba(23, 99, 166, 0.5)',
    badgeBg: '#152C40',
    iconColor: '#60A5FA',
    orbitIndex: 'outer',
  },

  // ── Órbita Interior (4 satélites) ──────────────────────────────────────────
  {
    id: 'mappin',
    icon: MapPin,
    angle: 65, // Superior derecha
    orbitRadius: ORBIT_INNER_RADIUS,
    size: 30,
    iconSize: 15,
    glowColor: 'rgba(56, 189, 248, 0.45)',
    badgeBg: '#132B3E',
    iconColor: '#38BDF8',
    orbitIndex: 'inner',
  },
  {
    id: 'navigation',
    icon: Navigation,
    angle: 335, // Inferior derecha
    orbitRadius: ORBIT_INNER_RADIUS,
    size: 30,
    iconSize: 15,
    glowColor: 'rgba(163, 230, 53, 0.45)',
    badgeBg: '#1C331B',
    iconColor: '#A3E635',
    orbitIndex: 'inner',
  },
  {
    id: 'container',
    icon: Trash2,
    angle: 250, // Inferior izquierda
    orbitRadius: ORBIT_INNER_RADIUS,
    size: 30,
    iconSize: 15,
    glowColor: 'rgba(96, 165, 250, 0.45)',
    badgeBg: '#15273C',
    iconColor: '#93C5FD',
    orbitIndex: 'inner',
  },
  {
    id: 'truck',
    icon: Truck,
    angle: 155, // Superior izquierda
    orbitRadius: ORBIT_INNER_RADIUS,
    size: 30,
    iconSize: 15,
    glowColor: 'rgba(52, 211, 153, 0.45)',
    badgeBg: '#142E28',
    iconColor: '#34D399',
    orbitIndex: 'inner',
  },
];

interface CleanGoOrbitRadarProps {
  size?: number;
}

export function CleanGoOrbitRadar({ size = CONTAINER_SIZE }: CleanGoOrbitRadarProps) {
  const scaleRatio = size / CONTAINER_SIZE;
  const center = size / 2;

  // Rotaciones orbitales continuas
  const outerRotation = useSharedValue(0);
  const innerRotation = useSharedValue(0);

  // Pulsos de radar
  const radarWave1 = useSharedValue(0);
  const radarOpacity1 = useSharedValue(0.7);
  const radarWave2 = useSharedValue(0);
  const radarOpacity2 = useSharedValue(0.7);

  // Respiración del orbe central
  const coreScale = useSharedValue(1);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    // Rotación órbita exterior (sentido horario, ciclo de 36s)
    outerRotation.value = withRepeat(
      withTiming(360, { duration: 36000, easing: Easing.linear }),
      -1,
      false
    );

    // Rotación órbita interior (sentido antihorario, ciclo de 26s)
    innerRotation.value = withRepeat(
      withTiming(-360, { duration: 26000, easing: Easing.linear }),
      -1,
      false
    );

    // Ondas de radar expansivas continuas
    radarWave1.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    radarOpacity1.value = withRepeat(
      withTiming(0, { duration: 2800, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );

    const timeout = setTimeout(() => {
      radarWave2.value = withRepeat(
        withTiming(1, { duration: 2800, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
      radarOpacity2.value = withRepeat(
        withTiming(0, { duration: 2800, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
    }, 1400);

    // Animación de respiración suave del orbe central
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.035, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.985, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    return () => clearTimeout(timeout);
  }, [
    outerRotation,
    innerRotation,
    radarWave1,
    radarOpacity1,
    radarWave2,
    radarOpacity2,
    coreScale,
    glowScale,
  ]);

  // Estilos animados para las órbitas
  const animatedOuterOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${outerRotation.value}deg` }],
  }));

  const animatedInnerOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${innerRotation.value}deg` }],
  }));

  // Contra-rotación para mantener los íconos erguidos
  const animatedOuterCounterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-outerRotation.value}deg` }],
  }));

  const animatedInnerCounterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-innerRotation.value}deg` }],
  }));

  // Ondas de radar
  const animatedRadarStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.35 + radarWave1.value * 0.65 }],
    opacity: radarOpacity1.value,
  }));

  const animatedRadarStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.35 + radarWave2.value * 0.65 }],
    opacity: radarOpacity2.value,
  }));

  // Orbe central
  const animatedCoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const orbScaledSize = CENTER_ORB_SIZE * scaleRatio;
  const outerRadiusScaled = ORBIT_OUTER_RADIUS * scaleRatio;
  const innerRadiusScaled = ORBIT_INNER_RADIUS * scaleRatio;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* ── Fondo de Órbitas SVG con líneas de cuadrícula y trazos discontinuos ── */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Líneas axiales tenues */}
        <Line
          x1={center}
          y1={size * 0.08}
          x2={center}
          y2={size * 0.92}
          stroke="rgba(23, 99, 166, 0.09)"
          strokeWidth={1}
          strokeDasharray="4,6"
        />
        <Line
          x1={size * 0.08}
          y1={center}
          x2={size * 0.92}
          y2={center}
          stroke="rgba(23, 99, 166, 0.09)"
          strokeWidth={1}
          strokeDasharray="4,6"
        />

        {/* Órbita exterior tenue */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadiusScaled}
          stroke="rgba(23, 99, 166, 0.16)"
          strokeWidth={1.4}
          strokeDasharray="5,6"
          fill="none"
        />

        {/* Órbita interior tenue */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadiusScaled}
          stroke="rgba(16, 185, 129, 0.22)"
          strokeWidth={1.4}
          strokeDasharray="4,5"
          fill="none"
        />

        {/* Anillo de halo del centro */}
        <Circle
          cx={center}
          cy={center}
          r={orbScaledSize * 0.62}
          stroke="rgba(132, 204, 22, 0.3)"
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>

      {/* ── Ondas de radar expansivas ────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.radarWave,
          {
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: (size * 0.9) / 2,
            borderColor: 'rgba(16, 185, 129, 0.45)',
          },
          animatedRadarStyle1,
        ]}
      />
      <Animated.View
        style={[
          styles.radarWave,
          {
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: (size * 0.9) / 2,
            borderColor: 'rgba(23, 99, 166, 0.35)',
          },
          animatedRadarStyle2,
        ]}
      />

      {/* ── Órbita Exterior y sus satélites ──────────────────────────────────── */}
      <Animated.View
        style={[
          styles.orbitContainer,
          { width: size, height: size },
          animatedOuterOrbitStyle,
        ]}
        pointerEvents="none"
      >
        {SATELLITES.filter((s) => s.orbitIndex === 'outer').map((sat) => {
          const rad = (sat.angle * Math.PI) / 180;
          const x = center + outerRadiusScaled * Math.cos(rad) - (sat.size * scaleRatio) / 2;
          const y = center - outerRadiusScaled * Math.sin(rad) - (sat.size * scaleRatio) / 2;
          const satSize = sat.size * scaleRatio;
          const IconComponent = sat.icon;

          return (
            <View
              key={sat.id}
              style={[
                styles.satelliteBadgePositioner,
                {
                  left: x,
                  top: y,
                  width: satSize,
                  height: satSize,
                },
              ]}
            >
              <Animated.View style={animatedOuterCounterStyle}>
                <View
                  style={[
                    styles.satelliteBadge,
                    {
                      width: satSize,
                      height: satSize,
                      borderRadius: satSize / 2,
                      backgroundColor: sat.badgeBg,
                      shadowColor: sat.glowColor,
                      borderColor: sat.iconColor,
                    },
                  ]}
                >
                  <IconComponent
                    size={sat.iconSize * scaleRatio}
                    color={sat.iconColor}
                    strokeWidth={2.4}
                  />
                </View>
              </Animated.View>
            </View>
          );
        })}
      </Animated.View>

      {/* ── Órbita Interior y sus satélites ──────────────────────────────────── */}
      <Animated.View
        style={[
          styles.orbitContainer,
          { width: size, height: size },
          animatedInnerOrbitStyle,
        ]}
        pointerEvents="none"
      >
        {SATELLITES.filter((s) => s.orbitIndex === 'inner').map((sat) => {
          const rad = (sat.angle * Math.PI) / 180;
          const x = center + innerRadiusScaled * Math.cos(rad) - (sat.size * scaleRatio) / 2;
          const y = center - innerRadiusScaled * Math.sin(rad) - (sat.size * scaleRatio) / 2;
          const satSize = sat.size * scaleRatio;
          const IconComponent = sat.icon;

          return (
            <View
              key={sat.id}
              style={[
                styles.satelliteBadgePositioner,
                {
                  left: x,
                  top: y,
                  width: satSize,
                  height: satSize,
                },
              ]}
            >
              <Animated.View style={animatedInnerCounterStyle}>
                <View
                  style={[
                    styles.satelliteBadge,
                    {
                      width: satSize,
                      height: satSize,
                      borderRadius: satSize / 2,
                      backgroundColor: sat.badgeBg,
                      shadowColor: sat.glowColor,
                      borderColor: sat.iconColor,
                    },
                  ]}
                >
                  <IconComponent
                    size={sat.iconSize * scaleRatio}
                    color={sat.iconColor}
                    strokeWidth={2.4}
                  />
                </View>
              </Animated.View>
            </View>
          );
        })}
      </Animated.View>

      {/* ── Orbe Central de CleanGo ──────────────────────────────────────────── */}
      <View style={[styles.centerWrapper, { width: orbScaledSize, height: orbScaledSize }]}>
        {/* Halo de resplandor verde animado */}
        <Animated.View
          style={[
            styles.glowHalo,
            {
              width: orbScaledSize * 1.18,
              height: orbScaledSize * 1.18,
              borderRadius: (orbScaledSize * 1.18) / 2,
            },
            animatedGlowStyle,
          ]}
        />

        {/* Tarjeta del orbe con respiración */}
        <Animated.View
          style={[
            styles.centerOrb,
            {
              width: orbScaledSize,
              height: orbScaledSize,
              borderRadius: orbScaledSize / 2,
            },
            animatedCoreStyle,
          ]}
        >
          {/* Imagen oficial idéntica al ícono CleanGo */}
          <Image
            source={cleangoIcon}
            style={styles.truckImage}
            resizeMode="cover"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarWave: {
    position: 'absolute',
    borderWidth: 1.5,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  orbitContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  satelliteBadgePositioner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  centerWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  glowHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(132, 204, 22, 0.28)',
    borderWidth: 1.5,
    borderColor: 'rgba(163, 230, 53, 0.5)',
  },
  centerOrb: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3.5,
    borderColor: '#84CC16',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#1763A6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  truckImage: {
    width: '100%',
    height: '100%',
  },
});
