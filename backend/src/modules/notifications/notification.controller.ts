// backend/src/modules/notifications/notification.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// Handlers de Express para el módulo de notificaciones.
// No contiene lógica de negocio ni SQL: delega 100% al NotificationService.
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response } from 'express';
import * as NotificationService from './notification.service';
import type { CrearAvisoManualDTO, FiltrosNotificaciones, NotificacionCategoria, NotificacionTipo } from './notification.types';
import { sanitizeText } from '../../utils/sanitize';

// ─── POST /api/notificaciones ────────────────────────────────────────────────

/**
 * Crea una nueva notificación.
 * Si tipo = 'MANUAL', se procesa como aviso manual y se distribuye
 * según el destinatario.
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const tipo = req.body.tipo || 'MANUAL';
    const categoria = req.body.categoria || 'AVISO';
    const destinatario = req.body.destinatario;
    const titulo = sanitizeText(req.body.titulo);
    const mensaje = sanitizeText(req.body.mensaje);

    if (tipo === 'MANUAL') {
      const dto: CrearAvisoManualDTO = {
        titulo,
        mensaje,
        categoria,
        destinatario
      };
      
      const count = await NotificationService.enviarAvisoManual(dto);
      res.status(201).json({ 
        success: true,
        message: 'Aviso publicado correctamente.',
        destinatarios: count
      });
      return;
    }

    // Si en el futuro se exponen notificaciones automáticas por API
    res.status(400).json({ error: 'Tipo de notificación no soportado para creación pública.' });
  } catch (error: any) {
    console.error('[NotificationController] POST /notificaciones:', error);
    res.status(500).json({ error: error.message || 'Error interno al crear la notificación.' });
  }
}

// ─── GET /api/notificaciones ─────────────────────────────────────────────────

/**
 * Obtiene todas las notificaciones del sistema.
 * Soporta filtros opcionales por query string:
 *   ?tipo=AUTOMATICA|MANUAL
 *   ?categoria=REPORTE|RECORRIDO|RUTA|AVISO
 *   ?leida=true|false
 *   ?usuario_id=<number>
 *   ?conductor_id=<number>
 */
export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const { tipo, categoria, leida, usuario_id, conductor_id, page, limit } =
      req.query as Record<string, string | undefined>;

    const filtros: FiltrosNotificaciones = {};

    if (tipo && tipo !== 'ALL') filtros.tipo = tipo as NotificacionTipo;
    if (categoria && categoria !== 'ALL') filtros.categoria = categoria as NotificacionCategoria;
    if (leida !== undefined && leida !== 'ALL') filtros.leida = leida === 'true';
    if (usuario_id) filtros.usuario_id = Number(usuario_id);
    if (conductor_id) filtros.conductor_id = Number(conductor_id);
    if (page) filtros.page = Number(page);
    if (limit) filtros.limit = Number(limit);

    const notificaciones = await NotificationService.obtenerTodas(filtros);
    res.json(notificaciones);
  } catch (error) {
    console.error('[NotificationController] GET /notificaciones:', error);
    res.status(500).json({ error: 'Error interno al obtener las notificaciones.' });
  }
}

// ─── GET /api/notificaciones/usuario/:id ──────────────────────────────────────

/**
 * Obtiene todas las notificaciones de un usuario (ciudadano o administrador) por su ID.
 */
export async function getByUsuario(req: Request, res: Response): Promise<void> {
  const usuario_id = Number(req.params.id);

  if (!Number.isFinite(usuario_id) || usuario_id <= 0) {
    res.status(400).json({ error: 'ID de usuario inválido.' });
    return;
  }

  try {
    const notificaciones = await NotificationService.obtenerPorUsuario(usuario_id);
    res.json(notificaciones);
  } catch (error) {
    console.error(`[NotificationController] GET /notificaciones/usuario/${usuario_id}:`, error);
    res.status(500).json({ error: 'Error interno al obtener las notificaciones del usuario.' });
  }
}

// ─── GET /api/notificaciones/conductor/:id ────────────────────────────────────

/**
 * Obtiene todas las notificaciones de un conductor por su ID.
 */
export async function getByConductor(req: Request, res: Response): Promise<void> {
  const conductor_id = Number(req.params.id);

  if (!Number.isFinite(conductor_id) || conductor_id <= 0) {
    res.status(400).json({ error: 'ID de conductor inválido.' });
    return;
  }

  try {
    const notificaciones = await NotificationService.obtenerPorConductor(conductor_id);
    res.json(notificaciones);
  } catch (error) {
    console.error(`[NotificationController] GET /notificaciones/conductor/${conductor_id}:`, error);
    res.status(500).json({ error: 'Error interno al obtener las notificaciones del conductor.' });
  }
}

// ─── PATCH /api/notificaciones/:id/leida ──────────────────────────────────────

/**
 * Marca una notificación como leída.
 * Responde con 200 si se actualizó, 404 si no existe o ya estaba leída.
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);

  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'ID de notificación inválido.' });
    return;
  }

  try {
    const actualizada = await NotificationService.marcarLeida(id);

    if (!actualizada) {
      res.status(404).json({
        error: 'Notificación no encontrada o ya estaba marcada como leída.',
      });
      return;
    }

    res.json({ message: 'Notificación marcada como leída correctamente.' });
  } catch (error) {
    console.error(`[NotificationController] PATCH /notificaciones/${id}/leida:`, error);
    res.status(500).json({ error: 'Error interno al actualizar la notificación.' });
  }
}
