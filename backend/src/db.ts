// backend/src/db.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config(); // load .env from project root

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'cleango',
  DB_SSL_ENABLED = 'false',
} = process.env as Record<string, string>;

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: DB_SSL_ENABLED === 'true' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Optional generic query helper (no strict generic constraints)
export async function query(sql: string, params?: any[]): Promise<any> {
  const [rows] = await pool.query(sql, params);
  return rows;
}
