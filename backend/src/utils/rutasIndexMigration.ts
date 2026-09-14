import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

/**
 * Garantiza que la tabla `rutas` tenga el índice `idx_rutas_nombre`
 * para acelerar las búsquedas por nombre/colonia.
 */
export async function ensureRutasIndexes(): Promise<void> {
  try {
    // 1. Comprobar si el índice ya existe en la tabla rutas
    const [indexes] = await pool.query<RowDataPacket[]>(
      `SHOW INDEX FROM rutas WHERE Key_name = 'idx_rutas_nombre'`
    );

    if (indexes.length === 0) {
      console.log('[Migration] Creando índice idx_rutas_nombre en la tabla rutas...');
      await pool.query(`CREATE INDEX idx_rutas_nombre ON rutas (nombre)`);
      console.log('[Migration] ✅ Índice idx_rutas_nombre creado exitosamente.');
    }
  } catch (error) {
    console.error('[Migration] ⚠️ Error al verificar/crear índice idx_rutas_nombre:', error);
  }
}
