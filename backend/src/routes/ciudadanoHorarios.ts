import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { mobileAuthMiddleware } from '../middlewares/mobileAuthMiddleware';
import type { RowDataPacket } from 'mysql2';

const router = Router();

// Todas las rutas de horarios del ciudadano están protegidas con el middleware de móvil
router.use(mobileAuthMiddleware);

/**
 * GET /api/ciudadano/horarios/rutas
 * Obtiene el catálogo completo de rutas para indexación y búsqueda instantánea en la app móvil.
 */
router.get('/rutas', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, nombre, descripcion, color 
       FROM rutas 
       ORDER BY nombre ASC`
    );

    res.json({ data: rows });
  } catch (error) {
    console.error(`[ciudadano/horarios] GET /rutas:`, error);
    res.status(500).json({ error: 'Error interno al obtener el catálogo de rutas.' });
  }
});

/**
 * GET /api/ciudadano/horarios/buscar?q=...
 * Busca rutas cuya colonia coincida con el parámetro de búsqueda (respaldo/compatibilidad).
 */
router.get('/buscar', async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;
  
  if (!query || query.trim().length < 2) {
    res.json({ data: [] });
    return;
  }

  const searchTerm = `%${query.trim().toLowerCase()}%`;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, nombre, descripcion, color 
       FROM rutas 
       WHERE LOWER(nombre) LIKE ? OR LOWER(descripcion) LIKE ?
       ORDER BY nombre ASC
       LIMIT 25`,
      [searchTerm, searchTerm]
    );

    res.json({ data: rows });
  } catch (error) {
    console.error(`[ciudadano/horarios] GET /buscar:`, error);
    res.status(500).json({ error: 'Error interno al buscar horarios.' });
  }
});

/**
 * GET /api/ciudadano/horarios/rutas/:rutaId
 * Obtiene los horarios programados de una ruta específica.
 */
router.get('/rutas/:rutaId', async (req: Request, res: Response): Promise<void> => {
  const rutaId = Number(req.params.rutaId);

  if (!Number.isFinite(rutaId) || rutaId <= 0) {
    res.status(400).json({ error: 'ID de ruta inválido.' });
    return;
  }

  try {
    // Primero, validar que la ruta existe y traer su info básica
    const [rutas] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, descripcion FROM rutas WHERE id = ?',
      [rutaId]
    );

    if (rutas.length === 0) {
      res.status(404).json({ error: 'Ruta no encontrada.' });
      return;
    }

    const ruta = rutas[0];

    // Luego traer sus horarios base
    const [horarios] = await pool.execute<RowDataPacket[]>(
      `SELECT id, dia_semana, hora_inicio_estimada, hora_fin_estimada
       FROM horarios_rutas
       WHERE ruta_id = ?
       ORDER BY FIELD(dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo') ASC`,
      [rutaId]
    );

    res.json({ 
      ruta: ruta,
      horarios: horarios 
    });
  } catch (error) {
    console.error(`[ciudadano/horarios] GET /rutas/${rutaId}:`, error);
    res.status(500).json({ error: 'Error interno al obtener los detalles de la ruta.' });
  }
});

export default router;
