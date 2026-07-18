import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserForm } from './components/UserForm';
import type { UsuarioData } from '../../types/usuarios';
import '../../assets/styles/usuarios.css';

export const UsuariosCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async (formData: UsuarioData) => {
    setFormError(null);
    if (!formData.nombre || !formData.correo || !formData.rol) {
      return setFormError('Todos los campos obligatorios deben estar llenos.');
    }

    if (!formData.password || formData.password.length < 8) {
      return setFormError('La contraseña debe tener al menos 8 caracteres.');
    }
    if (formData.password !== formData.confirmPassword) {
      return setFormError('Las contraseñas no coinciden.');
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: formData.nombre, 
          correo: formData.correo, 
          password: formData.password, 
          rol: formData.rol 
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Error al guardar');
      
      toast.success('Usuario creado correctamente');
      navigate('/usuarios');
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="usuarios-page">
      <div style={{ marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ margin: '0 0 0.2rem', fontFamily: 'var(--font-display)' }}>Nuevo Usuario</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: 0 }}>Completa los datos para registrar un nuevo usuario en el sistema.</p>
      </div>

      <UserForm 
        onSubmit={handleCreate}
        isSaving={isSaving}
        formError={formError}
      />
    </div>
  );
};
