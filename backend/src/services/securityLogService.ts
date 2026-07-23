// backend/src/services/securityLogService.ts
import { pool } from '../db';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Payload for a security audit log entry.
 * Maps 1-to-1 with the login_logs table columns.
 */
export interface SecurityLogEntry {
  /** Email attempted by the user. Null if not present in the request body. */
  correo: string | null;
  /** Client IP address (extracted from Express req). */
  ip: string;
  /** HTTP User-Agent header sent by the client. */
  userAgent: string;
  /** API endpoint that was hit, e.g. '/api/auth/login'. */
  endpoint: string;
  /** HTTP status code of the response: 200, 401, 403, or 429. */
  httpStatus: number;
  /** Human-readable description of the security event. */
  descripcion: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Inserts a security event into the login_logs table.
 *
 * This function is intentionally fire-and-forget: it will never throw.
 * If the INSERT fails (e.g. DB unavailable), the error is logged to console
 * and the main request flow continues unaffected.
 */
export async function logSecurityEvent(entry: SecurityLogEntry): Promise<void> {
  try {
    await pool.execute(
      `INSERT INTO login_logs
         (correo, ip_address, user_agent, endpoint, status_code, evento, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        entry.correo,
        entry.ip,
        entry.userAgent,
        entry.endpoint,
        entry.httpStatus,
        entry.descripcion,
      ]
    );
  } catch (err) {
    // Log but never propagate — security logging must not break the auth flow
    console.error('[securityLogService] Failed to insert into login_logs:', err);
  }
}
