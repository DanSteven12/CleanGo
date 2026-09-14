import api from './api';

export interface RutaSearchResult {
  id: number;
  nombre: string;
  descripcion: string | null;
  color?: string | null;
}

export interface HorarioRecoleccion {
  id: number;
  dia_semana: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  hora_inicio_estimada: string;
  hora_fin_estimada: string;
}

export interface RutaConHorarios {
  ruta: RutaSearchResult;
  horarios: HorarioRecoleccion[];
}

export const horariosService = {
  /**
   * Obtiene el catálogo completo de rutas para indexación y búsqueda instantánea local.
   */
  async getAllRutas(): Promise<RutaSearchResult[]> {
    try {
      const response = await api.get<{ data: RutaSearchResult[] }>('/ciudadano/horarios/rutas');
      return response.data.data;
    } catch (error) {
      console.error('[horariosService] Error en getAllRutas:', error);
      throw error;
    }
  },

  /**
   * Busca rutas por colonia/barrio.
   */
  async searchRutas(query: string, signal?: AbortSignal): Promise<RutaSearchResult[]> {
    if (!query || query.trim().length < 2) return [];
    
    try {
      const response = await api.get<{ data: RutaSearchResult[] }>(
        `/ciudadano/horarios/buscar?q=${encodeURIComponent(query)}`,
        { signal }
      );
      return response.data.data;
    } catch (error) {
      if (
        (error as any)?.name !== 'CanceledError' &&
        (error as any)?.name !== 'AbortError' &&
        (error as any)?.code !== 'ERR_CANCELED'
      ) {
        console.error('[horariosService] Error en searchRutas:', error);
      }
      throw error;
    }
  },

  /**
   * Obtiene los horarios de recolección de una ruta específica.
   */
  async getHorariosByRuta(rutaId: number): Promise<RutaConHorarios> {
    try {
      const response = await api.get<RutaConHorarios>(`/ciudadano/horarios/rutas/${rutaId}`);
      return response.data;
    } catch (error) {
      console.error(`[horariosService] Error en getHorariosByRuta(${rutaId}):`, error);
      throw error;
    }
  }
};
