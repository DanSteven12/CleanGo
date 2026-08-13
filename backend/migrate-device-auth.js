/**
 * migrate-device-auth.js
 * Crea la tabla sesiones_camiones para gestionar sesiones de dispositivos móviles.
 * La columna `estado` en `camiones` ya fue agregada manualmente — no se toca aquí.
 *
 * Ejecutar una sola vez:
 *   node migrate-device-auth.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('[migrate-device-auth] Conectado a la base de datos.');

  try {
    // ── Tabla sesiones_camiones ────────────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sesiones_camiones (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        camion_id     INT NOT NULL UNIQUE,
        jti           VARCHAR(255) NOT NULL,
        refresh_token_hash VARCHAR(255) NULL,
        ip            VARCHAR(45),
        user_agent    TEXT,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (camion_id) REFERENCES camiones(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('[migrate-device-auth] ✅  Tabla sesiones_camiones lista.');

    // ── Verificar que camiones.estado existe ──────────────────────────────────
    const [cols] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'camiones' AND COLUMN_NAME = 'estado'
    `, [process.env.DB_NAME]);

    if (cols.length === 0) {
      await connection.execute(`
        ALTER TABLE camiones
        ADD COLUMN estado ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo'
      `);
      console.log('[migrate-device-auth] ✅  Columna camiones.estado creada.');
    } else {
      console.log('[migrate-device-auth] ℹ️  Columna camiones.estado ya existe — sin cambios.');
    }

    console.log('[migrate-device-auth] Migración completada exitosamente.');
  } catch (err) {
    console.error('[migrate-device-auth] ❌ Error durante la migración:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
