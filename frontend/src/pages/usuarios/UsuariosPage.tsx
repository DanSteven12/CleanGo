import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Loader2, KeyRound, Lock, Unlock, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import type { UsuarioRecord } from '../../types/usuarios';
import '../../assets/styles/usuarios.css';

// ─── Componentes de Modal (Helpers locales) ───────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const UsuariosPage: React.FC = () => {
  const navigate = useNavigate();
  // ── State ───────────────────────────────────────────────────────────────
  const [usuarios, setUsuarios] = useState<UsuarioRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros y paginación
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Modales
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Seleccionado
  const [selectedUser, setSelectedUser] = useState<UsuarioRecord | null>(null);

  // Formulario
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchUsuarios = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      setUsuarios(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // ── Filtrado y Paginación ────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return usuarios.filter(u => {
      const matchSearch = u.nombre.toLowerCase().includes(search.toLowerCase()) || u.correo.toLowerCase().includes(search.toLowerCase());
      const matchRol = rolFilter ? u.rol === rolFilter : true;
      const matchEstado = estadoFilter ? u.estado === estadoFilter : true;
      return matchSearch && matchRol && matchEstado;
    });
  }, [usuarios, search, rolFilter, estadoFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, page]);

  useEffect(() => {
    setPage(1); // Reset page on filter change
  }, [search, rolFilter, estadoFilter]);

  // ── Handlers de Formulario ───────────────────────────────────────────────
  const handleOpenCreate = () => {
    navigate('/usuarios/nuevo');
  };

  const handleOpenEdit = (user: UsuarioRecord) => {
    navigate(`/usuarios/${user.id}/editar`);
  };

  const handleOpenPassword = (user: UsuarioRecord) => {
    setSelectedUser(user);
    setPasswordData({ password: '', confirmPassword: '' });
    setFormError(null);
    setIsPasswordOpen(true);
  };

  const handleSavePassword = async () => {
    setFormError(null);
    if (!passwordData.password || passwordData.password.length < 8) {
      return setFormError('La contraseña debe tener al menos 8 caracteres.');
    }
    if (passwordData.password !== passwordData.confirmPassword) {
      return setFormError('Las contraseñas no coinciden.');
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/usuarios/${selectedUser!.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar contraseña');
      
      toast.success('Contraseña actualizada correctamente');
      setIsPasswordOpen(false);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.estado === 'Activo' ? 'Bloqueado' : 'Activo';
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/usuarios/${selectedUser.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar estado');
      
      toast.success(`Usuario ${newStatus.toLowerCase()} correctamente`);
      fetchUsuarios();
      setIsConfirmOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render Helpers ───────────────────────────────────────────────────────
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—';
  
  return (
    <div className="usuarios-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Administración de Usuarios</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '0.2rem', marginBottom: 0 }}>Gestión de accesos y roles del sistema</p>
        </div>
        <button onClick={handleOpenCreate} className="save-button">
          <Plus size={16} /> Crear Usuario
        </button>
      </div>

      <div className="usuarios-filters">
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar por nombre o correo..." 
            style={{ paddingLeft: '2.5rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" value={rolFilter} onChange={(e) => setRolFilter(e.target.value)}>
          <option value="">Todos los roles</option>
          <option value="Administrador">Administrador</option>
          <option value="Ciudadano">Ciudadano</option>
        </select>
        <select className="form-select" value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Bloqueado">Bloqueado</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', padding: '1rem 0' }}>
          <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} /> Cargando usuarios…
        </div>
      ) : (
        <>
          <div className="usuarios-table-wrapper">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último Acceso</th>
                  <th>Creación</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No se encontraron usuarios</td>
                  </tr>
                ) : (
                  currentUsers.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-h)' }}>{u.nombre}</td>
                      <td>{u.correo}</td>
                      <td>
                        <span className="rol-badge">{u.rol}</span>
                      </td>
                      <td>
                        <span className={`estado-badge ${u.estado === 'Activo' ? 'estado-activo' : 'estado-bloqueado'}`}>
                          {u.estado}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{formatDate(u.ultimo_acceso!)}</td>
                      <td style={{ fontSize: '0.8rem' }}>{formatDate(u.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button className="action-btn action-btn--edit" onClick={() => handleOpenEdit(u)} title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button className="action-btn" onClick={() => handleOpenPassword(u)} title="Cambiar Contraseña" style={{ color: 'oklch(0.6 0.15 40)' }}>
                            <KeyRound size={14} />
                          </button>
                          <button 
                            className="action-btn" 
                            onClick={() => { setSelectedUser(u); setIsConfirmOpen(true); }} 
                            title={u.estado === 'Activo' ? 'Bloquear' : 'Desbloquear'}
                            style={{ color: u.estado === 'Activo' ? 'oklch(0.5 0.15 30)' : 'oklch(0.5 0.15 140)' }}
                          >
                            {u.estado === 'Activo' ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="btn-secondary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '0.85rem', alignSelf: 'center', color: 'var(--text)' }}>
                Página {page} de {totalPages}
              </span>
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="btn-secondary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Cambiar Contraseña */}
      <Modal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} title="Cambiar Contraseña">
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-field">
            <label className="form-label">Nueva Contraseña *</label>
            <input type="password" className="form-input" value={passwordData.password} onChange={e => setPasswordData({ ...passwordData, password: e.target.value })} />
          </div>
          <div className="form-field">
            <label className="form-label">Confirmar Contraseña *</label>
            <input type="password" className="form-input" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
          </div>
        </div>
        
        {formError && (
          <div className="validation-error-banner" style={{ marginTop: '1rem' }}>
            <span>{formError}</span>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setIsPasswordOpen(false)} disabled={isSaving}>Cancelar</button>
          <button className="save-button" onClick={handleSavePassword} disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="spin" /> : 'Actualizar'}
          </button>
        </div>
      </Modal>

      {/* Modal Confirmar Bloqueo */}
      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} title="Confirmar Acción">
        <p style={{ color: 'var(--text)', fontSize: '0.9rem' }}>
          ¿Estás seguro de que deseas {selectedUser?.estado === 'Activo' ? 'bloquear' : 'desbloquear'} a <strong>{selectedUser?.nombre}</strong>?
        </p>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setIsConfirmOpen(false)} disabled={isSaving}>Cancelar</button>
          <button className="save-button" onClick={handleToggleStatus} disabled={isSaving} style={{ background: selectedUser?.estado === 'Activo' ? 'oklch(0.5 0.15 30)' : 'var(--primary)' }}>
            {isSaving ? <Loader2 size={16} className="spin" /> : 'Confirmar'}
          </button>
        </div>
      </Modal>

    </div>
  );
};
