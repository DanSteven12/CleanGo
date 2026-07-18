import { Router, Request, Response } from 'express';
import { pool } from '../db';
import bcrypt from 'bcrypt';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password, type } = req.body; // type can be 'user' or 'truck'

  if (!email || !password) {
    return res.status(400).json({ message: 'Credenciales incompletas.' });
  }

  try {
    if (type === 'truck') {
      // Logic for truck (camion) login
      const [camiones] = await pool.query<RowDataPacket[]>(
        'SELECT id, usuario_dispositivo, password_dispositivo FROM camiones WHERE usuario_dispositivo = ?',
        [email]
      );

      if (camiones.length === 0) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      const camion = camiones[0];
      
      // Attempt to compare with bcrypt
      // Note: If passwords are in plain text currently in DB, we should handle the fallback or assume they will be updated.
      // The user stated "A partir de este momento, todas las contraseñas nuevas... deberán almacenarse cifradas utilizando bcrypt. Actualiza la lógica de autenticación para utilizar bcrypt.compare()".
      // We will assume bcrypt is used. For existing plain text, bcrypt.compare might fail unless handled.
      // We'll implement a simple plain text fallback for backward compatibility while new ones are hashed.
      
      let isMatch = false;
      if (camion.password_dispositivo.startsWith('$2b$') || camion.password_dispositivo.startsWith('$2a$')) {
        isMatch = await bcrypt.compare(password, camion.password_dispositivo);
      } else {
        // Plain text fallback
        isMatch = (password === camion.password_dispositivo);
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      return res.json({
        message: 'Login exitoso',
        user: { id: camion.id, username: camion.usuario_dispositivo, type: 'truck' }
      });

    } else {
      // Logic for user login
      const [usuarios] = await pool.query<RowDataPacket[]>(
        'SELECT id, nombre, correo, password, rol, estado FROM usuarios WHERE correo = ?',
        [email]
      );

      if (usuarios.length === 0) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      const usuario = usuarios[0];

      if (usuario.estado !== 'Activo') {
        return res.status(403).json({ message: 'Usuario bloqueado.' });
      }

      let isMatch = false;
      if (usuario.password && (usuario.password.startsWith('$2b$') || usuario.password.startsWith('$2a$'))) {
        isMatch = await bcrypt.compare(password, usuario.password);
      } else {
        // Plain text fallback if any exists
        isMatch = (password === usuario.password);
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      // Update ultimo_acceso
      await pool.execute('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [usuario.id]);

      return res.json({
        message: 'Login exitoso',
        user: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol, type: 'user' }
      });
    }

  } catch (err) {
    console.error('[auth] POST /login', err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Endpoint to update a truck password to bcrypt (as part of the requirement for camiones)
router.put('/trucks/:id/password', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({ message: 'La contraseña es muy corta.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute('UPDATE camiones SET password_dispositivo = ? WHERE id = ?', [hashedPassword, id]);
    res.json({ message: 'Contraseña de camión actualizada con bcrypt.' });
  } catch (err) {
    console.error('[auth] PUT /trucks/:id/password', err);
    res.status(500).json({ message: 'Error al actualizar contraseña de camión.' });
  }
});

export default router;
