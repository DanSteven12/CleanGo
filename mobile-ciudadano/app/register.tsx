// mobile-ciudadano/app/register.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ApiError } from '../services/authService';
import { LegalLinks } from '../components/legal/LegalLinks';
import { registerCiudadano } from '../services/authService';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';
import { Mail, Lock, User, Check, Circle } from 'lucide-react-native';

// ─── Design Tokens ───────────────
const T = {
  primary: '#1763A6',
  bgPage: '#FFFFFF',
  bgInput: '#F8FAFC',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  destructive: '#DC2626',
  destructiveBg: '#FEF2F2',
  destructiveText: '#B91C1C',
  successBg: '#ECFDF5',
  successText: '#065F46',
  successIcon: '#10B981', // Verde brillante para los checks
  errorIcon: '#EF4444', // Rojo brillante para los círculos
};

export default function RegisterScreen() {
  const router = useRouter();

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss inteligente para mensajes de error
  useEffect(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }

    if (errorMsg) {
      const isFast =
        errorMsg.includes('obligatorios') ||
        errorMsg.includes('coinciden') ||
        errorMsg.includes('caracteres') ||
        errorMsg.includes('válido');
      const duration = isFast ? 3500 : 5000;

      errorTimerRef.current = setTimeout(() => {
        setErrorMsg(null);
        errorTimerRef.current = null;
      }, duration);
    }

    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, [errorMsg]);

  // Validación rápida frontend para la contraseña (UX)
  const isPasswordValid = (pwd: string) => {
    return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
  };

  const handleRegister = async () => {
    // 1. Limpiar estados
    setErrorMsg(null);

    // 2. Validaciones básicas frontend
    const trimmedNombre = nombre.trim();
    const trimmedEmail = email.trim();

    if (!trimmedNombre || !trimmedEmail || !password || !confirmPassword) {
      setErrorMsg('Todos los campos son obligatorios.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (!isPasswordValid(password)) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.');
      return;
    }

    // 3. Llamada a la API
    setIsLoading(true);
    try {
      await registerCiudadano(trimmedNombre, trimmedEmail, password, confirmPassword);
      router.replace('/login');
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

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <View style={styles.requirementRow}>
      {met ? (
        <Check color={T.successIcon} size={16} strokeWidth={3} />
      ) : (
        <Circle color={T.errorIcon} size={16} strokeWidth={2} />
      )}
      <Text style={[styles.requirementText, met ? styles.requirementMet : styles.requirementUnmet]}>
        {text}
      </Text>
    </View>
  );

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
              title="Registro" 
              subtitle="Crea tu cuenta de Ciudadano" 
            />

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <AuthInput
              label="Nombre completo"
              placeholder="Ej. Juan Pérez"
              value={nombre}
              onChangeText={(text) => {
                setNombre(text);
                if (errorMsg) setErrorMsg(null);
              }}
              autoCapitalize="words"
              editable={!isLoading}
              icon={<User color={T.text} size={20} />}
            />

            <AuthInput
              label="Correo electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMsg) setErrorMsg(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
              icon={<Mail color={T.text} size={20} />}
            />

            <AuthInput
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMsg) setErrorMsg(null);
              }}
              autoCapitalize="none"
              editable={!isLoading}
              isPassword
              icon={<Lock color={T.text} size={20} />}
            />

            {/* Requerimientos de contraseña en tiempo real */}
            <View style={styles.requirementsContainer}>
              <PasswordRequirement met={password.length >= 8} text="Al menos 8 caracteres" />
              <PasswordRequirement met={/[A-Z]/.test(password)} text="Al menos 1 letra mayúscula" />
              <PasswordRequirement met={/[0-9]/.test(password)} text="Al menos 1 número" />
            </View>

            <AuthInput
              label="Confirmar contraseña"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errorMsg) setErrorMsg(null);
              }}
              autoCapitalize="none"
              editable={!isLoading}
              isPassword
              icon={<Lock color={T.text} size={20} />}
            />

            <AuthButton
              label="Crear Cuenta"
              onPress={handleRegister}
              isLoading={isLoading}
            />

            <LegalLinks actionText="registrarte" disabled={isLoading} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>¿Ya tienes una cuenta?</Text>
              <TouchableOpacity onPress={() => router.replace('/login')} disabled={isLoading}>
                <Text style={styles.footerLink}> Inicia sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  errorBanner: {
    backgroundColor: T.destructiveBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.destructiveBg,
  },
  errorText: {
    color: T.destructiveText,
    fontSize: 14,
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: T.successBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: {
    color: T.successText,
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: T.text,
    fontSize: 14,
  },
  footerLink: {
    color: T.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  requirementsContainer: {
    marginTop: -8, // Compensar el marginBottom de AuthInput
    marginBottom: 16,
    paddingHorizontal: 4,
    gap: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
  },
  requirementMet: {
    color: T.successIcon,
  },
  requirementUnmet: {
    color: T.errorIcon,
  },
});
