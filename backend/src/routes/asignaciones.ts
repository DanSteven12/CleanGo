// backend/src/routes/asignaciones.ts
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { NotificationService } from '../modules/notifications';
import * as NotificationMessages from '../constants/notificationMessages';

const router = Router();

// ── GET /api/asignaciones/camiones ────────────────────────────────────────
router.get('/camiones', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, numero_economico, placa
       FROM camiones
       ORDER BY numero_economico ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[asignaciones] GET /camiones:', err);
    res.status(500).json({ message: 'Error al obtener los camiones de la base de datos.' });
  }
});

// ── GET /api/asignaciones/conductores ─────────────────────────────────────
router.get('/conductores', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre_completo FROM conductores ORDER BY nombre_completo ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('[asignaciones] GET /conductores:', err);
    res.status(500).json({ message: 'Error al obtener los conductores de la base de datos.' });
  }
});

// ── GET /api/asignaciones ─────────────────────────────────────────────────
// Lista todas las asignaciones con datos de ruta, camión y conductor (JOIN).
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        ar.id,
        ar.ruta_id,
        ar.camion_id,
        ar.conductor_id,
        ar.fecha_programada,
        ar.horario_inicio,
        ar.horario_fin,
        ar.estatus_recorrido,
        r.nombre        AS ruta_nombre,
        r.color         AS ruta_color,
        c.numero_economico,
        c.placa,
        d.nombre_completo AS conductor_nombre
      FROM asignaciones_rutas ar
      INNER JOIN rutas r       ON r.id = ar.ruta_id
      INNER JOIN camiones c    ON c.id = ar.camion_id
      INNER JOIN conductores d ON d.id = ar.conductor_id
      ORDER BY ar.fecha_programada DESC, ar.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[asignaciones] GET /:', err);
    res.status(500).json({ message: 'Error al obtener las asignaciones.' });
  }
});

// ── GET /api/asignaciones/:id ─────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        ar.id,
        ar.ruta_id,
        ar.camion_id,
        ar.conductor_id,
        ar.fecha_programada,
        ar.horario_inicio,
        ar.horario_fin,
        ar.estatus_recorrido,
        r.nombre        AS ruta_nombre,
        r.color         AS ruta_color,
        c.numero_economico,
        c.placa,
        d.nombre_completo AS conductor_nombre
      FROM asignaciones_rutas ar
      INNER JOIN rutas r       ON r.id = ar.ruta_id
      INNER JOIN camiones c    ON c.id = ar.camion_id
      INNER JOIN conductores d ON d.id = ar.conductor_id
      WHERE ar.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('[asignaciones] GET /:id:', err);
    res.status(500).json({ message: 'Error al obtener la asignación.' });
  }
});

// ── POST /api/asignaciones ────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const {
    ruta_id,
    camion_id,
    conductor_id,
    fecha_programada,
    horario_inicio,
    horario_fin,
    estatus_recorrido,
  } = req.body as {
    ruta_id: number;
    camion_id: number;
    conductor_id: number;
    fecha_programada: string;
    horario_inicio: string;
    horario_fin: string;
    estatus_recorrido?: string;
  };

  if (!ruta_id)          return res.status(400).json({ message: 'La ruta es obligatoria.' });
  if (!camion_id)        return res.status(400).json({ message: 'El camión es obligatorio.' });
  if (!conductor_id)     return res.status(400).json({ message: 'El conductor es obligatorio.' });
  if (!fecha_programada) return res.status(400).json({ message: 'La fecha programada es obligatoria.' });
  if (!horario_inicio)   return res.status(400).json({ message: 'El horario de inicio es obligatorio.' });
  if (!horario_fin)      return res.status(400).json({ message: 'El horario de fin es obligatorio.' });

  const resolvedEstatus = estatus_recorrido ?? 'Pendiente';

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO asignaciones_rutas (ruta_id, camion_id, conductor_id, fecha_programada, horario_inicio, horario_fin, estatus_recorrido)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ruta_id, camion_id, conductor_id, fecha_programada, horario_inicio, horario_fin, resolvedEstatus]
    );

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        ar.id, ar.ruta_id, ar.camion_id, ar.conductor_id,
        ar.fecha_programada,
        ar.horario_inicio,
        ar.horario_fin,
        ar.estatus_recorrido,
        r.nombre AS ruta_nombre, r.color AS ruta_color,
        c.numero_economico, c.placa,
        d.nombre_completo AS conductor_nombre
      FROM asignaciones_rutas ar
      INNER JOIN rutas r       ON r.id = ar.ruta_id
      INNER JOIN camiones c    ON c.id = ar.camion_id
      INNER JOIN conductores d ON d.id = ar.conductor_id
      WHERE ar.id = ?
    `, [result.insertId]);

    res.status(201).json(rows[0]);

    // ── Notificación automática: nueva ruta asignada al conductor ─────────
    // Se lanza de forma no bloqueante después de la respuesta exitosa.
    NotificationService.crear({
      conductor_id,
      ...NotificationMessages.RUTA_ASIGNADA,
      tipo: 'AUTOMATICA',
      categoria: 'RUTA',
    }).catch((err) =>
      console.error('[asignaciones] Error al crear notificación RUTA_ASIGNADA:', err)
    );
  } catch (err: any) {
    console.error('[asignaciones] POST /:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({
        message: 'Error de validación: La ruta, el camión o el conductor seleccionado no existen.',
      });
    }
    res.status(500).json({ message: 'Error interno del servidor al guardar la asignación.' });
  }
});

// ── PUT /api/asignaciones/:id ─────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    ruta_id,
    camion_id,
    conductor_id,
    fecha_programada,
    horario_inicio,
    horario_fin,
    estatus_recorrido,
  } = req.body as {
    ruta_id?: number;
    camion_id?: number;
    conductor_id?: number;
    fecha_programada?: string;
    horario_inicio?: string;
    horario_fin?: string;
    estatus_recorrido?: string;
  };

  try {
    // Cargar registro actual
    const [current] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM asignaciones_rutas WHERE id = ?', [id]
    );
    if ((current as RowDataPacket[]).length === 0) {
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }
    const existing = (current as RowDataPacket[])[0];

    await pool.execute(
      `UPDATE asignaciones_rutas
         SET ruta_id           = ?,
             camion_id         = ?,
             conductor_id      = ?,
             fecha_programada  = ?,
             horario_inicio    = ?,
             horario_fin       = ?,
             estatus_recorrido = ?
       WHERE id = ?`,
      [
        ruta_id           ?? existing.ruta_id,
        camion_id         ?? existing.camion_id,
        conductor_id      ?? existing.conductor_id,
        fecha_programada  ?? existing.fecha_programada,
        horario_inicio    ?? existing.horario_inicio,
        horario_fin       ?? existing.horario_fin,
        estatus_recorrido ?? existing.estatus_recorrido,
        id,
      ]
    );

    const [updated] = await pool.query<RowDataPacket[]>(`
      SELECT
        ar.id, ar.ruta_id, ar.camion_id, ar.conductor_id,
        ar.fecha_programada,
        ar.horario_inicio,
        ar.horario_fin,
        ar.estatus_recorrido,
        r.nombre AS ruta_nombre, r.color AS ruta_color,
        c.numero_economico, c.placa,
        d.nombre_completo AS conductor_nombre
      FROM asignaciones_rutas ar
      INNER JOIN rutas r       ON r.id = ar.ruta_id
      INNER JOIN camiones c    ON c.id = ar.camion_id
      INNER JOIN conductores d ON d.id = ar.conductor_id
      WHERE ar.id = ?
    `, [id]);

    res.json((updated as RowDataPacket[])[0]);
  } catch (err: any) {
    console.error('[asignaciones] PUT /:id:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({
        message: 'Error de validación: La ruta, el camión o el conductor seleccionado no existen.',
      });
    }
    res.status(500).json({ message: 'Error interno al actualizar la asignación.' });
  }
});

// ── DELETE /api/asignaciones/:id ──────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM asignaciones_rutas WHERE id = ?', [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('[asignaciones] DELETE /:id:', err);
    res.status(500).json({ message: 'Error al eliminar la asignación.' });
  }
});

export default router;
