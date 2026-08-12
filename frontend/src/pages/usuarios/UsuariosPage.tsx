import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Loader2, KeyRound, Lock, Unlock, Search, X, Users, Shield, UserSquare } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useTiltGlow } from '../../lib/useTiltGlow';

import type { UsuarioRecord } from '../../types/usuarios';
import '../../assets/styles/usuarios.css';
import { Header } from '../../components/layout/Header';
import { PageSectionHeader } from '../../components/layout/PageSectionHeader';

// ─── Componentes de Modal (Helpers locales) ───────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="modal-header">
              <h3 className="modal-title">{title}</h3>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── StatCard sub-component ────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accentColor: string;
  bgColor: string;
  id: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, accentColor, bgColor, id }) => {
  const { ref, rotateX, rotateY, glowX, glowY, onMouseMove, onMouseLeave } = useTiltGlow(4);

  return (
    <motion.div
      id={id}
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="stat-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      variants={{
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
      }}
    >
      {/* Decorative corner glow */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 70, height: 70, borderRadius: '50%',
        background: `${accentColor}18`,
        pointerEvents: 'none',
      }} />

      {/* Tilt Glow Element */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 80px at ${glowX} ${glowY}, ${accentColor}15, transparent 100%)`,
        }}
        whileHover={{ opacity: 1 }}
      />

      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: '0.625rem',
        background: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transform: 'translateZ(10px)',
      }}>
        {icon}
      </div>

      {/* Value + Label */}
      <div style={{ transform: 'translateZ(5px)' }}>
        <div className="stat-value" style={{ fontSize: '1.875rem' }}>
          {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
        </div>
        <div className="stat-label" style={{ marginBottom: 0, marginTop: '0.25rem' }}>
          {label}
        </div>
      </div>
    </motion.div>
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

  // ── Estadísticas ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    return {
      total: usuarios.length,
      administradores: usuarios.filter(u => u.rol === 'Administrador').length,
      ciudadanos: usuarios.filter(u => u.rol === 'Ciudadano').length,
    };
  }, [usuarios]);

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

  const userPwd = passwordData.password;
  const userPwdLengthValid = userPwd.length >= 8 && userPwd.length <= 20;
  const userPwdUpperValid = /[A-Z]/.test(userPwd);
  const userPwdNumberValid = /[0-9]/.test(userPwd);
  const userPwdSpecialValid = /[^A-Za-z0-9]/.test(userPwd);
  const userPwdMatchValid = passwordData.confirmPassword !== '' && userPwd === passwordData.confirmPassword;
  const isUserPasswordValid = userPwdLengthValid && userPwdUpperValid && userPwdNumberValid && userPwdSpecialValid && userPwdMatchValid;

  const handleSavePassword = async () => {
    setFormError(null);
    if (!userPwdLengthValid) {
      return setFormError('La contraseña debe tener entre 8 y 20 caracteres.');
    }
    if (!userPwdUpperValid || !userPwdNumberValid || !userPwdSpecialValid) {
      return setFormError('La contraseña debe contener mayúscula, número y carácter especial.');
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
    <>
      <Header
        subtitle="Gestión de accesos y roles del sistema"
        title="Administración de Usuarios"
      />
      <PageSectionHeader
        eyebrow="ADMINISTRACIÓN"
        title="Gestión de usuarios"
        description="Roles, permisos y accesos al sistema municipal."
      />
    <div className="usuarios-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {/* Metric Cards Grid */}
      <motion.div 
        initial="hidden" animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}
      >
        <StatCard
          id="stat-usuarios"
          icon={<Users size={20} color="#fff" />}
          label="Usuarios Totales"
          value={stats.total}
          accentColor="oklch(0.52 0.14 250)"
          bgColor="linear-gradient(135deg, #1763A6, #152C40)"
        />
        <StatCard
          id="stat-admins"
          icon={<Shield size={20} color="#fff" />}
          label="Administradores"
          value={stats.administradores}
          accentColor="oklch(0.45 0.12 180)"
          bgColor="linear-gradient(135deg, #0A7056, #064032)"
        />
        <StatCard
          id="stat-citizens"
          icon={<UserSquare size={20} color="#fff" />}
          label="Ciudadanos"
          value={stats.ciudadanos}
          accentColor="oklch(0.60 0.15 40)"
          bgColor="linear-gradient(135deg, #A65217, #5C2B0B)"
        />
      </motion.div>

      {/* Main Card */}
      <div style={{ background: 'var(--panel-bg)', borderRadius: '0.75rem', border: '1px solid var(--panel-border)', padding: '1.5rem', boxShadow: '0 1px 3px 0 oklch(0.2 0.04 240 / 0.06)' }}>
        
        {/* Header of main card: Filters, Search, Crear Usuario, Record count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="usuarios-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1 }}>
            <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 300px', maxWidth: '400px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Buscar por nombre o correo..." 
                style={{ paddingLeft: '2.5rem', width: '100%' }}
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={handleOpenCreate} className="save-button">
              <Plus size={16} /> Crear Usuario
            </button>
          </div>
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
      </div>

      {/* Modal Cambiar Contraseña */}
      <Modal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} title="Cambiar Contraseña">
        <p style={{ color: 'var(--text)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Usuario: <strong>{selectedUser?.nombre}</strong> ({selectedUser?.correo})
        </p>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Nueva Contraseña *</label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{passwordData.password.length}/20</span>
            </div>
            <input 
              type="password" 
              className="form-input" 
              value={passwordData.password} 
              onChange={e => setPasswordData({ ...passwordData, password: e.target.value })} 
              maxLength={20}
            />
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
              <span style={{ color: userPwdLengthValid ? '#22c55e' : (userPwd.length > 0 ? '#ef4444' : 'var(--text)') }}>
                {userPwdLengthValid ? '✓' : '○'} Entre 8 y 20 caracteres
              </span>
              <span style={{ color: userPwdUpperValid ? '#22c55e' : (userPwd.length > 0 ? '#ef4444' : 'var(--text)') }}>
                {userPwdUpperValid ? '✓' : '○'} Al menos 1 letra mayúscula
              </span>
              <span style={{ color: userPwdNumberValid ? '#22c55e' : (userPwd.length > 0 ? '#ef4444' : 'var(--text)') }}>
                {userPwdNumberValid ? '✓' : '○'} Al menos 1 número
              </span>
              <span style={{ color: userPwdSpecialValid ? '#22c55e' : (userPwd.length > 0 ? '#ef4444' : 'var(--text)') }}>
                {userPwdSpecialValid ? '✓' : '○'} Al menos 1 carácter especial
              </span>
            </div>
          </div>
          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Confirmar Contraseña *</label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>{passwordData.confirmPassword.length}/20</span>
            </div>
            <input 
              type="password" 
              className="form-input" 
              value={passwordData.confirmPassword} 
              onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
              maxLength={20}
            />
            {passwordData.confirmPassword.length > 0 && !userPwdMatchValid && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                Las contraseñas no coinciden.
              </span>
            )}
          </div>
        </div>
        
        {formError && (
          <div className="validation-error-banner" style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span>{formError}</span>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setIsPasswordOpen(false)} disabled={isSaving}>Cancelar</button>
          <button className="save-button" onClick={handleSavePassword} disabled={isSaving || !isUserPasswordValid}>
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
    </>
  );
};
