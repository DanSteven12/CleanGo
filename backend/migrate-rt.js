const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cleango'
  });

  try {
    await connection.execute('ALTER TABLE sesiones ADD COLUMN refresh_token_hash VARCHAR(255) NULL AFTER jti');
    console.log('Migration successful: Added refresh_token_hash to sesiones');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists, ignoring.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    await connection.end();
  }
}

migrate();
