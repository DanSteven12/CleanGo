import { Router } from 'express';
import { query } from '../db';
import { mobileAuthMiddleware } from '../middlewares/mobileAuthMiddleware';

const router = Router();

// Todas las rutas de zonas de interés están protegidas para usuarios móviles (ciudadanos)
router.use(mobileAuthMiddleware);

// Límite máximo de zonas por ciudadano
const MAX_ZONAS = 3;

// ── GET /api/ciudadano/zonas ────────────────────────────────────────────────
// Listar todas las zonas del ciudadano autenticado
router.get('/', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const sql = `
      SELECT id, alias, latitud, longitud, activo, created_at, updated_at
      FROM zonas_interes
      WHERE usuario_id = ?
      ORDER BY created_at ASC
    `;
    const zonas = await query(sql, [usuarioId]);
    res.json(zonas);
  } catch (error) {
    console.error('Error fetching zonas de interés:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/ciudadano/zonas ───────────────────────────────────────────────
// Crear una nueva zona de interés
router.post('/', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    let { alias, latitud, longitud } = req.body;

    // Validación básica
    if (!latitud || !longitud) {
      return res.status(400).json({ error: 'Latitud y longitud son requeridas' });
    }

    latitud = Number(latitud);
    longitud = Number(longitud);

    if (isNaN(latitud) || latitud < -90 || latitud > 90) {
      return res.status(400).json({ error: 'Latitud inválida' });
    }
    if (isNaN(longitud) || longitud < -180 || longitud > 180) {
      return res.status(400).json({ error: 'Longitud inválida' });
    }

    if (!alias || typeof alias !== 'string' || alias.trim() === '') {
      alias = 'Mi Domicilio';
    } else {
      alias = alias.trim().substring(0, 50); // MAX 50 chars
    }

    // Verificar límite de zonas
    const countSql = `SELECT COUNT(*) as total FROM zonas_interes WHERE usuario_id = ?`;
    const countResult = await query(countSql, [usuarioId]);
    if (countResult[0].total >= MAX_ZONAS) {
      return res.status(400).json({ error: `No puedes crear más de ${MAX_ZONAS} zonas de interés` });
    }

    // Insertar
    const insertSql = `
      INSERT INTO zonas_interes (usuario_id, alias, latitud, longitud)
      VALUES (?, ?, ?, ?)
    `;
    const result = await query(insertSql, [usuarioId, alias, latitud, longitud]);

    res.status(201).json({
      message: 'Zona creada exitosamente',
      id: result.insertId,
      alias,
      latitud,
      longitud,
      activo: 1
    });

  } catch (error: any) {
    // Manejar error de UNIQUE (duplicado)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya tienes una zona registrada con estas coordenadas exactas.' });
    }
    console.error('Error creando zona de interés:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── PUT /api/ciudadano/zonas/:id ────────────────────────────────────────────
// Actualizar una zona existente
router.put('/:id', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    const zonaId = req.params.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { alias, latitud, longitud, activo } = req.body;

    // Obtener la zona actual para asegurarnos de que existe y pertenece al usuario (Anti-IDOR)
    const existing = await query(
      'SELECT * FROM zonas_interes WHERE id = ? AND usuario_id = ?',
      [zonaId, usuarioId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Zona no encontrada o no te pertenece' });
    }

    let updatedAlias = existing[0].alias;
    let updatedLat = existing[0].latitud;
    let updatedLng = existing[0].longitud;
    let updatedActivo = existing[0].activo;

    if (alias !== undefined) {
      updatedAlias = String(alias).trim().substring(0, 50);
      if (updatedAlias === '') updatedAlias = 'Mi Domicilio';
    }

    if (latitud !== undefined) {
      const lat = Number(latitud);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ error: 'Latitud inválida' });
      }
      updatedLat = lat;
    }

    if (longitud !== undefined) {
      const lng = Number(longitud);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Longitud inválida' });
      }
      updatedLng = lng;
    }

    if (activo !== undefined) {
      updatedActivo = activo ? 1 : 0;
    }

    const updateSql = `
      UPDATE zonas_interes 
      SET alias = ?, latitud = ?, longitud = ?, activo = ?
      WHERE id = ? AND usuario_id = ?
    `;
    
    await query(updateSql, [updatedAlias, updatedLat, updatedLng, updatedActivo, zonaId, usuarioId]);

    res.json({
      message: 'Zona actualizada exitosamente',
      id: zonaId,
      alias: updatedAlias,
      latitud: updatedLat,
      longitud: updatedLng,
      activo: updatedActivo
    });

  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya tienes otra zona registrada con estas coordenadas exactas.' });
    }
    console.error('Error actualizando zona de interés:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── DELETE /api/ciudadano/zonas/:id ─────────────────────────────────────────
// Eliminar permanentemente una zona
router.delete('/:id', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    const zonaId = req.params.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Eliminar solo si pertenece al usuario (Anti-IDOR)
    const result = await query(
      'DELETE FROM zonas_interes WHERE id = ? AND usuario_id = ?',
      [zonaId, usuarioId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Zona no encontrada o no te pertenece' });
    }

    res.json({ message: 'Zona eliminada correctamente' });

  } catch (error) {
    console.error('Error eliminando zona de interés:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
