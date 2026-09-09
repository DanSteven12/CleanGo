// backend/src/routes/ciudadanoPreferencias.ts
// ─────────────────────────────────────────────────────────────────────────────
// Rutas de preferencias de notificaciones para la app móvil de Ciudadanos.
//
// Todas las rutas están protegidas con mobileAuthMiddleware.
// El usuario siempre se identifica desde req.user.id — nunca desde el body.
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import { mobileAuthMiddleware } from '../middlewares/mobileAuthMiddleware';
import * as NotificationRepository from '../modules/notifications/notification.repository';

const router = Router();

// Todas las rutas están protegidas con mobileAuthMiddleware
// (lee Bearer token de la app móvil de Ciudadanos)
router.use(mobileAuthMiddleware);

// ── Campos permitidos en el body del PUT ──────────────────────────────────────
const CAMPOS_PERMITIDOS = new Set([
  'notificaciones_push_enabled',
  'proximidad_enabled',
  'retraso_enabled',
]);

// ── GET /api/ciudadano/preferencias ──────────────────────────────────────────
// Obtiene las preferencias del ciudadano autenticado.
// Si todavía no existe registro, getPreferenciasUsuario() lo crea con defaults.
router.get('/', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const preferencias = await NotificationRepository.getPreferenciasUsuario(usuarioId);
    res.json(preferencias);
  } catch (error) {
    console.error('[ciudadanoPreferencias] Error en GET /:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener las preferencias' });
  }
});

// ── PUT /api/ciudadano/preferencias ──────────────────────────────────────────
// Actualiza una o más preferencias del ciudadano autenticado.
// Todos los campos son opcionales; solo los presentes se actualizan.
router.put('/', async (req: any, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const body = req.body;

    // El body debe ser un objeto plano (no array, no primitivo, no null)
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return res.status(400).json({ error: 'El body debe ser un objeto JSON válido.' });
    }

    // Rechazar cualquier campo que no esté en la lista de permitidos
    const camposRecibidos = Object.keys(body);
    const camposDesconocidos = camposRecibidos.filter((k) => !CAMPOS_PERMITIDOS.has(k));
    if (camposDesconocidos.length > 0) {
      return res.status(400).json({
        error: `Campo(s) no permitido(s): ${camposDesconocidos.join(', ')}. ` +
               `Solo se aceptan: ${[...CAMPOS_PERMITIDOS].join(', ')}.`,
      });
    }

    // Validar que cada valor recibido sea estrictamente boolean
    for (const campo of camposRecibidos) {
      if (typeof body[campo] !== 'boolean') {
        return res.status(400).json({
          error: `El campo "${campo}" debe ser un booleano (true o false). ` +
                 `Se recibió: ${JSON.stringify(body[campo])}.`,
        });
      }
    }

    // Construir el DTO de actualización (solo campos presentes)
    const prefs: {
      notificaciones_push_enabled?: boolean;
      proximidad_enabled?: boolean;
      retraso_enabled?: boolean;
    } = {};

    if ('notificaciones_push_enabled' in body) {
      prefs.notificaciones_push_enabled = body.notificaciones_push_enabled as boolean;
    }
    if ('proximidad_enabled' in body) {
      prefs.proximidad_enabled = body.proximidad_enabled as boolean;
    }
    if ('retraso_enabled' in body) {
      prefs.retraso_enabled = body.retraso_enabled as boolean;
    }

    const preferencias = await NotificationRepository.upsertPreferencias(usuarioId, prefs);
    res.json(preferencias);
  } catch (error) {
    console.error('[ciudadanoPreferencias] Error en PUT /:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar las preferencias' });
  }
});

export default router;
