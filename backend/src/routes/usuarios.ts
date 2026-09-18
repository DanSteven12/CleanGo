import { Router, Request, Response } from 'express';
import { pool } from '../db';
import bcrypt from 'bcrypt';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { authorizeRoles } from '../middlewares/roleMiddleware';
import { sanitizeText } from '../utils/sanitize';
import { validatePasswordStrength } from '../utils/passwordPolicy';

const SALT_ROUNDS = 12;

const router = Router();

// ── Aplicar autorización a todas las rutas de este router ────────────────────
router.use(authorizeRoles('Administrador'));

// ── GET /api/usuarios ─────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, rol, estado } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: any[] = [];

    if (search && search.trim()) {
      conditions.push('(nombre LIKE ? OR correo LIKE ? OR telefono LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (rol && rol.trim()) {
      conditions.push('rol = ?');
      params.push(rol.trim());
    }

    if (estado && estado.trim()) {
      conditions.push('estado = ?');
      params.push(estado.trim());
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT id, nombre, correo, rol, estado, ultimo_acceso, created_at, telefono 
      FROM usuarios
      ${where}
      ORDER BY id DESC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[usuarios] GET /', err);
    res.status(500).json({ message: 'Error al obtener los usuarios.' });
  }
});

// ── GET /api/usuarios/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, nombre, correo, rol, estado, ultimo_acceso, created_at, telefono 
      FROM usuarios
      WHERE id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('[usuarios] GET /:id', err);
    res.status(500).json({ message: 'Error al obtener el usuario.' });
  }
});

function isValidNombre(nombre: string): boolean {
  if (!nombre || nombre.length < 3 || nombre.length > 100) return false;
  if (/[0-9]/.test(nombre)) return false;
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(nombre)) return false;
  const letters = nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '');
  return letters.length >= 3;
}

function isValidTelefono(telefono: string): boolean {
  if (!telefono || !/^[0-9]{10}$/.test(telefono)) return false;
  if (!/^[2-9]/.test(telefono)) return false;
  if (/^(\d)\1{9}$/.test(telefono) || /(\d)\1{6,}/.test(telefono)) return false;
  const dummyNumbers = [
    '1234567890',
    '0123456789',
    '9876543210',
    '0987654321',
    '1122334455',
    '1212121212',
    '2345678901',
    '9898989898',
  ];
  if (dummyNumbers.includes(telefono)) return false;
  return true;
}

// ── POST /api/usuarios ────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { correo, password, rol, telefono } = req.body;
  const nombre = sanitizeText(req.body.nombre);

  if (!nombre || !correo || !password || !rol || !telefono || typeof telefono !== 'string' || !telefono.trim()) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  if (/[0-9]/.test(nombre)) {
    return res.status(400).json({ message: 'El nombre no debe contener números.' });
  }

  if (!isValidNombre(nombre)) {
    return res.status(400).json({ message: 'El nombre debe tener entre 3 y 100 caracteres y contener solo letras.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (correo.length > 100 || !emailRegex.test(correo)) {
    return res.status(400).json({ message: 'El correo electrónico debe tener un formato válido (máximo 100 caracteres).' });
  }

  const normalizedTelefono = telefono.trim();
  if (normalizedTelefono.length !== 10) {
    return res.status(400).json({ message: 'El teléfono debe tener exactamente 10 dígitos numéricos.' });
  }

  if (!/^[2-9]/.test(normalizedTelefono)) {
    return res.status(400).json({ message: 'El teléfono debe tener 10 dígitos y no puede iniciar con 0 ni 1.' });
  }

  if (!isValidTelefono(normalizedTelefono)) {
    return res.status(400).json({ message: 'El número telefónico no es válido.' });
  }

  if (rol !== 'Administrador' && rol !== 'Ciudadano') {
    return res.status(400).json({ message: 'Rol inválido.' });
  }

  const pwdValidation = validatePasswordStrength(password, nombre, correo);
  if (!pwdValidation.isValid) {
    return res.status(400).json({ message: pwdValidation.error });
  }

  try {
    // Check unique email
    const [existente] = await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existente.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO usuarios (nombre, correo, password, rol, estado, telefono) VALUES (?, ?, ?, ?, 'Activo', ?)`,
      [nombre, correo, hashedPassword, rol, normalizedTelefono]
    );

    const [newRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre, correo, rol, estado, ultimo_acceso, created_at, telefono FROM usuarios WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(newRows[0]);
  } catch (err) {
    console.error('[usuarios] POST /', err);
    res.status(500).json({ message: 'Error al crear el usuario.' });
  }
});

// ── PUT /api/usuarios/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { correo, rol, estado, telefono } = req.body;
  const nombre = sanitizeText(req.body.nombre);

  try {
    const [current] = await pool.query<RowDataPacket[]>('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    const existing = current[0];

    const newNombre = nombre ?? existing.nombre;
    const newCorreo = correo ?? existing.correo;
    const newRol = rol ?? existing.rol;
    const newEstado = estado ?? existing.estado;
    const newTelefono = (telefono !== undefined ? (typeof telefono === 'string' ? telefono.trim() : '') : existing.telefono);

    if (!newTelefono) {
      return res.status(400).json({ message: 'El teléfono es obligatorio.' });
    }
    if (newTelefono.length !== 10) {
      return res.status(400).json({ message: 'El teléfono debe tener exactamente 10 dígitos numéricos.' });
    }
    if (!/^[2-9]/.test(newTelefono)) {
      return res.status(400).json({ message: 'El teléfono debe tener 10 dígitos y no puede iniciar con 0 ni 1.' });
    }
    if (!isValidTelefono(newTelefono)) {
      return res.status(400).json({ message: 'El número telefónico no es válido.' });
    }

    if (nombre !== undefined) {
      if (/[0-9]/.test(newNombre)) {
        return res.status(400).json({ message: 'El nombre no debe contener números.' });
      }
      if (!isValidNombre(newNombre)) {
        return res.status(400).json({ message: 'El nombre debe tener entre 3 y 100 caracteres y contener solo letras.' });
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newCorreo.length > 100 || !emailRegex.test(newCorreo)) {
      return res.status(400).json({ message: 'El correo electrónico debe tener un formato válido (máximo 100 caracteres).' });
    }

    if (newRol !== 'Administrador' && newRol !== 'Ciudadano') {
      return res.status(400).json({ message: 'Rol inválido.' });
    }

    if (newEstado !== 'Activo' && newEstado !== 'Bloqueado') {
      return res.status(400).json({ message: 'Estado inválido.' });
    }

    if (newCorreo !== existing.correo) {
      const [existente] = await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE correo = ? AND id != ?', [newCorreo, id]);
      if (existente.length > 0) {
        return res.status(400).json({ message: 'El correo ya está registrado por otro usuario.' });
      }
    }

    await pool.execute(
      `UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, estado = ?, telefono = ? WHERE id = ?`,
      [newNombre, newCorreo, newRol, newEstado, newTelefono, id]
    );

    const [updated] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre, correo, rol, estado, ultimo_acceso, created_at, telefono FROM usuarios WHERE id = ?',
      [id]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error('[usuarios] PUT /:id', err);
    res.status(500).json({ message: 'Error al actualizar el usuario.' });
  }
});

// ── PUT /api/usuarios/:id/password ────────────────────────────────────────────
router.put('/:id/password', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    const [current] = await pool.query<RowDataPacket[]>('SELECT id, nombre, correo FROM usuarios WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const pwdValidation = validatePasswordStrength(password, current[0].nombre, current[0].correo);
    if (!pwdValidation.isValid) {
      return res.status(400).json({ message: pwdValidation.error });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await pool.execute('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, id]);

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error('[usuarios] PUT /:id/password', err);
    res.status(500).json({ message: 'Error al cambiar la contraseña.' });
  }
});

// ── PUT /api/usuarios/:id/status ──────────────────────────────────────────────
router.put('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (estado !== 'Activo' && estado !== 'Bloqueado') {
    return res.status(400).json({ message: 'Estado inválido.' });
  }

  try {
    const [current] = await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    await pool.execute('UPDATE usuarios SET estado = ? WHERE id = ?', [estado, id]);

    const [updated] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre, correo, rol, estado, ultimo_acceso, created_at, telefono FROM usuarios WHERE id = ?',
      [id]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error('[usuarios] PUT /:id/status', err);
    res.status(500).json({ message: 'Error al cambiar el estado.' });
  }
});

export default router;
