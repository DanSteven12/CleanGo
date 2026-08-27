import api from './api';

export interface ReporteCiudadano {
  id: number;
  tipo_reporte: string;
  descripcion: string | null;
  fotografia: string | null;
  latitud: string;
  longitud: string;
  direccion_referencia: string | null;
  estado: string;
  fecha_reporte: string;
}

export const reportesService = {
  getMisReportes: async (): Promise<ReporteCiudadano[]> => {
    const response = await api.get('/ciudadano/reportes');
    return response.data;
  },

  getReporteById: async (id: number): Promise<ReporteCiudadano> => {
    const response = await api.get(`/ciudadano/reportes/${id}`);
    return response.data;
  },

  crearReporte: async (formData: FormData): Promise<{ message: string; reporteId: number; fotografiaUri: string | null }> => {
    try {
      // En React Native, Axios no reconoce el FormData nativo como browser FormData
      // y lo serializa como application/x-www-form-urlencoded.
      // Solución: forzar el Content-Type (sin boundary — React Native lo añade solo)
      // y usar transformRequest para que Axios no intente serializar el FormData.
      const response = await api.post('/ciudadano/reportes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: [(data) => data],
      });
      return response.data;
    } catch (err: any) {
      throw err;
    }
  },
};
