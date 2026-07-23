import { Router } from 'express';
import { pool, query } from '../db';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const router = Router();

// ==========================================
// OBTENER TODOS LOS CAMIONES
// ==========================================
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.id, 
        c.numero_economico, 
        c.placa, 
        c.gps_instalado, 
        c.usuario_dispositivo, 
        c.created_at
      FROM camiones c
      ORDER BY c.numero_economico ASC
    `;
    const camiones = await query(sql);

    const result = camiones.map((camion: any) => ({
      id: camion.id,
      numero_economico: camion.numero_economico,
      placa: camion.placa,
      gps_instalado: camion.gps_instalado,
      usuario_dispositivo: camion.usuario_dispositivo,
      created_at: camion.created_at
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching camiones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// CREAR UN CAMIÓN
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { numero_economico, placa, usuario_dispositivo, password_dispositivo } = req.body;

    if (!numero_economico || !placa || !usuario_dispositivo || !password_dispositivo) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Check if unique constraints are met
    const [existing] = await query(
      'SELECT id FROM camiones WHERE numero_economico = ? OR placa = ? OR usuario_dispositivo = ? LIMIT 1',
      [numero_economico, placa, usuario_dispositivo]
    );

    if (existing) {
      return res.status(400).json({ error: 'El número económico, placa o usuario ya están en uso' });
    }

    const hashedPassword = await bcrypt.hash(password_dispositivo, SALT_ROUNDS);

    const sql = `
      INSERT INTO camiones (numero_economico, placa, gps_instalado, usuario_dispositivo, password_dispositivo)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result]: any = await pool.query(sql, [numero_economico, placa, 1, usuario_dispositivo, hashedPassword]);

    res.status(201).json({ message: 'Camión registrado exitosamente', id: result.insertId });
  } catch (error) {
    console.error('Error creating camion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// OBTENER UN CAMIÓN (DETALLE)
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const sql = `
      SELECT id, numero_economico, placa, gps_instalado, usuario_dispositivo, created_at
      FROM camiones
      WHERE id = ?
    `;
    const [camion] = await query(sql, [req.params.id]);

    if (!camion) {
      return res.status(404).json({ error: 'Camión no encontrado' });
    }

    res.json(camion);
  } catch (error) {
    console.error('Error fetching camion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// EDITAR UN CAMIÓN
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const camionId = req.params.id;
    const { numero_economico, placa, usuario_dispositivo } = req.body;

    if (!numero_economico || !placa || !usuario_dispositivo) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Check unique constraints for other records
    const [existing] = await query(
      'SELECT id FROM camiones WHERE (numero_economico = ? OR placa = ? OR usuario_dispositivo = ?) AND id != ? LIMIT 1',
      [numero_economico, placa, usuario_dispositivo, camionId]
    );

    if (existing) {
      return res.status(400).json({ error: 'El número económico, placa o usuario ya están en uso' });
    }

    const sql = `
      UPDATE camiones 
      SET numero_economico = ?, placa = ?, usuario_dispositivo = ?
      WHERE id = ?
    `;
    await query(sql, [numero_economico, placa, usuario_dispositivo, camionId]);

    res.json({ message: 'Camión actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating camion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// CAMBIAR CONTRASEÑA DEL DISPOSITIVO
// ==========================================
router.put('/:id/password', async (req, res) => {
  try {
    const camionId = req.params.id;
    const { nueva_password } = req.body;

    if (!nueva_password) {
      return res.status(400).json({ error: 'La nueva contraseña es obligatoria' });
    }

    const hashedPassword = await bcrypt.hash(nueva_password, SALT_ROUNDS);

    await query('UPDATE camiones SET password_dispositivo = ? WHERE id = ?', [hashedPassword, camionId]);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating camion password:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// OBTENER HISTORIAL DE RECORRIDOS DE UN CAMIÓN
// ==========================================
router.get('/:id/recorridos', async (req, res) => {
  try {
    const sql = `
      SELECT 
        r.id AS recorrido_id,
        rt.nombre AS ruta_nombre,
        ar.fecha_programada,
        r.hora_inicio,
        r.hora_fin,
        r.estado,
        r.conductor_real_nombre
      FROM recorridos r
      JOIN asignaciones_rutas ar ON r.asignacion_id = ar.id
      JOIN rutas rt ON ar.ruta_id = rt.id
      WHERE ar.camion_id = ?
      ORDER BY r.hora_inicio DESC
    `;
    const recorridos = await query(sql, [req.params.id]);

    const result = recorridos.map((r: any) => {
      let duracion = null;
      if (r.hora_inicio && r.hora_fin) {
        const diffMs = new Date(r.hora_fin).getTime() - new Date(r.hora_inicio).getTime();
        const diffMins = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        duracion = `${hours}h ${mins}m`;
      }

      return {
        id: r.recorrido_id,
        ruta: r.ruta_nombre,
        fecha_programada: r.fecha_programada,
        hora_inicio: r.hora_inicio,
        hora_fin: r.hora_fin,
        duracion,
        estado: r.estado,
        conductor: r.conductor_real_nombre
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching camion recorridos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
