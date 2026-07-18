export interface UsuarioRecord {
  id: number;
  nombre: string;
  correo: string;
  rol: 'Administrador' | 'Ciudadano';
  estado: 'Activo' | 'Bloqueado';
  ultimo_acceso: string | null;
  created_at: string;
}

export interface UsuarioData {
  nombre: string;
  correo: string;
  password?: string;
  confirmPassword?: string;
  rol: 'Administrador' | 'Ciudadano';
  estado?: 'Activo' | 'Bloqueado';
}
