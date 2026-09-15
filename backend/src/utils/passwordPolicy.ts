// backend/src/utils/passwordPolicy.ts
/**
 * Política de seguridad de contraseñas de CleanGo.
 *
 * Reglas:
 * - Mínimo 10 caracteres, máximo 72 caracteres.
 * - Al menos 1 letra mayúscula.
 * - Al menos 1 letra minúscula.
 * - Al menos 1 número.
 * - Al menos 1 carácter especial (no alfanumérico).
 * - Sin espacios en blanco.
 * - Rechazar contraseñas comunes / predecibles.
 * - No permitir que la contraseña sea igual al correo ni al nombre.
 */

const COMMON_PASSWORDS = new Set([
  '1234567890',
  '12345678901',
  'password123',
  'password1234',
  'password123!',
  'Password123!',
  'Password1234!',
  'Password2024!',
  'Password2025!',
  'Password2026!',
  'CleanGo2024!',
  'CleanGo2025!',
  'CleanGo2026!',
  'Admin12345!',
  'Admin123456!',
  'qwertyuiop',
  'Qwerty12345!',
  'Contraseña123!',
  'Contrasena123!',
]);

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePasswordStrength(
  password: string,
  nombre?: string,
  correo?: string
): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'La contraseña es obligatoria.' };
  }

  if (password.length < 10) {
    return { isValid: false, error: 'La contraseña debe tener al menos 10 caracteres.' };
  }

  if (password.length > 72) {
    return { isValid: false, error: 'La contraseña no puede superar los 72 caracteres.' };
  }

  if (/\s/.test(password)) {
    return { isValid: false, error: 'La contraseña no puede contener espacios.' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'La contraseña debe contener al menos una letra mayúscula.' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'La contraseña debe contener al menos una letra minúscula.' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'La contraseña debe contener al menos un número.' };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, error: 'La contraseña debe contener al menos un carácter especial.' };
  }

  const pwdLower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(password) || COMMON_PASSWORDS.has(pwdLower)) {
    return { isValid: false, error: 'La contraseña ingresada es demasiado común y predecible. Elige una más segura.' };
  }

  if (correo && typeof correo === 'string' && correo.trim()) {
    const cleanEmail = correo.trim().toLowerCase();
    const emailPrefix = cleanEmail.split('@')[0];
    if (pwdLower === cleanEmail || (emailPrefix.length >= 3 && pwdLower === emailPrefix)) {
      return { isValid: false, error: 'La contraseña no puede ser igual a tu correo electrónico.' };
    }
  }

  if (nombre && typeof nombre === 'string' && nombre.trim()) {
    const cleanNombre = nombre.trim().toLowerCase();
    if (cleanNombre.length >= 3 && pwdLower === cleanNombre) {
      return { isValid: false, error: 'La contraseña no puede ser igual a tu nombre.' };
    }
  }

  return { isValid: true };
}
