import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, TouchableOpacityProps } from 'react-native';

const T = {
  primary: '#1763A6',
  primaryHover: '#13528A',
};

interface AuthButtonProps extends TouchableOpacityProps {
  label: string;
  isLoading?: boolean;
  variant?: 'primary' | 'outline';
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  label,
  isLoading = false,
  variant = 'primary',
  style,
  disabled,
  ...props
}) => {
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutline ? styles.buttonOutline : styles.buttonPrimary,
        (isLoading || disabled) && styles.buttonDisabled,
        style,
      ]}
      disabled={isLoading || disabled}
      activeOpacity={0.8}
      {...props}
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
  },
  buttonPrimary: {
    backgroundColor: T.primary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: T.primary,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textOutline: {
    color: T.primary,
  },
});
