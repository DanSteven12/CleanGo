// backend/src/utils/historyMigration.ts
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

/**
 * Garantiza que la tabla `recorrido_checkpoints` posea columnas propias de snapshot
 * (nombre, latitud, longitud, orden) y que su clave foránea sobre `checkpoint_id`
 * esté configurada como `ON DELETE SET NULL`.
 *
 * Esto asegura la INMUTABILIDAD HISTÓRICA: si una ruta es editada o sus checkpoints
 * eliminados/reordenados posteriormente, los recorridos pasados o en progreso conservan
 * su propia copia congelada de los datos sin perder ningún registro histórico.
 */
export async function ensureHistoricalSnapshotSchema(): Promise<void> {
  try {
    // 1. Verificar si las columnas de snapshot ya existen
    const [cols] = await pool.query<RowDataPacket[]>(
      `SHOW COLUMNS FROM recorrido_checkpoints LIKE 'nombre'`
    );

    if (cols.length === 0) {
      console.log('📦 [Migración Histórica] Agregando columnas snapshot a recorrido_checkpoints...');
      await pool.query(`
        ALTER TABLE recorrido_checkpoints
          ADD COLUMN nombre VARCHAR(100) NULL AFTER checkpoint_id,
          ADD COLUMN latitud DECIMAL(10,8) NULL AFTER nombre,
          ADD COLUMN longitud DECIMAL(11,8) NULL AFTER latitud,
          ADD COLUMN orden INT NULL AFTER longitud,
          MODIFY COLUMN checkpoint_id INT NULL
      `);
      console.log('✅ [Migración Histórica] Columnas snapshot creadas exitosamente.');
    }

    // 2. Modificar la Foreign Key de checkpoint_id a ON DELETE SET NULL para evitar eliminaciones en cascada del historial
    const [fks] = await pool.query<RowDataPacket[]>(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'recorrido_checkpoints' 
        AND COLUMN_NAME = 'checkpoint_id' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const fk of fks) {
      const constraintName = fk.CONSTRAINT_NAME;
      if (constraintName !== 'fk_recorrido_checkpoints_checkpoint') {
        try {
          await pool.query(`ALTER TABLE recorrido_checkpoints DROP FOREIGN KEY \`${constraintName}\``);
        } catch (e) {
          // Ignorado si ya fue eliminada previa
        }
      }
    }

    try {
      await pool.query(`
        ALTER TABLE recorrido_checkpoints
          ADD CONSTRAINT fk_recorrido_checkpoints_checkpoint
          FOREIGN KEY (checkpoint_id) REFERENCES puntos_control(id) ON DELETE SET NULL
      `);
    } catch (e) {
      // Ignorado si la restricción ya existe
    }

    // 3. Poblar (backfill) registros históricos existentes con los datos de puntos_control
    await pool.query(`
      UPDATE recorrido_checkpoints rc
      JOIN puntos_control pc ON pc.id = rc.checkpoint_id
      SET rc.nombre = pc.nombre,
          rc.latitud = pc.latitud,
          rc.longitud = pc.longitud,
          rc.orden = pc.orden
      WHERE rc.nombre IS NULL
    `);

  } catch (err) {
    console.error('❌ [Migración Histórica] Error al verificar/actualizar el schema:', err);
  }
}
