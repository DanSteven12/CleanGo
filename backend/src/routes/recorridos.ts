import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { ResultSetHeader } from 'mysql2';

const router = Router();

// ─── POST /api/recorridos/iniciar ────────────────────────────────────────────
router.post('/iniciar', async (req: Request, res: Response): Promise<void> => {
  const { asignacion_id, ruta_id } = req.body;

  if (!asignacion_id || !ruta_id) {
    res.status(400).json({ error: 'Faltan parámetros requeridos: asignacion_id, ruta_id' });
    return;
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const horaInicio = new Date();

    // 1. Insertar un nuevo registro en la tabla recorridos
    const [resultRecorrido] = await connection.execute<ResultSetHeader>(
      'INSERT INTO recorridos (asignacion_id, hora_inicio, estado) VALUES (?, ?, ?)',
      [asignacion_id, horaInicio, 'En progreso']
    );

    const recorrido_id = resultRecorrido.insertId;

    // 2. Consultar la tabla puntos_control filtrando por ruta_id y ordenando por orden ASC
    const [puntosControl] = await connection.execute<any[]>(
      'SELECT id, orden FROM puntos_control WHERE ruta_id = ? ORDER BY orden ASC',
      [ruta_id]
    );

    // 3. Crear un registro en recorrido_checkpoints por cada checkpoint encontrado
    for (const punto of puntosControl) {
      const minutosASumar = (punto.orden - 1) * 5;

      const horaEstimada = new Date(
        horaInicio.getTime() + minutosASumar * 60000
      );

      const estado = 'Pendiente';

      await connection.execute(
        'INSERT INTO recorrido_checkpoints (recorrido_id, checkpoint_id, hora_estimada, estado) VALUES (?, ?, ?, ?)',
        [recorrido_id, punto.id, horaEstimada, estado]
      );
    }

    await connection.commit();

    // Volver a consultar la tabla puntos_control para obtener los datos geoespaciales requeridos por el frontend
    const [checkpointsCompletos] = await connection.execute<any[]>(
      'SELECT id, nombre, latitud, longitud, orden FROM puntos_control WHERE ruta_id = ? ORDER BY orden ASC',
      [ruta_id]
    );

    // Consultar el color de la ruta
    const [rutaResult] = await connection.execute<any[]>(
      'SELECT color FROM rutas WHERE id = ?',
      [ruta_id]
    );
    const color = rutaResult.length > 0 ? rutaResult[0].color : null;

    res.json({
      recorrido_id,
      color,
      checkpoints: checkpointsCompletos
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error en /api/recorridos/iniciar:', error);
    res.status(500).json({ error: 'Error interno del servidor al iniciar el recorrido' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ─── PUT /api/recorridos/:recorridoId/checkpoint ──────────────────────────────
router.put('/:recorridoId/checkpoint', async (req: Request, res: Response): Promise<void> => {
  const recorridoId = req.params.recorridoId;
  const { checkpoint_id, latitud, longitud } = req.body;

  if (!checkpoint_id || latitud === undefined || longitud === undefined) {
    res.status(400).json({ error: 'Faltan parámetros requeridos: checkpoint_id, latitud, longitud' });
    return;
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Verificar que el recorrido exista y obtener hora_inicio
    const [recorridos] = await connection.execute<any[]>(
      'SELECT id, asignacion_id, hora_inicio FROM recorridos WHERE id = ?',
      [recorridoId]
    );

    if (recorridos.length === 0) {
      res.status(404).json({ error: 'Recorrido no encontrado' });
      return;
    }

    const asignacionId  = recorridos[0].asignacion_id;
    const horaInicio    = new Date(recorridos[0].hora_inicio);

    // 2. Obtener el orden del checkpoint para calcular la hora_llegada acumulativa.
    //    Se usa el mismo intervalo de 5 minutos por tramo que emplea /iniciar.
    const [puntoRows] = await connection.execute<any[]>(
      'SELECT orden FROM puntos_control WHERE id = ?',
      [checkpoint_id]
    );

    if (puntoRows.length === 0) {
      res.status(404).json({ error: 'Checkpoint no encontrado' });
      return;
    }

    const orden           = puntoRows[0].orden as number;
    const minutosTranscurridos = (orden - 1) * 5;
    const horaLlegada    = new Date(horaInicio.getTime() + minutosTranscurridos * 60_000);

    // 3. Actualizar la tabla recorridos (latitud_actual, longitud_actual)
    await connection.execute(
      'UPDATE recorridos SET latitud_actual = ?, longitud_actual = ? WHERE id = ?',
      [latitud, longitud, recorridoId]
    );

    // 4. Marcar el checkpoint como completado usando la hora_llegada calculada
    await connection.execute(
      'UPDATE recorrido_checkpoints SET estado = ?, hora_llegada = ? WHERE recorrido_id = ? AND checkpoint_id = ?',
      ['Completado', horaLlegada, recorridoId, checkpoint_id]
    );

    // 5. Verificar si aún existen checkpoints pendientes
    const [pendientes] = await connection.execute<any[]>(
      'SELECT id FROM recorrido_checkpoints WHERE recorrido_id = ? AND estado = ?',
      [recorridoId, 'Pendiente']
    );

    // 6. Si ya no existen checkpoints pendientes, cerrar el recorrido
    if (pendientes.length === 0) {
      // Usar la hora_llegada del último checkpoint como hora_fin real del recorrido
      await connection.execute(
        'UPDATE recorridos SET hora_fin = ?, estado = ? WHERE id = ?',
        [horaLlegada, 'Completado', recorridoId]
      );

      await connection.execute(
        'UPDATE asignaciones_rutas SET estatus_recorrido = ? WHERE id = ?',
        ['Completado', asignacionId]
      );
    }

    await connection.commit();
    res.json({ message: 'Checkpoint actualizado correctamente' });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error(`Error en PUT /api/recorridos/${recorridoId}/checkpoint:`, error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar el checkpoint' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ─── HISTORIAL DE RECORRIDOS (sólo lectura) ───────────────────────────────────
// Ninguno de estos endpoints modifica datos; no tocan la lógica del mapa en vivo.

const HISTORIAL_PAGE_SIZE = 20;

/**
 * GET /api/recorridos/historial/filtros
 *
 * Devuelve los catálogos completos de camiones, conductores y rutas
 * para poblar los <select> de filtros en el frontend.
 * Se declara ANTES de /historial/:id para que Express no lo interprete
 * como un parámetro dinámico.
 */
router.get('/historial/filtros', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [camiones] = await pool.query<any[]>(
      'SELECT id, numero_economico, placa FROM camiones ORDER BY numero_economico ASC'
    );
    const [conductores] = await pool.query<any[]>(
      'SELECT id, nombre_completo FROM conductores ORDER BY nombre_completo ASC'
    );
    const [rutas] = await pool.query<any[]>(
      'SELECT id, nombre, color FROM rutas ORDER BY nombre ASC'
    );
    res.json({ camiones, conductores, rutas });
  } catch (error) {
    console.error('[historial] GET /filtros:', error);
    res.status(500).json({ error: 'Error interno al obtener los catálogos de filtros.' });
  }
});

/**
 * GET /api/recorridos/historial
 *
 * Lista paginada (20 por página) de recorridos con estado = 'Completado'.
 *
 * Query params opcionales (todos son opcionales; sin ellos devuelve todo):
 *   fecha_inicio   YYYY-MM-DD  Filtro >= ar.fecha  (sin función, aprovecha índice)
 *   fecha_fin      YYYY-MM-DD  Filtro <= ar.fecha
 *   camion_id      number      Igualdad ar.camion_id
 *   conductor_id   number      Igualdad ar.conductor_id
 *   ruta_id        number      Igualdad ar.ruta_id
 *   page           number      Página solicitada (default 1)
 *
 * Respuesta: { data: RecorridoCompletado[], total: number, page: number, totalPages: number }
 */
router.get('/historial', async (req: Request, res: Response): Promise<void> => {
  const {
    fecha_inicio,
    fecha_fin,
    camion_id,
    conductor_id,
    ruta_id,
    page,
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
  const offset = (pageNum - 1) * HISTORIAL_PAGE_SIZE;

  // WHERE dinámico — sin funciones sobre columnas filtradas para usar índices
  const conditions: string[] = ["r.estado = 'Completado'"];
  const filterParams: (string | number)[] = [];

  if (fecha_inicio) { conditions.push('ar.fecha >= ?'); filterParams.push(fecha_inicio); }
  if (fecha_fin) { conditions.push('ar.fecha <= ?'); filterParams.push(fecha_fin); }
  if (camion_id) { conditions.push('ar.camion_id = ?'); filterParams.push(Number(camion_id)); }
  if (conductor_id) { conditions.push('ar.conductor_id = ?'); filterParams.push(Number(conductor_id)); }
  if (ruta_id) { conditions.push('ar.ruta_id = ?'); filterParams.push(Number(ruta_id)); }

  const whereClause = conditions.join(' AND ');

  // Fragment reutilizado en COUNT y en el SELECT de datos
  const fromJoins = `
    FROM recorridos r
    INNER JOIN asignaciones_rutas ar ON ar.id  = r.asignacion_id
    INNER JOIN rutas               ru ON ru.id  = ar.ruta_id
    INNER JOIN camiones            c  ON c.id   = ar.camion_id
    INNER JOIN conductores         d  ON d.id   = ar.conductor_id
    WHERE ${whereClause}
  `;

  try {
    // ── Conteo total para calcular páginas ────────────────────────────────
    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total ${fromJoins}`,
      filterParams
    );
    const total = Number(countRows[0].total);
    const totalPages = Math.max(1, Math.ceil(total / HISTORIAL_PAGE_SIZE));

    // ── Registros de la página solicitada ─────────────────────────────────
    const [rows] = await pool.query<any[]>(
      `SELECT
        r.id,
        r.hora_inicio,
        r.hora_fin,
        r.estado,
        TIMESTAMPDIFF(MINUTE, r.hora_inicio, r.hora_fin)  AS duracion_minutos,
        ru.id              AS ruta_id,
        ru.nombre          AS ruta_nombre,
        ru.color           AS ruta_color,
        c.id               AS camion_id,
        c.numero_economico,
        c.placa,
        d.id               AS conductor_id,
        d.nombre_completo  AS conductor_nombre,
        ar.fecha           AS fecha_programada,
        ar.hora_inicio     AS horario_inicio,
        ar.hora_fin        AS horario_fin,
        (SELECT COUNT(*)   FROM recorrido_checkpoints rc
         WHERE rc.recorrido_id = r.id)                                 AS total_checkpoints,
        (SELECT COUNT(*)   FROM recorrido_checkpoints rc
         WHERE rc.recorrido_id = r.id AND rc.estado = 'Completado')    AS checkpoints_completados
      ${fromJoins}
      ORDER BY ar.fecha DESC, r.hora_inicio DESC
      LIMIT ? OFFSET ?`,
      [...filterParams, HISTORIAL_PAGE_SIZE, offset]
    );

    res.json({ data: rows, total, page: pageNum, totalPages });
  } catch (error) {
    console.error('[historial] GET /historial:', error);
    res.status(500).json({ error: 'Error interno al obtener el historial de recorridos.' });
  }
});

/**
 * GET /api/recorridos/historial/:id
 *
 * Detalle completo de un recorrido completado:
 * encabezado con datos del recorrido + array de checkpoints con desviación en minutos.
 */
router.get('/historial/:id', async (req: Request, res: Response): Promise<void> => {
  const recorridoId = Number(req.params.id);

  if (!Number.isFinite(recorridoId) || recorridoId <= 0) {
    res.status(400).json({ error: 'ID de recorrido inválido.' });
    return;
  }

  try {
    // ── Encabezado del recorrido ──────────────────────────────────────────
    const [rows] = await pool.query<any[]>(
      `SELECT
        r.id,
        r.hora_inicio,
        r.hora_fin,
        r.estado,
        r.latitud_actual,
        r.longitud_actual,
        TIMESTAMPDIFF(MINUTE, r.hora_inicio, r.hora_fin) AS duracion_minutos,
        ru.nombre          AS ruta_nombre,
        ru.color           AS ruta_color,
        c.numero_economico,
        c.placa,
        d.nombre_completo  AS conductor_nombre,
        d.num_licencia,
        ar.fecha           AS fecha_programada,
        ar.hora_inicio     AS horario_inicio,
        ar.hora_fin        AS horario_fin
      FROM recorridos r
      INNER JOIN asignaciones_rutas ar ON ar.id  = r.asignacion_id
      INNER JOIN rutas               ru ON ru.id  = ar.ruta_id
      INNER JOIN camiones            c  ON c.id   = ar.camion_id
      INNER JOIN conductores         d  ON d.id   = ar.conductor_id
      WHERE r.id = ? AND r.estado = 'Completado'`,
      [recorridoId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Recorrido completado no encontrado.' });
      return;
    }

    // ── Checkpoints del recorrido ─────────────────────────────────────────
    const [checkpoints] = await pool.query<any[]>(
      `SELECT
        rc.id,
        rc.checkpoint_id,
        pc.nombre,
        pc.latitud,
        pc.longitud,
        pc.orden,
        rc.hora_estimada,
        rc.hora_llegada,
        rc.estado,
        TIMESTAMPDIFF(MINUTE, rc.hora_estimada, rc.hora_llegada) AS desviacion_minutos
      FROM recorrido_checkpoints rc
      INNER JOIN puntos_control pc ON pc.id = rc.checkpoint_id
      WHERE rc.recorrido_id = ?
      ORDER BY pc.orden ASC`,
      [recorridoId]
    );

    res.json({ ...rows[0], checkpoints });
  } catch (error) {
    console.error(`[historial] GET /historial/${recorridoId}:`, error);
    res.status(500).json({ error: 'Error interno al obtener el detalle del recorrido.' });
  }
});

export default router;
