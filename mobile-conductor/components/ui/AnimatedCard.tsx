// mobile-conductor/components/ui/AnimatedCard.tsx
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from './AnimatedPressable';

export interface AnimatedCardProps {
  index?: number;
  maxStaggerIndex?: number;
  staggerMs?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function AnimatedCard({
  index = 0,
  maxStaggerIndex = 8,
  staggerMs = 45,
  onPress,
  style,
  scaleTo = 0.97,
  disabled = false,
  children,
}: AnimatedCardProps) {
  // Cap the delay so long lists don't have endless cascading wait times
  const effectiveIndex = Math.min(index, maxStaggerIndex);
  const delay = effectiveIndex * staggerMs;

  const enteringAnimation = FadeInDown.duration(380)
    .springify()
    .damping(20)
    .stiffness(220)
    .delay(delay);

  if (onPress) {
    return (
      <Animated.View entering={enteringAnimation}>
        <AnimatedPressable
          onPress={onPress}
          style={style}
          scaleTo={scaleTo}
          disabled={disabled}
        >
          {children}
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={enteringAnimation} style={style}>
      {children}
    </Animated.View>
  );
}
