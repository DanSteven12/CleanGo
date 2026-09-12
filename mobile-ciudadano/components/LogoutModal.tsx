import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LogOut, User, X } from 'lucide-react-native';
import { AnimatedPressable } from './ui/AnimatedPressable';

const T = {
  primary: '#1763A6',
  card: '#FFFFFF',
  background: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  destructive: '#DC2626',
  destructiveBg: '#FEF2F2',
  destructiveBorder: '#FECACA',
  activeBg: '#E0F2FE',
};

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string | null;
  userEmail?: string | null;
  isLoading?: boolean;
}

export function LogoutModal({
  visible,
  onClose,
  onConfirm,
  userName,
  userEmail,
  isLoading = false,
}: LogoutModalProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const translateY = useSharedValue(12);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      scale.value = withSpring(1, { damping: 20, stiffness: 280 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 280 });

      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      opacity.value = 0;
      scale.value = 0.95;
      translateY.value = 12;
      pulseScale.value = 1;
    }
  }, [visible, opacity, scale, translateY, pulseScale]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const animatedHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={isLoading ? undefined : onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop táctil para cerrar */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={isLoading ? undefined : onClose}
        >
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
        </Pressable>

        {/* Tarjeta del modal */}
        <Animated.View style={[styles.card, animatedCardStyle]}>
          {/* Botón de cerrar superior */}
          {!isLoading && (
            <AnimatedPressable
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={18} color={T.textMuted} />
            </AnimatedPressable>
          )}

          {/* Ícono con halo pulsante */}
          <View style={styles.iconContainer}>
            <Animated.View style={[styles.iconHalo, animatedHaloStyle]} />
            <View style={styles.iconCircle}>
              <LogOut size={26} color={T.destructive} strokeWidth={2.4} />
            </View>
          </View>

          {/* Título */}
          <Text style={styles.title}>¿Cerrar sesión?</Text>

          {/* Badge informativo del usuario */}
          {(userName || userEmail) && (
            <View style={styles.userBadge}>
              <User size={14} color={T.primary} />
              <Text style={styles.userBadgeText} numberOfLines={1}>
                {userName || userEmail}
              </Text>
            </View>
          )}

          {/* Descripción */}
          <Text style={styles.description}>
            Se finalizará tu sesión activa en este dispositivo. Para volver a acceder a CleanGo, deberás ingresar nuevamente.
          </Text>

          {/* Botones de acción */}
          <View style={styles.actionsRow}>
            <AnimatedPressable
              style={[styles.button, styles.cancelBtn]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.button, styles.confirmBtn, isLoading && styles.confirmBtnDisabled]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <LogOut size={16} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.confirmBtnText}>Cerrar sesión</Text>
                </>
              )}
            </AnimatedPressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: T.card,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: 80,
    height: 80,
  },
  iconHalo: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: T.destructiveBg,
    opacity: 0.7,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: T.destructiveBg,
    borderWidth: 2,
    borderColor: T.destructiveBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: T.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.activeBg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
    maxWidth: '90%',
  },
  userBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.primary,
  },
  description: {
    fontSize: 13.5,
    color: T.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: T.background,
    borderWidth: 1,
    borderColor: T.border,
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: T.text,
  },
  confirmBtn: {
    flex: 1.25,
    backgroundColor: T.destructive,
    flexDirection: 'row',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: T.destructive,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
