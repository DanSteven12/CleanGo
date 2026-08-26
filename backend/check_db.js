const { pool } = require('./src/db');
async function run() {
  const [rows] = await pool.query('SELECT id, nombre, descripcion FROM rutas LIMIT 10');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
run();
