// backend/src/routes/puntosControl.ts
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
const router = Router();

// POST /api/puntos-control
router.post('/', async (req: Request, res: Response) => {
  const { ruta_id, nombre, latitud, longitud, orden } = req.body as {
    ruta_id: number;
    nombre: string;
    latitud: number;
    longitud: number;
    orden: number;
  };

  // Basic validation
  if (
    typeof ruta_id !== 'number' ||
    typeof nombre !== 'string' ||
    typeof latitud !== 'number' ||
    typeof longitud !== 'number' ||
    typeof orden !== 'number'
  ) {
    return res.status(400).json({ message: 'Invalid payload – all fields required.' });
  }

  try {
    // Use execute to get ResultSetHeader with insertId
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO puntos_control (ruta_id, nombre, latitud, longitud, orden) VALUES (?, ?, ?, ?, ?)',
      [ruta_id, nombre, latitud, longitud, orden]
    );
    const insertId = result.insertId;
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM puntos_control WHERE id = ?', [insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error inserting punto_control:', err);
    res.status(500).json({ message: 'Server error while saving checkpoint.' });
  }
});

export default router;
