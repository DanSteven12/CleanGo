// backend/src/routes/checkpoints.ts
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const router = Router();

// ─── Tipo interno que refleja la forma que espera el frontend ──────────────
interface CheckpointRow {
  id: number;
  route_id: number;
  latitude: number;
  longitude: number;
  route_order: number;
  name: string | null;
}

/** Mapea una fila de `puntos_control` al contrato que usa el frontend. */
function mapRow(row: RowDataPacket): CheckpointRow {
  return {
    id:          row.id,
    route_id:    row.ruta_id,
    latitude:    Number(row.latitud),
    longitude:   Number(row.longitud),
    route_order: row.orden,
    name:        row.nombre ?? null,
  };
}

// ── POST /api/checkpoints ──────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { route_id, latitude, longitude, route_order, name } = req.body as {
    route_id: number;
    latitude: number;
    longitude: number;
    route_order: number;
    name?: string;
  };

  if (
    typeof route_id    !== 'number' ||
    typeof latitude    !== 'number' ||
    typeof longitude   !== 'number' ||
    typeof route_order !== 'number'
  ) {
    return res
      .status(400)
      .json({ message: 'route_id, latitude, longitude y route_order son requeridos.' });
  }

  const nombre = name?.trim() || `Checkpoint ${route_order}`;

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO puntos_control (ruta_id, nombre, latitud, longitud, orden) VALUES (?, ?, ?, ?, ?)',
      [route_id, nombre, latitude, longitude, route_order]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM puntos_control WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(mapRow(rows[0]));
  } catch (err) {
    console.error('[checkpoints] POST /', err);
    res.status(500).json({ message: 'Error al guardar el checkpoint.' });
  }
});

// ── DELETE /api/checkpoints/:id ───────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM puntos_control WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Checkpoint no encontrado.' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('[checkpoints] DELETE /:id', err);
    res.status(500).json({ message: 'Error al eliminar el checkpoint.' });
  }
});

export default router;

// ── GET /api/routes/:id/checkpoints ───────────────────────────────────────
// Exported separately and mounted in index.ts as routeCheckpointsRouter
export const routeCheckpointsRouter = Router();

routeCheckpointsRouter.get('/:id/checkpoints', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM puntos_control WHERE ruta_id = ? ORDER BY orden ASC',
      [id]
    );
    res.json(rows.map(mapRow));
  } catch (err) {
    console.error('[checkpoints] GET /routes/:id/checkpoints', err);
    res.status(500).json({ message: 'Error al obtener los checkpoints.' });
  }
});
