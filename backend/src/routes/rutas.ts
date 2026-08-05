import { Router, Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sanitizeText } from '../utils/sanitize';
import { checkRouteEditable, getEditableStatusFromCounts } from '../utils/routeValidation';

const router = Router();

// ── GET /api/rutas ─────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        r.*,
        SUM(CASE WHEN ar.estatus_recorrido = 'En progreso' THEN 1 ELSE 0 END) as en_progreso_count,
        SUM(CASE WHEN ar.estatus_recorrido = 'Pendiente' THEN 1 ELSE 0 END) as pendiente_count
      FROM rutas r
      LEFT JOIN asignaciones_rutas ar ON r.id = ar.ruta_id
      GROUP BY r.id
      ORDER BY r.id ASC
    `);
    
    const mapped = rows.map(r => {
      const { en_progreso_count, pendiente_count, ...rest } = r;
      return {
        ...rest,
        ...getEditableStatusFromCounts(Number(pendiente_count || 0), Number(en_progreso_count || 0))
      };
    });
    
    res.json(mapped);
  } catch (err) {
    console.error('[rutas] GET /', err);
    res.status(500).json({ message: 'Error al obtener las rutas.' });
  }
});

// ── GET /api/rutas/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const rutaId = Number(id);
  if (!Number.isFinite(rutaId) || rutaId <= 0) {
    return res.status(400).json({ success: false, message: 'ID de ruta inválido.' });
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         r.*,
         SUM(CASE WHEN ar.estatus_recorrido = 'En progreso' THEN 1 ELSE 0 END) as en_progreso_count,
         SUM(CASE WHEN ar.estatus_recorrido = 'Pendiente' THEN 1 ELSE 0 END) as pendiente_count
       FROM rutas r
       LEFT JOIN asignaciones_rutas ar ON r.id = ar.ruta_id
       WHERE r.id = ?
       GROUP BY r.id`,
      [rutaId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ruta no encontrada.' });
    }
    
    const { en_progreso_count, pendiente_count, ...rest } = rows[0];
    const editableStatus = getEditableStatusFromCounts(Number(pendiente_count || 0), Number(en_progreso_count || 0));
    
    res.json({ ...rest, ...editableStatus });
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
    return res.status(400).json({ success: false, message: 'El campo "nombre" es obligatorio.' });
  }

  if (nombre.trim().length > 50) {
    return res.status(400).json({ success: false, message: 'El nombre de la ruta no puede exceder los 50 caracteres.' });
  }

  // Validar nombre duplicado
  const [existingNames] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM rutas WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?))',
    [nombre.trim()]
  );
  if (existingNames.length > 0) {
    return res.status(400).json({ success: false, message: 'Ya existe una ruta registrada con este nombre.' });
  }

  const resolvedColor = color ?? '#3498db';

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
  const rutaId = Number(id);
  if (!Number.isFinite(rutaId) || rutaId <= 0) {
    return res.status(400).json({ success: false, message: 'ID de ruta inválido.' });
  }

  const nombre = sanitizeText(req.body.nombre);
  const descripcion = sanitizeText(req.body.descripcion);
  const color = sanitizeText(req.body.color);
  const checkpoints = req.body.checkpoints;

  if (nombre !== undefined && nombre.trim() === '') {
    return res.status(400).json({ success: false, message: 'El campo "nombre" no puede estar vacío.' });
  }

  if (nombre !== undefined && nombre.trim().length > 50) {
    return res.status(400).json({ success: false, message: 'El nombre de la ruta no puede exceder los 50 caracteres.' });
  }

  if (descripcion !== undefined && descripcion !== null && descripcion.trim().length > 200) {
    return res.status(400).json({ success: false, message: 'La descripción no puede exceder los 200 caracteres.' });
  }

  // Si se envían checkpoints, comprobar que haya al menos 2
  if (checkpoints !== undefined) {
    if (!Array.isArray(checkpoints) || checkpoints.length < 2) {
      return res.status(400).json({ success: false, message: 'Debes incluir al menos dos puntos de control para la ruta.' });
    }

    const cpNames: string[] = [];
    for (const cp of checkpoints) {
      if (cp.name !== undefined) {
        const trimmedName = cp.name.trim();
        if (trimmedName.length === 0) {
          return res.status(400).json({ success: false, message: 'El nombre de un punto de control no puede estar vacío.' });
        }
        if (trimmedName.length > 50) {
          return res.status(400).json({ success: false, message: 'El nombre de un punto de control no puede exceder los 50 caracteres.' });
        }
        const lowerName = trimmedName.toLowerCase();
        if (cpNames.includes(lowerName)) {
          return res.status(400).json({ success: false, message: `Ya existe un punto de control con el nombre "${trimmedName}" en esta ruta.` });
        }
        cpNames.push(lowerName);
      }
    }
  }

  try {
    // Validar regla de negocio
    const status = await checkRouteEditable(rutaId);
    if (!status.editable) {
      return res.status(422).json({ success: false, message: status.notEditableReason });
    }

    // Fetch current record
    const [current] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rutas WHERE id = ?',
      [rutaId]
    );
    if (current.length === 0) {
      return res.status(404).json({ success: false, message: 'Ruta no encontrada.' });
    }

    const existing = current[0];

    // Validar si el nuevo nombre choca con otra ruta
    if (nombre !== undefined && nombre.trim() !== '') {
      const [dup] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM rutas WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) AND id != ?',
        [nombre.trim(), rutaId]
      );
      if (dup.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya existe otra ruta registrada con este nombre.' });
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE rutas
           SET nombre          = ?,
               descripcion     = ?,
               color           = ?
         WHERE id = ?`,
        [
          nombre !== undefined ? nombre.trim() : existing.nombre,
          descripcion !== undefined ? (descripcion?.trim() || null) : existing.descripcion,
          color ?? existing.color,
          rutaId,
        ]
      );

      // Si se envían checkpoints, sincronizarlos
      if (Array.isArray(checkpoints)) {
        // Borrar anteriores
        await conn.execute('DELETE FROM puntos_control WHERE ruta_id = ?', [rutaId]);
        
        // Insertar nuevos
        for (const cp of checkpoints) {
          const sanitizedCpName = sanitizeText(cp.name);
          const cpNombre = sanitizedCpName?.trim() || `Checkpoint ${cp.route_order}`;
          await conn.execute(
            'INSERT INTO puntos_control (ruta_id, nombre, latitud, longitud, orden) VALUES (?, ?, ?, ?, ?)',
            [rutaId, cpNombre, cp.latitude, cp.longitude, cp.route_order]
          );
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [updated] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rutas WHERE id = ?',
      [rutaId]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error('[rutas] PUT /:id', err);
    res.status(500).json({ message: 'Error al actualizar la ruta.' });
  }
});

// ── DELETE /api/rutas/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const rutaId = Number(id);
  if (!Number.isFinite(rutaId) || rutaId <= 0) {
    return res.status(400).json({ success: false, message: 'ID de ruta inválido.' });
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM rutas WHERE id = ?',
      [rutaId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ruta no encontrada.' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('[rutas] DELETE /:id', err);
    res.status(500).json({ message: 'Error al eliminar la ruta.' });
  }
});

export default router;
