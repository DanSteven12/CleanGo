import api from './api';

export interface CiudadanoRecorridoActivo {
  recorrido_id: number;
  ruta_id: number;
  ruta_nombre: string;
  color: string;
  colonias: string;
  numero_economico: string;
  conductor_nombre: string;
  hora_inicio: string;
  estado: string;
}

export interface CheckpointGeometria {
  id: number;
  nombre: string;
  latitud: number | string;
  longitud: number | string;
  orden: number;
  estado: string;
  hora_llegada: string | null;
}

export interface CiudadanoRecorridoDetalle extends CiudadanoRecorridoActivo {
  checkpoints: CheckpointGeometria[];
  geometria: { lat: number; lng: number }[] | null;
}

export const recorridosService = {
  /**
   * Obtiene la lista de recorridos activos (En progreso) en toda la ciudad.
   */
  getRecorridosActivos: async (): Promise<CiudadanoRecorridoActivo[]> => {
    try {
      const response = await api.get('/ciudadano/recorridos/activos');
      return response.data.data;
    } catch (error) {
      console.error('[recorridosService] Error en getRecorridosActivos:', error);
      throw error;
    }
  },

  /**
   * Obtiene los detalles de un recorrido en curso (Ruta, Checkpoints, Geometría real).
   */
  getRecorridoDetalle: async (recorridoId: number): Promise<CiudadanoRecorridoDetalle> => {
    try {
      const response = await api.get(`/ciudadano/recorridos/${recorridoId}`);
      return response.data;
    } catch (error) {
      console.error(`[recorridosService] Error en getRecorridoDetalle(${recorridoId}):`, error);
      throw error;
    }
  }
};
