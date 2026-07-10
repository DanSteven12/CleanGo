// frontend/src/types/routes.ts
// Tipos compartidos entre los módulos de rutas y asignaciones

export type AsignacionData = {
  camion_id: number | '';
  conductor_id: number | '';
  fecha_programada: string;
  horario_inicio: string;
  horario_fin: string;
  estatus_recorrido?: string;
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

// ─── Tipos para el Historial de Recorridos ────────────────────────────────────

/** Fila de la tabla de historial (listado). */
export type RecorridoCompletado = {
  id: number;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  duracion_minutos: number | null;
  ruta_id: number;
  ruta_nombre: string;
  ruta_color: string;
  camion_id: number;
  numero_economico: string;
  placa: string;
  conductor_id: number;
  conductor_nombre: string;
  fecha_programada: string;
  horario_inicio: string;
  horario_fin: string;
  total_checkpoints: number;
  checkpoints_completados: number;
};

/** Respuesta paginada del endpoint GET /api/recorridos/historial. */
export type HistorialPaginado = {
  data: RecorridoCompletado[];
  total: number;
  page: number;
  totalPages: number;
};

/** Checkpoint individual en el panel de detalle. */
export type CheckpointDetalle = {
  id: number;
  checkpoint_id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  orden: number;
  hora_estimada: string | null;
  hora_llegada: string | null;
  estado: 'Pendiente' | 'Completado' | 'Omitido';
  desviacion_minutos: number | null;
};

/** Detalle completo de un recorrido (encabezado + checkpoints). */
export type RecorridoDetalle = {
  id: number;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  duracion_minutos: number | null;
  latitud_actual: number | null;
  longitud_actual: number | null;
  ruta_nombre: string;
  ruta_color: string;
  numero_economico: string;
  placa: string;
  conductor_nombre: string;
  num_licencia: string;
  fecha_programada: string;
  horario_inicio: string;
  horario_fin: string;
  checkpoints: CheckpointDetalle[];
};

