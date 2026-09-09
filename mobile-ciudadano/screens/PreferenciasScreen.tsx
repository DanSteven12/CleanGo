// mobile-ciudadano/screens/PreferenciasScreen.tsx
/**
 * Pantalla de Preferencias de Notificaciones del Ciudadano.
 *
 * Fuente de verdad: el backend (/api/ciudadano/preferencias).
 * No almacena preferencias en AsyncStorage — siempre refleja el estado del servidor.
 *
 * Estados de UI implementados:
 *   - loading inicial (ActivityIndicator)
 *   - error de carga (con botón "Reintentar")
 *   - saving por switch (deshabilita el control mientras la petición está en curso)
 *   - rollback visual si la petición PUT falla
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Truck, Clock, AlertTriangle } from 'lucide-react-native';
import {
  getPreferencias,
  updatePreferencias,
  PreferenciasNotificaciones,
} from '../services/preferenciasService';

// ─── Design Tokens (idénticos al resto de la app) ─────────────────────────────

const T = {
  primary: '#1763A6',
  primaryLight: '#E0F2FE',
  primaryDark: '#13528A',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  destructive: '#DC2626',
  success: '#16A34A',
};

// ─── Tipo para el estado de guardado por campo ────────────────────────────────

type PreferenceKey = keyof Omit<PreferenciasNotificaciones, 'usuario_id' | 'updated_at'>;

// ─── Componente de fila de preferencia ───────────────────────────────────────

interface PreferenceRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  saving: boolean;
  onChange: (val: boolean) => void;
}

function PreferenceRow({
  icon,
  label,
  description,
  value,
  saving,
  onChange,
}: PreferenceRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      {saving ? (
        <ActivityIndicator size="small" color={T.primary} style={styles.rowSpinner} />
      ) : (
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: T.border, true: T.primaryLight }}
          thumbColor={value ? T.primary : '#f4f3f4'}
          ios_backgroundColor={T.border}
        />
      )}
    </View>
  );
}

// ─── Pantalla Principal ───────────────────────────────────────────────────────

export function PreferenciasScreen() {
  const router = useRouter();

  // Estado de la pantalla
  const [preferencias, setPreferencias] = useState<PreferenciasNotificaciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Estado de guardado por campo (evita bloquear toda la pantalla)
  const [saving, setSaving] = useState<Record<PreferenceKey, boolean>>({
    notificaciones_push_enabled: false,
    proximidad_enabled: false,
    retraso_enabled: false,
  });

  // ── Carga inicial ──────────────────────────────────────────────────────────

  const cargarPreferencias = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getPreferencias();
      setPreferencias(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        'No se pudieron cargar las preferencias. Verifica tu conexión.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarPreferencias();
    }, [])
  );

  // ── Guardado de un campo ───────────────────────────────────────────────────

  const handleToggle = async (key: PreferenceKey, newValue: boolean) => {
    if (!preferencias) return;
    if (saving[key]) return; // Evitar doble-tap mientras guarda

    // Optimistic update
    const valorAnterior = preferencias[key];
    setPreferencias((prev) => prev ? { ...prev, [key]: newValue } : prev);
    setSaving((prev) => ({ ...prev, [key]: true }));

    try {
      const actualizado = await updatePreferencias({ [key]: newValue });
      // Sincronizar con el estado devuelto por el servidor
      setPreferencias(actualizado);
    } catch (err: any) {
      // Rollback visual al valor anterior
      setPreferencias((prev) => prev ? { ...prev, [key]: valorAnterior } : prev);
      const msg =
        err?.response?.data?.error ||
        'No se pudo guardar el cambio. Inténtalo de nuevo.';
      Alert.alert('Error al guardar', msg);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={styles.loadingText}>Cargando preferencias…</Text>
        </View>
      );
    }

    if (loadError || !preferencias) {
      return (
        <View style={styles.center}>
          <AlertTriangle size={48} color={T.destructive} style={{ marginBottom: 16 }} />
          <Text style={styles.errorText}>{loadError || 'Error desconocido'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={cargarPreferencias}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sección: Notificaciones ── */}
        <Text style={styles.sectionTitle}>Notificaciones</Text>

        <View style={styles.card}>
          <PreferenceRow
            icon={<Bell size={20} color={T.primary} />}
            label="Notificaciones push"
            description="Recibir alertas y notificaciones en tu dispositivo."
            value={preferencias.notificaciones_push_enabled}
            saving={saving.notificaciones_push_enabled}
            onChange={(val) => handleToggle('notificaciones_push_enabled', val)}
          />

          <View style={styles.divider} />

          <PreferenceRow
            icon={<Truck size={20} color={T.primary} />}
            label="Camión cerca"
            description="Recibir una alerta cuando el camión esté cerca de tu zona."
            value={preferencias.proximidad_enabled}
            saving={saving.proximidad_enabled}
            onChange={(val) => handleToggle('proximidad_enabled', val)}
          />

          <View style={styles.divider} />

          <PreferenceRow
            icon={<Clock size={20} color={T.primary} />}
            label="Alertas de retraso"
            description="Recibir alertas cuando exista un retraso en tu ruta."
            value={preferencias.retraso_enabled}
            saving={saving.retraso_enabled}
            onChange={(val) => handleToggle('retraso_enabled', val)}
          />
        </View>

        <Text style={styles.hint}>
          Los cambios se aplican de inmediato. Las notificaciones desactivadas no aparecerán
          en tu dispositivo, pero quedarán registradas en el sistema.
        </Text>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <ArrowLeft size={24} color={T.textH} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferencias</Text>
      </View>

      {renderContent()}
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
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textH,
  },

  // Center states (loading, error)
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: T.textMuted,
  },
  errorText: {
    fontSize: 15,
    color: T.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: T.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
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

  // Preference row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 72,
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
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textH,
    marginBottom: 2,
  },
  rowDescription: {
    fontSize: 13,
    color: T.textMuted,
    lineHeight: 18,
  },
  rowSpinner: {
    marginHorizontal: 4,
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
