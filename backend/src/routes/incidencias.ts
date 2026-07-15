// backend/src/routes/incidencias.ts
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const router = Router();

// Tipos que representan cambios permanentes (no resolubles)
const TIPOS_PERMANENTES = ['Reprogramación', 'Cambio de horario'] as const;
type TipoPermanente = typeof TIPOS_PERMANENTES[number];

function esTipoPermanente(tipo: string): tipo is TipoPermanente {
  return (TIPOS_PERMANENTES as readonly string[]).includes(tipo);
}

/**
 * Dado un horario_inicio (HH:MM:SS) y una duración en minutos,
 * devuelve el horario_fin correspondiente en formato HH:MM:SS.
 */
function calcularHoraFin(horaInicio: string, duracionMinutos: number): string {
  const [h, m, s] = horaInicio.split(':').map(Number);
  const totalMinutos = h * 60 + m + duracionMinutos;
  const finH = Math.floor(totalMinutos / 60) % 24;
  const finM = totalMinutos % 60;
  const finS = s || 0;
  return [
    String(finH).padStart(2, '0'),
    String(finM).padStart(2, '0'),
    String(finS).padStart(2, '0'),
  ].join(':');
}

/**
 * Calcula la duración en minutos entre dos tiempos HH:MM:SS.
 */
function calcularDuracionMinutos(horaInicio: string, horaFin: string): number {
  const [hi, mi] = horaInicio.split(':').map(Number);
  const [hf, mf] = horaFin.split(':').map(Number);
  let duracion = (hf * 60 + mf) - (hi * 60 + mi);
  if (duracion < 0) {
    duracion += 24 * 60; // Si cruza la medianoche, sumamos 24 horas
  }
  return duracion;
}

// ── GET /api/incidencias ──────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT i.*, 
             a.ruta_id, r.nombre as ruta_nombre,
             a.camion_id, c.numero_economico as camion_numero,
             a.conductor_id, co.nombre_completo as conductor_nombre,
             a.fecha as fecha_programada
      FROM incidencias_calendario i
      JOIN asignaciones_rutas a ON i.asignacion_id = a.id
      JOIN rutas r ON a.ruta_id = r.id
      JOIN camiones c ON a.camion_id = c.id
      JOIN conductores co ON a.conductor_id = co.id
      ORDER BY i.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[incidencias] GET /', err);
    res.status(500).json({ message: 'Error al obtener las incidencias.' });
  }
});

// ── POST /api/incidencias ─────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { asignacion_id, tipo, motivo, fecha_nueva, hora_nueva, descripcion } = req.body;

  if (!asignacion_id || !tipo || !motivo) {
    return res.status(400).json({ message: 'asignacion_id, tipo y motivo son obligatorios.' });
  }

  // Validaciones condicionales según el tipo
  if (tipo === 'Reprogramación') {
    if (!fecha_nueva || !hora_nueva) {
      return res.status(400).json({ message: 'Reprogramación requiere nueva fecha y nueva hora.' });
    }
  } else if (tipo === 'Cambio de horario') {
    if (!hora_nueva) {
      return res.status(400).json({ message: 'Cambio de horario requiere nueva hora.' });
    }
  }

  try {
    // Obtener la asignación actual para calcular la duración original
    const [asignaciones] = await pool.query<RowDataPacket[]>(
      'SELECT id, fecha, hora_inicio, hora_fin FROM asignaciones_rutas WHERE id = ?',
      [asignacion_id]
    );
    if (asignaciones.length === 0) {
      return res.status(404).json({ message: 'La asignación especificada no existe.' });
    }
    const asignacion = asignaciones[0];

    // Validar si ya existe una incidencia activa o aplicada para esta asignación
    const [activas] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM incidencias_calendario WHERE asignacion_id = ? AND estatus IN ('Activa', 'Aplicada')",
      [asignacion_id]
    );
    if (activas.length > 0) {
      return res.status(400).json({ message: 'Ya existe una incidencia activa o aplicada para esta asignación.' });
    }

    // ── Aplicar cambios permanentes sobre la asignación ───────────────────────
    if (esTipoPermanente(tipo)) {
      // Calcular duración original en minutos
      const duracionMinutos = calcularDuracionMinutos(
        asignacion.hora_inicio,
        asignacion.hora_fin
      );

      // Determinar nueva fecha y nuevo horario_inicio
      const nuevaFecha = tipo === 'Reprogramación'
        ? fecha_nueva
        : asignacion.fecha; // Cambio de horario conserva la misma fecha

      // hora_nueva puede venir como "HH:MM" (sin segundos), normalizar
      const horaInicioNormalizada = hora_nueva.length === 5
        ? `${hora_nueva}:00`
        : hora_nueva;

      // Recalcular horario_fin conservando la duración original
      const nuevaHoraFin = calcularHoraFin(horaInicioNormalizada, duracionMinutos);

      await pool.execute(
        `UPDATE asignaciones_rutas
           SET fecha       = ?,
               hora_inicio = ?,
               hora_fin    = ?
         WHERE id = ?`,
        [nuevaFecha, horaInicioNormalizada, nuevaHoraFin, asignacion_id]
      );
    }

    // Insertar la incidencia — permanentes quedan como 'Aplicada' (ya se refleja en la asignación),
    // temporales quedan como 'Activa' hasta que el admin las resuelva.
    const estatusInicial = esTipoPermanente(tipo) ? 'Aplicada' : 'Activa';
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO incidencias_calendario (asignacion_id, tipo, motivo, fecha_nueva, hora_nueva, descripcion, estatus, fecha_original, hora_inicio_original, hora_fin_original)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        asignacion_id,
        tipo,
        motivo,
        fecha_nueva || null,
        hora_nueva || null,
        descripcion || null,
        estatusInicial,
        asignacion.fecha,
        asignacion.hora_inicio,
        asignacion.hora_fin,
      ]
    );

    const [newRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM incidencias_calendario WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(newRows[0]);
  } catch (err) {
    console.error('[incidencias] POST /', err);
    res.status(500).json({ message: 'Error al crear la incidencia.' });
  }
});

// ── PUT /api/incidencias/:id ──────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tipo, motivo, fecha_nueva, hora_nueva, descripcion, estatus } = req.body;

  try {
    const [current] = await pool.query<RowDataPacket[]>('SELECT * FROM incidencias_calendario WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({ message: 'Incidencia no encontrada.' });
    }
    const existing = current[0];

    const newTipo = tipo ?? existing.tipo;
    const newMotivo = motivo ?? existing.motivo;
    const newFecha = fecha_nueva !== undefined ? fecha_nueva : existing.fecha_nueva;
    const newHora = hora_nueva !== undefined ? hora_nueva : existing.hora_nueva;
    const newDesc = descripcion !== undefined ? descripcion : existing.descripcion;

    // Las incidencias permanentes no pueden cambiar su estatus a Resuelta;
    // su estado final siempre es 'Aplicada' (el cambio ya fue escrito en la asignación).
    const newEstatus = esTipoPermanente(newTipo)
      ? 'Aplicada'
      : (estatus ?? existing.estatus);

    // Validaciones condicionales
    if (newTipo === 'Reprogramación' && (!newFecha || !newHora)) {
      return res.status(400).json({ message: 'Reprogramación requiere nueva fecha y nueva hora.' });
    } else if (newTipo === 'Cambio de horario' && !newHora) {
      return res.status(400).json({ message: 'Cambio de horario requiere nueva hora.' });
    }

    // Validar duplicidad si se reactiva (Activa o Aplicada)
    if ((newEstatus === 'Activa' || newEstatus === 'Aplicada') &&
        existing.estatus !== 'Activa' && existing.estatus !== 'Aplicada') {
      const [activas] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM incidencias_calendario WHERE asignacion_id = ? AND estatus IN ('Activa', 'Aplicada') AND id != ?",
        [existing.asignacion_id, id]
      );
      if (activas.length > 0) {
        return res.status(400).json({ message: 'Ya existe otra incidencia activa o aplicada para esta asignación.' });
      }
    }

    await pool.execute(
      `UPDATE incidencias_calendario
       SET tipo = ?, motivo = ?, fecha_nueva = ?, hora_nueva = ?, descripcion = ?, estatus = ?
       WHERE id = ?`,
      [newTipo, newMotivo, newFecha || null, newHora || null, newDesc || null, newEstatus, id]
    );

    const [updated] = await pool.query<RowDataPacket[]>('SELECT * FROM incidencias_calendario WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('[incidencias] PUT /:id', err);
    res.status(500).json({ message: 'Error al actualizar la incidencia.' });
  }
});

// ── PUT /api/incidencias/:id/resolver ─────────────────────────────────────────
router.put('/:id/resolver', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [current] = await pool.query<RowDataPacket[]>('SELECT * FROM incidencias_calendario WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({ message: 'Incidencia no encontrada.' });
    }

    const incidencia = current[0];

    // Bloquear resolución de incidencias permanentes
    if (esTipoPermanente(incidencia.tipo)) {
      return res.status(403).json({
        message: `Las incidencias de tipo "${incidencia.tipo}" son cambios definitivos y no pueden resolverse. Quedan registradas como historial permanente.`,
      });
    }

    if (incidencia.estatus === 'Resuelta') {
      return res.status(400).json({ message: 'La incidencia ya está resuelta.' });
    }

    await pool.execute("UPDATE incidencias_calendario SET estatus = 'Resuelta' WHERE id = ?", [id]);

    const [updated] = await pool.query<RowDataPacket[]>('SELECT * FROM incidencias_calendario WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('[incidencias] PUT /:id/resolver', err);
    res.status(500).json({ message: 'Error al resolver la incidencia.' });
  }
});

// ── DELETE /api/incidencias/:id ───────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM incidencias_calendario WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Incidencia no encontrada.' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('[incidencias] DELETE /:id', err);
    res.status(500).json({ message: 'Error al eliminar la incidencia.' });
  }
});

export default router;
