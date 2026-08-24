// mobile-ciudadano/app/login.tsx
import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/authService';
import { LegalLinks } from '../components/legal/LegalLinks';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';
import { Mail, Lock } from 'lucide-react-native';

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
  warning: '#D97706',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#B45309',
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blockTime, setBlockTime] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  // Contador regresivo de bloqueo
  useEffect(() => {
    if (blockTime === null || blockTime <= 0) return;
    const id = setInterval(() => {
      setBlockTime(prev => {
        if (prev && prev > 1) return prev - 1;
        return null;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [blockTime]);

  const isBlocked = blockTime !== null && blockTime > 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Por favor ingresa correo y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await login(email, password);
      // La navegación a Home se maneja automáticamente en _layout.tsx
      // al cambiar el estado de isAuthenticated
    } catch (error: any) {
      if (error instanceof ApiError || error?.name === 'ApiError') {
        if (error.status === 429 && error.retryAfter) {
          setBlockTime(error.retryAfter);
          setRemaining(null);
        } else if (error.status === 401 && error.remaining !== undefined) {
          setRemaining(error.remaining);
          setErrorMsg(error.message);
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setErrorMsg('Error al conectar con el servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Bloqueo total (pantalla superpuesta) ─────────────────────── */}
      {isBlocked && (
        <View style={styles.blockOverlay}>
          <View style={styles.blockIcon}>
            <Text style={styles.blockIconText}>🚫</Text>
          </View>
          <Text style={styles.blockTitle}>ACCESO DENEGADO</Text>
          <Text style={styles.blockDesc}>
            Se detectaron demasiados intentos fallidos. Por seguridad, el acceso permanecerá bloqueado temporalmente.
          </Text>
          <Text style={styles.blockTimer}>{formatTime(blockTime!)}</Text>
        </View>
      )}

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
              title="CleanGo"
              subtitle="Inicia sesión para continuar"
            />

            {/* ── Warning: intentos restantes ──────────────────────────── */}
            {remaining !== null && remaining > 0 && (
              <View style={[
                styles.banner,
                remaining <= 2 ? styles.bannerDestructive : styles.bannerWarning,
              ]}>
                <Text style={styles.bannerIcon}>⚠️</Text>
                <View style={styles.bannerBody}>
                  <Text style={[styles.bannerTitle, remaining <= 2 ? styles.bannerTitleRed : styles.bannerTitleAmber]}>
                    {remaining === 1 ? 'Último intento disponible' : 'Advertencia de seguridad'}
                  </Text>
                  <Text style={[styles.bannerText, remaining <= 2 ? styles.bannerTextRed : styles.bannerTextAmber]}>
                    {remaining === 1
                      ? 'El siguiente intento fallido bloqueará temporalmente el acceso.'
                      : `Te quedan ${remaining} intentos antes de que el acceso sea bloqueado.`}
                  </Text>
                </View>
              </View>
            )}

            {errorMsg && (
              <View style={[styles.banner, styles.bannerDestructive, { marginBottom: 20 }]}>
                <Text style={styles.bannerIcon}>⛔</Text>
                <View style={styles.bannerBody}>
                  <Text style={[styles.bannerText, styles.bannerTextRed]}>{errorMsg}</Text>
                </View>
              </View>
            )}

            <AuthInput
              label="Correo electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
              icon={<Mail color={T.text} size={20} />}
            />

            <View style={styles.passwordWrapper}>
              <AuthInput
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                editable={!isLoading && !isBlocked}
                isPassword
                icon={<Lock color={T.text} size={20} />}
              />
              <View style={styles.forgotPasswordContainer}>
                <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                  <Text style={styles.forgotPasswordText}>
                    ¿Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <AuthButton
              label="Iniciar Sesión"
              onPress={handleLogin}
              isLoading={isLoading}
              disabled={isBlocked}
            />

            <LegalLinks actionText="iniciar sesión" disabled={isLoading || isBlocked} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>¿No tienes una cuenta?</Text>
              <TouchableOpacity onPress={() => router.replace('/register')} disabled={isLoading || isBlocked}>
                <Text style={styles.footerLink}> Regístrate</Text>
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
  passwordWrapper: {
    marginBottom: 4,
  },
  forgotPasswordContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -8, // Offset the AuthInput's marginBottom
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: T.primary,
    fontSize: 13,
    fontWeight: '600'
  },

  // ── Block Overlay ─────────────────────────────────────────────────────────
  blockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
    backgroundColor: 'rgba(15,23,42,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  blockIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  blockIconText: { fontSize: 44 },
  blockTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  blockDesc: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 330,
    marginBottom: 30,
  },
  blockTimer: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: 4,
  },

  // ── Banners ─────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  bannerWarning: {
    backgroundColor: T.warningBg,
    borderColor: T.warningBorder,
  },
  bannerDestructive: {
    backgroundColor: T.destructiveBg,
    borderColor: '#FECACA',
  },
  bannerIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  bannerBody: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerTitleAmber: {
    color: T.warningText,
  },
  bannerTitleRed: {
    color: T.destructiveText,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bannerTextAmber: {
    color: '#92400E',
  },
  bannerTextRed: {
    color: T.destructiveText,
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
});
