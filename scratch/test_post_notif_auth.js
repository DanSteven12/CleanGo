require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

async function runTest() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cleango'
  });

  try {
    const [users] = await pool.query("SELECT * FROM usuarios WHERE rol = 'ADMIN' LIMIT 1");
    if (!users.length) {
      console.error('No admin user found');
      process.exit(1);
    }
    const admin = users[0];
    console.log('Admin user:', admin.email, 'ID:', admin.id);

    const token = jwt.sign(
      { id: admin.id, email: admin.email, rol: admin.rol },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '1h' }
    );

    const fakeCsrf = 'test-csrf-123';

    // Test 1: Fallback (without tipo property)
    const res1 = await fetch('http://localhost:5001/api/notificaciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${token}; XSRF-TOKEN=${fakeCsrf}`,
        'x-xsrf-token': fakeCsrf,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        titulo: 'Aviso sin tipo explicit',
        mensaje: 'Probando fallback en backend para avisos manuales',
        destinatario: 'CIUDADANOS'
      })
    });

    console.log('Test 1 Status:', res1.status);
    console.log('Test 1 Response:', await res1.json());

    // Test 2: Explicit tipo MANUAL & categoria AVISO
    const res2 = await fetch('http://localhost:5001/api/notificaciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${token}; XSRF-TOKEN=${fakeCsrf}`,
        'x-xsrf-token': fakeCsrf,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        titulo: 'Aviso de prueba final',
        mensaje: 'Comunicado oficial para los ciudadanos de CleanGo',
        destinatario: 'CIUDADANOS',
        tipo: 'MANUAL',
        categoria: 'AVISO'
      })
    });

    console.log('Test 2 Status:', res2.status);
    console.log('Test 2 Response:', await res2.json());

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error running test:', err);
    await pool.end();
    process.exit(1);
  }
}

runTest();
