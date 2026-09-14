// mobile-conductor/app/login.tsx
/**
 * Pantalla de Login de la app móvil de Conductores.
 *
 * Diseño idéntico al Login Web de CleanGo:
 *  - Paleta: azul institucional #1763A6, verde #90BF49, dark #152C40
 *  - Fuentes: Space Grotesk (títulos) / Inter (cuerpo) vía @expo-google-fonts
 *  - Estructura: panel izquierdo decorativo + panel derecho con formulario
 *  - Inputs, botones, banners de error/warning idénticos al CSS web
 *
 * Textos adaptados para conductores/dispositivos (sin registro ni recuperación).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Image,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useRouter, useFocusEffect, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/authService';
import { X, User, Lock, Eye, EyeOff } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_WIDE = SCREEN_WIDTH >= 768;

// ─── Design Tokens (espejados del Web - Tema Claro / Institucional) ───────────
const T = {
  // Paleta institucional
  primary:       '#1763A6',
  primaryDark:   '#125088',
  secondary:     '#152C40',
  accent:        '#90BF49',

  // Backgrounds
  bgPage:        '#FFFFFF',   // Fondo principal blanco (como en la web)
  bgPanelRight:  '#FFFFFF',   // Panel del formulario
  bgInput:       '#F8FAFC',   // Fondo de inputs suave
  bgInputFocused:'#FFFFFF',   // Input enfocado
  bgLeft:        '#152C40',   // Panel izquierdo (tablet)

  // Textos
  textH:         '#0F172A',   // Titulares principales (negro/azul petróleo oscuro)
  text:          '#475569',   // Textos secundarios (slate 600)
  textMuted:     '#94A3B8',   // Placeholders y notas

  // Bordes
  border:        '#E2E8F0',   // Borde estándar
  borderFocus:   '#1763A6',   // Borde al enfocar

  // Semánticos
  destructive:   '#DC2626',
  destructiveBg: '#FEF2F2',
  destructiveBorder: '#FECACA',
  destructiveText: '#B91C1C',

  warning:       '#D97706',
  warningBg:     '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText:   '#B45309',
} as const;

// ─── Animated Orb (decoración panel izquierdo tablet) ────────────────────────
function AnimatedOrb({ size, color, delay }: { size: number; color: string; delay: number }) {
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 3000, delay, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.85, duration: 3000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scale }],
        opacity: 0.18,
      }}
    />
  );
}

// ─── Animated Login Logo (Pulsing Glow Halo + Spring Entrance) ──────────────
function AnimatedLoginLogo({ size = 52 }: { size?: number }) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  const enterScale = useRef(new Animated.Value(0.5)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      // 1. Entrada Spring elegante
      enterScale.setValue(0.5);
      enterOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(enterScale, {
          toValue: 1,
          friction: 6,
          tension: 75,
          useNativeDriver: true,
        }),
        Animated.timing(enterOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();

      // 2. Halo pulsante continuo estilo TechOrbit Web (#90BF49)
      const pulseLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseScale, {
              toValue: 1.35,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0.08,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.45,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      pulseLoop.start();

      return () => {
        pulseLoop.stop();
        enterScale.stopAnimation();
        enterOpacity.stopAnimation();
      };
    }, [enterOpacity, enterScale, pulseOpacity, pulseScale])
  );

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Halo verde institucional de fondo pulsante */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#90BF49',
          transform: [{ scale: pulseScale }],
          opacity: pulseOpacity,
        }}
      />
      {/* Ícono central con entrada animada y borde limpio */}
      <Animated.View
        style={[
          styles.mobileBrandLogoWrapper,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: enterOpacity,
            transform: [{ scale: enterScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/cleango-icon.png')}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
}

// ─── Componente FadeSlideIn (Entrada Staggered Framer-Motion style) ──────────
function FadeSlideIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(22);

      const anim = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      anim.start();

      return () => {
        anim.stop();
        opacity.stopAnimation();
        translateY.stopAnimation();
      };
    }, [delay, opacity, translateY])
  );

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Animated Text "CleanGo" (Rotación 3D en Vivo y Continua) ────────────────
function AnimatedCleanGoText({ textStyle }: { textStyle: any }) {
  const letters = 'CleanGo'.split('');
  const animations = useRef(letters.map(() => new Animated.Value(0))).current;

  useFocusEffect(
    useCallback(() => {
      const timeouts: any[] = [];
      const loops: Animated.CompositeAnimation[] = [];

      animations.forEach((anim, i) => {
        anim.setValue(0);
        // Cada letra arranca su loop perpetuo con un desfase inicial (stagger)
        const timeoutId = setTimeout(() => {
          const loopAnim = Animated.loop(
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            })
          );
          loops.push(loopAnim);
          loopAnim.start();
        }, i * 140);
        timeouts.push(timeoutId);
      });

      return () => {
        timeouts.forEach(t => clearTimeout(t));
        loops.forEach(l => l.stop());
        animations.forEach(a => a.stopAnimation());
      };
    }, [animations])
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {letters.map((letter, i) => {
        // Rotación 3D sobre el eje X (vuelta completa)
        const rotateX = animations[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        // Cambio de opacidad en las caras superior / inferior
        const opacity = animations[i].interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [1, 0.45, 0.95, 0.45, 1],
        });

        // Sensación de profundidad mediante ligera escala
        const scale = animations[i].interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [1, 0.88, 1, 0.88, 1],
        });

        return (
          <Animated.Text
            key={i}
            style={[
              textStyle,
              {
                transform: [
                  { perspective: 600 },
                  { rotateX },
                  { scale },
                ],
                opacity,
              },
            ]}
          >
            {letter}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ─── Feature item (panel izquierdo tablet) ───────────────────────────────────
function FeatureItem({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login, sessionExpiredReason, clearSessionExpiredReason } = useAuth();

  const [usuarioDispositivo, setUsuarioDispositivo] = useState('');
  const [password, setPassword]                     = useState('');
  const [showPassword, setShowPassword]             = useState(false);
  const [isSubmitting, setIsSubmitting]             = useState(false);
  const [serverError, setServerError]               = useState<string | null>(null);
  const [blockTime, setBlockTime]                   = useState<number | null>(null);
  const [remaining, setRemaining]                   = useState<number | null>(null);

  const [isFocusedUser, setIsFocusedUser]           = useState(false);
  const [isFocusedPass, setIsFocusedPass]           = useState(false);

  const passwordRef = useRef<TextInput>(null);

  // Referencias para temporizadores de auto-cierre de alertas
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss inteligente para mensajes de error
  useEffect(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }

    if (serverError) {
      // Errores locales de formato/vacío desaparecen rápido (3.5s), errores de auth/servidor (5s)
      const isFast =
        serverError.includes('Ingresa el usuario') ||
        serverError.includes('Por favor') ||
        serverError.includes('formato') ||
        serverError.includes('obligatorios') ||
        serverError.includes('válido') ||
        serverError.includes('incompleto');
      const duration = isFast ? 3500 : 5000;

      errorTimerRef.current = setTimeout(() => {
        setServerError(null);
        errorTimerRef.current = null;
      }, duration);
    }

    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, [serverError]);

  // Auto-dismiss para aviso de sesión expirada (7.5s de lectura cómoda)
  useEffect(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }

    if (sessionExpiredReason) {
      sessionTimerRef.current = setTimeout(() => {
        clearSessionExpiredReason();
        sessionTimerRef.current = null;
      }, 7500);
    }

    return () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [sessionExpiredReason, clearSessionExpiredReason]);

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

  if (isLoading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  const isBlocked = blockTime !== null && blockTime > 0;

  // ── Helpers de formato ──────────────────────────────────────────────────────
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setServerError(null);
    if (sessionExpiredReason) clearSessionExpiredReason();

    const user = usuarioDispositivo.trim().toLowerCase();
    const pass = password.trim();

    if (!user || !pass) {
      setServerError('Ingresa el usuario y la contraseña del dispositivo.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(user, pass);
      setIsSubmitting(false);
      router.replace('/');
    } catch (error: any) {
      setIsSubmitting(false);
      if (error instanceof ApiError || error?.name === 'ApiError') {
        if (error.status === 429 && error.retryAfter) {
          setBlockTime(error.retryAfter);
          setRemaining(null);
        } else if (error.status === 401 && error.remaining !== undefined) {
          setRemaining(error.remaining);
          setServerError(error.message);
        } else {
          setServerError(error.message);
        }
      } else {
        setServerError(error?.message || 'Error al conectar con el servidor.');
      }
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      {/* StatusBar con estilo oscuro para contrastar con el fondo blanco */}
      <StatusBar style="dark" />

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
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, IS_WIDE && styles.scrollContentWide]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Panel Izquierdo Decorativo (visible en Tablet/Web amplio) ─ */}
          {IS_WIDE && (
            <View style={styles.leftPanel}>
              {/* Orbs animados */}
              <View style={StyleSheet.absoluteFill}>
                <View style={styles.orbContainer}>
                  <AnimatedOrb size={320} color={T.accent}   delay={0}    />
                  <AnimatedOrb size={200} color={T.primary}  delay={1500} />
                </View>
              </View>

              {/* Grid overlay */}
              <View style={styles.gridOverlay} />

              {/* Marca */}
              <View style={styles.leftBrand}>
                <AnimatedLoginLogo size={52} />
                <View>
                  <AnimatedCleanGoText textStyle={styles.leftBrandName} />
                  <Text style={styles.leftBrandSub}>SISTEMA DE CONDUCTORES</Text>
                </View>
              </View>

              {/* Hero */}
              <View style={styles.hero}>
                <Text style={styles.heroTitle}>
                  Acceso al{'\n'}
                  <Text style={styles.heroTitleAccent}>dispositivo{'\n'}del camión</Text>
                </Text>
                <Text style={styles.heroDesc}>
                  Plataforma de gestión de recorridos y recolección de residuos en tiempo real.
                </Text>
              </View>

              {/* Features */}
              <View style={styles.features}>
                <FeatureItem icon="🛣️" title="Rutas en tiempo real"    desc="Monitoreo GPS y seguimiento de recorridos" />
                <FeatureItem icon="📍" title="Puntos de control"       desc="Registro automático de paradas programadas" />
                <FeatureItem icon="🔒" title="Acceso seguro"           desc="Autenticación exclusiva del dispositivo asignado" />
              </View>

              {/* Tagline */}
              <Text style={styles.tagline}>
                CleanGo, gestión inteligente de recolección de residuos
              </Text>
            </View>
          )}

          {/* ── Panel Derecho — Formulario Blanco ─────────────────────── */}
          <View style={[styles.rightPanel, IS_WIDE && styles.rightPanelWide]}>
            <View style={styles.formContainer}>

              {/* Marca superior en móvil animada */}
              {!IS_WIDE && (
                <FadeSlideIn delay={0} style={styles.mobileBrand}>
                  <AnimatedLoginLogo size={52} />
                  <View>
                    <AnimatedCleanGoText textStyle={styles.mobileBrandName} />
                    <Text style={styles.mobileBrandSub}>SISTEMA DE CONDUCTORES</Text>
                  </View>
                </FadeSlideIn>
              )}

              {/* Encabezado del formulario animado */}
              <FadeSlideIn delay={90} style={styles.formHeader}>
                <Text style={styles.formTitle}>Iniciar sesión</Text>
                <Text style={styles.formSubtitle}>
                  Accede con las credenciales asignadas a este dispositivo
                </Text>
              </FadeSlideIn>

              {/* ── Banner: Sesión finalizada por inactividad / revocación ── */}
              {sessionExpiredReason && (
                <View style={[styles.banner, styles.bannerWarning, { marginBottom: 20 }]}>
                  <Text style={styles.bannerIcon}>⚠️</Text>
                  <View style={styles.bannerBody}>
                    <Text style={[styles.bannerTitle, styles.bannerTitleAmber]}>
                      Sesión finalizada
                    </Text>
                    <Text style={[styles.bannerText, styles.bannerTextAmber]}>
                      {sessionExpiredReason}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={clearSessionExpiredReason}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar aviso"
                  >
                    <X size={16} color={T.warningText} />
                  </TouchableOpacity>
                </View>
              )}

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

              {/* ── Error de servidor ─────────────────────────────────────── */}
              {serverError && (
                <View style={[styles.banner, styles.bannerDestructive]}>
                  <Text style={styles.bannerIcon}>⛔</Text>
                  <View style={styles.bannerBody}>
                    <Text style={[styles.bannerText, styles.bannerTextRed]}>{serverError}</Text>
                  </View>
                </View>
              )}

              {/* ── Campo: usuario dispositivo ───────────────────────────── */}
              <FadeSlideIn delay={170} style={styles.field}>
                <Text style={styles.label}>Usuario del dispositivo</Text>
                <View style={[
                  styles.inputWrapper,
                  isFocusedUser && styles.inputWrapperFocused,
                ]}>
                  <View style={styles.inputIconWrapper}>
                    <User
                      size={20}
                      color={isFocusedUser ? T.primary : T.textMuted}
                      strokeWidth={2}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="ej. camion_015"
                    placeholderTextColor={T.textMuted}
                    value={usuarioDispositivo}
                    onChangeText={t => {
                      setUsuarioDispositivo(t.toLowerCase());
                      if (sessionExpiredReason) clearSessionExpiredReason();
                      if (serverError) setServerError(null);
                    }}
                    onFocus={() => setIsFocusedUser(true)}
                    onBlur={() => setIsFocusedUser(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    editable={!isSubmitting && !isBlocked}
                  />
                </View>
              </FadeSlideIn>

              {/* ── Campo: contraseña ─────────────────────────────────────── */}
              <FadeSlideIn delay={250} style={styles.field}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={[
                  styles.inputWrapper,
                  isFocusedPass && styles.inputWrapperFocused,
                ]}>
                  <View style={styles.inputIconWrapper}>
                    <Lock
                      size={20}
                      color={isFocusedPass ? T.primary : T.textMuted}
                      strokeWidth={2}
                    />
                  </View>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, styles.inputWithEye]}
                    placeholder="••••••••"
                    placeholderTextColor={T.textMuted}
                    value={password}
                    onChangeText={t => {
                      setPassword(t);
                      if (sessionExpiredReason) clearSessionExpiredReason();
                      if (serverError) setServerError(null);
                    }}
                    onFocus={() => setIsFocusedPass(true)}
                    onBlur={() => setIsFocusedPass(false)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    editable={!isSubmitting && !isBlocked}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(v => !v)}
                    disabled={isSubmitting || isBlocked}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={T.textMuted} strokeWidth={2} />
                    ) : (
                      <Eye size={20} color={T.textMuted} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
              </FadeSlideIn>

              {/* ── Botón de submit ──────────────────────────────────────── */}
              <FadeSlideIn delay={330}>
                <TouchableOpacity
                  style={[styles.submitBtn, (isSubmitting || isBlocked) && styles.submitBtnDisabled]}
                  onPress={handleLogin}
                  disabled={isSubmitting || isBlocked}
                  activeOpacity={0.88}
                >
                  {isSubmitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.submitBtnText}>Iniciar sesión</Text>
                  }
                </TouchableOpacity>
              </FadeSlideIn>

              {/* ── Nota informativa institucional ───────────────────────── */}
              <FadeSlideIn delay={400}>
                <Text style={styles.legalNote}>
                  Las credenciales de acceso son asignadas exclusivamente por el administrador del sistema CleanGo. No existe registro de dispositivo desde esta aplicación.
                </Text>
              </FadeSlideIn>

            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  flex: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: T.bgPage,
    paddingVertical: 20,
  },
  scrollContentWide: {
    flexDirection: 'row',
    minHeight: '100%',
    paddingVertical: 0,
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

  // ── Left Panel (Tablet / Desktop) ─────────────────────────────────────────
  leftPanel: {
    flex: 1,
    backgroundColor: T.bgLeft,
    padding: 44,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  orbContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.03,
    backgroundColor: '#ffffff',
  },

  // Brand (left)
  leftBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    position: 'relative',
    zIndex: 2,
  },
  leftBrandLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  leftBrandName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.5,
  },
  leftBrandSub: {
    fontSize: 10.5,
    color: 'rgba(148,163,184,0.9)',
    letterSpacing: 1.4,
    fontWeight: '700',
    marginTop: 2,
  },

  // Hero
  hero: {
    position: 'relative',
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 18,
  },
  heroTitleAccent: {
    color: T.accent,
  },
  heroDesc: {
    fontSize: 15,
    color: 'rgba(148,163,184,0.9)',
    lineHeight: 24,
    maxWidth: 340,
  },

  // Features
  features: {
    position: 'relative',
    zIndex: 2,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureIconText: { fontSize: 19 },
  featureText:  { gap: 3 },
  featureTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: -0.2,
  },
  featureDesc: {
    fontSize: 12,
    color: 'rgba(148,163,184,0.85)',
    lineHeight: 17,
  },

  // Tagline
  tagline: {
    fontSize: 13,
    color: 'rgba(148,163,184,0.7)',
    textAlign: 'center',
    letterSpacing: 0.2,
    position: 'relative',
    zIndex: 2,
  },

  // ── Right Panel (Formulario Blanco) ───────────────────────────────────────
  rightPanel: {
    flex: 1,
    backgroundColor: T.bgPanelRight,
    paddingHorizontal: 26,
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightPanelWide: {
    maxWidth: 500,
    paddingHorizontal: 48,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },

  // Mobile brand (Header superior en móvil)
  mobileBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 32,
  },
  mobileBrandLogoWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mobileBrandLogo: {
    width: 52,
    height: 52,
  },
  mobileBrandName: {
    fontSize: 26,
    fontWeight: '800',
    color: T.primary,
    letterSpacing: -0.5,
  },
  mobileBrandSub: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.1,
    marginTop: 2,
  },

  // Form header
  formHeader: {
    marginBottom: 26,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: T.textH,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    color: T.text,
    lineHeight: 22,
  },

  // ── Banners (errores y alertas en light mode) ──────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  bannerDestructive: {
    backgroundColor: T.destructiveBg,
    borderColor:     T.destructiveBorder,
  },
  bannerWarning: {
    backgroundColor: T.warningBg,
    borderColor:     T.warningBorder,
  },
  bannerIcon:        { fontSize: 18, marginTop: 1 },
  bannerBody:        { flex: 1 },
  bannerTitle:       { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  bannerTitleAmber:  { color: T.warningText },
  bannerTitleRed:    { color: T.destructiveText },
  bannerText:        { fontSize: 13.5, lineHeight: 19 },
  bannerTextAmber:   { color: T.warningText },
  bannerTextRed:     { color: T.destructiveText },

  // ── Fields ────────────────────────────────────────────────────────────────
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14.5,
    fontWeight: '700',
    color: T.textH,
    letterSpacing: -0.1,
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bgInput,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    height: 52,
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: T.borderFocus,
    backgroundColor: T.bgInputFocused,
  },
  inputIconWrapper: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15.5,
    color: T.textH,
    height: '100%',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  inputWithEye: {
    paddingRight: 36,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Submit button ─────────────────────────────────────────────────────────
  submitBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },

  // ── Legal note ────────────────────────────────────────────────────────────
  legalNote: {
    fontSize: 12.5,
    color: T.textMuted,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
});
