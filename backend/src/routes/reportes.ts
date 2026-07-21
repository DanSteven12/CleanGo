import { Router } from 'express';
import { query } from '../db';

const router = Router();

// ==========================================
// GET /api/reportes/indicadores
// Conteos para las tarjetas del dashboard
// ==========================================
router.get('/indicadores', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(estado = 'Pendiente')  AS pendientes,
        SUM(estado = 'En proceso') AS en_proceso,
        SUM(estado = 'Cerrado')    AS cerrados
      FROM reportes_ciudadanos
    `);

    const row = rows[0];
    res.json({
      total:      Number(row.total),
      pendientes: Number(row.pendientes),
      en_proceso: Number(row.en_proceso),
      cerrados:   Number(row.cerrados),
    });
  } catch (error) {
    console.error('Error fetching indicadores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// GET /api/reportes
// Listado con filtros opcionales:
//   ?estado=   &tipo=   &fecha_desde=   &fecha_hasta=   &search=
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { estado, tipo, fecha_desde, fecha_hasta, search } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: any[] = [];

    if (estado) {
      conditions.push('r.estado = ?');
      params.push(estado);
    }

    if (tipo) {
      conditions.push('r.tipo_reporte = ?');
      params.push(tipo);
    }

    if (fecha_desde) {
      conditions.push('DATE(r.fecha_reporte) >= ?');
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      conditions.push('DATE(r.fecha_reporte) <= ?');
      params.push(fecha_hasta);
    }

    if (search) {
      conditions.push('(r.descripcion LIKE ? OR r.direccion_referencia LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        r.id,
        r.tipo_reporte,
        r.descripcion,
        r.fotografia,
        r.latitud,
        r.longitud,
        r.direccion_referencia,
        r.estado,
        r.fecha_reporte,
        u.nombre AS ciudadano_nombre,
        u.correo AS ciudadano_correo
      FROM reportes_ciudadanos r
      LEFT JOIN usuarios u ON u.id = r.usuario_id
      ${where}
      ORDER BY r.fecha_reporte DESC
    `;

    const reportes = await query(sql, params);
    res.json(reportes);
  } catch (error) {
    console.error('Error fetching reportes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// GET /api/reportes/:id
// Detalle completo de un reporte
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(
      `SELECT
        r.id,
        r.tipo_reporte,
        r.descripcion,
        r.fotografia,
        r.latitud,
        r.longitud,
        r.direccion_referencia,
        r.estado,
        r.fecha_reporte,
        u.nombre AS ciudadano_nombre,
        u.correo AS ciudadano_correo
      FROM reportes_ciudadanos r
      LEFT JOIN usuarios u ON u.id = r.usuario_id
      WHERE r.id = ?`,
      [req.params.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching reporte by id:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// PATCH /api/reportes/:id/estado
// Actualiza ÚNICAMENTE el campo estado
// Estados permitidos: En proceso | Cerrado
// ==========================================
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body as { estado: string };
    const ESTADOS_PERMITIDOS = ['En proceso', 'Cerrado'];

    if (!estado || !ESTADOS_PERMITIDOS.includes(estado)) {
      return res.status(400).json({
        error: `Estado inválido. Los valores permitidos son: ${ESTADOS_PERMITIDOS.join(', ')}`,
      });
    }

    const existing = await query(
      'SELECT id FROM reportes_ciudadanos WHERE id = ?',
      [req.params.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    await query(
      'UPDATE reportes_ciudadanos SET estado = ? WHERE id = ?',
      [estado, req.params.id]
    );

    res.json({ message: 'Estado actualizado correctamente', estado });
  } catch (error) {
    console.error('Error updating reporte estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
