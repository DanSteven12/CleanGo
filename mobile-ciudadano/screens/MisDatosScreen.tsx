// mobile-ciudadano/screens/MisDatosScreen.tsx
/**
 * Pantalla "Mis datos" — solo lectura.
 *
 * Muestra la información personal del ciudadano autenticado:
 *   - Nombre
 *   - Correo electrónico
 *   - Rol
 *
 * Fuente de datos: AuthContext (useAuth().user)
 * El objeto `user` se popula en el login y se actualiza en cada refresh de sesión.
 * No se requiere ningún endpoint adicional ni petición al backend.
 *
 * NO contiene formulario, botón Guardar, ni lógica de edición.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Shield, Phone } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedPressable } from '../components/ui';

// ─── Design Tokens (idénticos al resto de la app) ─────────────────────────────

const T = {
  primary: '#1763A6',
  primaryLight: '#E0F2FE',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
};

// ─── Componente de fila de dato ───────────────────────────────────────────────

interface DatoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DatoRow({ icon, label, value }: DatoRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Pantalla Principal ───────────────────────────────────────────────────────

export function MisDatosScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <AnimatedPressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <ArrowLeft size={20} color={T.textH} strokeWidth={2.2} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Mis datos</Text>
      </View>

      <Animated.ScrollView
        entering={FadeInDown.duration(380).springify().damping(20)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sección: Información personal ── */}
        <Text style={styles.sectionTitle}>Información personal</Text>

        <View style={styles.card}>
          <DatoRow
            icon={<User size={20} color={T.primary} />}
            label="Nombre"
            value={user?.nombre ?? '—'}
          />

          <View style={styles.divider} />

          <DatoRow
            icon={<Mail size={20} color={T.primary} />}
            label="Correo electrónico"
            value={user?.correo ?? '—'}
          />

          <View style={styles.divider} />

          <DatoRow
            icon={<Phone size={20} color={T.primary} />}
            label="Teléfono"
            value={user?.telefono?.trim() ? user.telefono : 'No registrado'}
          />

          <View style={styles.divider} />

          <DatoRow
            icon={<Shield size={20} color={T.primary} />}
            label="Tipo de cuenta"
            value={user?.rol ?? '—'}
          />
        </View>

        {/* ── Nota informativa ── */}
        <Text style={styles.hint}>
          Esta información es de solo lectura. Para modificar tus datos
          de cuenta, comunícate con el administrador del sistema.
        </Text>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textH,
  },

  // Scroll
  scrollContent: {
    padding: 20,
    gap: 12,
  },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    marginLeft: 4,
  },

  // Card
  card: {
    backgroundColor: T.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },

  // Data row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 68,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: T.textMuted,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textH,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginLeft: 70,
  },

  // Hint
  hint: {
    fontSize: 13,
    color: T.textMuted,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginTop: 4,
  },
});
