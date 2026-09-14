import { Router } from 'express';
import { query } from '../db';
import { mobileAuthMiddleware } from '../middlewares/mobileAuthMiddleware';
import { uploadReporteFotografia } from '../utils/uploadUtil';
import { NotificationService } from '../modules/notifications';
import * as NotificationMessages from '../constants/notificationMessages';

const router = Router();

// Todas las rutas de reportes del ciudadano están protegidas con mobileAuthMiddleware
// (lee Bearer token, igual que ciudadanoHorarios)
router.use(mobileAuthMiddleware);

// GET /api/ciudadano/reportes
// Historial de reportes del ciudadano autenticado (con soporte para paginación)
router.get('/', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { page, limit } = req.query;
    const isPaginated = page !== undefined || limit !== undefined;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit as string, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Total de reportes del usuario
    const countRows = await query(
      'SELECT COUNT(*) AS total FROM reportes_ciudadanos WHERE usuario_id = ?',
      [usuarioId]
    );
    const total = Number(countRows[0]?.total || 0);

    const sql = `
      SELECT
        id,
        tipo_reporte,
        descripcion,
        fotografia,
        latitud,
        longitud,
        direccion_referencia,
        estado,
        fecha_reporte
      FROM reportes_ciudadanos
      WHERE usuario_id = ?
      ORDER BY fecha_reporte DESC
      ${isPaginated ? 'LIMIT ? OFFSET ?' : ''}
    `;

    const queryParams = isPaginated ? [usuarioId, limitNum, offset] : [usuarioId];
    const reportes = await query(sql, queryParams);

    if (isPaginated) {
      return res.json({
        data: reportes,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
          hasMore: offset + reportes.length < total,
        },
      });
    }

    res.json(reportes);
  } catch (error) {
    console.error('Error fetching mis reportes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/ciudadano/reportes/:id
// Detalle de un reporte del ciudadano autenticado
router.get('/:id', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const sql = `
      SELECT
        id,
        tipo_reporte,
        descripcion,
        fotografia,
        latitud,
        longitud,
        direccion_referencia,
        estado,
        fecha_reporte
      FROM reportes_ciudadanos
      WHERE id = ? AND usuario_id = ?
    `;
    const rows = await query(sql, [req.params.id, usuarioId]);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching reporte detalle:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/ciudadano/reportes
// Crear un nuevo reporte
router.post('/', (req: any, res: any, next: any) => {
  // Si la petición viene como JSON (reporte sin foto), continuar directo
  if (!req.is('multipart/form-data')) {
    return next();
  }
  // Manejo de la subida con multer
  uploadReporteFotografia.single('fotografia')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { tipo_reporte, descripcion, latitud, longitud, direccion_referencia } = req.body;
    const file = req.file;

    // Validación de campos obligatorios
    if (!tipo_reporte) {
      return res.status(400).json({ error: 'El tipo de reporte es obligatorio.' });
    }
    if (!latitud || !longitud) {
      return res.status(400).json({ error: 'La ubicación GPS es obligatoria.' });
    }

    // Validar tipo_reporte
    const TIPOS_VALIDOS = ['Basura acumulada', 'Camión no pasó', 'Contenedor lleno', 'Calles contaminadas'];
    if (!TIPOS_VALIDOS.includes(tipo_reporte)) {
      return res.status(400).json({ error: 'Tipo de reporte inválido.' });
    }

    // Si hay foto, generar la URI a guardar
    let fotografiaUri = null;
    if (file) {
      // Guardamos la ruta relativa para ser accesible desde /uploads
      fotografiaUri = `/uploads/reportes/${file.filename}`;
    }

    const sql = `
      INSERT INTO reportes_ciudadanos (
        usuario_id, 
        tipo_reporte, 
        descripcion, 
        fotografia, 
        latitud, 
        longitud, 
        direccion_referencia,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')
    `;

    const result = await query(sql, [
      usuarioId,
      tipo_reporte,
      descripcion || null,
      fotografiaUri,
      parseFloat(latitud),
      parseFloat(longitud),
      direccion_referencia || null,
    ]);

    // Notificar al administrador
    const adminId = await NotificationService.obtenerAdminId();
    if (adminId) {
      await NotificationService.crear({
        usuario_id: adminId,
        ...NotificationMessages.NUEVO_REPORTE_CIUDADANO,
        tipo: 'AUTOMATICA',
        categoria: 'REPORTE',
      }).catch(err => console.error('Error enviando notif al admin:', err));
    }

    // Notificar al ciudadano (Etapa C - Cobertura de reportes)
    await NotificationService.crear({
      usuario_id: usuarioId,
      titulo: 'Reporte recibido',
      mensaje: 'Hemos recibido tu reporte y está en revisión. Te avisaremos cuando haya actualizaciones.',
      tipo: 'AUTOMATICA',
      categoria: 'REPORTE',
    }).catch(err => console.error('Error enviando notif al ciudadano:', err));

    res.status(201).json({ 
      message: 'Reporte creado correctamente',
      reporteId: result.insertId,
      fotografiaUri
    });
  } catch (error) {
    console.error('Error creating reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear el reporte' });
  }
});

export default router;
