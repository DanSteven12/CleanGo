import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

interface IndexDefinition {
  table: string;
  indexName: string;
  createSql: string;
}

const SEARCH_INDEXES: IndexDefinition[] = [
  // ─── Índices para tabla `usuarios` ──────────────────────────────────────────
  {
    table: 'usuarios',
    indexName: 'idx_usuarios_nombre',
    createSql: 'CREATE INDEX idx_usuarios_nombre ON usuarios (nombre)',
  },
  {
    table: 'usuarios',
    indexName: 'idx_usuarios_correo',
    createSql: 'CREATE INDEX idx_usuarios_correo ON usuarios (correo)',
  },
  {
    table: 'usuarios',
    indexName: 'idx_usuarios_rol',
    createSql: 'CREATE INDEX idx_usuarios_rol ON usuarios (rol)',
  },
  {
    table: 'usuarios',
    indexName: 'idx_usuarios_estado',
    createSql: 'CREATE INDEX idx_usuarios_estado ON usuarios (estado)',
  },

  // ─── Índices para tabla `reportes_ciudadanos` ────────────────────────────────
  {
    table: 'reportes_ciudadanos',
    indexName: 'idx_reportes_estado',
    createSql: 'CREATE INDEX idx_reportes_estado ON reportes_ciudadanos (estado)',
  },
  {
    table: 'reportes_ciudadanos',
    indexName: 'idx_reportes_tipo',
    createSql: 'CREATE INDEX idx_reportes_tipo ON reportes_ciudadanos (tipo_reporte)',
  },
  {
    table: 'reportes_ciudadanos',
    indexName: 'idx_reportes_fecha',
    createSql: 'CREATE INDEX idx_reportes_fecha ON reportes_ciudadanos (fecha_reporte)',
  },
  {
    table: 'reportes_ciudadanos',
    indexName: 'idx_reportes_usuario_id',
    createSql: 'CREATE INDEX idx_reportes_usuario_id ON reportes_ciudadanos (usuario_id)',
  },
  {
    table: 'reportes_ciudadanos',
    indexName: 'idx_reportes_descripcion',
    createSql: 'CREATE INDEX idx_reportes_descripcion ON reportes_ciudadanos (descripcion(100))',
  },
  {
    table: 'reportes_ciudadanos',
    indexName: 'idx_reportes_direccion',
    createSql: 'CREATE INDEX idx_reportes_direccion ON reportes_ciudadanos (direccion_referencia(100))',
  },
];

/**
 * Garantiza la existencia de índices optimizados para búsqueda y filtrado
 * en las tablas de `usuarios` y `reportes_ciudadanos`.
 */
export async function ensureSearchIndexes(): Promise<void> {
  for (const item of SEARCH_INDEXES) {
    try {
      // 1. Verificar si la tabla existe antes de comprobar el índice
      const [tableExists] = await pool.query<RowDataPacket[]>(
        `SHOW TABLES LIKE ?`,
        [item.table]
      );

      if (tableExists.length === 0) {
        continue;
      }

      // 2. Verificar si el índice ya existe
      const [indexes] = await pool.query<RowDataPacket[]>(
        `SHOW INDEX FROM \`${item.table}\` WHERE Key_name = ?`,
        [item.indexName]
      );

      if (indexes.length === 0) {
        console.log(`[Migration] Creando índice ${item.indexName} en la tabla ${item.table}...`);
        await pool.query(item.createSql);
        console.log(`[Migration] ✅ Índice ${item.indexName} creado exitosamente.`);
      }
    } catch (error: any) {
      // Ignorar si el índice ya existe o advertir
      if (error?.code !== 'ER_DUP_KEYNAME') {
        console.error(`[Migration] ⚠️ Error al verificar/crear índice ${item.indexName}:`, error?.message || error);
      }
    }
  }
}
