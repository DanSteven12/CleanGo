import { Router } from 'express';
import { query } from '../db';

const router = Router();

// ==========================================
// VALIDACIONES ESTRICTAS DE CONDUCTORES
// ==========================================

const isGibberishOrRepeating = (str: string): boolean => {
  // Detecta 3 o más caracteres idénticos consecutivos (ej. "AAA", "111", "---")
  if (/(.)\1{2,}/.test(str)) return true;
  // Detecta si todos los caracteres alfanuméricos son iguales (ej. "AAAAAAA")
  const clean = str.replace(/[\s-]/g, '').toLowerCase();
  if (clean.length > 0 && new Set(clean).size <= 1) return true;
  return false;
};

interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: {
    nombre_completo: string;
    numero_empleado: string;
    numero_licencia: string;
    fecha_expedicion_licencia: string;
    vigencia_licencia: string;
    telefono: string;
    estado: 'Activo' | 'Inactivo';
  };
}

const validateConductorData = (data: any): ValidationResult => {
  const {
    nombre_completo,
    numero_empleado,
    numero_licencia,
    fecha_expedicion_licencia,
    vigencia_licencia,
    telefono,
    estado = 'Activo',
  } = data;

  // 1. Nombre completo
  if (!nombre_completo || typeof nombre_completo !== 'string' || !nombre_completo.trim()) {
    return { isValid: false, error: 'El nombre completo es estrictamente obligatorio.' };
  }
  const nombreTrim = nombre_completo.trim();
  if (nombreTrim.length < 6 || nombreTrim.length > 100) {
    return { isValid: false, error: 'El nombre completo debe tener entre 6 y 100 caracteres.' };
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.]+$/.test(nombreTrim)) {
    return { isValid: false, error: 'El nombre completo solo puede contener letras y espacios válidos.' };
  }
  if (isGibberishOrRepeating(nombreTrim)) {
    return { isValid: false, error: 'El nombre completo contiene caracteres repetidos o no válidos.' };
  }
  const words = nombreTrim.split(/\s+/).filter(w => w.length >= 2);
  if (words.length < 2) {
    return { isValid: false, error: 'Debe ingresar al menos un nombre y un apellido (mínimo 2 palabras).' };
  }

  // 2. Número de empleado
  if (!numero_empleado || typeof numero_empleado !== 'string' || !numero_empleado.trim()) {
    return { isValid: false, error: 'El número de empleado es estrictamente obligatorio.' };
  }
  const empleadoTrim = numero_empleado.trim().toUpperCase();
  if (empleadoTrim.length < 3 || empleadoTrim.length > 20) {
    return { isValid: false, error: 'El número de empleado debe tener entre 3 y 20 caracteres.' };
  }
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(empleadoTrim)) {
    return { isValid: false, error: 'El número de empleado solo permite letras mayúsculas, números y guiones.' };
  }
  if (isGibberishOrRepeating(empleadoTrim)) {
    return { isValid: false, error: 'El número de empleado contiene caracteres repetidos no válidos.' };
  }
  if (!/\d/.test(empleadoTrim)) {
    return { isValid: false, error: 'El número de empleado debe contener al menos un dígito numérico (ej. EMP-001 o CHF-01).' };
  }

  // 3. Número de licencia (Validación estricta)
  if (!numero_licencia || typeof numero_licencia !== 'string' || !numero_licencia.trim()) {
    return { isValid: false, error: 'El número de licencia es estrictamente obligatorio.' };
  }
  const licenciaTrim = numero_licencia.trim().toUpperCase();
  if (licenciaTrim.length < 6 || licenciaTrim.length > 20) {
    return { isValid: false, error: 'El número de licencia debe tener entre 6 y 20 caracteres.' };
  }
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(licenciaTrim)) {
    return { isValid: false, error: 'El número de licencia solo permite letras mayúsculas, números y guiones.' };
  }
  if (isGibberishOrRepeating(licenciaTrim)) {
    return { isValid: false, error: 'El número de licencia no puede contener caracteres repetidos consecutivamente.' };
  }
  const hasLetter = /[A-Z]/.test(licenciaTrim);
  const digitsCount = (licenciaTrim.match(/\d/g) || []).length;
  if (!hasLetter || digitsCount < 4) {
    return {
      isValid: false,
      error: 'El número de licencia no es válido. Debe contener al menos una letra y mínimo 4 dígitos (ej. B-12345678 o LIC-987654).',
    };
  }

  // 4. Teléfono (Estrictamente 10 dígitos válidos)
  if (!telefono || typeof telefono !== 'string' || !telefono.trim()) {
    return { isValid: false, error: 'El número de teléfono es estrictamente obligatorio.' };
  }
  const telTrim = telefono.trim();
  if (!/^[2-9]\d{9}$/.test(telTrim)) {
    return {
      isValid: false,
      error: 'El teléfono debe ser un número válido de 10 dígitos (no puede iniciar con 0 ni 1).',
    };
  }
  const uniqueDigits = new Set(telTrim.split(''));
  if (uniqueDigits.size <= 2) {
    return { isValid: false, error: 'El número de teléfono no puede ser un valor repetitivo o ficticio.' };
  }
  if (['1234567890', '0123456789', '9876543210'].includes(telTrim)) {
    return { isValid: false, error: 'El número de teléfono no puede ser una secuencia numérica simple.' };
  }

  // 5. Fechas de expedición y vigencia
  if (!fecha_expedicion_licencia || typeof fecha_expedicion_licencia !== 'string' || !fecha_expedicion_licencia.trim()) {
    return { isValid: false, error: 'La fecha de expedición de la licencia es obligatoria.' };
  }
  if (!vigencia_licencia || typeof vigencia_licencia !== 'string' || !vigencia_licencia.trim()) {
    return { isValid: false, error: 'La vigencia de la licencia es obligatoria.' };
  }

  const expedicionTrim = fecha_expedicion_licencia.trim().slice(0, 10);
  const vigenciaTrim = vigencia_licencia.trim().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(expedicionTrim) || isNaN(Date.parse(expedicionTrim))) {
    return { isValid: false, error: 'La fecha de expedición no tiene un formato válido.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigenciaTrim) || isNaN(Date.parse(vigenciaTrim))) {
    return { isValid: false, error: 'La fecha de vigencia no tiene un formato válido.' };
  }

  const expDate = new Date(expedicionTrim + 'T00:00:00');
  const vigDate = new Date(vigenciaTrim + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (expDate > today) {
    return { isValid: false, error: 'La fecha de expedición de la licencia no puede ser una fecha futura.' };
  }

  const minExpDate = new Date(today);
  minExpDate.setFullYear(minExpDate.getFullYear() - 15);
  if (expDate < minExpDate) {
    return { isValid: false, error: 'La fecha de expedición no puede tener más de 15 años de antigüedad.' };
  }

  if (vigDate <= expDate) {
    return { isValid: false, error: 'La vigencia de la licencia debe ser posterior a la fecha de expedición.' };
  }

  const diffDays = (vigDate.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 180) {
    return {
      isValid: false,
      error: 'La vigencia de la licencia debe tener un periodo mínimo de 6 meses desde su expedición.',
    };
  }

  // 6. Estado
  if (!estado || (estado !== 'Activo' && estado !== 'Inactivo')) {
    return { isValid: false, error: 'El estado debe ser "Activo" o "Inactivo".' };
  }

  if (estado === 'Activo' && vigDate < today) {
    return {
      isValid: false,
      error: 'No se puede registrar un conductor como "Activo" con una licencia vencida. Seleccione "Inactivo" o actualice la vigencia.',
    };
  }

  return {
    isValid: true,
    sanitized: {
      nombre_completo: nombreTrim,
      numero_empleado: empleadoTrim,
      numero_licencia: licenciaTrim,
      fecha_expedicion_licencia: expedicionTrim,
      vigencia_licencia: vigenciaTrim,
      telefono: telTrim,
      estado,
    },
  };
};

// ==========================================
// OBTENER TODOS LOS CONDUCTORES
// ==========================================
router.get('/', async (_req, res) => {
  try {
    const sql = `
      SELECT
        id,
        nombre_completo,
        numero_empleado,
        numero_licencia,
        fecha_expedicion_licencia,
        vigencia_licencia,
        telefono,
        estado,
        created_at
      FROM conductores
      ORDER BY nombre_completo ASC
    `;
    const conductores = await query(sql);
    res.json(conductores);
  } catch (error) {
    console.error('Error fetching conductores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// OBTENER UN CONDUCTOR POR ID
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT
        id,
        nombre_completo,
        numero_empleado,
        numero_licencia,
        fecha_expedicion_licencia,
        vigencia_licencia,
        telefono,
        estado,
        created_at
      FROM conductores
      WHERE id = ?
    `;
    const rows = await query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching conductor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// CREAR CONDUCTOR
// ==========================================
router.post('/', async (req, res) => {
  try {
    const validation = validateConductorData(req.body);
    if (!validation.isValid || !validation.sanitized) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      nombre_completo,
      numero_empleado,
      numero_licencia,
      fecha_expedicion_licencia,
      vigencia_licencia,
      telefono,
      estado,
    } = validation.sanitized;

    // Verificar duplicados antes de insertar
    const existingEmpleado: any = await query(
      'SELECT id FROM conductores WHERE numero_empleado = ?',
      [numero_empleado]
    );
    if (existingEmpleado.length > 0) {
      return res.status(409).json({ error: 'Ya existe un conductor con este número de empleado.' });
    }

    const existingLicencia: any = await query(
      'SELECT id FROM conductores WHERE numero_licencia = ?',
      [numero_licencia]
    );
    if (existingLicencia.length > 0) {
      return res.status(409).json({ error: 'Ya existe un conductor con este número de licencia.' });
    }

    const existingTelefono: any = await query(
      'SELECT id FROM conductores WHERE telefono = ?',
      [telefono]
    );
    if (existingTelefono.length > 0) {
      return res.status(409).json({ error: 'Ya existe un conductor registrado con este número de teléfono.' });
    }

    const sql = `
      INSERT INTO conductores
        (nombre_completo, numero_empleado, numero_licencia, fecha_expedicion_licencia, vigencia_licencia, telefono, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result: any = await query(sql, [
      nombre_completo,
      numero_empleado,
      numero_licencia,
      fecha_expedicion_licencia,
      vigencia_licencia,
      telefono,
      estado,
    ]);

    res.status(201).json({ id: result.insertId, message: 'Conductor registrado exitosamente.' });
  } catch (error: any) {
    console.error('Error creating conductor:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message && error.message.includes('numero_empleado')) {
        return res.status(409).json({ error: 'Ya existe un conductor con este número de empleado.' });
      }
      if (error.message && error.message.includes('numero_licencia')) {
        return res.status(409).json({ error: 'Ya existe un conductor con este número de licencia.' });
      }
      if (error.message && error.message.includes('telefono')) {
        return res.status(409).json({ error: 'Ya existe un conductor con este número de teléfono.' });
      }
      return res.status(409).json({ error: 'Ya existe un conductor con estos datos registrados.' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// ACTUALIZAR CONDUCTOR
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = validateConductorData(req.body);
    if (!validation.isValid || !validation.sanitized) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      nombre_completo,
      numero_empleado,
      numero_licencia,
      fecha_expedicion_licencia,
      vigencia_licencia,
      telefono,
      estado,
    } = validation.sanitized;

    // Verificar duplicados excluyendo el conductor actual
    const existingEmpleado: any = await query(
      'SELECT id FROM conductores WHERE numero_empleado = ? AND id != ?',
      [numero_empleado, id]
    );
    if (existingEmpleado.length > 0) {
      return res.status(409).json({ error: 'Ya existe otro conductor con este número de empleado.' });
    }

    const existingLicencia: any = await query(
      'SELECT id FROM conductores WHERE numero_licencia = ? AND id != ?',
      [numero_licencia, id]
    );
    if (existingLicencia.length > 0) {
      return res.status(409).json({ error: 'Ya existe otro conductor con este número de licencia.' });
    }

    const existingTelefono: any = await query(
      'SELECT id FROM conductores WHERE telefono = ? AND id != ?',
      [telefono, id]
    );
    if (existingTelefono.length > 0) {
      return res.status(409).json({ error: 'Ya existe otro conductor registrado con este número de teléfono.' });
    }

    const sql = `
      UPDATE conductores
      SET
        nombre_completo          = ?,
        numero_empleado          = ?,
        numero_licencia          = ?,
        fecha_expedicion_licencia = ?,
        vigencia_licencia        = ?,
        telefono                 = ?,
        estado                   = ?
      WHERE id = ?
    `;
    const result: any = await query(sql, [
      nombre_completo,
      numero_empleado,
      numero_licencia,
      fecha_expedicion_licencia,
      vigencia_licencia,
      telefono,
      estado,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado.' });
    }

    res.json({ message: 'Conductor actualizado exitosamente.' });
  } catch (error: any) {
    console.error('Error updating conductor:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message && error.message.includes('numero_empleado')) {
        return res.status(409).json({ error: 'Ya existe un conductor con este número de empleado.' });
      }
      if (error.message && error.message.includes('numero_licencia')) {
        return res.status(409).json({ error: 'Ya existe un conductor con este número de licencia.' });
      }
      if (error.message && error.message.includes('telefono')) {
        return res.status(409).json({ error: 'Ya existe un conductor con este número de teléfono.' });
      }
      return res.status(409).json({ error: 'Ya existe un conductor con estos datos registrados.' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// ELIMINAR CONDUCTOR
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar si existe en asignaciones_rutas
    const checkSql = `SELECT COUNT(*) as count FROM asignaciones_rutas WHERE conductor_id = ?`;
    const checkResult: any = await query(checkSql, [id]);

    if (checkResult[0].count > 0) {
      return res.status(409).json({ error: 'El conductor ya forma parte de registros del sistema.' });
    }

    const deleteSql = `DELETE FROM conductores WHERE id = ?`;
    const deleteResult: any = await query(deleteSql, [id]);

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado.' });
    }

    res.json({ message: 'Conductor eliminado exitosamente.' });
  } catch (error) {
    console.error('Error deleting conductor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
