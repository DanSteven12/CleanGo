const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host: 'localhost', user: 'root', database: 'cleango'});
  const [rows] = await conn.execute('SELECT ruta_id, COUNT(*) as count FROM puntos_control GROUP BY ruta_id');
  console.log(rows);
  const [rutas] = await conn.execute('SELECT * FROM puntos_control LIMIT 5');
  console.log(rutas);
  await conn.end();
}
run();
