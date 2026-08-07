// backend/src/index.ts
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { csrfMiddleware } from './middlewares/csrfMiddleware';
import { authMiddleware } from './middlewares/authMiddleware';
import rutasRouter from './routes/rutas';
import puntosControlRouter from './routes/puntosControl';
import checkpointsRouter, { routeCheckpointsRouter } from './routes/checkpoints';
import asignacionesRouter from './routes/asignaciones';
import crearRutaRouter from './routes/crearRuta';
import recorridosRouter from './routes/recorridos';
import horariosRouter from './routes/horarios';
import usuariosRouter from './routes/usuarios';
import authRouter from './routes/auth';
import camionesRouter from './routes/camiones';
import conductoresRouter from './routes/conductores';
import reportesRouter from './routes/reportes';
import dashboardRouter from './routes/dashboard';
import { notificacionesRouter } from './modules/notifications';
import { pool } from './db';

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Trust Proxy (Para producción) ────────────────────────────────────────────
// Permite que Express confíe en los headers X-Forwarded-* enviados por el proxy inverso (Hostinger).
// Necesario para que req.ip, req.secure y el Rate Limit funcionen correctamente.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"], // Bloquea todo contenido ejecutable, asumiendo que la API solo devuelve JSON
      frameAncestors: ["'none'"], // Protege contra Clickjacking si el navegador interpreta JSON como HTML
    },
  },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false, // Desactivar HSTS en desarrollo local para no romper HTTP
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://cleangomunicipal.com.mx'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
}));

app.use(express.json({ limit: '1mb' }));

// ─── Cookie Parser ────────────────────────────────────────────────────────────
// Must be registered before routes so req.cookies is populated in authMiddleware.
app.use(cookieParser());

// ─── CSRF Protection ──────────────────────────────────────────────────────────
// Applies to all mutating requests (POST, PUT, PATCH, DELETE), excluding public routes.
app.use(csrfMiddleware);

// ─── Routes ───────────────────────────────────────────────────────────────────

// ── Health check: verifica conexión a la base de datos (público, sin auth)
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      db: 'connected',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'cleango',
      node_env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      db: 'disconnected',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Public: auth endpoints (login, register, forgot-password, reset-password, me)
app.use('/api/auth', authRouter);

// ── Protected: all application routes require a valid JWT ─────────────────────
app.use('/api/rutas', authMiddleware, rutasRouter);
app.use('/api/puntos-control', authMiddleware, puntosControlRouter);
app.use('/api/checkpoints', authMiddleware, checkpointsRouter);
app.use('/api/routes', authMiddleware, routeCheckpointsRouter);
app.use('/api/asignaciones', asignacionesRouter);
app.use('/api/crear-ruta', authMiddleware, crearRutaRouter);
app.use('/api/recorridos', recorridosRouter);
app.use('/api/horarios', authMiddleware, horariosRouter);
app.use('/api/usuarios', authMiddleware, usuariosRouter);
app.use('/api/camiones', authMiddleware, camionesRouter);
app.use('/api/conductores', authMiddleware, conductoresRouter);
app.use('/api/reportes', authMiddleware, reportesRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/notificaciones', authMiddleware, notificacionesRouter);

// ─── Server ───────────────────────────────────────────────────────────────────

import { initSocketServer } from './socket/socketServer';
import { resumeActiveSimulations } from './services/simulationService';
import { ensureHistoricalSnapshotSchema } from './utils/historyMigration';

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
  console.log(`🔐 Auth routes: /api/auth/{login,register,forgot-password,reset-password,me}`);
  void ensureHistoricalSnapshotSchema();
});

// Initialize Socket.IO and resume any active simulations
const io = initSocketServer(server);
resumeActiveSimulations(io);

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} ya está en uso. Cerrando para permitir reinicio limpio...`);
    process.exit(1);
  } else {
    throw err;
  }
});
