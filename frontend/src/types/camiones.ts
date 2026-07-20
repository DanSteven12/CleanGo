export interface CamionRecord {
  id: number;
  numero_economico: string;
  placa: string;
  gps_instalado: boolean;
  usuario_dispositivo: string;
  created_at: string;
}

export interface CamionData {
  numero_economico: string;
  placa: string;
  usuario_dispositivo: string;
  password_dispositivo?: string;
}

export interface HistorialRecorrido {
  id: number;
  ruta: string;
  fecha_programada: string;
  hora_inicio: string;
  hora_fin: string | null;
  duracion: string | null;
  estado: string;
  conductor: string | null;
}
