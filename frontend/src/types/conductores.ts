export interface Conductor {
  id: number;
  nombre_completo: string;
  numero_empleado: string;
  numero_licencia: string;
  fecha_expedicion_licencia: string | null;
  vigencia_licencia: string;
  telefono: string | null;
  estado: 'Activo' | 'Inactivo';
  created_at: string;
}
