const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'cleango'});

  console.log('=== 1. ZONAS DEL USUARIO 7 ===');
  const [zonas] = await conn.query('SELECT id, alias, latitud, longitud, activo FROM zonas_interes WHERE usuario_id = 7 AND activo = 1');
  console.log(JSON.stringify(zonas, null, 2));

  console.log('\n=== 2. ASIGNACIONES PENDIENTES RUTA 41 ===');
  const [asig] = await conn.query("SELECT ar.id AS asignacion_id, ar.ruta_id, r.nombre, ar.camion_id, ar.conductor_id, ar.estatus_recorrido FROM asignaciones_rutas ar JOIN rutas r ON r.id = ar.ruta_id WHERE ar.ruta_id = 41 AND ar.estatus_recorrido = 'Pendiente'");
  console.log(JSON.stringify(asig, null, 2));

  console.log('\n=== 3. CHECKPOINTS RUTA 41 ===');
  const [cps] = await conn.query('SELECT id, nombre, latitud, longitud, orden FROM puntos_control WHERE ruta_id = 41 ORDER BY orden');
  console.log(JSON.stringify(cps, null, 2));

  conn.end();
})();
