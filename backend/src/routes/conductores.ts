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

// ==========================================
// OBTENER UN CONDUCTOR POR ID
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `SELECT id, nombre_completo, created_at FROM conductores WHERE id = ?`;
    const rows = await query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching conductor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// CREAR CONDUCTOR
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { nombre_completo } = req.body;
    
    if (!nombre_completo || typeof nombre_completo !== 'string' || nombre_completo.trim() === '') {
      return res.status(400).json({ error: 'El nombre completo es obligatorio y no puede estar vacío' });
    }
    
    const nombreLimpio = nombre_completo.trim();
    if (nombreLimpio.length > 150) {
      return res.status(400).json({ error: 'El nombre completo excede el máximo de 150 caracteres' });
    }

    const sql = `INSERT INTO conductores (nombre_completo) VALUES (?)`;
    const result = await query(sql, [nombreLimpio]);
    
    res.status(201).json({ id: result.insertId, message: 'Conductor creado exitosamente' });
  } catch (error) {
    console.error('Error creating conductor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// ACTUALIZAR CONDUCTOR
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo } = req.body;
    
    if (!nombre_completo || typeof nombre_completo !== 'string' || nombre_completo.trim() === '') {
      return res.status(400).json({ error: 'El nombre completo es obligatorio y no puede estar vacío' });
    }
    
    const nombreLimpio = nombre_completo.trim();
    if (nombreLimpio.length > 150) {
      return res.status(400).json({ error: 'El nombre completo excede el máximo de 150 caracteres' });
    }

    const sql = `UPDATE conductores SET nombre_completo = ? WHERE id = ?`;
    const result = await query(sql, [nombreLimpio, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    
    res.json({ message: 'Conductor actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating conductor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// ELIMINAR CONDUCTOR
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar si existe en asignaciones_rutas
    const checkSql = `SELECT COUNT(*) as count FROM asignaciones_rutas WHERE conductor_id = ?`;
    const checkResult = await query(checkSql, [id]);
    
    if (checkResult[0].count > 0) {
      return res.status(409).json({ error: 'El conductor ya forma parte de registros del sistema' });
    }

    const deleteSql = `DELETE FROM conductores WHERE id = ?`;
    const deleteResult = await query(deleteSql, [id]);
    
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    
    res.json({ message: 'Conductor eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting conductor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
