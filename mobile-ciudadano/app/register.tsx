// mobile-ciudadano/app/register.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ApiError, registerCiudadano } from '../services/authService';
import { LegalModal } from '../components/legal/LegalModal';
import { TermsContent } from '../components/legal/TermsContent';
import { PrivacyContent } from '../components/legal/PrivacyContent';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';
import {
  Mail,
  Lock,
  User,
  Check,
  Phone,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react-native';

// ─── Design Tokens ───────────────
const T = {
  primary: '#1763A6',
  primaryLight: '#EFF6FF',
  bgPage: '#FFFFFF',
  cardBg: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  destructive: '#DC2626',
  destructiveBg: '#FEF2F2',
  destructiveBorder: '#FECACA',
  destructiveText: '#B91C1C',
  success: '#10B981',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#065F46',
  warning: '#F59E0B',
};

export default function RegisterScreen() {
  const router = useRouter();

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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

  // Validadores auxiliares
  const isValidNombre = (text: string): boolean => {
    const clean = text.trim();
    if (clean.length < 3 || clean.length > 100) return false;
    if (/[0-9]/.test(clean)) return false;
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(clean)) return false;
    const letters = clean.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '');
    return letters.length >= 3;
  };

  const isValidTelefono = (text: string): boolean => {
    const clean = text.trim();
    if (!/^[0-9]{10}$/.test(clean)) return false;
    if (!/^[2-9]/.test(clean)) return false; // En México (+52) inicia con 2-9
    if (/^(\d)\1{9}$/.test(clean)) return false; // Dígitos todos iguales (0000000000, 1111111111, etc.)
    if (/(\d)\1{6,}/.test(clean)) return false; // 7+ dígitos repetidos consecutivos
    const dummyNumbers = [
      '1234567890',
      '0123456789',
      '9876543210',
      '0987654321',
      '1122334455',
      '1212121212',
      '2345678901',
      '9898989898',
    ];
    if (dummyNumbers.includes(clean)) return false;
    return true;
  };

  // Validaciones en tiempo real (UX)
  const isNombreValid = isValidNombre(nombre);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isTelefonoValid = isValidTelefono(telefono);
  const isConfirmPasswordValid =
    confirmPassword.length > 0 && confirmPassword === password;

  // Requisitos individuales de contraseña
  const reqLength = password.length >= 10 && password.length <= 72;
  const reqUpper = /[A-Z]/.test(password);
  const reqLower = /[a-z]/.test(password);
  const reqNum = /[0-9]/.test(password);
  const reqSpecial = /[^A-Za-z0-9]/.test(password);
  const reqNoSpaces = password.length > 0 && !/\s/.test(password);

  const isPasswordSecure =
    reqLength && reqUpper && reqLower && reqNum && reqSpecial && reqNoSpaces;

  // Medidor de fuerza de contraseña
  const strengthInfo = useMemo(() => {
    if (!password) return { score: 0, label: 'Sin contraseña', color: T.textMuted };
    const metCount = [reqLength, reqUpper, reqLower, reqNum, reqSpecial, reqNoSpaces].filter(
      Boolean
    ).length;

    if (metCount <= 2) {
      return { score: 1, label: 'Débil', color: '#EF4444' };
    }
    if (metCount <= 4) {
      return { score: 2, label: 'Media', color: '#F59E0B' };
    }
    if (metCount === 5) {
      return { score: 3, label: 'Buena', color: '#3B82F6' };
    }
    return { score: 4, label: 'Excelente', color: '#10B981' };
  }, [password, reqLength, reqUpper, reqLower, reqNum, reqSpecial, reqNoSpaces]);

  const handleRegister = async () => {
    setErrorMsg(null);

    const trimmedNombre = nombre.trim();
    const trimmedEmail = email.trim();
    const trimmedTelefono = telefono.trim();

    if (!trimmedNombre || !trimmedEmail || !trimmedTelefono || !password || !confirmPassword) {
      setErrorMsg('Todos los campos son obligatorios.');
      return;
    }

    if (/[0-9]/.test(trimmedNombre)) {
      setErrorMsg('El nombre completo no debe contener números.');
      return;
    }

    if (!isValidNombre(trimmedNombre)) {
      setErrorMsg('Por favor ingresa un nombre completo válido (solo letras, mínimo 3 caracteres).');
      return;
    }

    if (!isEmailValid) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (trimmedTelefono.length !== 10) {
      setErrorMsg('El teléfono debe tener exactamente 10 dígitos numéricos.');
      return;
    }

    if (!/^[2-9]/.test(trimmedTelefono)) {
      setErrorMsg('El número telefónico no puede iniciar con 0 ni 1.');
      return;
    }

    if (!isValidTelefono(trimmedTelefono)) {
      setErrorMsg('Por favor ingresa un número telefónico real y válido.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (!isPasswordSecure) {
      setErrorMsg('La contraseña no cumple con los requisitos de seguridad.');
      return;
    }

    if (
      password.toLowerCase() === trimmedEmail.toLowerCase() ||
      (trimmedEmail.includes('@') &&
        password.toLowerCase() === trimmedEmail.split('@')[0].toLowerCase())
    ) {
      setErrorMsg('La contraseña no puede ser igual a tu correo electrónico.');
      return;
    }

    if (password.toLowerCase() === trimmedNombre.toLowerCase()) {
      setErrorMsg('La contraseña no puede ser igual a tu nombre.');
      return;
    }

    if (!acceptedTerms) {
      setErrorMsg('Debes aceptar los Términos de servicio y la Política de privacidad.');
      return;
    }

    setIsLoading(true);
    try {
      await registerCiudadano(
        trimmedNombre,
        trimmedEmail,
        password,
        confirmPassword,
        trimmedTelefono
      );
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
              title="Crear Cuenta"
              subtitle="Regístrate como ciudadano para consultar rutas y recibir avisos."
            />

            {errorMsg && (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color={T.destructive} strokeWidth={2.2} style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* ── Nombre Completo ── */}
            <AuthInput
              label="Nombre completo"
              placeholder="Ej. Juan Pérez López"
              value={nombre}
              onChangeText={(text) => {
                // Filtrar números y caracteres especiales no permitidos en nombres
                const filtered = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
                setNombre(filtered);
                if (errorMsg) setErrorMsg(null);
              }}
              autoCapitalize="words"
              editable={!isLoading}
              maxLength={70}
              isValid={isNombreValid}
              icon={<User color={isNombreValid ? T.primary : T.text} size={20} />}
            />

            {/* ── Correo Electrónico ── */}
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
              isValid={isEmailValid}
              icon={<Mail color={isEmailValid ? T.primary : T.text} size={20} />}
            />

            {/* ── Teléfono con Bandera Mexicana ── */}
            <AuthInput
              label="Número telefónico"
              placeholder="919 123 4567"
              value={telefono}
              prefix="🇲🇽 +52"
              onChangeText={(text) => {
                const numericText = text.replace(/[^0-9]/g, '');
                setTelefono(numericText);
                if (errorMsg) setErrorMsg(null);
              }}
              keyboardType="number-pad"
              autoCapitalize="none"
              editable={!isLoading}
              maxLength={10}
              isValid={isTelefonoValid}
              icon={<Phone color={isTelefonoValid ? T.primary : T.text} size={20} />}
            />

            {/* ── Contraseña ── */}
            <AuthInput
              label="Contraseña"
              placeholder="Mínimo 10 caracteres"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMsg) setErrorMsg(null);
              }}
              autoCapitalize="none"
              editable={!isLoading}
              isPassword
              maxLength={72}
              icon={<Lock color={isPasswordSecure ? T.primary : T.text} size={20} />}
            />

            {/* ── Medidor de Fortaleza de Contraseña & Chips ── */}
            {password.length > 0 && (
              <View style={styles.passwordFeedbackContainer}>
                {/* Barra de progreso */}
                <View style={styles.strengthHeader}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.strengthSegment,
                          {
                            backgroundColor:
                              strengthInfo.score >= level
                                ? strengthInfo.color
                                : '#E2E8F0',
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
                    {strengthInfo.label}
                  </Text>
                </View>

                {/* Grid 2x3 de Chips Requerimientos */}
                <View style={styles.reqGrid}>
                  <RequirementChip met={reqLength} label="10+ caracteres" />
                  <RequirementChip met={reqUpper} label="1 Mayúscula" />
                  <RequirementChip met={reqLower} label="1 Minúscula" />
                  <RequirementChip met={reqNum} label="1 Número" />
                  <RequirementChip met={reqSpecial} label="1 Especial (@#$)" />
                  <RequirementChip met={reqNoSpaces} label="Sin espacios" />
                </View>
              </View>
            )}

            {/* ── Confirmar Contraseña ── */}
            <AuthInput
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errorMsg) setErrorMsg(null);
              }}
              autoCapitalize="none"
              editable={!isLoading}
              isPassword
              maxLength={72}
              isValid={isConfirmPasswordValid}
              error={
                confirmPassword.length > 0 && !isConfirmPasswordValid
                  ? 'Las contraseñas no coinciden'
                  : null
              }
              icon={<ShieldCheck color={isConfirmPasswordValid ? T.success : T.text} size={20} />}
            />

            {/* ── Tarjeta Interactiva de Términos y Condiciones ── */}
            <TouchableOpacity
              style={[
                styles.termsCard,
                acceptedTerms && styles.termsCardChecked,
              ]}
              onPress={() => {
                setAcceptedTerms(!acceptedTerms);
                if (errorMsg) setErrorMsg(null);
              }}
              activeOpacity={0.75}
              disabled={isLoading}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                ]}
              >
                {acceptedTerms && <Check color="#FFFFFF" size={13} strokeWidth={3.5} />}
              </View>

              <Text style={styles.termsText}>
                Acepto los{' '}
                <Text
                  style={styles.termsLink}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!isLoading) setShowTerms(true);
                  }}
                  suppressHighlighting
                >
                  Términos de servicio
                </Text>{' '}
                y la{' '}
                <Text
                  style={styles.termsLink}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!isLoading) setShowPrivacy(true);
                  }}
                  suppressHighlighting
                >
                  Política de privacidad
                </Text>{' '}
                municipal de CleanGo.
              </Text>
            </TouchableOpacity>

            {/* ── Botón Principal ── */}
            <AuthButton
              label="Crear Cuenta"
              onPress={handleRegister}
              isLoading={isLoading}
            />

            {/* ── Footer ── */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>¿Ya tienes una cuenta?</Text>
              <TouchableOpacity
                onPress={() => router.replace('/login')}
                disabled={isLoading}
                activeOpacity={0.6}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Text style={styles.footerLink}> Inicia sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LegalModal visible={showTerms} onClose={() => setShowTerms(false)}>
        {showTerms ? <TermsContent /> : null}
      </LegalModal>

      <LegalModal visible={showPrivacy} onClose={() => setShowPrivacy(false)}>
        {showPrivacy ? <PrivacyContent /> : null}
      </LegalModal>
    </SafeAreaView>
  );
}

// ─── Componente Chip de Requisito ─────────────────────
function RequirementChip({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={[styles.chip, met ? styles.chipMet : styles.chipUnmet]}>
      <View style={[styles.chipIconWrap, met ? styles.chipIconWrapMet : styles.chipIconWrapUnmet]}>
        {met ? (
          <Check size={11} color="#FFFFFF" strokeWidth={3.5} />
        ) : (
          <View style={styles.chipDot} />
        )}
      </View>
      <Text style={[styles.chipText, met ? styles.chipTextMet : styles.chipTextUnmet]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────
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
    paddingTop: 8,
    paddingBottom: 48,
  },
  formContainer: {
    paddingHorizontal: 22,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.destructiveBg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.destructiveBorder,
    gap: 10,
  },
  errorIcon: {
    flexShrink: 0,
  },
  errorText: {
    flex: 1,
    color: T.destructiveText,
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Feedback Contraseña ──
  passwordFeedbackContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  strengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 5,
    flex: 1,
    marginRight: 12,
  },
  strengthSegment: {
    flex: 1,
    height: 4.5,
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    width: '48.5%',
    gap: 6,
  },
  chipMet: {
    backgroundColor: T.successBg,
    borderColor: T.successBorder,
  },
  chipUnmet: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  chipIconWrap: {
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIconWrapMet: {
    backgroundColor: T.success,
  },
  chipIconWrapUnmet: {
    backgroundColor: '#E2E8F0',
  },
  chipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  chipTextMet: {
    color: T.successText,
  },
  chipTextUnmet: {
    color: '#64748B',
  },

  // ── Tarjeta Términos ──
  termsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    marginBottom: 20,
    marginTop: 2,
    gap: 12,
  },
  termsCardChecked: {
    backgroundColor: '#F0F9FF',
    borderColor: '#93C5FD',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 12.5,
    color: T.text,
    lineHeight: 18,
  },
  termsLink: {
    color: T.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  footerText: {
    color: T.text,
    fontSize: 14,
  },
  footerLink: {
    color: T.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
