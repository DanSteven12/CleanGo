import { Router, Request, Response } from 'express';
import { pool } from '../db';
import bcrypt from 'bcrypt';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const SALT_ROUNDS = 12;

const router = Router();

// ── GET /api/usuarios ─────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, nombre, correo, rol, estado, ultimo_acceso, created_at 
      FROM usuarios
      ORDER BY id DESC
    `);
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
      SELECT id, nombre, correo, rol, estado, ultimo_acceso, created_at 
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

// ── POST /api/usuarios ────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { nombre, correo, password, rol } = req.body;

  if (!nombre || !correo || !password || !rol) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  if (rol !== 'Administrador' && rol !== 'Ciudadano') {
    return res.status(400).json({ message: 'Rol inválido.' });
  }

  try {
    // Check unique email
    const [existente] = await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existente.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO usuarios (nombre, correo, password, rol, estado) VALUES (?, ?, ?, ?, 'Activo')`,
      [nombre, correo, hashedPassword, rol]
    );

    const [newRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre, correo, rol, estado, ultimo_acceso, created_at FROM usuarios WHERE id = ?',
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
  const { nombre, correo, rol, estado } = req.body;

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
      `UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, estado = ? WHERE id = ?`,
      [newNombre, newCorreo, newRol, newEstado, id]
    );

    const [updated] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre, correo, rol, estado, ultimo_acceso, created_at FROM usuarios WHERE id = ?',
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

  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  try {
    const [current] = await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
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
      'SELECT id, nombre, correo, rol, estado, ultimo_acceso, created_at FROM usuarios WHERE id = ?',
      [id]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error('[usuarios] PUT /:id/status', err);
    res.status(500).json({ message: 'Error al cambiar el estado.' });
  }
});

export default router;
