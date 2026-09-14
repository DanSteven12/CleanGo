import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Truck, User, Clock, CheckCircle2, UserCircle, MapPin, Calendar, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react-native';
import { AnimatedPressable, PulsingBeacon } from './ui';

const ANTICIPATION_MINUTES = 30;

interface AsignacionCardProps {
  asignacion: any;
  onIniciar: (conductorRealNombre?: string) => void;
  onFinalizar: () => void;
  onVerMapa?: () => void;
  isStarting: boolean;
  isFinishing: boolean;
}

function formatTimeAMPM(date: Date): string {
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  const hours = date.getHours() % 12 || 12;
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
}

function formatFechaCompleta(fechaRaw: any): { fechaBadgeText: string; prefijoEarly: string } {
  if (!fechaRaw) return { fechaBadgeText: '', prefijoEarly: 'hoy' };
  try {
    const fechaStr = typeof fechaRaw === 'string'
      ? fechaRaw.split('T')[0]
      : new Date(fechaRaw).toISOString().split('T')[0];

    const [year, month, day] = fechaStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);

    if (isNaN(d.getTime())) return { fechaBadgeText: '', prefijoEarly: 'hoy' };

    const hoy = new Date();
    const esHoy =
      hoy.getFullYear() === d.getFullYear() &&
      hoy.getMonth() === d.getMonth() &&
      hoy.getDate() === d.getDate();

    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const esManana =
      manana.getFullYear() === d.getFullYear() &&
      manana.getMonth() === d.getMonth() &&
      manana.getDate() === d.getDate();

    const diaSemana = d.toLocaleDateString('es-MX', { weekday: 'short' });
    const mes = d.toLocaleDateString('es-MX', { month: 'short' });
    const diaNum = String(d.getDate()).padStart(2, '0');
    const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    const fechaBadgeText = esHoy
      ? `Hoy, ${diaNum} ${mes}`
      : esManana
      ? `Mañana, ${diaNum} ${mes}`
      : `${diaSemanaCap}, ${diaNum} ${mes}`;

    const prefijoEarly = esHoy
      ? 'hoy'
      : esManana
      ? 'mañana'
      : `el ${diaSemanaCap} ${diaNum} de ${mes}`;

    return { fechaBadgeText, prefijoEarly };
  } catch {
    return { fechaBadgeText: '', prefijoEarly: 'hoy' };
  }
}

export const AsignacionCard: React.FC<AsignacionCardProps> = ({
  asignacion,
  onIniciar,
  onFinalizar,
  onVerMapa,
  isStarting,
  isFinishing,
}) => {
  const [confirmStep, setConfirmStep] = useState<'ask' | 'capture'>('ask');
  const [conductorRealNombre, setConductorRealNombre] = useState('');
  const [conductorRealError, setConductorRealError] = useState<string | null>(null);

  const handleConfirmSelf = () => {
    onIniciar();
  };

  const handleConfirmOtherSubmit = () => {
    if (!conductorRealNombre.trim()) {
      setConductorRealError('El nombre es obligatorio.');
      return;
    }
    onIniciar(conductorRealNombre);
  };

  const isEnProgreso =
    asignacion.estatus_recorrido === 'En Progreso' ||
    asignacion.estatus_recorrido === 'En progreso';
  const estatusColor = asignacion.estatus_recorrido === 'Pendiente' ? '#f59e0b' : '#10b981';
  const estatusBg = asignacion.estatus_recorrido === 'Pendiente' ? '#fef3c7' : '#d1fae5';

  // Calcular fecha formateada y prefijo de horario
  const { fechaBadgeText, prefijoEarly } = formatFechaCompleta(asignacion.fecha_programada);

  // Reloj interno para evaluar anticipación y retrasos en tiempo real
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (asignacion.estatus_recorrido !== 'Pendiente') return;
    const interval = setInterval(() => setNow(new Date()), 5000); // Re-check cada 5 segundos
    return () => clearInterval(interval);
  }, [asignacion.estatus_recorrido]);

  // Cálculos de tiempos y estados
  let isExpired = false;
  let isTooEarly = false;
  let isInAnticipation = false;
  let isDelayed = false;
  let delayStr = '';
  let scheduledTimeStr = '';
  let unlockTimeStr = '';

  if (asignacion.estatus_recorrido === 'Pendiente' && asignacion.horario_inicio) {
    try {
      const fechaStr = typeof asignacion.fecha_programada === 'string'
        ? asignacion.fecha_programada.split('T')[0]
        : new Date(asignacion.fecha_programada).toISOString().split('T')[0];

      const [year, month, day] = fechaStr.split('-').map(Number);
      const [hours, mins] = (asignacion.horario_inicio || '00:00').split(':').map(Number);

      const scheduledStart = new Date(year, month - 1, day, hours, mins, 0);
      const startWindow = new Date(scheduledStart.getTime() - ANTICIPATION_MINUTES * 60 * 1000);

      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const assignmentMidnight = new Date(year, month - 1, day);

      if (!isNaN(scheduledStart.getTime())) {
        scheduledTimeStr = formatTimeAMPM(scheduledStart);
        unlockTimeStr = formatTimeAMPM(startWindow);

        if (assignmentMidnight < todayMidnight) {
          isExpired = true;
        } else if (now < startWindow) {
          isTooEarly = true;
        } else if (now >= startWindow && now < scheduledStart) {
          isInAnticipation = true;
        } else if (now >= scheduledStart) {
          const diffMs = now.getTime() - scheduledStart.getTime();
          const diffMins = Math.floor(diffMs / 60000);

          if (diffMins >= 1) {
            isDelayed = true;
            const delayHours = Math.floor(diffMins / 60);
            const remainingMins = diffMins % 60;
            delayStr = delayHours > 0
              ? `${delayHours}h ${remainingMins}m`
              : `${diffMins} min`;
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  return (
    <View style={styles.card}>
      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.rutaPill}>
          <View style={[styles.rutaDot, { backgroundColor: asignacion.ruta_color || '#3b82f6' }]} />
          <Text style={styles.rutaNombre}>{asignacion.ruta_nombre}</Text>
        </View>
        <View style={[styles.estatusBadge, { backgroundColor: estatusBg, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          {isEnProgreso && <PulsingBeacon color="#10B981" size={7} pulseScale={2} />}
          <Text style={[styles.estatusText, { color: estatusColor }]}>
            {asignacion.estatus_recorrido}
          </Text>
        </View>
      </View>

      {/* Info Principal */}
      <View style={styles.infoContainer}>
        <View style={styles.infoCol}>
          <View style={styles.infoRow}>
            <Truck size={14} color="#1763A6" />
            <Text style={styles.infoBold}>{asignacion.numero_economico}</Text>
          </View>
          <View style={styles.infoRow}>
            <User size={14} color="#4b5563" />
            <Text style={styles.infoText}>{asignacion.conductor_nombre}</Text>
          </View>
        </View>

        <View style={styles.infoRightCol}>
          {fechaBadgeText !== '' && (
            <View style={styles.infoRowRight}>
              <Calendar size={13} color="#1763A6" />
              <Text style={styles.infoDateText}>{fechaBadgeText}</Text>
            </View>
          )}
          <View style={styles.infoRowRight}>
            <Clock size={13} color="#4b5563" />
            <Text style={styles.infoText}>
              {asignacion.horario_inicio?.slice(0, 5)} - {asignacion.horario_fin?.slice(0, 5)}
            </Text>
          </View>
        </View>
      </View>

      {/* Flujos de acción dependiendo del estatus */}
      {asignacion.estatus_recorrido === 'Pendiente' && (
        <View style={styles.actionSection}>
          <View style={styles.divider} />
          
          {isExpired ? (
            <View style={styles.expiredContainer}>
              <AlertCircle size={26} color="#ef4444" style={{ marginBottom: 6 }} />
              <Text style={styles.expiredTitle}>Asignación no iniciada</Text>
              <Text style={styles.expiredSubtitle}>
                Esta asignación correspondía a una fecha anterior ({fechaBadgeText}) y no fue realizada.
              </Text>
            </View>
          ) : isTooEarly ? (
            <View style={styles.earlyContainer}>
              <View style={styles.earlyIconWrapper}>
                <Clock size={22} color="#d97706" />
              </View>
              <Text style={styles.earlyTitle}>
                Programado para {prefijoEarly} a las {scheduledTimeStr}
              </Text>
              <Text style={styles.earlySubtitle}>
                El botón de inicio se habilitará a las <Text style={styles.earlyHighlight}>{unlockTimeStr}</Text> ({ANTICIPATION_MINUTES} min de anticipación para preparación).
              </Text>
            </View>
          ) : (
            <View>
              {/* Banner de anticipación */}
              {isInAnticipation && (
                <View style={styles.anticipationBanner}>
                  <Sparkles size={15} color="#0d9488" />
                  <Text style={styles.anticipationBannerText}>
                    Habilitado con anticipación · Horario oficial: {scheduledTimeStr}
                  </Text>
                </View>
              )}

              {/* Banner de retraso informativo (NO bloqueante) */}
              {isDelayed && (
                <View style={styles.delayBanner}>
                  <AlertTriangle size={15} color="#b45309" />
                  <Text style={styles.delayBannerText}>
                    Turno con retraso de {delayStr} · Programado: {scheduledTimeStr}
                  </Text>
                </View>
              )}

              {confirmStep === 'ask' ? (
                <View>
                  <Text style={styles.questionText}>¿Eres tú quien realizará este recorrido?</Text>
                  
                  <AnimatedPressable 
                    style={styles.primaryButton} 
                    onPress={handleConfirmSelf}
                    disabled={isStarting}
                  >
                    {isStarting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} color="#fff" style={styles.btnIcon} />
                        <Text style={styles.primaryButtonText}>Sí, iniciar recorrido</Text>
                      </>
                    )}
                  </AnimatedPressable>
                  
                  <AnimatedPressable 
                    style={styles.secondaryButton} 
                    onPress={() => setConfirmStep('capture')}
                    disabled={isStarting}
                  >
                    <UserCircle size={18} color="#1763A6" style={styles.btnIcon} />
                    <Text style={styles.secondaryButtonText}>No, soy otra persona</Text>
                  </AnimatedPressable>
                </View>
              ) : (
                <View>
                  <Text style={styles.questionText}>Escribe tu nombre completo:</Text>
                  <TextInput
                    style={[styles.input, conductorRealError && styles.inputError]}
                    placeholder="Ej. Leodan Hernández"
                    value={conductorRealNombre}
                    onChangeText={(val) => {
                      setConductorRealNombre(val);
                      setConductorRealError(null);
                    }}
                    autoFocus
                  />
                  {conductorRealError && <Text style={styles.errorText}>{conductorRealError}</Text>}
                  
                  <AnimatedPressable 
                    style={styles.primaryButton} 
                    onPress={handleConfirmOtherSubmit}
                    disabled={isStarting}
                  >
                    {isStarting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} color="#fff" style={styles.btnIcon} />
                        <Text style={styles.primaryButtonText}>Iniciar recorrido</Text>
                      </>
                    )}
                  </AnimatedPressable>
                  
                  <AnimatedPressable 
                    style={[styles.secondaryButton, { marginTop: 8 }]} 
                    onPress={() => { setConfirmStep('ask'); setConductorRealError(null); }}
                    disabled={isStarting}
                  >
                    <Text style={styles.secondaryButtonText}>Regresar</Text>
                  </AnimatedPressable>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {isEnProgreso && (
        <View style={styles.actionSection}>
          <View style={styles.divider} />
          {onVerMapa && (
            <AnimatedPressable 
              style={[styles.primaryButton, { backgroundColor: '#1763A6', marginBottom: 8 }]} 
              onPress={onVerMapa}
            >
              <MapPin size={18} color="#fff" style={styles.btnIcon} />
              <Text style={styles.primaryButtonText}>Ver Mapa de Ruta</Text>
            </AnimatedPressable>
          )}
          <AnimatedPressable 
            style={[styles.primaryButton, { backgroundColor: '#10b981' }]} 
            onPress={onFinalizar}
            disabled={isFinishing}
          >
            {isFinishing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <CheckCircle2 size={18} color="#fff" style={styles.btnIcon} />
                <Text style={styles.primaryButtonText}>Finalizar recorrido</Text>
              </>
            )}
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  rutaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexShrink: 1,
    marginRight: 10,
  },
  rutaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  rutaNombre: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  estatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  estatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCol: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoText: {
    fontSize: 13,
    color: '#4b5563',
  },
  infoRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  infoRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1763A6',
  },
  actionSection: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 16,
  },
  questionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#1763A6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  btnIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryButtonText: {
    color: '#1763A6',
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
    marginTop: -8,
  },
  // Banners y Contenedores de Estado de Horario
  anticipationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  anticipationBannerText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f766e',
    flex: 1,
  },
  delayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  delayBannerText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#b45309',
    flex: 1,
  },
  earlyContainer: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  earlyIconWrapper: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  earlyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    textAlign: 'center',
  },
  earlySubtitle: {
    fontSize: 12.5,
    color: '#78350f',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
  earlyHighlight: {
    fontWeight: '700',
    color: '#b45309',
  },
  expiredContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  expiredTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginTop: 2,
  },
  expiredSubtitle: {
    fontSize: 12.5,
    color: '#b91c1c',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
