import api from './api';

export interface RecorridoStartResponse {
  recorrido_id: number;
  color: string;
  checkpoints: any[];
}

export const recorridosService = {
  /**
   * Inicia un recorrido para la asignación seleccionada.
   */
  iniciarRecorrido: async (asignacionId: number, rutaId: number, conductorRealNombre?: string): Promise<RecorridoStartResponse> => {
    const payload: Record<string, unknown> = {
      asignacion_id: asignacionId,
      ruta_id: rutaId,
    };
    if (conductorRealNombre && conductorRealNombre.trim() !== '') {
      payload.conductorRealNombre = conductorRealNombre.trim();
    }
    
    const response = await api.post<RecorridoStartResponse>('/recorridos/iniciar', payload);
    return response.data;
  },

  /**
   * Finaliza el recorrido activo.
   */
  finalizarRecorrido: async (recorridoId: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/recorridos/${recorridoId}/finalizar`);
    return response.data;
  },

  /**
   * Obtiene la lista de asignaciones del día o pendientes.
   */
  getAsignaciones: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/asignaciones');
    return response.data;
  },

  /**
   * Obtiene el recorrido activo si la asignación está En progreso.
   */
  getRecorridoActivo: async (asignacionId: number): Promise<any> => {
    const response = await api.get<any>(`/recorridos/activo/${asignacionId}`);
    return response.data;
  },

  /**
   * Envía la actualización de la ubicación simulada al backend.
   */
  actualizarUbicacion: async (recorridoId: number, stats: any): Promise<any> => {
    const response = await api.put<any>(`/recorridos/${recorridoId}/ubicacion`, stats);
    return response.data;
  },

  /**
   * Cambia la velocidad de simulación en el backend.
   * El backend actualiza la simulación autoritativa y propaga la nueva velocidad
   * a todos los clientes conectados al recorrido por Socket.IO.
   */
  cambiarVelocidad: async (recorridoId: number, velocidad: number): Promise<void> => {
    await api.post(`/recorridos/${recorridoId}/velocidad`, { velocidad });
  },
};
