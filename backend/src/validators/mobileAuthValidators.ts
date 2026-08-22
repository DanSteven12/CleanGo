// backend/src/validators/mobileAuthValidators.ts
/**
 * Validadores de entrada para la autenticación móvil de Ciudadanos.
 *
 * Reutiliza las mismas reglas que authValidators (Web):
 *  - email: formato válido + normalización
 *  - password: no vacío (sin revelar política de complejidad en el error)
 */
import { body, ValidationChain } from 'express-validator';

export const mobileLoginValidators: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es obligatorio.')
    .isEmail().withMessage('El correo electrónico no tiene un formato válido.')
    .normalizeEmail(),
  body('password')
    .trim()
    .notEmpty().withMessage('La contraseña es obligatoria.'),
];
