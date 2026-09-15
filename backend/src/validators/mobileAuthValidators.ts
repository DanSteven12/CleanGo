// backend/src/validators/mobileAuthValidators.ts
/**
 * Validadores de entrada para la autenticación móvil de Ciudadanos.
 *
 * Reutiliza las mismas reglas que authValidators (Web):
 *  - email: formato válido + normalización
 *  - password: no vacío (sin revelar política de complejidad en el error)
 */
import { body, ValidationChain } from 'express-validator';

import { validatePasswordStrength } from '../utils/passwordPolicy';

export const mobileLoginValidators: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es obligatorio.')
    .isEmail().withMessage('El correo electrónico no tiene un formato válido.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.'),
];

export const mobileRegisterValidators: ValidationChain[] = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio.')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.')
    .escape(),
  body('correo')
    .trim()
    .notEmpty().withMessage('El correo electrónico es obligatorio.')
    .isEmail().withMessage('El correo electrónico no tiene un formato válido.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .custom((value, { req }) => {
      const result = validatePasswordStrength(value, req.body.nombre, req.body.correo);
      if (!result.isValid) {
        throw new Error(result.error);
      }
      return true;
    }),
  body('confirmPassword')
    .notEmpty().withMessage('La confirmación de contraseña es obligatoria.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden.');
      }
      return true;
    }),
  body('telefono')
    .trim()
    .notEmpty().withMessage('El teléfono es obligatorio.')
    .matches(/^[0-9]{10}$/).withMessage('El teléfono debe tener exactamente 10 dígitos numéricos.'),
];

export const mobileForgotPasswordValidators: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es obligatorio.')
    .isEmail().withMessage('El correo electrónico no tiene un formato válido.')
    .normalizeEmail(),
];

export const mobileResetPasswordValidators: ValidationChain[] = [
  body('token')
    .trim()
    .notEmpty().withMessage('El token de recuperación es obligatorio.')
    .isLength({ min: 32 }).withMessage('Token inválido.'),
  body('newPassword')
    .notEmpty().withMessage('La nueva contraseña es obligatoria.')
    .custom((value) => {
      const result = validatePasswordStrength(value);
      if (!result.isValid) {
        throw new Error(result.error);
      }
      return true;
    }),
  body('confirmPassword')
    .notEmpty().withMessage('La confirmación de contraseña es obligatoria.')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Las contraseñas no coinciden.');
      }
      return true;
    }),
];

export const mobileFcmTokenValidators: ValidationChain[] = [
  body('token')
    .trim()
    .notEmpty().withMessage('El token FCM es obligatorio.'),
  body('plataforma')
    .optional()
    .trim()
    .isIn(['android', 'ios', 'web']).withMessage('Plataforma inválida.'),
];

