import { pool } from './src/db';

async function main() {
  try {
    const [rows] = await pool.query('SELECT * FROM notificaciones');
    console.log('NOTIFICACIONES EN DB:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit(0);
  }
}

main();
