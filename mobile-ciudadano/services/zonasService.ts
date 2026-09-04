// mobile-ciudadano/services/zonasService.ts
/**
 * Servicio de Zonas de Interés del ciudadano.
 *
 * Reutiliza el cliente Axios (api.ts) que inyecta automáticamente
 * el Bearer Token desde SecureStore en cada petición.
 *
 * Endpoints:
 *   GET    /ciudadano/zonas         → listar zonas del usuario autenticado
 *   POST   /ciudadano/zonas         → crear una nueva zona
 *   PUT    /ciudadano/zonas/:id     → actualizar alias, coordenadas o estado activo
 *   DELETE /ciudadano/zonas/:id     → eliminar una zona
 */
import api from './api';

export interface ZonaInteres {
  id: number;
  alias: string;
  latitud: string;
  longitud: string;
  activo: number; // tinyint(1): 1 = activo, 0 = inactivo
  created_at: string;
  updated_at: string;
}

export interface CrearZonaPayload {
  alias?: string;
  latitud: number;
  longitud: number;
}

export interface ActualizarZonaPayload {
  alias?: string;
  latitud?: number;
  longitud?: number;
  activo?: boolean;
}

export const zonasService = {
  getZonas: async (): Promise<ZonaInteres[]> => {
    const response = await api.get('/ciudadano/zonas');
    return response.data;
  },

  crearZona: async (payload: CrearZonaPayload): Promise<ZonaInteres> => {
    const response = await api.post('/ciudadano/zonas', payload);
    return response.data;
  },

  actualizarZona: async (id: number, payload: ActualizarZonaPayload): Promise<ZonaInteres> => {
    const response = await api.put(`/ciudadano/zonas/${id}`, payload);
    return response.data;
  },

  eliminarZona: async (id: number): Promise<void> => {
    await api.delete(`/ciudadano/zonas/${id}`);
  },
};
