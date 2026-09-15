import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import '../../assets/styles/usuarios.css';
import { Header } from '../../components/layout/Header';

export const ConductoresCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre_completo: '',
    numero_empleado: '',
    numero_licencia: '',
    fecha_expedicion_licencia: '',
    vigencia_licencia: '',
    telefono: '',
    estado: 'Activo' as 'Activo' | 'Inactivo',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const isGibberishOrRepeating = (str: string): boolean => {
    if (/(.)\1{2,}/.test(str)) return true;
    const clean = str.replace(/[\s-]/g, '').toLowerCase();
    if (clean.length > 0 && new Set(clean).size <= 1) return true;
    return false;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, telefono: onlyDigits }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Nombre completo
    const nombre = formData.nombre_completo.trim();
    if (!nombre) {
      return setError('El nombre completo es estrictamente obligatorio.');
    }
    if (nombre.length < 6 || nombre.length > 100) {
      return setError('El nombre completo debe tener entre 6 y 100 caracteres.');
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.]+$/.test(nombre)) {
      return setError('El nombre completo solo puede contener letras y espacios válidos.');
    }
    if (isGibberishOrRepeating(nombre)) {
      return setError('El nombre completo contiene caracteres repetidos o no válidos.');
    }
    const words = nombre.split(/\s+/).filter(w => w.length >= 2);
    if (words.length < 2) {
      return setError('Debe ingresar nombre y apellido válidos (mínimo 2 palabras).');
    }

    // 2. Número de empleado
    const numEmpleado = formData.numero_empleado.trim().toUpperCase();
    if (!numEmpleado) {
      return setError('El número de empleado es estrictamente obligatorio.');
    }
    if (numEmpleado.length < 3 || numEmpleado.length > 20) {
      return setError('El número de empleado debe tener entre 3 y 20 caracteres.');
    }
    if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(numEmpleado)) {
      return setError('El número de empleado solo permite letras mayúsculas, números y guiones.');
    }
    if (isGibberishOrRepeating(numEmpleado)) {
      return setError('El número de empleado contiene caracteres repetidos no válidos.');
    }
    if (!/\d/.test(numEmpleado)) {
      return setError('El número de empleado debe contener al menos un dígito numérico (ej. EMP-001 o CHF-01).');
    }

    // 3. Número de licencia
    const numLicencia = formData.numero_licencia.trim().toUpperCase();
    if (!numLicencia) {
      return setError('El número de licencia es estrictamente obligatorio.');
    }
    if (numLicencia.length < 6 || numLicencia.length > 20) {
      return setError('El número de licencia debe tener entre 6 y 20 caracteres.');
    }
    if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(numLicencia)) {
      return setError('El número de licencia solo permite letras mayúsculas, números y guiones.');
    }
    if (isGibberishOrRepeating(numLicencia)) {
      return setError('El número de licencia no puede contener caracteres repetidos consecutivamente.');
    }
    const hasLetter = /[A-Z]/.test(numLicencia);
    const digitsCount = (numLicencia.match(/\d/g) || []).length;
    if (!hasLetter || digitsCount < 4) {
      return setError(
        'El número de licencia no es válido. Debe contener al menos una letra y mínimo 4 dígitos (ej. B-12345678 o LIC-987654).'
      );
    }

    // 4. Teléfono (10 dígitos válidos)
    const tel = formData.telefono.trim();
    if (!tel) {
      return setError('El número de teléfono es estrictamente obligatorio.');
    }
    if (!/^[2-9]\d{9}$/.test(tel)) {
      return setError('El teléfono debe ser un número válido de 10 dígitos (no puede iniciar con 0 ni 1).');
    }
    const uniqueDigits = new Set(tel.split(''));
    if (uniqueDigits.size <= 2) {
      return setError('El número de teléfono no puede ser un valor repetitivo o ficticio.');
    }
    if (['1234567890', '0123456789', '9876543210'].includes(tel)) {
      return setError('El número de teléfono no puede ser una secuencia numérica simple.');
    }

    // 5. Fechas de expedición y vigencia
    const expedicion = formData.fecha_expedicion_licencia.trim();
    const vigencia = formData.vigencia_licencia.trim();

    if (!expedicion) {
      return setError('La fecha de expedición de la licencia es obligatoria.');
    }
    if (!vigencia) {
      return setError('La vigencia de la licencia es obligatoria.');
    }

    const expDate = new Date(expedicion + 'T00:00:00');
    const vigDate = new Date(vigencia + 'T00:00:00');
    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (expDate > todayDate) {
      return setError('La fecha de expedición de la licencia no puede ser una fecha futura.');
    }

    const minExpDate = new Date(todayDate);
    minExpDate.setFullYear(minExpDate.getFullYear() - 15);
    if (expDate < minExpDate) {
      return setError('La fecha de expedición no puede tener más de 15 años de antigüedad.');
    }

    if (vigDate <= expDate) {
      return setError('La vigencia de la licencia debe ser posterior a la fecha de expedición.');
    }

    const diffDays = (vigDate.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 180) {
      return setError('La vigencia de la licencia debe tener un periodo mínimo de 6 meses desde su expedición.');
    }

    if (vigDate < todayDate) {
      return setError(
        'No se puede registrar un conductor con una licencia vencida. Por favor verifique la fecha de vigencia.'
      );
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/conductores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: nombre,
          numero_empleado: numEmpleado,
          numero_licencia: numLicencia,
          fecha_expedicion_licencia: expedicion,
          vigencia_licencia: vigencia,
          telefono: tel,
          estado: 'Activo',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el conductor');

      toast.success('Conductor registrado exitosamente');
      navigate('/conductores');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Header
        subtitle="Ingresa los datos del conductor para el sistema"
        title="Registrar Nuevo Conductor"
      />
      <div className="usuarios-page">
        <div className="form-header-row" style={{ marginTop: '1rem', padding: '0 2rem' }}>
          <button
            className="back-button"
            onClick={() => navigate('/conductores')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              color: 'var(--text-h)',
            }}
          >
            <ArrowLeft size={16} /> Volver a la lista
          </button>
        </div>

        <motion.div
          className="form-container"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-grid">

              {/* Nombre completo */}
              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Nombre completo (Nombre y Apellidos) *</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>
                    {formData.nombre_completo.length}/100
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '0.2rem', marginBottom: '0.5rem' }}>
                  Ingresa los nombres y apellidos completos del conductor oficial.
                </p>
                <input
                  type="text"
                  className="form-input"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  placeholder="Ej: Juan Carlos Pérez López"
                  maxLength={100}
                  required
                />
              </div>

              {/* Número de empleado */}
              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Número de empleado *</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>
                    {formData.numero_empleado.length}/20
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '0.2rem', marginBottom: '0.5rem' }}>
                  Introduce la clave o identificador laboral único asignado al conductor dentro de la empresa.
                </p>
                <input
                  type="text"
                  className="form-input"
                  name="numero_empleado"
                  value={formData.numero_empleado}
                  onChange={handleChange}
                  placeholder="Ej: EMP-001 o CHF-102"
                  maxLength={20}
                  required
                />
              </div>

              {/* Número de licencia */}
              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Número de licencia oficial *</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>
                    {formData.numero_licencia.length}/20
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '0.2rem', marginBottom: '0.5rem' }}>
                  Ingresa el folio o número oficial de la licencia de conducir del operador.
                </p>
                <input
                  type="text"
                  className="form-input"
                  name="numero_licencia"
                  value={formData.numero_licencia}
                  onChange={handleChange}
                  placeholder="Ej: B-12345678 o LIC-987654"
                  maxLength={20}
                  required
                />
              </div>

              {/* Teléfono */}
              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Teléfono (10 dígitos) *</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.8 }}>
                    {formData.telefono.length}/10
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '0.2rem', marginBottom: '0.5rem' }}>
                  Número de teléfono móvil o celular de contacto directo a 10 dígitos.
                </p>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  className="form-input"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handlePhoneChange}
                  placeholder="Ej. 9191234567"
                  required
                />
              </div>

              {/* Fecha de expedición de licencia */}
              <div className="form-field">
                <label className="form-label" style={{ marginBottom: 0 }}>Fecha de expedición de licencia *</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '0.2rem', marginBottom: '0.5rem' }}>
                  Indica la fecha en la que fue emitida originalmente la licencia de conducir.
                </p>
                <input
                  type="date"
                  className="form-input"
                  name="fecha_expedicion_licencia"
                  value={formData.fecha_expedicion_licencia}
                  onChange={handleChange}
                  max={today}
                  required
                />
              </div>

              {/* Vigencia de licencia */}
              <div className="form-field">
                <label className="form-label" style={{ marginBottom: 0 }}>Vigencia de licencia *</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, marginTop: '0.2rem', marginBottom: '0.5rem' }}>
                  Establece la fecha oficial de vencimiento de la licencia de conducir.
                </p>
                <input
                  type="date"
                  className="form-input"
                  name="vigencia_licencia"
                  value={formData.vigencia_licencia}
                  onChange={handleChange}
                  min={formData.fecha_expedicion_licencia || undefined}
                  required
                />
              </div>

            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -5 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -5 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="validation-error-banner" style={{ marginTop: '1.5rem' }}>
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button type="button" className="btn-secondary" onClick={() => navigate('/conductores')} disabled={isSaving}>
                Cancelar
              </button>
              <button type="submit" className="save-button" disabled={isSaving}>
                {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {isSaving ? 'Guardando...' : 'Guardar Conductor'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
};
