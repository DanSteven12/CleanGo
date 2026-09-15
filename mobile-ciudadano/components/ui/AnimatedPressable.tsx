import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
  children?: React.ReactNode;
}

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  style,
  scaleTo = 0.97,
  springConfig = { damping: 20, stiffness: 600, mass: 0.2 },
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!disabled) {
      // withTiming en press-in = respuesta inmediata (~60ms)
      scale.value = withTiming(scaleTo, {
        duration: 60,
        easing: Easing.out(Easing.quad),
      });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!disabled) {
      // withSpring al soltar = sensación natural de rebote suave
      scale.value = withSpring(1, springConfig);
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressableComponent
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressableComponent>
  );
}
