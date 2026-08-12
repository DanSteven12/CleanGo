import { Router } from 'express';
import { pool, query } from '../db';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const router = Router();

// ==========================================
// FUNCIÓN DE VALIDACIÓN REUTILIZABLE
// ==========================================
const validateCamionInput = (data: any, isEdit = false) => {
  const { numero_economico, placa, usuario_dispositivo, password_dispositivo } = data;
  const errors: string[] = [];

  if (!numero_economico) errors.push('El número económico es obligatorio.');
  else if (!/^[A-Za-z0-9-]{3,10}$/.test(numero_economico)) {
    errors.push('El número económico debe tener entre 3 y 10 caracteres (solo letras, números y guiones).');
  }

  if (!placa) errors.push('La placa es obligatoria.');
  else {
    const p = placa.toUpperCase().trim();
    if (!/^[A-Z0-9-]{5,10}$/.test(p)) {
      errors.push('La placa debe tener entre 5 y 10 caracteres (solo letras, números y guiones).');
    } else if (!/[A-Z]/.test(p) || !/[0-9]/.test(p)) {
      errors.push('La placa debe contener al menos una letra y un número válidos.');
    }
  }

  if (!usuario_dispositivo) errors.push('El usuario del dispositivo es obligatorio.');
  else if (!/^[a-z0-9_]{4,15}$/.test(usuario_dispositivo)) {
    errors.push('El usuario debe tener entre 4 y 15 caracteres (letras minúsculas, números y guiones bajos).');
  }

  if (!isEdit) {
    if (!password_dispositivo) errors.push('La contraseña es obligatoria.');
    else {
      if (password_dispositivo.length < 8 || password_dispositivo.length > 20) {
        errors.push('La contraseña debe tener entre 8 y 20 caracteres.');
      }
      if (!/[A-Z]/.test(password_dispositivo) || !/[0-9]/.test(password_dispositivo) || !/[^A-Za-z0-9]/.test(password_dispositivo)) {
        errors.push('La contraseña debe contener al menos una mayúscula, un número y un carácter especial.');
      }
    }
  }

  return errors;
};

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
    let { numero_economico, placa, usuario_dispositivo, password_dispositivo } = req.body;

    const validationErrors = validateCamionInput(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Normalizar datos
    numero_economico = numero_economico.trim();
    placa = placa.toUpperCase().trim();
    usuario_dispositivo = usuario_dispositivo.toLowerCase().trim();

    // Check if unique constraints are met
    const [existing]: any = await query(
      'SELECT numero_economico, placa, usuario_dispositivo FROM camiones WHERE numero_economico = ? OR placa = ? OR usuario_dispositivo = ? LIMIT 1',
      [numero_economico, placa, usuario_dispositivo]
    );

    if (existing) {
      if (existing.numero_economico.toLowerCase() === numero_economico.toLowerCase()) return res.status(409).json({ error: 'El número económico ya está registrado' });
      if (existing.placa.toUpperCase() === placa) return res.status(409).json({ error: 'La placa ya está registrada' });
      if (existing.usuario_dispositivo.toLowerCase() === usuario_dispositivo) return res.status(409).json({ error: 'El usuario ya está en uso' });
      return res.status(409).json({ error: 'El número económico, placa o usuario ya están en uso' });
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
    let { numero_economico, placa, usuario_dispositivo } = req.body;

    const validationErrors = validateCamionInput(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Normalizar datos
    numero_economico = numero_economico.trim();
    placa = placa.toUpperCase().trim();
    usuario_dispositivo = usuario_dispositivo.toLowerCase().trim();

    // Check unique constraints for other records
    const [existing]: any = await query(
      'SELECT numero_economico, placa, usuario_dispositivo FROM camiones WHERE (numero_economico = ? OR placa = ? OR usuario_dispositivo = ?) AND id != ? LIMIT 1',
      [numero_economico, placa, usuario_dispositivo, camionId]
    );

    if (existing) {
      if (existing.numero_economico.toLowerCase() === numero_economico.toLowerCase()) return res.status(409).json({ error: 'El número económico ya está registrado por otro camión' });
      if (existing.placa.toUpperCase() === placa) return res.status(409).json({ error: 'La placa ya está registrada por otro camión' });
      if (existing.usuario_dispositivo.toLowerCase() === usuario_dispositivo) return res.status(409).json({ error: 'El usuario ya está en uso por otro camión' });
      return res.status(409).json({ error: 'El número económico, placa o usuario ya están en uso' });
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

    if (nueva_password.length < 8 || nueva_password.length > 20) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 20 caracteres' });
    }

    if (!/[A-Z]/.test(nueva_password) || !/[0-9]/.test(nueva_password) || !/[^A-Za-z0-9]/.test(nueva_password)) {
      return res.status(400).json({ error: 'La contraseña debe contener al menos una mayúscula, un número y un carácter especial' });
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
