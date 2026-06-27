// backend/src/routes/rutas.ts
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader } from 'mysql2';

const router = Router();

// GET all rutas
router.get('/', async (req: Request, res: Response) => {
  const [rows] = await pool.query('SELECT * FROM rutas');
  res.json(rows);
});

// GET single ruta by id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM rutas WHERE id = ?', [id]);
  if ((rows as any).length === 0) return res.status(404).json({ message: 'Ruta not found' });
  res.json((rows as any)[0]);
});

// POST create a ruta
// POST create a ruta
router.post('/', async (req: Request, res: Response) => {
  const { nombre, descripcion, zona, color } = req.body;
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO rutas (nombre, descripcion, zona, color) VALUES (?, ?, ?, ?)',
    [nombre, descripcion, zona, color]
  );
  const insertId = result.insertId;
  const [newRows] = await pool.query('SELECT * FROM rutas WHERE id = ?', [insertId]);
  res.status(201).json((newRows as any)[0]);
});

// PUT update ruta
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion, zona, color } = req.body;
  await pool.query(
    'UPDATE rutas SET nombre = ?, descripcion = ?, zona = ?, color = ? WHERE id = ?',
    [nombre, descripcion, zona, color, id]
  );
  const [updated] = await pool.query('SELECT * FROM rutas WHERE id = ?', [id]);
  res.json((updated as any)[0]);
});

// DELETE ruta (cascades puntos_control via FK)
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await pool.query('DELETE FROM rutas WHERE id = ?', [id]);
  res.sendStatus(204);
});

export default router;
