// backend/src/routes/crearRuta.ts
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader } from 'mysql2';
import { sanitizeText } from '../utils/sanitize';

const router = Router();

interface CheckpointInput {
  latitude: number;
  longitude: number;
  route_order: number;
  name?: string;
}

interface CrearRutaBody {
  ruta: {
    nombre: string;
    descripcion?: string;
    color?: string;
  };
  checkpoints: CheckpointInput[];
}

// ── POST /api/crear-ruta ───────────────────────────────────────────────────
// Crea la ruta y sus puntos de control en una única transacción atómica.
// La asignación de camión/conductor se gestiona de forma independiente
// desde el módulo "Asignación de Rutas".
router.post('/', async (req: Request, res: Response) => {
  const { ruta, checkpoints } = req.body as CrearRutaBody;

  // ── Validaciones ────────────────────────────────────────────────────────
  const sanitizedNombre = sanitizeText(ruta?.nombre);
  const sanitizedDescripcion = sanitizeText(ruta?.descripcion);
  const sanitizedColor = sanitizeText(ruta?.color);

  if (!sanitizedNombre || typeof sanitizedNombre !== 'string' || sanitizedNombre.trim() === '') {
    return res.status(400).json({ success: false, message: 'El campo "nombre" de la ruta es obligatorio.' });
  }

  if (sanitizedNombre.trim().length > 50) {
    return res.status(400).json({ success: false, message: 'El nombre de la ruta no puede exceder los 50 caracteres.' });
  }

  if (sanitizedDescripcion && sanitizedDescripcion.trim().length > 200) {
    return res.status(400).json({ success: false, message: 'La descripción no puede exceder los 200 caracteres.' });
  }

  if (!Array.isArray(checkpoints) || checkpoints.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Debes agregar al menos dos puntos de control para crear una ruta.',
    });
  }

  // Validar nombres de checkpoints
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

  // Validar nombre duplicado de ruta
  const [existingNames] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM rutas WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?))',
    [sanitizedNombre.trim()]
  );
  if (existingNames.length > 0) {
    return res.status(400).json({ success: false, message: 'Ya existe una ruta registrada con este nombre.' });
  }

  const resolvedColor = sanitizedColor ?? '#3498db';

  // ── Transacción ────────────────────────────────────────────────────────
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insertar ruta
    const [rutaResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO rutas (nombre, descripcion, color)
       VALUES (?, ?, ?)`,
      [
        sanitizedNombre.trim(),
        sanitizedDescripcion?.trim() ?? null,
        resolvedColor,
      ]
    );
    const rutaId = rutaResult.insertId;

    // 2. Insertar puntos de control (si hay)
    if (Array.isArray(checkpoints) && checkpoints.length > 0) {
      for (const cp of checkpoints) {
        const sanitizedCpName = sanitizeText(cp.name);
        const nombre = sanitizedCpName?.trim() || `Checkpoint ${cp.route_order}`;
        await conn.execute(
          'INSERT INTO puntos_control (ruta_id, nombre, latitud, longitud, orden) VALUES (?, ?, ?, ?, ?)',
          [rutaId, nombre, cp.latitude, cp.longitude, cp.route_order]
        );
      }
    }

    await conn.commit();

    res.status(201).json({
      message: 'Ruta creada exitosamente.',
      ruta_id: rutaId,
      checkpoints_insertados: Array.isArray(checkpoints) ? checkpoints.length : 0,
    });
  } catch (err: any) {
    await conn.rollback();
    console.error('[crearRuta] POST / — transacción fallida:', err);
    res.status(500).json({ message: 'Error interno al crear la ruta. Se revirtió la transacción.' });
  } finally {
    conn.release();
  }
});

export default router;
