import React from 'react';
import { Text, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { AnimatedPressable } from '../ui/AnimatedPressable';

const T = {
  primary: '#1763A6',
  primaryHover: '#13528A',
};

interface AuthButtonProps {
  label: string;
  onPress?: () => void;
  isLoading?: boolean;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  isLoading = false,
  variant = 'primary',
  style,
  disabled,
}) => {
  const isOutline = variant === 'outline';

  return (
    <AnimatedPressable
      style={[
        styles.button,
        isOutline ? styles.buttonOutline : styles.buttonPrimary,
        (isLoading || disabled) && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={isLoading || disabled}
      scaleTo={0.97}
    >
      {isLoading ? (
        <ActivityIndicator color={isOutline ? T.primary : '#FFFFFF'} />
      ) : (
        <Text
          style={[
            styles.text,
            isOutline ? styles.textOutline : styles.textPrimary,
          ]}
        >
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
  },
  buttonPrimary: {
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: T.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
    elevation: 0,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textOutline: {
    color: T.primary,
  },
});
