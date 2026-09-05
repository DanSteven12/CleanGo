import { pool } from '../db';

/**
 * Garantiza que exista la tabla de tokens FCM de camiones.
 * Sin ella, el registro push de mobile-conductor falla en silencio.
 */
export async function ensureFcmTokensCamionesSchema(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fcm_tokens_camiones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        camion_id INT NOT NULL,
        token VARCHAR(512) NOT NULL UNIQUE,
        plataforma ENUM('android', 'ios', 'web') DEFAULT 'android',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_fcm_tokens_camiones_camion
          FOREIGN KEY (camion_id) REFERENCES camiones(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      ALTER TABLE fcm_tokens_camiones
        MODIFY COLUMN token VARCHAR(512) NOT NULL
    `).catch(() => undefined);

    console.log('[FCM Camiones] Tabla fcm_tokens_camiones verificada.');
  } catch (err) {
    console.error('[FCM Camiones] Error al verificar/crear fcm_tokens_camiones:', err);
  }
}
