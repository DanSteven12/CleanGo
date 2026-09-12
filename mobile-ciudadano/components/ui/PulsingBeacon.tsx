import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export interface PulsingBeaconProps {
  color?: string;
  size?: number;
  pulseScale?: number;
  style?: StyleProp<ViewStyle>;
}

export function PulsingBeacon({
  color = '#16A34A',
  size = 8,
  pulseScale = 2.2,
  style,
}: PulsingBeaconProps) {
  const pulse = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(pulseScale, {
        duration: 1600,
        easing: Easing.out(Easing.ease),
      }),
      -1,
      false
    );

    opacity.value = withRepeat(
      withTiming(0, {
        duration: 1600,
        easing: Easing.out(Easing.ease),
      }),
      -1,
      false
    );
  }, [pulse, opacity, pulseScale]);

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
      opacity: opacity.value,
    };
  });

  return (
    <View style={[styles.container, { width: size * pulseScale, height: size * pulseScale }, style]}>
      {/* Outer expanding halo */}
      <Animated.View
        style={[
          styles.halo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          animatedPulseStyle,
        ]}
      />
      {/* Core solid dot */}
      <View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
  },
  core: {
    position: 'relative',
    zIndex: 2,
  },
});
