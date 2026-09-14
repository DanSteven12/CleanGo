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

export interface PaginatedReportesResponse {
  data: ReporteCiudadano[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface CrearReporteData {
  tipo_reporte: string;
  latitud: number | string;
  longitud: number | string;
  descripcion?: string | null;
  direccion_referencia?: string | null;
  fotografia?: {
    uri: string;
    name: string;
    type: string;
  } | null;
}

export const reportesService = {
  getMisReportes: async (page = 1, limit = 10): Promise<PaginatedReportesResponse> => {
    const response = await api.get('/ciudadano/reportes', {
      params: { page, limit },
    });
    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        pagination: {
          total: response.data.length,
          page: 1,
          limit: response.data.length,
          totalPages: 1,
          hasMore: false,
        },
      };
    }
    return response.data;
  },

  getReporteById: async (id: number): Promise<ReporteCiudadano> => {
    const response = await api.get(`/ciudadano/reportes/${id}`);
    return response.data;
  },

  crearReporte: async (
    data: FormData | CrearReporteData
  ): Promise<{ message: string; reporteId: number; fotografiaUri: string | null }> => {
    try {
      if (data instanceof FormData) {
        const response = await api.post('/ciudadano/reportes', data, {
          timeout: 30000,
        });
        return response.data;
      }

      // Si no tiene fotografía, enviar como JSON directo (rápido y sin problemas de multipart)
      if (!data.fotografia) {
        const response = await api.post(
          '/ciudadano/reportes',
          {
            tipo_reporte: data.tipo_reporte,
            latitud: data.latitud,
            longitud: data.longitud,
            descripcion: data.descripcion || null,
            direccion_referencia: data.direccion_referencia || null,
          },
          {
            timeout: 30000,
          }
        );
        return response.data;
      }

      // Si tiene fotografía, crear el FormData
      const formData = new FormData();
      formData.append('tipo_reporte', data.tipo_reporte);
      formData.append('latitud', String(data.latitud));
      formData.append('longitud', String(data.longitud));
      if (data.descripcion) {
        formData.append('descripcion', data.descripcion);
      }
      if (data.direccion_referencia) {
        formData.append('direccion_referencia', data.direccion_referencia);
      }
      formData.append('fotografia', {
        uri: data.fotografia.uri,
        name: data.fotografia.name,
        type: data.fotografia.type,
      } as any);

      const response = await api.post('/ciudadano/reportes', formData, {
        timeout: 30000,
      });
      return response.data;
    } catch (err: any) {
      throw err;
    }
  },
};
