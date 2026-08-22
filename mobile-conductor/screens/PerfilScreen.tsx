// mobile-conductor/app/screens/PerfilScreen.tsx
/**
 * Pantalla de Perfil — Tab 4 del Bottom Navigation.
 *
 * Muestra:
 *  - Datos del camión autenticado (del AuthContext — ya disponibles)
 *  - Información completa del camión con asignación actual
 *    usando GET /api/device/auth/asignacion (camion_id desde el JWT)
 *  - Opción para cerrar sesión
 *
 * La información es solo de consulta — sin edición.
 * La identidad del camión siempre viene del token, nunca del cliente.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LogOut, Truck } from 'lucide-react-native';
import { CamionInfoCard } from '../components/CamionInfoCard';
import { LogoutModal } from '../components/LogoutModal';
import { getAsignacionActual } from '../services/camionService';
import { useAuth } from '../contexts/AuthContext';
import { useAsignacionGlobal } from '../contexts/AsignacionContext';
import { theme } from '../theme/colors';

export function PerfilScreen() {
  const { camion, logout } = useAuth();
  
  // Consumir datos del contexto global
  const { asignacionActual: asignacion, isLoading: isLoadingAsignacion, isRefreshing, refreshData } = useAsignacionGlobal();

  const [error, setError] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleRefresh = () => {
    refreshData(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    setIsLoggingOut(false);
    try {
      await logout();
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Encabezado fijo */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarCircle}>
            <Truck size={24} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {camion?.numero_economico ?? 'Mi perfil'}
            </Text>
            <Text style={styles.headerSub}>
              {camion?.placa ?? ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
          accessibilityLabel="Cerrar sesión"
        >
          <LogOut size={18} color={theme.colors.destructiveText} />
        </TouchableOpacity>
      </View>

      {/* Información del camión con scroll y pull-to-refresh */}
      <CamionInfoCard
        camion={camion}
        asignacion={asignacion}
        isLoading={isLoadingAsignacion}
        error={error}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onLogout={() => setShowLogoutModal(true)}
      />

      {/* Modal de confirmación para cerrar sesión con diseño */}
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        camionNumero={camion?.numero_economico}
        camionPlaca={camion?.placa}
        isLoading={isLoggingOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.activeBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  headerSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.destructiveBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
});
