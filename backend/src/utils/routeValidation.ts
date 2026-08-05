import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

export interface RouteEditableStatus {
  editable: boolean;
  notEditableReason?: string;
}

/**
 * Verifica si una ruta puede editarse según sus asignaciones.
 * Reglas:
 * - Si no tiene asignaciones -> Editable
 * - Si tiene ÚNICAMENTE asignaciones Completadas (o sin En progreso/Pendiente) -> Editable
 * - Si tiene asignaciones "En progreso" -> No editable
 * - Si tiene asignaciones "Pendiente" -> No editable
 */
export async function checkRouteEditable(rutaId: number | string): Promise<RouteEditableStatus> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT estatus_recorrido, COUNT(*) as count 
     FROM asignaciones_rutas 
     WHERE ruta_id = ? 
     GROUP BY estatus_recorrido`,
    [rutaId]
  );

  let pending = 0;
  let inProgress = 0;

  for (const row of rows) {
    if (row.estatus_recorrido === 'Pendiente') {
      pending += Number(row.count);
    }
    if (row.estatus_recorrido === 'En progreso') {
      inProgress += Number(row.count);
    }
  }

  if (inProgress > 0) {
    const s = inProgress === 1 ? '' : 's';
    return {
      editable: false,
      notEditableReason: `No puede editarse porque existe ${inProgress} recorrido${s} en progreso.`
    };
  }

  if (pending > 0) {
    const s1 = pending === 1 ? 'ón' : 'ones';
    const s2 = pending === 1 ? '' : 's';
    return {
      editable: false,
      notEditableReason: `No puede editarse porque tiene ${pending} asignaci${s1} pendiente${s2}.`
    };
  }

  return { editable: true };
}

/**
 * Parsea el conteo devuelto por la consulta agregada y devuelve el status editable.
 * Se usa para los endpoints GET donde agrupamos por ruta.
 */
export function getEditableStatusFromCounts(pending: number, inProgress: number): RouteEditableStatus {
  if (inProgress > 0) {
    const s = inProgress === 1 ? '' : 's';
    return {
      editable: false,
      notEditableReason: `No puede editarse porque existe ${inProgress} recorrido${s} en progreso.`
    };
  }

  if (pending > 0) {
    const s1 = pending === 1 ? 'ón' : 'ones';
    const s2 = pending === 1 ? '' : 's';
    return {
      editable: false,
      notEditableReason: `No puede editarse porque tiene ${pending} asignaci${s1} pendiente${s2}.`
    };
  }

  return { editable: true };
}
