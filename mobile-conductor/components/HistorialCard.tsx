// mobile-conductor/components/HistorialCard.tsx
/**
 * Tarjeta de un recorrido completado para la pantalla Historial.
 *
 * Muestra:
 *  - Fecha del recorrido (día + mes + año)
 *  - Nombre de la ruta con chip de color
 *  - Conductor asignado (o conductor real si difiere)
 *  - Hora de inicio y hora de fin
 *  - Estado del recorrido (badge)
 *  - Progreso de checkpoints (completados / total)
 *
 * Solo lectura — sin acciones de modificación ni eliminación.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Clock, User, CheckSquare, Calendar } from 'lucide-react-native';
import type { RecorridoHistorial } from '../services/recorridosService';
import { theme } from '../theme/colors';

interface HistorialCardProps {
  recorrido: RecorridoHistorial;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_CORTO = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

/**
 * Formatea una fecha a "12 Ago 2026"
 */
function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  try {
    const str = String(fecha).trim();

    // 1. Extraer YYYY-MM-DD directamente si está presente (evita desfaces de zona horaria o concatenaciones inválidas)
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const monthIndex = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const mes = MESES_CORTO[monthIndex] || '';
      return `${day} ${mes} ${year}`;
    }

    // 2. Intentar parsear como Date estándar
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }

    return str;
  } catch {
    return String(fecha);
  }
}

/**
 * Formatea datetime ISO o time a "17:05"
 */
function formatHora(dt: string | null | undefined): string {
  if (!dt) return '—';
  try {
    const str = String(dt).trim();

    // 1. Si es solo hora "HH:MM" o "HH:MM:SS"
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(str)) {
      return str.slice(0, 5);
    }

    // 2. Intentar extraer la hora si es ISO o timestamp string
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    // 3. Fallback: buscar patrón "THH:MM" o " HH:MM"
    const match = str.match(/[T ](\d{2}:\d{2})/);
    if (match) {
      return match[1];
    }

    return str.slice(0, 5);
  } catch {
    return '—';
  }
}

/**
 * Devuelve estilos del badge según el estado del recorrido
 */
function getEstadoBadgeStyle(estado: string): { bg: string; text: string } {
  switch (estado.toLowerCase()) {
    case 'completado':
      return { bg: theme.colors.successBg, text: theme.colors.successText };
    case 'en progreso':
    case 'en_progreso':
      return { bg: theme.colors.activeBg, text: theme.colors.activeText };
    case 'cancelado':
      return { bg: theme.colors.destructiveBg, text: theme.colors.destructiveText };
    default:
      return { bg: theme.colors.background, text: theme.colors.textMuted };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistorialCard({ recorrido }: HistorialCardProps) {
  const badgeStyle = getEstadoBadgeStyle(recorrido.estado);

  // El conductor mostrado: si hay conductor real diferente al asignado, mostrarlo
  const conductorMostrado = recorrido.conductor_real_nombre?.trim()
    ? recorrido.conductor_real_nombre
    : recorrido.conductor_nombre;

  const tieneCheckpoints = recorrido.total_checkpoints > 0;

  return (
    <View style={styles.card}>
      {/* ── Cabecera: fecha + estado ─────────────────────────────────── */}
      <View style={styles.cardHeader}>
        <View style={styles.fechaRow}>
          <Calendar size={13} color={theme.colors.textMuted} strokeWidth={2} />
          <Text style={styles.fechaText}>
            {formatFecha(recorrido.fecha_programada || recorrido.hora_inicio)}
          </Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: badgeStyle.bg }]}>
          <Text style={[styles.estadoText, { color: badgeStyle.text }]}>
            {recorrido.estado}
          </Text>
        </View>
      </View>

      {/* ── Ruta ─────────────────────────────────────────────────────── */}
      <View style={styles.rutaRow}>
        {recorrido.ruta_color ? (
          <View
            style={[styles.rutaColorChip, { backgroundColor: recorrido.ruta_color }]}
          />
        ) : (
          <MapPin size={16} color={theme.colors.primary} strokeWidth={2.5} />
        )}
        <Text style={styles.rutaNombre} numberOfLines={1}>
          {recorrido.ruta_nombre}
        </Text>
      </View>

      {/* ── Separador ────────────────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Conductor ────────────────────────────────────────────────── */}
      <View style={styles.infoRow}>
        <User size={13} color={theme.colors.textMuted} strokeWidth={2} />
        <Text style={styles.infoLabel}>Conductor</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{conductorMostrado}</Text>
      </View>

      {/* ── Horario ──────────────────────────────────────────────────── */}
      <View style={styles.infoRow}>
        <Clock size={13} color={theme.colors.textMuted} strokeWidth={2} />
        <Text style={styles.infoLabel}>Horario</Text>
        <Text style={styles.infoValue}>
          {formatHora(recorrido.hora_inicio)}
          {recorrido.hora_fin ? ` → ${formatHora(recorrido.hora_fin)}` : ''}
        </Text>
      </View>

      {/* ── Checkpoints ──────────────────────────────────────────────── */}
      {tieneCheckpoints && (
        <View style={styles.checkpointsRow}>
          <CheckSquare size={13} color={theme.colors.textMuted} strokeWidth={2} />
          <Text style={styles.infoLabel}>Checkpoints</Text>
          <View style={styles.checkpointsRight}>
            <Text style={styles.checkpointsValue}>
              {recorrido.checkpoints_completados}/{recorrido.total_checkpoints}
            </Text>
            {/* Barra de progreso */}
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(
                      (recorrido.checkpoints_completados / recorrido.total_checkpoints) * 100
                    )}%` as any,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fechaText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  estadoText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  rutaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rutaColorChip: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  rutaNombre: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.background,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
    minWidth: 64,
  },
  infoValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
    flex: 1,
  },
  checkpointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  checkpointsRight: {
    flex: 1,
    gap: 4,
  },
  checkpointsValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '700',
  },
  progressBar: {
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.success,
    borderRadius: 10,
  },
});
