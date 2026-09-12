import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export const TRUCK_NAVY = '#1B2744';
export const TRUCK_GREEN = '#74C044';
export const TRUCK_GREEN_DARK = '#4F9A28';
export const TRUCK_CIRCLE = '#C6E6A6';

type GarbageTruckIconProps = {
  size?: number;
  showPulse?: boolean;
};

/**
 * Recolector de perfil, cabina a la derecha (Este).
 * En el mapa: rotation = heading - 90, igual que la web,
 * para que rumbo 0° (Norte) deje la cabina apuntando arriba.
 */
export const GarbageTruckIcon = ({ size = 64, showPulse = true }: GarbageTruckIconProps) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (showPulse) {
      pulseScale.value = withRepeat(
        withTiming(1.32, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    }
  }, [showPulse, pulseScale, pulseOpacity]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {showPulse && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: size * 0.95,
              height: size * 0.95,
              borderRadius: (size * 0.95) / 2,
              borderColor: TRUCK_GREEN,
              backgroundColor: 'rgba(116, 192, 68, 0.15)',
            },
            animatedPulseStyle,
          ]}
        />
      )}
      <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
      <Circle cx={64} cy={64} r={60} fill="#FFFFFF" />
      <Circle cx={64} cy={64} r={52} fill={TRUCK_CIRCLE} />
      <Circle cx={64} cy={64} r={52} stroke={TRUCK_GREEN_DARK} strokeWidth={3.2} fill="none" />

      {/* Sombra */}
      <Path
        d="M28 92 C40 98, 88 98, 100 92"
        stroke={TRUCK_NAVY}
        strokeOpacity={0.12}
        strokeWidth={6}
        strokeLinecap="round"
      />

      {/* Chasis */}
      <Rect x={30} y={76} width={70} height={8} rx={2} fill={TRUCK_NAVY} />

      {/* Caja y tolva (atrás = izquierda) */}
      <Path
        d="M26 58
           C24 50 28 42 36 40
           H78
           V78
           H32
           C28 78 26 74 26 70
           Z"
        fill={TRUCK_GREEN}
      />
      <Path
        d="M26 58 C24 48 30 40 38 40 H48 V78 H32 C28 78 26 72 26 66 Z"
        fill={TRUCK_GREEN_DARK}
        fillOpacity={0.22}
      />

      {/* Hoja */}
      <Path
        d="M52 46
           C62 48 68 58 62 68
           C54 64 46 56 48 46
           C50 50 52 50 52 46 Z"
        fill="#FFFFFF"
      />
      <Path
        d="M51 50 C54 56 58 62 60 67"
        stroke={TRUCK_GREEN_DARK}
        strokeWidth={1.7}
        strokeLinecap="round"
      />

      {/* Cabina (frente = derecha) */}
      <Path
        d="M78 44
           C78 40 81 38 86 38
           H96
           C102 38 106 44 106 50
           V78
           H78
           Z"
        fill="#FFFFFF"
      />
      <Path
        d="M84 42
           C84 40 86 39 89 39
           H98
           C101 39 103 42 103 45
           V56
           H84
           Z"
        fill={TRUCK_NAVY}
      />
      <Rect x={82} y={62} width={12} height={2.2} rx={1} fill={TRUCK_NAVY} fillOpacity={0.3} />
      <Circle cx={98} cy={66} r={1.5} fill={TRUCK_NAVY} fillOpacity={0.4} />

      {/* Ruedas */}
      <Circle cx={44} cy={86} r={10} fill={TRUCK_NAVY} />
      <Circle cx={44} cy={86} r={4.2} fill="#FFFFFF" />
      <Circle cx={90} cy={86} r={10} fill={TRUCK_NAVY} />
      <Circle cx={90} cy={86} r={4.2} fill="#FFFFFF" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
});
