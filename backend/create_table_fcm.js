const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cleango'
  });

  const sql = `
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      plataforma ENUM('android', 'ios', 'web') DEFAULT 'android',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `;

  try {
    console.log('Ejecutando creacion de tabla...');
    await connection.execute(sql);
    console.log('Tabla fcm_tokens creada exitosamente (o ya existia).');
  } catch(err) {
    console.error('Error al crear la tabla:', err);
  } finally {
    await connection.end();
  }
}

run();
