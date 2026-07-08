// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import rutasRouter from './routes/rutas';
import puntosControlRouter from './routes/puntosControl';
import checkpointsRouter, { routeCheckpointsRouter } from './routes/checkpoints';
import asignacionesRouter from './routes/asignaciones';
import crearRutaRouter from './routes/crearRuta';
import recorridosRouter from './routes/recorridos';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: 'http://localhost:5173' })); // adjust origin as needed
app.use(express.json());

app.use('/api/rutas', rutasRouter);
app.use('/api/puntos-control', puntosControlRouter);
app.use('/api/checkpoints', checkpointsRouter);
app.use('/api/routes', routeCheckpointsRouter);
app.use('/api/asignaciones', asignacionesRouter);
app.use('/api/crear-ruta', crearRutaRouter);
app.use('/api/recorridos', recorridosRouter);

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} ya está en uso. Cerrando para permitir reinicio limpio...`);
    process.exit(1);
  } else {
    throw err;
  }
});

