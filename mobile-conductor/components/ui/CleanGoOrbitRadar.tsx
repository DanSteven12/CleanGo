// mobile-conductor/components/ui/CleanGoOrbitRadar.tsx
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
    id: 'trash',
    icon: Trash2,
    angle: 160, // Izquierda superior
    orbitRadius: ORBIT_OUTER_RADIUS,
    size: 32,
    iconSize: 16,
    glowColor: 'rgba(239, 68, 68, 0.45)',
    badgeBg: '#2C1B1E',
    iconColor: '#F87171',
    orbitIndex: 'outer',
  },

  // ── Órbita Interior (4 satélites) ──────────────────────────────────────────
  {
    id: 'truck',
    icon: Truck,
    angle: 55, // Cuadrante superior derecho
    orbitRadius: ORBIT_INNER_RADIUS,
    size: 36,
    iconSize: 18,
    glowColor: 'rgba(16, 185, 129, 0.55)',
    badgeBg: '#103328',
    iconColor: '#34D399',
    orbitIndex: 'inner',
  },
  {
    id: 'navigation',
    icon: Navigation,
    angle: 325, // Cuadrante inferior derecho
    orbitRadius: ORBIT_INNER_RADIUS,
    size: 32,
    iconSize: 16,
    glowColor: 'rgba(59, 130, 246, 0.5)',
    badgeBg: '#13243D',
    iconColor: '#60A5FA',
    orbitIndex: 'inner',
  },
  {
    id: 'map',
    icon: Map,
    angle: 215, // Cuadrante inferior izquierdo
    orbitRadius: ORBIT_INNER_RADIUS,
    size: 32,
    iconSize: 15,
    glowColor: 'rgba(245, 158, 11, 0.5)',
    badgeBg: '#2B2314',
    iconColor: '#FBBF24',
    orbitIndex: 'inner',
  },
  {
    id: 'pin',
    icon: MapPin,
    angle: 125, // Cuadrante superior izquierdo
    orbitRadius: ORBIT_INNER_RADIUS,
    size: 34,
    iconSize: 17,
    glowColor: 'rgba(16, 185, 129, 0.5)',
    badgeBg: '#103027',
    iconColor: '#34D399',
    orbitIndex: 'inner',
  },
];

// Helper trigonométrico para calcular posición en el círculo
function getCoordinates(angleDeg: number, radius: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER - radius * Math.sin(angleRad), // Eje Y invertido en pantalla
  };
}

export function CleanGoOrbitRadar() {
  // ── Animaciones Reanimated ───────────────────────────────────────────────────
  const rotationInner = useSharedValue(0);
  const rotationOuter = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.25);
  const radarSweep = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    // 1. Rotación lenta de la órbita interior (en sentido horario)
    rotationInner.value = withRepeat(
      withTiming(360, { duration: 40000, easing: Easing.linear }),
      -1,
      false
    );

    // 2. Rotación lenta de la órbita exterior (en sentido antihorario)
    rotationOuter.value = withRepeat(
      withTiming(-360, { duration: 55000, easing: Easing.linear }),
      -1,
      false
    );

    // 3. Pulso sutil del núcleo de CleanGo
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.18, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 4. Barrido de radar continuo
    radarSweep.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );

    // 5. Flotación etérea vertical del conjunto
    floatY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [rotationInner, rotationOuter, pulseScale, pulseOpacity, radarSweep, floatY]);

  // ── Estilos Animados ─────────────────────────────────────────────────────────
  const animatedInnerOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationInner.value}deg` }],
  }));

  const animatedOuterOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationOuter.value}deg` }],
  }));

  // Contrarotación para mantener los íconos siempre en orientación vertical
  const animatedCounterInnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotationInner.value}deg` }],
  }));

  const animatedCounterOuterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotationOuter.value}deg` }],
  }));

  const animatedCenterHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const animatedCenterOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedSweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${radarSweep.value}deg` }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {/* ── Capa 1: Círculos Guía SVG (Órbitas concéntricas con dashes) ─────── */}
      <Svg
        width={CONTAINER_SIZE}
        height={CONTAINER_SIZE}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {/* Órbita exterior punteada */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={ORBIT_OUTER_RADIUS}
          stroke="rgba(23, 99, 166, 0.18)"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          fill="none"
        />

        {/* Órbita interior punteada */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={ORBIT_INNER_RADIUS}
          stroke="rgba(16, 185, 129, 0.22)"
          strokeWidth="1.2"
          strokeDasharray="3 5"
          fill="none"
        />

        {/* Círculo tenue ambiental central */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={CONTAINER_SIZE * 0.48}
          stroke="rgba(23, 99, 166, 0.06)"
          strokeWidth="1"
          fill="none"
        />
      </Svg>

      {/* ── Capa 2: Línea de Barrido Radar Giratoria ──────────────────────────── */}
      <Animated.View
        style={[
          styles.sweepContainer,
          animatedSweepStyle,
          { width: CONTAINER_SIZE, height: CONTAINER_SIZE },
        ]}
        pointerEvents="none"
      >
        <Svg width={CONTAINER_SIZE} height={CONTAINER_SIZE}>
          <Line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER + ORBIT_OUTER_RADIUS}
            y2={CENTER}
            stroke="rgba(16, 185, 129, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="2 3"
          />
        </Svg>
      </Animated.View>

      {/* ── Capa 3: Órbita Exterior Animada con Satélites ─────────────────────── */}
      <Animated.View
        style={[
          styles.orbitLayer,
          animatedOuterOrbitStyle,
          { width: CONTAINER_SIZE, height: CONTAINER_SIZE },
        ]}
        pointerEvents="none"
      >
        {SATELLITES.filter((s) => s.orbitIndex === 'outer').map((sat) => {
          const { x, y } = getCoordinates(sat.angle, sat.orbitRadius);
          const Icon = sat.icon;
          return (
            <View
              key={sat.id}
              style={[
                styles.satelliteAnchor,
                {
                  left: x - sat.size / 2,
                  top: y - sat.size / 2,
                  width: sat.size,
                  height: sat.size,
                },
              ]}
            >
              {/* Halo resplandeciente */}
              <View
                style={[
                  styles.satelliteGlow,
                  {
                    width: sat.size + 12,
                    height: sat.size + 12,
                    borderRadius: (sat.size + 12) / 2,
                    backgroundColor: sat.glowColor,
                  },
                ]}
              />
              {/* Badge contenedor con contrarotación */}
              <Animated.View
                style={[
                  styles.satelliteBadge,
                  animatedCounterOuterStyle,
                  {
                    width: sat.size,
                    height: sat.size,
                    borderRadius: sat.size / 2,
                    backgroundColor: sat.badgeBg,
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                  },
                ]}
              >
                <Icon
                  size={sat.iconSize}
                  color={sat.iconColor}
                  strokeWidth={2.2}
                />
              </Animated.View>
            </View>
          );
        })}
      </Animated.View>

      {/* ── Capa 4: Órbita Interior Animada con Satélites ─────────────────────── */}
      <Animated.View
        style={[
          styles.orbitLayer,
          animatedInnerOrbitStyle,
          { width: CONTAINER_SIZE, height: CONTAINER_SIZE },
        ]}
        pointerEvents="none"
      >
        {SATELLITES.filter((s) => s.orbitIndex === 'inner').map((sat) => {
          const { x, y } = getCoordinates(sat.angle, sat.orbitRadius);
          const Icon = sat.icon;
          return (
            <View
              key={sat.id}
              style={[
                styles.satelliteAnchor,
                {
                  left: x - sat.size / 2,
                  top: y - sat.size / 2,
                  width: sat.size,
                  height: sat.size,
                },
              ]}
            >
              {/* Halo resplandeciente */}
              <View
                style={[
                  styles.satelliteGlow,
                  {
                    width: sat.size + 12,
                    height: sat.size + 12,
                    borderRadius: (sat.size + 12) / 2,
                    backgroundColor: sat.glowColor,
                  },
                ]}
              />
              {/* Badge contenedor con contrarotación */}
              <Animated.View
                style={[
                  styles.satelliteBadge,
                  animatedCounterInnerStyle,
                  {
                    width: sat.size,
                    height: sat.size,
                    borderRadius: sat.size / 2,
                    backgroundColor: sat.badgeBg,
                    borderColor: 'rgba(255, 255, 255, 0.14)',
                  },
                ]}
              >
                <Icon
                  size={sat.iconSize}
                  color={sat.iconColor}
                  strokeWidth={2.2}
                />
              </Animated.View>
            </View>
          );
        })}
      </Animated.View>

      {/* ── Capa 5: Núcleo Central CleanGo con Efecto Halo ────────────────────── */}
      <View
        style={[
          styles.centerContainer,
          {
            left: CENTER - CENTER_ORB_SIZE / 2,
            top: CENTER - CENTER_ORB_SIZE / 2,
            width: CENTER_ORB_SIZE,
            height: CENTER_ORB_SIZE,
          },
        ]}
      >
        {/* Halo exterior pulsante (#10B981) */}
        <Animated.View
          style={[
            styles.centerHalo,
            animatedCenterHaloStyle,
            {
              width: CENTER_ORB_SIZE + 24,
              height: CENTER_ORB_SIZE + 24,
              borderRadius: (CENTER_ORB_SIZE + 24) / 2,
            },
          ]}
        />

        {/* Núcleo CleanGo circular */}
        <Animated.View
          style={[
            styles.centerOrb,
            animatedCenterOrbStyle,
            {
              width: CENTER_ORB_SIZE,
              height: CENTER_ORB_SIZE,
              borderRadius: CENTER_ORB_SIZE / 2,
            },
          ]}
        >
          <Image
            source={cleangoIcon}
            style={{
              width: CENTER_ORB_SIZE * 0.82,
              height: CENTER_ORB_SIZE * 0.82,
            }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sweepContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  orbitLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  satelliteAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteGlow: {
    position: 'absolute',
    opacity: 0.8,
  },
  satelliteBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  centerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(16, 185, 129, 0.35)',
  },
  centerOrb: {
    backgroundColor: '#0F172A',
    borderWidth: 2.5,
    borderColor: 'rgba(16, 185, 129, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: {
        elevation: 12,
      },
    }),
  },
});
