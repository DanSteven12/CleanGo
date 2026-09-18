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
    .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres.')
    .custom((value) => {
      if (/[0-9]/.test(value)) {
        throw new Error('El nombre no debe contener números.');
      }
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(value)) {
        throw new Error('El nombre solo debe contener letras.');
      }
      const letters = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '');
      if (letters.length < 3) {
        throw new Error('El nombre debe tener al menos 3 letras.');
      }
      return true;
    })
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
    .matches(/^[2-9][0-9]{9}$/).withMessage('El teléfono debe tener 10 dígitos y no puede iniciar con 0 ni 1.')
    .custom((val) => {
      if (/^(\d)\1{9}$/.test(val) || /(\d)\1{6,}/.test(val)) {
        throw new Error('El número telefónico no es válido.');
      }
      const dummyNumbers = [
        '1234567890',
        '0123456789',
        '9876543210',
        '0987654321',
        '1122334455',
        '1212121212',
        '2345678901',
        '9898989898',
      ];
      if (dummyNumbers.includes(val)) {
        throw new Error('El número telefónico no es válido.');
      }
      return true;
    }),
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

