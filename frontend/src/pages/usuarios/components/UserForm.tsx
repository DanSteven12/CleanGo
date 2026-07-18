import React, { useState, useEffect } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UsuarioData, UsuarioRecord } from '../../../types/usuarios';

interface UserFormProps {
  initialData?: Partial<UsuarioData>;
  isEditing?: boolean;
  selectedUser?: UsuarioRecord;
  onSubmit: (formData: UsuarioData) => Promise<void>;
  isSaving: boolean;
  formError: string | null;
}

export const UserForm: React.FC<UserFormProps> = ({ 
  initialData, 
  isEditing = false, 
  selectedUser,
  onSubmit, 
  isSaving, 
  formError 
}) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<UsuarioData>({
    nombre: '',
    correo: '',
    password: '',
    confirmPassword: '',
    rol: 'Ciudadano',
    estado: 'Activo',
    ...initialData,
  });

  // Sync state if initialData changes (e.g. after fetch in edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="routes-section" id="usuario-form" style={{ marginTop: '1rem' }}>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="form-field">
          <label className="form-label">Nombre Completo *</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.nombre} 
            onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
            placeholder="Ej: Juan Pérez"
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
            Ingresa el nombre completo del usuario que tendrá acceso al sistema.
          </p>
        </div>
        <div className="form-field">
          <label className="form-label">Correo Electrónico *</label>
          <input 
            type="email" 
            className="form-input" 
            value={formData.correo} 
            onChange={e => setFormData({ ...formData, correo: e.target.value })} 
            placeholder="Ej: juan@ejemplo.com"
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
            Introduce un correo electrónico único que será utilizado para iniciar sesión.
          </p>
        </div>

        {!isEditing && (
          <>
            <div className="form-field">
              <label className="form-label">Contraseña *</label>
              <input 
                type="password" 
                className="form-input" 
                value={formData.password} 
                onChange={e => setFormData({ ...formData, password: e.target.value })} 
                placeholder="Al menos 8 caracteres"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
                Define una contraseña segura con la que el usuario accederá al sistema.
              </p>
            </div>
            <div className="form-field">
              <label className="form-label">Confirmar Contraseña *</label>
              <input 
                type="password" 
                className="form-input" 
                value={formData.confirmPassword} 
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} 
                placeholder="Repita la contraseña"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #737373)', marginTop: '0.25rem', marginBottom: 0 }}>
                Vuelve a escribir la contraseña para confirmar que ambos valores coinciden.
              </p>
            </div>
          </>
        )}



        {isEditing && selectedUser && (
          <div className="form-field">
            <label className="form-label">Estado *</label>
            <select 
              className="form-select" 
              value={formData.estado || 'Activo'} 
              onChange={e => setFormData({ ...formData, estado: e.target.value as 'Activo' | 'Bloqueado' })}
            >
              <option value="Activo">Activo</option>
              <option value="Bloqueado">Bloqueado</option>
            </select>
          </div>
        )}
      </div>

      {formError && (
        <div className="validation-error-banner" style={{ marginTop: '1rem' }}>
          <span>{formError}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
        <button
          type="button"
          className="save-button"
          style={{ background: 'transparent', color: 'var(--text-h)', border: '1px solid var(--panel-border)', boxShadow: 'none', width: '180px', height: '40px' }}
          onClick={() => navigate('/usuarios')}
          disabled={isSaving}
        >
          <X size={16} />
          Cancelar
        </button>
        <button
          className="save-button crear-ruta-btn"
          onClick={handleSubmit}
          disabled={isSaving}
          style={{ width: '180px', height: '40px' }}
        >
          {isSaving ? (
            <>
              <Loader2 size={20} className="spin" />
              {isEditing ? 'Guardando…' : 'Creando…'}
            </>
          ) : (
            <>
              <Check size={20} />
              {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
