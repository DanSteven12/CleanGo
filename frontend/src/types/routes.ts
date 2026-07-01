// frontend/src/types/routes.ts
// Tipos compartidos entre los módulos de rutas y asignaciones

export type AsignacionData = {
  camion_id: number | '';
  conductor_id: number | '';
  fecha_programada: string;
  horario_inicio: string;
  horario_fin: string;
  estatus_recorrido: string;
};

export type CheckpointInput = {
  latitude: number;
  longitude: number;
  route_order: number;
  name?: string;
};

/** Registro completo de asignación (con datos JOIN de ruta, camión y conductor). */
export type AsignacionRecord = {
  id: number;
  ruta_id: number;
  camion_id: number;
  conductor_id: number;
  fecha_programada: string;
  horario_inicio: string;
  horario_fin: string;
  estatus_recorrido: string;
  ruta_nombre: string;
  ruta_color: string;
  numero_economico: string;
  placa: string;
  conductor_nombre: string;
  num_licencia: string;
};
