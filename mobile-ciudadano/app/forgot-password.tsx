// mobile-ciudadano/app/forgot-password.tsx
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
import { useRouter } from 'expo-router';
import { requestPasswordReset, ApiError } from '../services/authService';
import { ArrowLeft, Mail } from 'lucide-react-native';
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
  primaryHover: '#13528A',
  danger: '#EF4444',
  success: '#10B981',
};

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequest = async () => {
    if (!email.trim()) {
      setErrorMsg('Por favor, ingresa tu correo electrónico.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await requestPasswordReset(email.trim());
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={isLoading}>
          <ArrowLeft size={24} color={T.textH} />
        </TouchableOpacity>
      </View>

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
              title="Recuperar Contraseña" 
              subtitle="Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña en la aplicación." 
            />

            {!!errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {!!successMsg && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            )}

            {!successMsg && (
              <>
                <AuthInput
                  label="Correo electrónico"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setErrorMsg('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                  icon={<Mail color={T.text} size={20} />}
                />

                <AuthButton
                  label="Enviar enlace"
                  onPress={handleRequest}
                  isLoading={isLoading}
                />
              </>
            )}

            {!!successMsg && (
              <AuthButton
                label="Volver a iniciar sesión"
                variant="outline"
                onPress={() => router.replace('/login')}
              />
            )}
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
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
