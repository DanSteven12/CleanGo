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
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react-native';
import { AnimatedPressable } from './AnimatedPressable';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'danger';

export interface AlertButton {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CleanGoAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  buttons?: AlertButton[];
  isDestructive?: boolean;
  isLoading?: boolean;
  dismissible?: boolean;
  customIcon?: React.ReactNode;
}

const THEME = {
  primary: '#1763A6',
  primaryLight: '#E0F2FE',
  card: '#FFFFFF',
  background: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  // Success
  success: '#10B981',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  // Error / Danger
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  // Warning
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  // Info
  info: '#3B82F6',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',
};

function getAlertConfig(type: AlertType, isDestructive?: boolean) {
  switch (type) {
    case 'success':
      return {
        color: THEME.success,
        bg: THEME.successBg,
        border: THEME.successBorder,
        badgeText: 'ÉXITO',
        icon: <CheckCircle2 size={32} color={THEME.success} strokeWidth={2.4} />,
        primaryBtnBg: THEME.success,
        defaultConfirmText: 'Aceptar',
      };
    case 'error':
    case 'danger':
      return {
        color: THEME.danger,
        bg: THEME.dangerBg,
        border: THEME.dangerBorder,
        badgeText: 'ERROR',
        icon: <AlertCircle size={32} color={THEME.danger} strokeWidth={2.4} />,
        primaryBtnBg: THEME.danger,
        defaultConfirmText: 'Entendido',
      };
    case 'warning':
      return {
        color: THEME.warning,
        bg: THEME.warningBg,
        border: THEME.warningBorder,
        badgeText: 'ATENCIÓN',
        icon: <AlertTriangle size={32} color={THEME.warning} strokeWidth={2.4} />,
        primaryBtnBg: THEME.warning,
        defaultConfirmText: 'Entendido',
      };
    case 'confirm':
      if (isDestructive) {
        return {
          color: THEME.danger,
          bg: THEME.dangerBg,
          border: THEME.dangerBorder,
          badgeText: 'CONFIRMACIÓN',
          icon: <Trash2 size={30} color={THEME.danger} strokeWidth={2.2} />,
          primaryBtnBg: THEME.danger,
          defaultConfirmText: 'Confirmar',
        };
      }
      return {
        color: THEME.primary,
        bg: THEME.primaryLight,
        border: '#BFDBFE',
        badgeText: 'CONFIRMACIÓN',
        icon: <Sparkles size={30} color={THEME.primary} strokeWidth={2.2} />,
        primaryBtnBg: THEME.primary,
        defaultConfirmText: 'Confirmar',
      };
    case 'info':
    default:
      return {
        color: THEME.primary,
        bg: THEME.primaryLight,
        border: '#BFDBFE',
        badgeText: 'INFORMACIÓN',
        icon: <Info size={32} color={THEME.primary} strokeWidth={2.4} />,
        primaryBtnBg: THEME.primary,
        defaultConfirmText: 'Aceptar',
      };
  }
}

export function CleanGoAlert({
  visible,
  type = 'info',
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  onClose,
  buttons,
  isDestructive = false,
  isLoading = false,
  dismissible = true,
  customIcon,
}: CleanGoAlertProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const translateY = useSharedValue(16);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
      scale.value = withSpring(1, { damping: 18, stiffness: 260 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 260 });

      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.16, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      opacity.value = 0;
      scale.value = 0.92;
      translateY.value = 16;
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

  const config = getAlertConfig(type, isDestructive);
  const hasCancel = Boolean(cancelText || type === 'confirm' || (buttons && buttons.length > 1));

  const handleDismiss = () => {
    if (isLoading) return;
    if (onClose) {
      onClose();
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleConfirmPress = async () => {
    if (isLoading) return;
    if (onConfirm) {
      await onConfirm();
    }
    if (onClose && !onConfirm) {
      onClose();
    }
  };

  const handleCancelPress = () => {
    if (isLoading) return;
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={dismissible && !isLoading ? handleDismiss : undefined}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop táctil para cerrar si es dismissible */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissible && !isLoading ? handleDismiss : undefined}
        >
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
        </Pressable>

        {/* Tarjeta de la alerta */}
        <Animated.View style={[styles.card, animatedCardStyle]}>
          {/* Barra superior de acento */}
          <View style={[styles.topAccent, { backgroundColor: config.color }]} />

          {/* Botón de cerrar superior */}
          {dismissible && !isLoading && (
            <AnimatedPressable
              style={styles.closeBtn}
              onPress={handleDismiss}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar alerta"
            >
              <X size={18} color={THEME.textMuted} />
            </AnimatedPressable>
          )}

          {/* Ícono animado con halo */}
          <View style={styles.iconWrapper}>
            <Animated.View
              style={[
                styles.iconHalo,
                { backgroundColor: config.bg },
                animatedHaloStyle,
              ]}
            />
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: config.bg, borderColor: config.border },
              ]}
            >
              {customIcon || config.icon}
            </View>
          </View>

          {/* Badge de tipo */}
          <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.typeBadgeText, { color: config.color }]}>
              {config.badgeText}
            </Text>
          </View>

          {/* Título */}
          <Text style={styles.title}>{title}</Text>

          {/* Mensaje descriptivo */}
          {Boolean(message) && (
            <Text style={styles.message}>{message}</Text>
          )}

          {/* Acciones */}
          {buttons && buttons.length > 0 ? (
            <View style={styles.customButtonsContainer}>
              {buttons.map((btn, idx) => {
                const isBtnDestructive = btn.style === 'destructive';
                const isBtnCancel = btn.style === 'cancel';
                const btnBg = isBtnDestructive
                  ? THEME.danger
                  : isBtnCancel
                  ? THEME.background
                  : THEME.primary;
                const btnTextColor = isBtnCancel ? THEME.text : '#FFFFFF';

                return (
                  <AnimatedPressable
                    key={idx}
                    style={[
                      styles.actionButton,
                      { backgroundColor: btnBg },
                      isBtnCancel && styles.cancelButtonBorder,
                    ]}
                    onPress={async () => {
                      if (btn.onPress) {
                        await btn.onPress();
                      }
                      handleDismiss();
                    }}
                    disabled={isLoading}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: btnTextColor },
                        !isBtnCancel && styles.actionButtonBold,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.actionsRow}>
              {hasCancel && (
                <AnimatedPressable
                  style={[styles.button, styles.cancelBtn]}
                  onPress={handleCancelPress}
                  disabled={isLoading}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelBtnText}>
                    {cancelText || 'Cancelar'}
                  </Text>
                </AnimatedPressable>
              )}

              <AnimatedPressable
                style={[
                  styles.button,
                  styles.confirmBtn,
                  { backgroundColor: config.primaryBtnBg },
                  !hasCancel && styles.fullWidthBtn,
                  isLoading && styles.btnDisabled,
                ]}
                onPress={handleConfirmPress}
                disabled={isLoading}
                accessibilityRole="button"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {confirmText || config.defaultConfirmText}
                  </Text>
                )}
              </AnimatedPressable>
            </View>
          )}
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
    padding: 24,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: THEME.card,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    width: 84,
    height: 84,
  },
  iconHalo: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.65,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 10,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
    lineHeight: 26,
  },
  message: {
    fontSize: 14,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
    paddingHorizontal: 6,
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
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: THEME.text,
  },
  confirmBtn: {
    flex: 1.25,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fullWidthBtn: {
    flex: 1,
    width: '100%',
  },
  confirmBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  customButtonsContainer: {
    width: '100%',
    gap: 10,
  },
  actionButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonBorder: {
    borderWidth: 1,
    borderColor: THEME.border,
  },
  actionButtonText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  actionButtonBold: {
    fontWeight: '700',
  },
});
