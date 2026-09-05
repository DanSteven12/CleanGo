import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Truck, User, Clock, CheckCircle2, UserCircle, MapPin, Calendar } from 'lucide-react-native';

interface AsignacionCardProps {
  asignacion: any;
  onIniciar: (conductorRealNombre?: string) => void;
  onFinalizar: () => void;
  onVerMapa?: () => void;
  isStarting: boolean;
  isFinishing: boolean;
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

  const estatusColor = asignacion.estatus_recorrido === 'Pendiente' ? '#f59e0b' : '#3b82f6';
  const estatusBg = asignacion.estatus_recorrido === 'Pendiente' ? '#fef3c7' : '#dbeafe';

  // Calcular fecha formateada y prefijo de horario
  const { fechaBadgeText, prefijoEarly } = formatFechaCompleta(asignacion.fecha_programada);

  // Calcular si el horario ya permite iniciar
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (asignacion.estatus_recorrido !== 'Pendiente') return;
    const interval = setInterval(() => setNow(new Date()), 5000); // Re-check cada 5 segundos
    return () => clearInterval(interval);
  }, [asignacion.estatus_recorrido]);

  let isEarly = false;
  let timeStr = '';

  if (asignacion.fecha_programada && asignacion.horario_inicio) {
    const fechaStr = typeof asignacion.fecha_programada === 'string' 
      ? asignacion.fecha_programada.split('T')[0] 
      : new Date(asignacion.fecha_programada).toISOString().split('T')[0];
    const programada = new Date(`${fechaStr}T${asignacion.horario_inicio}`);
    
    if (!isNaN(programada.getTime()) && now < programada) {
      isEarly = true;
      const ampm = programada.getHours() >= 12 ? 'PM' : 'AM';
      const hours = programada.getHours() % 12 || 12;
      const mins = programada.getMinutes().toString().padStart(2, '0');
      timeStr = `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
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
        <View style={[styles.estatusBadge, { backgroundColor: estatusBg }]}>
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
          {Boolean(fechaBadgeText) && (
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
          
          {isEarly ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Clock size={28} color="#f59e0b" style={{ marginBottom: 8 }} />
              <Text style={{ textAlign: 'center', color: '#374151', fontSize: 15, fontWeight: '600' }}>
                Programado para {prefijoEarly} a las {timeStr}
              </Text>
              <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, marginTop: 4 }}>
                El botón se habilitará automáticamente a esa hora.
              </Text>
            </View>
          ) : confirmStep === 'ask' ? (
            <View>
              <Text style={styles.questionText}>¿Eres tú quien realizará este recorrido?</Text>
              
              <TouchableOpacity 
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
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => setConfirmStep('capture')}
                disabled={isStarting}
              >
                <UserCircle size={18} color="#1763A6" style={styles.btnIcon} />
                <Text style={styles.secondaryButtonText}>No, soy otra persona</Text>
              </TouchableOpacity>
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
              
              <TouchableOpacity 
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
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryButton, { marginTop: 8 }]} 
                onPress={() => { setConfirmStep('ask'); setConductorRealError(null); }}
                disabled={isStarting}
              >
                <Text style={styles.secondaryButtonText}>Regresar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {asignacion.estatus_recorrido === 'En Progreso' && (
        <View style={styles.actionSection}>
          <View style={styles.divider} />
          {onVerMapa && (
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: '#1763A6', marginBottom: 8 }]} 
              onPress={onVerMapa}
            >
              <MapPin size={18} color="#fff" style={styles.btnIcon} />
              <Text style={styles.primaryButtonText}>Ver Mapa de Ruta</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
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
          </TouchableOpacity>
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
});
