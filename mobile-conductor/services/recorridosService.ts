import api from './api';

export interface RecorridoStartResponse {
  recorrido_id: number;
  color: string;
  checkpoints: any[];
  geometria?: { lat: number; lng: number }[];
}

// ─── Historial ────────────────────────────────────────────────────────────────

export interface RecorridoHistorial {
  id: number;
  hora_inicio: string;
  hora_fin: string | null;
  estado: string;
  conductor_real_nombre: string | null;
  duracion_minutos: number | null;
  ruta_id: number;
  ruta_nombre: string;
  ruta_color: string | null;
  camion_id: number;
  numero_economico: string;
  placa: string;
  conductor_id: number;
  conductor_nombre: string;
  fecha_programada: string;
  horario_inicio: string | null;
  horario_fin: string | null;
  total_checkpoints: number;
  checkpoints_completados: number;
}

export interface HistorialResponse {
  data: RecorridoHistorial[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

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
   * Obtiene la lista de asignaciones exclusivas del camión autenticado.
   */
  getAsignaciones: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/device/auth/asignaciones');
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

  /**
   * Obtiene el historial paginado de recorridos completados del camión autenticado.
   *
   * El endpoint usa deviceAuthMiddleware: el camion_id se extrae del JWT en el
   * backend y nunca se envía desde el cliente.
   *
   * GET /api/device/recorridos/historial?page=N
   */
  getHistorial: async (page: number = 1): Promise<HistorialResponse> => {
    const response = await api.get<HistorialResponse>('/device/recorridos/historial', {
      params: { page },
    });
    return response.data;
  },
};

