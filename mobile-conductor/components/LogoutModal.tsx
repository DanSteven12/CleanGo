// mobile-conductor/components/LogoutModal.tsx
/**
 * Modal personalizado para confirmación de Cierre de Sesión.
 *
 * Reemplaza el Alert.alert nativo por un modal elegante alineado
 * a la identidad visual de CleanGo:
 *  - Fondo traslúcido con efecto de desenfoque/overlay
 *  - Ícono destacado con halo suave de advertencia/destructivo
 *  - Badge con datos del camión autenticado
 *  - Botones con jerarquía visual clara (Cancelar vs Cerrar sesión)
 *  - Animación suave de entrada/salida (Scale + Fade)
 *  - Estado de carga integrado durante el logout
 */
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LogOut, Truck, X } from 'lucide-react-native';
import { AnimatedPressable } from './ui';
import { theme } from '../theme/colors';

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  camionNumero?: string | null;
  camionPlaca?: string | null;
  isLoading?: boolean;
}

export function LogoutModal({
  visible,
  onClose,
  onConfirm,
  camionNumero,
  camionPlaca,
  isLoading = false,
}: LogoutModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Entrada modal
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();

      // Animación continua del halo
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1400,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      loop.start();

      return () => loop.stop();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim, pulseAnim]);

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
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </Pressable>

        {/* Tarjeta del modal */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Botón de cerrar superior */}
          {!isLoading && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <X size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Ícono con halo pulsante */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.iconHalo,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.iconCircle}>
              <LogOut size={26} color={theme.colors.destructive} strokeWidth={2.4} />
            </View>
          </View>

          {/* Título */}
          <Text style={styles.title}>¿Cerrar sesión?</Text>

          {/* Badge informativo del camión */}
          {(camionNumero || camionPlaca) && (
            <View style={styles.camionBadge}>
              <Truck size={14} color={theme.colors.primary} />
              <Text style={styles.camionBadgeText}>
                {camionNumero ? `Camión ${camionNumero}` : ''}
                {camionNumero && camionPlaca ? ' · ' : ''}
                {camionPlaca ? camionPlaca : ''}
              </Text>
            </View>
          )}

          {/* Descripción */}
          <Text style={styles.description}>
            Se finalizará la sesión activa en este dispositivo. Para volver a registrar recorridos, deberás ingresar tus credenciales nuevamente.
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
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.destructiveBg,
    opacity: 0.7,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.destructiveBg,
    borderWidth: 2,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  camionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.activeBg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  camionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  description: {
    fontSize: 13.5,
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: theme.colors.text,
  },
  confirmBtn: {
    flex: 1.25,
    backgroundColor: theme.colors.destructive,
    flexDirection: 'row',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.destructive,
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
