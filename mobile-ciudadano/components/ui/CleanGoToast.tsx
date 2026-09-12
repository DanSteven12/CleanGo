import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { X, Truck, Clock, Megaphone, Info, CheckCircle2 } from 'lucide-react-native';

// Asset del logo oficial de CleanGo idéntico al Login (AuthHeader.tsx)
const cleangoLogo = require('../../assets/images/cleango-icon.png');

export type ToastCategory =
  | 'PROXIMIDAD'
  | 'RETRASO'
  | 'AVISO'
  | 'REPORTE'
  | 'INFORMACION'
  | string;

export interface ToastPayload {
  id?: number | string;
  titulo: string;
  mensaje: string;
  categoria?: ToastCategory;
  recorrido_id?: number | null;
  fecha?: string;
  onPress?: () => void;
  onDismiss?: () => void;
  duration?: number;
}

interface CleanGoToastProps {
  toast: ToastPayload | null;
  onDismiss: () => void;
}

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 220,
  mass: 0.6,
};

// ─── Configuración por Categoría ──────────────────────────────────────────────

function getCategoryConfig(cat?: ToastCategory) {
  const normalized = (cat || 'INFORMACION').toUpperCase();

  switch (normalized) {
    case 'PROXIMIDAD':
      return {
        tag: 'EN TU ZONA',
        accentColor: '#10B981',
        tagBg: '#ECFDF5',
        tagText: '#047857',
        icon: <Truck size={14} color="#10B981" strokeWidth={2.5} />,
      };
    case 'RETRASO':
      return {
        tag: 'RETRASO',
        accentColor: '#F59E0B',
        tagBg: '#FFFBEB',
        tagText: '#B45309',
        icon: <Clock size={14} color="#F59E0B" strokeWidth={2.5} />,
      };
    case 'REPORTE':
      return {
        tag: 'REPORTE',
        accentColor: '#3B82F6',
        tagBg: '#EFF6FF',
        tagText: '#1D4ED8',
        icon: <CheckCircle2 size={14} color="#3B82F6" strokeWidth={2.5} />,
      };
    case 'AVISO':
    case 'AVISO_GENERAL':
      return {
        tag: 'AVISO',
        accentColor: '#1763A6',
        tagBg: '#F0F7FF',
        tagText: '#1763A6',
        icon: <Megaphone size={14} color="#1763A6" strokeWidth={2.5} />,
      };
    default:
      return {
        tag: 'CLEANGO',
        accentColor: '#1763A6',
        tagBg: '#F0F7FF',
        tagText: '#1763A6',
        icon: <Info size={14} color="#1763A6" strokeWidth={2.5} />,
      };
  }
}

export function CleanGoToast({ toast, onDismiss }: CleanGoToastProps) {
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  const handleDismiss = useCallback(() => {
    onDismiss();
    toast?.onDismiss?.();
  }, [onDismiss, toast]);

  // Animación de salida programada
  const dismissWithAnimation = useCallback(() => {
    'worklet';
    translateY.value = withTiming(-120, { duration: 250, easing: Easing.in(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.92, { duration: 250 }, () => {
      runOnJS(handleDismiss)();
    });
  }, [handleDismiss, translateY, opacity, scale]);

  // Auto-cierre
  useEffect(() => {
    if (!toast) return;

    // Animación de entrada estilo Sileo
    translateY.value = -100;
    opacity.value = 0;
    scale.value = 0.92;

    translateY.value = withSpring(0, SPRING_CONFIG);
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, SPRING_CONFIG);

    const timeout = setTimeout(() => {
      dismissWithAnimation();
    }, toast.duration || 4800);

    return () => clearTimeout(timeout);
  }, [toast, dismissWithAnimation, translateY, opacity, scale]);

  // Gesto de Swipe Up interactivo
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY;
        opacity.value = 1 - Math.min(Math.abs(event.translationY) / 100, 0.6);
      }
    })
    .onEnd((event) => {
      if (event.translationY < -35 || event.velocityY < -400) {
        dismissWithAnimation();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
        opacity.value = withTiming(1, { duration: 150 });
      }
    });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }, { scale: scale.value }],
      opacity: opacity.value,
    };
  });

  if (!toast) return null;

  const config = getCategoryConfig(toast.categoria);

  const topPosition = Platform.OS === 'ios' ? Math.max(insets.top + 6, 44) : insets.top + 12;

  const handlePress = () => {
    toast.onPress?.();
    dismissWithAnimation();
  };

  return (
    <View
      style={[styles.overlayWrapper, { top: topPosition }]}
      pointerEvents="box-none"
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.toastCard, animatedContainerStyle]}>
          {/* Barra de acento superior sutil */}
          <View style={[styles.topAccentBar, { backgroundColor: config.accentColor }]} />

          <Pressable
            style={styles.cardContent}
            onPress={handlePress}
            accessibilityRole="alert"
            accessibilityLabel={`${toast.titulo}. ${toast.mensaje}`}
            android_ripple={{ color: 'rgba(23, 99, 166, 0.08)', borderless: false }}
          >
            {/* Logo de CleanGo (idéntico al Login) */}
            <View style={styles.logoContainer}>
              <View style={styles.logoOrb}>
                <Image
                  source={cleangoLogo}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
              {/* Indicador de estado */}
              <View style={[styles.statusDot, { backgroundColor: config.accentColor }]} />
            </View>

            {/* Texto y detalles */}
            <View style={styles.textContainer}>
              <View style={styles.headerRow}>
                <View style={[styles.tagBadge, { backgroundColor: config.tagBg }]}>
                  {config.icon}
                  <Text style={[styles.tagText, { color: config.tagText }]}>
                    {config.tag}
                  </Text>
                </View>
                <Text style={styles.timeText}>Ahora</Text>
              </View>

              <Text style={styles.titleText} numberOfLines={1}>
                {toast.titulo}
              </Text>

              <Text style={styles.bodyText} numberOfLines={2}>
                {toast.mensaje}
              </Text>
            </View>

            {/* Botón de cierre manual */}
            <Pressable
              style={styles.closeBtn}
              onPress={dismissWithAnimation}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar notificación"
            >
              <X size={16} color="#94A3B8" strokeWidth={2.4} />
            </Pressable>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  topAccentBar: {
    height: 3,
    width: '100%',
    opacity: 0.9,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  logoContainer: {
    position: 'relative',
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#152C40',
    borderWidth: 1.8,
    borderColor: 'rgba(144, 191, 73, 0.75)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1763A6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  titleText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
    lineHeight: 19,
  },
  bodyText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 17,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
});
