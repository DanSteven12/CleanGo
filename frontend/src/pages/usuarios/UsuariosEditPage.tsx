import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { UserForm } from './components/UserForm';
import type { UsuarioData, UsuarioRecord } from '../../types/usuarios';
import '../../assets/styles/usuarios.css';

export const UsuariosEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UsuarioRecord | undefined>();
  const [initialData, setInitialData] = useState<Partial<UsuarioData> | undefined>();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/usuarios/${id}`);
        if (!res.ok) throw new Error('Usuario no encontrado');
        const data = await res.json();
        setSelectedUser(data);
        setInitialData({
          nombre: data.nombre,
          correo: data.correo,
          rol: data.rol,
          estado: data.estado,
        });
      } catch (e: any) {
        toast.error(e.message || 'Error al cargar usuario');
        navigate('/usuarios');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchUser();
    }
  }, [id, navigate]);

  const handleEdit = async (formData: UsuarioData) => {
    setFormError(null);
    if (!formData.nombre || !formData.correo || !formData.rol || !formData.estado) {
      return setFormError('Todos los campos obligatorios deben estar llenos.');
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: formData.nombre, 
          correo: formData.correo, 
          rol: formData.rol, 
          estado: formData.estado 
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Error al actualizar');
      
      toast.success('Usuario actualizado correctamente');
      navigate('/usuarios');
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="usuarios-page" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', padding: '2rem' }}>
        <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} /> Cargando datos del usuario…
      </div>
    );
  }

  return (
    <div className="usuarios-page">
      <div style={{ marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ margin: '0 0 0.2rem', fontFamily: 'var(--font-display)' }}>Editar Usuario</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: 0 }}>Actualiza los datos del usuario</p>
      </div>

      <UserForm 
        isEditing
        initialData={initialData}
        selectedUser={selectedUser}
        onSubmit={handleEdit}
        isSaving={isSaving}
        formError={formError}
      />
    </div>
  );
};
