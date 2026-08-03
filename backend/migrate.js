// backend/migrate.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cleango',
  });

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sesiones (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NOT NULL UNIQUE,
          jti VARCHAR(255) NOT NULL,
          ip VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla sesiones creada exitosamente (o ya existía).');
  } catch (err) {
    console.error('❌ Error creando tabla:', err);
  } finally {
    await connection.end();
  }
}

run();
