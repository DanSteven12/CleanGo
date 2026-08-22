// mobile-conductor/components/CamionInfoCard.tsx
/**
 * Tarjeta de información del camión autenticado.
 *
 * Muestra:
 *  - Número económico, placa, estado, GPS instalado
 *  - Conductor asignado, ruta, fecha de asignación, horario
 *
 * Solo lectura. La información viene del backend mediante el token JWT.
 * Si no hay asignación activa, muestra "Sin asignación activa".
 * Soporta estado de carga y errores amigables.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Truck,
  Hash,
  Shield,
  Wifi,
  User,
  Map,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  LogOut,
} from 'lucide-react-native';
import type { CamionAuth } from '../services/authService';
import type { AsignacionActual } from '../services/camionService';
import { theme } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CamionInfoCardProps {
  camion: CamionAuth | null;
  asignacion: AsignacionActual | null;
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onLogout?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  try {
    // Si viene en formato YYYY-MM-DD o ISO 8601 (ej: 2026-08-13 o 2026-08-13T00:00:00.000Z)
    const match = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const monthIndex = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const mes = MESES[monthIndex] || '';
      return `${day} de ${mes} de ${year}`;
    }

    const d = new Date(fecha);
    if (isNaN(d.getTime())) {
      return String(fecha);
    }

    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(fecha);
  }
}

function formatHora(hora: string | null | undefined): string {
  if (!hora) return '—';
  // Recortar a HH:MM si viene como HH:MM:SS
  return hora.slice(0, 5);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrapper}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <View style={styles.infoValueWrapper}>{typeof value === 'string' ? <Text style={styles.infoValue}>{value}</Text> : value}</View>
      </View>
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CamionInfoCard({
  camion,
  asignacion,
  isLoading,
  error,
  isRefreshing = false,
  onRefresh,
  onLogout,
}: CamionInfoCardProps) {
  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando información del camión...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView
        contentContainerStyle={styles.centerContainer}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          ) : undefined
        }
      >
        <AlertTriangle size={40} color={theme.colors.warning} />
        <Text style={styles.errorTitle}>No se pudo cargar la información</Text>
        <Text style={styles.errorText}>{error}</Text>
      </ScrollView>
    );
  }

  if (!camion) return null;

  const estadoActivo = camion.estado === 'Activo';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
        ) : undefined
      }
    >
      {/* ── Sección: Datos del camión ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Truck size={16} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Datos del camión</Text>
        </View>

        <InfoRow
          icon={<Hash size={18} color={theme.colors.primary} />}
          label="Número económico"
          value={camion.numero_economico}
        />

        <View style={styles.divider} />

        <InfoRow
          icon={<Shield size={18} color="#64748b" />}
          label="Placa"
          value={camion.placa}
        />

        <View style={styles.divider} />

        <InfoRow
          icon={
            estadoActivo ? (
              <CheckCircle size={18} color={theme.colors.success} />
            ) : (
              <XCircle size={18} color={theme.colors.destructive} />
            )
          }
          label="Estado"
          value={
            <View
              style={[
                styles.estadoBadge,
                { backgroundColor: estadoActivo ? theme.colors.successBg : theme.colors.destructiveBg },
              ]}
            >
              <Text
                style={[
                  styles.estadoText,
                  { color: estadoActivo ? theme.colors.successText : theme.colors.destructiveText },
                ]}
              >
                {camion.estado}
              </Text>
            </View>
          }
        />

        <View style={styles.divider} />

        <InfoRow
          icon={<Wifi size={18} color={camion.gps_instalado ? theme.colors.primary : theme.colors.textMuted} />}
          label="GPS"
          value={
            <View
              style={[
                styles.estadoBadge,
                {
                  backgroundColor: camion.gps_instalado ? theme.colors.activeBg : theme.colors.background,
                },
              ]}
            >
              <Text
                style={[
                  styles.estadoText,
                  { color: camion.gps_instalado ? theme.colors.primary : theme.colors.textMuted },
                ]}
              >
                {camion.gps_instalado ? 'Instalado' : 'No instalado'}
              </Text>
            </View>
          }
        />
      </View>

      {/* ── Sección: Asignación actual ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={16} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Asignación actual</Text>
        </View>

        {!asignacion ? (
          <View style={styles.emptyAsignacion}>
            <Text style={styles.emptyAsignacionText}>Sin asignación activa</Text>
            <Text style={styles.emptyAsignacionSub}>
              No hay recorrido programado para hoy.
            </Text>
          </View>
        ) : (
          <>
            <InfoRow
              icon={<User size={18} color="#64748b" />}
              label="Conductor asignado"
              value={asignacion.conductor_nombre ?? '—'}
            />

            <View style={styles.divider} />

            <InfoRow
              icon={<Map size={18} color="#64748b" />}
              label="Ruta asignada"
              value={
                <View style={styles.rutaWrapper}>
                  <View
                    style={[
                      styles.rutaDot,
                      { backgroundColor: asignacion.ruta_color || '#3b82f6' },
                    ]}
                  />
                  <Text style={styles.infoValue}>{asignacion.ruta_nombre}</Text>
                </View>
              }
            />

            <View style={styles.divider} />

            <InfoRow
              icon={<Calendar size={18} color="#64748b" />}
              label="Fecha de asignación"
              value={formatFecha(asignacion.fecha_programada)}
            />

            <View style={styles.divider} />

            <InfoRow
              icon={<Clock size={18} color="#64748b" />}
              label="Horario programado"
              value={`${formatHora(asignacion.horario_inicio)} — ${formatHora(asignacion.horario_fin)}`}
            />

            {/* Horario base de la ruta, si existe */}
            {(asignacion.horario_ruta_inicio || asignacion.horario_ruta_fin) && (
              <>
                <View style={styles.divider} />
                <InfoRow
                  icon={<Clock size={18} color="#94a3b8" />}
                  label="Horario estimado de ruta"
                  value={`${formatHora(asignacion.horario_ruta_inicio)} — ${formatHora(asignacion.horario_ruta_fin)}`}
                />
              </>
            )}
          </>
        )}
      </View>

      {/* Botón de cerrar sesión */}
      {onLogout && (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <LogOut size={18} color={theme.colors.destructive} />
          <Text style={styles.logoutButtonText}>Cerrar sesión de este dispositivo</Text>
        </TouchableOpacity>
      )}

      {/* Nota de solo lectura */}
      <Text style={styles.readonlyNote}>
        Esta información es de solo consulta. Para realizar cambios, contacta al administrador.
      </Text>
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  infoIconWrapper: {
    width: 36,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  infoValueWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.background,
    marginLeft: 50,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  estadoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rutaWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rutaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyAsignacion: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyAsignacionText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  emptyAsignacionSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    ...theme.shadows.card,
  },
  logoutButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: theme.colors.destructive,
  },
  readonlyNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
