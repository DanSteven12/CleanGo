import type { AsignacionRecord } from '../types/routes';

export function getEffectiveSchedule(a: AsignacionRecord) {
  let date = a.fecha_programada;
  let start = a.horario_inicio;
  let end = a.horario_fin;
  let isModified = false;

  if (a.incidencia_tipo === 'Reprogramación' || a.incidencia_tipo === 'Cambio de horario') {
    isModified = true;
    if (a.incidencia_fecha_nueva) {
      date = a.incidencia_fecha_nueva;
    }
    
    if (a.incidencia_hora_nueva && start && end) {
      // Calcular duración original
      const startParts = start.split(':');
      const endParts = end.split(':');
      
      const startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
      const endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
      
      const durationMin = endMin - startMin;
      
      // Nueva hora de inicio
      start = a.incidencia_hora_nueva;
      const newStartParts = start.split(':');
      const newStartMin = parseInt(newStartParts[0], 10) * 60 + parseInt(newStartParts[1], 10);
      
      // Calcular nueva hora de fin
      const newEndMin = newStartMin + durationMin;
      const newEndHours = Math.floor(newEndMin / 60) % 24;
      const newEndMins = newEndMin % 60;
      
      end = `${newEndHours.toString().padStart(2, '0')}:${newEndMins.toString().padStart(2, '0')}:00`;
    }
  }

  return { date, start, end, isModified };
}
