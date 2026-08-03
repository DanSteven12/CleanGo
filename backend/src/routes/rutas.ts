import { Router, Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sanitizeText } from '../utils/sanitize';

const router = Router();

// ── GET /api/rutas ─────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM rutas ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('[rutas] GET /', err);
    res.status(500).json({ message: 'Error al obtener las rutas.' });
  }
});

// ── GET /api/rutas/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rutas WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Ruta no encontrada.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('[rutas] GET /:id', err);
    res.status(500).json({ message: 'Error al obtener la ruta.' });
  }
});

// ── POST /api/rutas ────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const nombre = sanitizeText(req.body.nombre);
  const descripcion = sanitizeText(req.body.descripcion);
  const color = sanitizeText(req.body.color);

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ message: 'El campo "nombre" es obligatorio.' });
  }

  const resolvedColor         = color          ?? '#3498db';

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO rutas (nombre, descripcion, color)
       VALUES (?, ?, ?)`,
      [
        nombre.trim(),
        descripcion ?? null,
        resolvedColor,
      ]
    );

    const [newRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rutas WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(newRows[0]);
  } catch (err) {
    console.error('[rutas] POST /', err);
    res.status(500).json({ message: 'Error al crear la ruta.' });
  }
});

// ── PUT /api/rutas/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const nombre = sanitizeText(req.body.nombre);
  const descripcion = sanitizeText(req.body.descripcion);
  const color = sanitizeText(req.body.color);

  if (nombre !== undefined && nombre.trim() === '') {
    return res.status(400).json({ message: 'El campo "nombre" no puede estar vacío.' });
  }

  try {
    // Fetch current record to only update provided fields
    const [current] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rutas WHERE id = ?',
      [id]
    );
    if ((current as RowDataPacket[]).length === 0) {
      return res.status(404).json({ message: 'Ruta no encontrada.' });
    }

    const existing = (current as RowDataPacket[])[0];

    await pool.execute(
      `UPDATE rutas
         SET nombre          = ?,
             descripcion     = ?,
             color           = ?
       WHERE id = ?`,
      [
        nombre          ?? existing.nombre,
        descripcion     !== undefined ? descripcion : existing.descripcion,
        color           ?? existing.color,
        id,
      ]
    );

    const [updated] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rutas WHERE id = ?',
      [id]
    );
    res.json((updated as RowDataPacket[])[0]);
  } catch (err) {
    console.error('[rutas] PUT /:id', err);
    res.status(500).json({ message: 'Error al actualizar la ruta.' });
  }
});

// ── DELETE /api/rutas/:id ──────────────────────────────────────────────────
// FK ON DELETE CASCADE removes puntos_control automatically
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM rutas WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ruta no encontrada.' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('[rutas] DELETE /:id', err);
    res.status(500).json({ message: 'Error al eliminar la ruta.' });
  }
});

export default router;
