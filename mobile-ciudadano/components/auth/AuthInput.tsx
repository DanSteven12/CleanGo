import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

const T = {
  primary: '#1763A6',
  textH: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
  inputBgFocus: '#FFFFFF',
  danger: '#EF4444',
};

interface AuthInputProps extends TextInputProps {
  label: string;
  icon?: React.ReactNode;
  error?: string | null;
  isPassword?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  icon,
  error,
  isPassword = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          !!error && styles.inputContainerError,
        ]}
      >
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          style={[styles.input, !icon && { paddingLeft: 16 }]}
          placeholderTextColor={T.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            {showPassword ? <EyeOff color={T.textMuted} size={20} /> : <Eye color={T.textMuted} size={20} />}
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textH,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.inputBg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 8,
    height: 52,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    backgroundColor: T.inputBgFocus,
    borderColor: T.primary,
  },
  inputContainerError: {
    borderColor: T.danger,
    backgroundColor: '#FEF2F2',
  },
  iconWrapper: {
    paddingLeft: 14,
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: T.textH,
    paddingRight: 16, // If there's no eye icon
  },
  eyeButton: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: T.danger,
    fontSize: 13,
    marginTop: 6,
    marginLeft: 2,
  },
});
