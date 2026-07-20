import { Router } from 'express';
import { query } from '../db';

const router = Router();

// ==========================================
// OBTENER TODOS LOS CONDUCTORES
// ==========================================
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT id, nombre_completo, created_at
      FROM conductores
      ORDER BY nombre_completo ASC
    `;
    const conductores = await query(sql);
    res.json(conductores);
  } catch (error) {
    console.error('Error fetching conductores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
