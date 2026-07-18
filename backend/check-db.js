const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cleango'
  });

  try {
    const [rows] = await connection.execute('SELECT id, usuario_dispositivo, password_dispositivo FROM camiones LIMIT 5');
    console.log('Camiones passwords:', rows);
    const [usuarios] = await connection.execute('SELECT * FROM usuarios LIMIT 5');
    console.log('Usuarios:', usuarios);
  } catch(e) {
    console.error(e);
  }
  await connection.end();
}
run();
