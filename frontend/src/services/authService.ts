// frontend/src/services/authService.ts

const BASE = '/api/auth';

export interface AuthUser {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  telefono: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  nombre: string;
  correo: string;
  password: string;
  confirmPassword: string;
  telefono: string;
}

// Login no longer returns a token — it is stored exclusively in an HttpOnly cookie.
export interface LoginResponse {
  message: string;
  user: AuthUser;
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  remaining?: number;
  retryAfter?: number;

  constructor(message: string, status: number, remaining?: number, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.remaining = remaining;
    this.retryAfter = retryAfter;
  }
}

// ─── Response helper ──────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({ message: 'Error inesperado del servidor.' }));
  if (!res.ok) {
    const remaining = res.headers.get('RateLimit-Remaining');
    const retryAfter = res.headers.get('Retry-After');

    let waitSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
    if (res.status === 429 && !waitSeconds) {
      waitSeconds = 60;
    }

    throw new ApiError(
      data.message || `Error ${res.status}`,
      res.status,
      remaining ? parseInt(remaining, 10) : undefined,
      waitSeconds
    );
  }
  return data as T;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Authenticates the user. On success the server sets an HttpOnly cookie.
 * The token is NOT returned in the response body.
 */
export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    // credentials:'include' is injected globally by the fetch patch in main.tsx
  });
  return handleResponse<LoginResponse>(res);
}

/**
 * Ends the session by asking the server to clear the HttpOnly cookie.
 */
export async function logoutUser(): Promise<void> {
  await fetch(`${BASE}/logout`, { method: 'POST' });
  // Ignore errors — the cookie will expire naturally if the request fails
}

export async function registerUser(payload: RegisterPayload): Promise<{ message: string; user: AuthUser }> {
  const res = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ message: string; user: AuthUser }>(res);
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse<{ message: string }>(res);
}

export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword, confirmPassword }),
  });
  return handleResponse<{ message: string }>(res);
}

/**
 * Validates the current session by calling GET /api/auth/me.
 * The session cookie is sent automatically — no Authorization header needed.
 */
export async function getMe(): Promise<{ user: AuthUser }> {
  const res = await fetch(`${BASE}/me`);
  return handleResponse<{ user: AuthUser }>(res);
}
