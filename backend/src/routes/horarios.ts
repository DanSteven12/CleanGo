// backend/src/routes/horarios.ts
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const router = Router();

// ── GET /api/horarios ─────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT h.*, r.nombre as ruta_nombre
      FROM horarios_rutas h
      JOIN rutas r ON h.ruta_id = r.id
      ORDER BY h.ruta_id ASC, 
               FIELD(h.dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo') ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[horarios] GET /', err);
    res.status(500).json({ message: 'Error al obtener los horarios.' });
  }
});

// ── POST /api/horarios ────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { ruta_id, dia_semana, hora_inicio_estimada, hora_fin_estimada } = req.body;

  if (!ruta_id || !dia_semana || !hora_inicio_estimada || !hora_fin_estimada) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  if (hora_inicio_estimada >= hora_fin_estimada) {
    return res.status(400).json({ message: 'La hora de inicio debe ser menor que la hora de fin.' });
  }

  try {
    // Validar si la ruta existe
    const [rutas] = await pool.query<RowDataPacket[]>('SELECT id FROM rutas WHERE id = ?', [ruta_id]);
    if (rutas.length === 0) {
      return res.status(404).json({ message: 'La ruta especificada no existe.' });
    }

    // Validar si ya existe un horario para esta ruta y día
    const [existente] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM horarios_rutas WHERE ruta_id = ? AND dia_semana = ?',
      [ruta_id, dia_semana]
    );
    if (existente.length > 0) {
      return res.status(400).json({ message: 'Ya existe un horario para esta ruta en el día seleccionado.' });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO horarios_rutas (ruta_id, dia_semana, hora_inicio_estimada, hora_fin_estimada)
       VALUES (?, ?, ?, ?)`,
      [ruta_id, dia_semana, hora_inicio_estimada, hora_fin_estimada]
    );

    const [newRows] = await pool.query<RowDataPacket[]>(
      `SELECT h.*, r.nombre as ruta_nombre
       FROM horarios_rutas h
       JOIN rutas r ON h.ruta_id = r.id
       WHERE h.id = ?`,
      [result.insertId]
    );
    res.status(201).json(newRows[0]);
  } catch (err) {
    console.error('[horarios] POST /', err);
    res.status(500).json({ message: 'Error al crear el horario.' });
  }
});

// ── PUT /api/horarios/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ruta_id, dia_semana, hora_inicio_estimada, hora_fin_estimada } = req.body;

  try {
    const [current] = await pool.query<RowDataPacket[]>('SELECT * FROM horarios_rutas WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({ message: 'Horario no encontrado.' });
    }
    const existing = current[0];

    const newRutaId = ruta_id ?? existing.ruta_id;
    const newDia = dia_semana ?? existing.dia_semana;
    const newInicio = hora_inicio_estimada ?? existing.hora_inicio_estimada;
    const newFin = hora_fin_estimada ?? existing.hora_fin_estimada;

    if (newInicio >= newFin) {
      return res.status(400).json({ message: 'La hora de inicio debe ser menor que la hora de fin.' });
    }

    // Validar duplicidad si cambia ruta_id o dia_semana
    if (newRutaId !== existing.ruta_id || newDia !== existing.dia_semana) {
      const [rutas] = await pool.query<RowDataPacket[]>('SELECT id FROM rutas WHERE id = ?', [newRutaId]);
      if (rutas.length === 0) {
        return res.status(404).json({ message: 'La ruta especificada no existe.' });
      }

      const [existente] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM horarios_rutas WHERE ruta_id = ? AND dia_semana = ? AND id != ?',
        [newRutaId, newDia, id]
      );
      if (existente.length > 0) {
        return res.status(400).json({ message: 'Ya existe un horario para esta ruta en el día seleccionado.' });
      }
    }

    await pool.execute(
      `UPDATE horarios_rutas
       SET ruta_id = ?, dia_semana = ?, hora_inicio_estimada = ?, hora_fin_estimada = ?
       WHERE id = ?`,
      [newRutaId, newDia, newInicio, newFin, id]
    );

    const [updated] = await pool.query<RowDataPacket[]>(
      `SELECT h.*, r.nombre as ruta_nombre
       FROM horarios_rutas h
       JOIN rutas r ON h.ruta_id = r.id
       WHERE h.id = ?`,
      [id]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error('[horarios] PUT /:id', err);
    res.status(500).json({ message: 'Error al actualizar el horario.' });
  }
});

// ── DELETE /api/horarios/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM horarios_rutas WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Horario no encontrado.' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('[horarios] DELETE /:id', err);
    res.status(500).json({ message: 'Error al eliminar el horario.' });
  }
});

export default router;
