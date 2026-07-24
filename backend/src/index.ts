// backend/src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Trust Proxy (Para producción) ────────────────────────────────────────────
// Permite que Express confíe en los headers X-Forwarded-* enviados por el proxy inverso (Hostinger).
// Necesario para que req.ip, req.secure y el Rate Limit funcionen correctamente.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
// Must be registered before CORS and routes so headers apply to all responses.
app.use(helmet({
  hsts: process.env.NODE_ENV === 'production' 
    ? { maxAge: 31536000, includeSubDomains: true, preload: true } 
    : false, // Desactivar HSTS en desarrollo local para no romper HTTP
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
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
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '1mb' }));

// ─── Cookie Parser ────────────────────────────────────────────────────────────
// Must be registered before routes so req.cookies is populated in authMiddleware.
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────────────────────

// ── Public: auth endpoints (login, register, forgot-password, reset-password, me)
app.use('/api/auth', authRouter);

// ── Protected: all application routes require a valid JWT ─────────────────────
app.use('/api/rutas',          authMiddleware, rutasRouter);
app.use('/api/puntos-control', authMiddleware, puntosControlRouter);
app.use('/api/checkpoints',    authMiddleware, checkpointsRouter);
app.use('/api/routes',         authMiddleware, routeCheckpointsRouter);
app.use('/api/asignaciones',   authMiddleware, asignacionesRouter);
app.use('/api/crear-ruta',     authMiddleware, crearRutaRouter);
app.use('/api/recorridos',     authMiddleware, recorridosRouter);
app.use('/api/horarios',       authMiddleware, horariosRouter);
app.use('/api/usuarios',       authMiddleware, usuariosRouter);
app.use('/api/camiones',       authMiddleware, camionesRouter);
app.use('/api/conductores',    authMiddleware, conductoresRouter);
app.use('/api/reportes',       authMiddleware, reportesRouter);
app.use('/api/dashboard',      authMiddleware, dashboardRouter);

// ─── Server ───────────────────────────────────────────────────────────────────

import { initSocketServer } from './socket/socketServer';

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
  console.log(`🔐 Auth routes: /api/auth/{login,register,forgot-password,reset-password,me}`);
});

// Initialize Socket.IO
initSocketServer(server);

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} ya está en uso. Cerrando para permitir reinicio limpio...`);
    process.exit(1);
  } else {
    throw err;
  }
});
