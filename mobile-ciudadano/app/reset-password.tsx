// mobile-ciudadano/app/reset-password.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { resetPassword, ApiError } from '../services/authService';
import { Lock } from 'lucide-react-native';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';

const T = {
  bgPage: '#F8FAFC',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  inputBg: '#FFFFFF',
  primary: '#1763A6',
  danger: '#EF4444',
  success: '#10B981',
};

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Validate on the fly
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleReset = async () => {
    if (!token) {
      setErrorMsg('Token inválido. Solicita un nuevo enlace.');
      return;
    }
    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setErrorMsg('La contraseña no cumple con todos los requisitos.');
      return;
    }
    if (!isMatch) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await resetPassword(token, newPassword, confirmPassword);
      if (res) {
        setSuccessMsg(res.message);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg('Error al conectar con el servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <AuthHeader 
              title="Establecer Contraseña" 
              subtitle={!token 
                ? 'No se ha detectado el token de seguridad.' 
                : 'Por favor, ingresa tu nueva contraseña para acceder a la aplicación.'
              }
            />

            {!!errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {!!successMsg && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMsg}</Text>
                <AuthButton
                  label="Iniciar Sesión"
                  onPress={() => router.replace('/login')}
                  style={{ marginTop: 16 }}
                />
              </View>
            )}

            {!successMsg && !token && (
              <AuthButton
                label="Solicitar nuevo enlace"
                variant="outline"
                onPress={() => router.replace('/forgot-password')}
              />
            )}

            {!successMsg && token && (
              <>
                <AuthInput
                  label="Nueva Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); setErrorMsg(''); }}
                  editable={!isLoading}
                  isPassword
                  icon={<Lock color={T.text} size={20} />}
                />

                <AuthInput
                  label="Confirmar Contraseña"
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setErrorMsg(''); }}
                  editable={!isLoading}
                  isPassword
                  icon={<Lock color={T.text} size={20} />}
                />

                <View style={styles.requirementsBox}>
                  <Text style={styles.reqTitle}>Tu contraseña debe incluir:</Text>
                  <Requirement text="Mínimo 8 caracteres" met={hasMinLength} />
                  <Requirement text="Una letra mayúscula" met={hasUppercase} />
                  <Requirement text="Un número" met={hasNumber} />
                  <Requirement text="Las contraseñas coinciden" met={isMatch} />
                </View>

                <AuthButton
                  label="Actualizar contraseña"
                  onPress={handleReset}
                  isLoading={isLoading}
                />

                <AuthButton
                  label="Cancelar"
                  variant="outline"
                  onPress={() => router.replace('/login')}
                  disabled={isLoading}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Requirement({ text, met }: { text: string; met: boolean }) {
  return (
    <View style={styles.reqRow}>
      <View style={[styles.reqDot, met && styles.reqDotMet]} />
      <Text style={[styles.reqText, met && styles.reqTextMet]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 60,
  },
  formContainer: {
    paddingHorizontal: 24,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  requirementsBox: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    marginTop: 8,
  },
  reqTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textH,
    marginBottom: 8,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reqDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
    marginRight: 8,
  },
  reqDotMet: {
    backgroundColor: T.success,
  },
  reqText: {
    fontSize: 13,
    color: '#64748B',
  },
  reqTextMet: {
    color: T.success,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: T.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    color: T.success,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
