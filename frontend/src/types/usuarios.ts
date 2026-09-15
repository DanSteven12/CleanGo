export interface UsuarioRecord {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  rol: 'Administrador' | 'Ciudadano';
  estado: 'Activo' | 'Bloqueado';
  ultimo_acceso: string | null;
  created_at: string;
}

export interface UsuarioData {
  nombre: string;
  correo: string;
  telefono: string;
  password?: string;
  confirmPassword?: string;
  rol: 'Administrador' | 'Ciudadano';
  estado?: 'Activo' | 'Bloqueado';
}
