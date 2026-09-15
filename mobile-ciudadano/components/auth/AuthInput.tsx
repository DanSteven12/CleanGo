import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Eye, EyeOff, Check } from 'lucide-react-native';

const T = {
  primary: '#1763A6',
  primaryLight: '#EFF6FF',
  primaryBorder: '#93C5FD',
  textH: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
  inputBgFocus: '#FFFFFF',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  success: '#10B981',
  successLight: '#ECFDF5',
};

export interface AuthInputProps extends TextInputProps {
  label: string;
  icon?: React.ReactNode;
  prefix?: string;
  error?: string | null;
  isPassword?: boolean;
  isValid?: boolean;
  rightAccessory?: React.ReactNode;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  icon,
  prefix,
  error,
  isPassword = false,
  isValid = false,
  rightAccessory,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const hasError = !!error;
  const showValidBadge = isValid && !hasError && !isPassword;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
        {rightAccessory}
      </View>

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          hasError && styles.inputContainerError,
          isValid && !isFocused && !hasError && styles.inputContainerValid,
        ]}
      >
        {icon && (
          <View
            style={[
              styles.iconWrapper,
              isFocused && styles.iconWrapperFocused,
              hasError && styles.iconWrapperError,
            ]}
          >
            {icon}
          </View>
        )}

        {prefix && (
          <View style={styles.prefixWrapper}>
            <Text style={styles.prefixText}>{prefix}</Text>
            <View style={styles.prefixDivider} />
          </View>
        )}

        <TextInput
          style={[
            styles.input,
            !icon && !prefix && { paddingLeft: 16 },
            style,
          ]}
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
          cursorColor={T.primary}
          selectionColor="rgba(23, 99, 166, 0.2)"
          {...props}
        />

        {showValidBadge && (
          <View style={styles.validBadge}>
            <Check size={14} color="#FFFFFF" strokeWidth={3} />
          </View>
        )}

        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            {showPassword ? (
              <EyeOff color={isFocused ? T.primary : T.textMuted} size={20} />
            ) : (
              <Eye color={isFocused ? T.primary : T.textMuted} size={20} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
    color: T.textH,
    letterSpacing: 0.1,
  },
  labelFocused: {
    color: T.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.inputBg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 0,
  },
  inputContainerFocused: {
    backgroundColor: T.inputBgFocus,
    borderColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  inputContainerValid: {
    borderColor: '#CBD5E1',
  },
  inputContainerError: {
    borderColor: T.danger,
    backgroundColor: T.dangerBg,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 4,
    backgroundColor: 'transparent',
  },
  iconWrapperFocused: {
    backgroundColor: T.primaryLight,
  },
  iconWrapperError: {
    backgroundColor: '#FEE2E2',
  },
  prefixWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  prefixText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: T.textH,
    letterSpacing: 0.2,
  },
  prefixDivider: {
    width: 1,
    height: 20,
    backgroundColor: T.border,
    marginHorizontal: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: T.textH,
    paddingVertical: 0,
    paddingRight: 8,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  validBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: T.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  eyeButton: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: T.danger,
    fontSize: 12.5,
    marginTop: 5,
    marginLeft: 4,
    fontWeight: '500',
  },
});
