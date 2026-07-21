// frontend/src/types/reportes.ts

export type TipoReporte =
  | 'Basura acumulada'
  | 'Camión no pasó'
  | 'Contenedor lleno'
  | 'Calles contaminadas';

export type EstadoReporte = 'Pendiente' | 'En proceso' | 'Cerrado';

export interface ReporteRecord {
  id: number;
  tipo_reporte: TipoReporte;
  descripcion: string | null;
  fotografia: string | null;
  latitud: string | number;
  longitud: string | number;
  direccion_referencia: string | null;
  estado: EstadoReporte;
  fecha_reporte: string;
  ciudadano_nombre: string | null;
  ciudadano_correo: string | null;
}

export interface ReporteIndicadores {
  total: number;
  pendientes: number;
  en_proceso: number;
  cerrados: number;
}
