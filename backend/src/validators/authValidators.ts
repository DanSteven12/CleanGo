// backend/src/validators/authValidators.ts
import { body, ValidationChain } from 'express-validator';

export const loginValidators: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es obligatorio.')
    .isEmail().withMessage('El correo electrónico no tiene un formato válido.')
    .normalizeEmail(),
  body('password')
    .trim()
    .notEmpty().withMessage('La contraseña es obligatoria.'),
];

export const registerValidators: ValidationChain[] = [
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
    .trim()
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una letra mayúscula.')
    .matches(/[0-9]/).withMessage('La contraseña debe contener al menos un número.'),
  body('confirmPassword')
    .trim()
    .notEmpty().withMessage('La confirmación de contraseña es obligatoria.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden.');
      }
      return true;
    }),
];

export const forgotPasswordValidators: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es obligatorio.')
    .isEmail().withMessage('El correo electrónico no tiene un formato válido.')
    .normalizeEmail(),
];

export const resetPasswordValidators: ValidationChain[] = [
  body('token')
    .trim()
    .notEmpty().withMessage('El token de recuperación es obligatorio.')
    .isLength({ min: 32 }).withMessage('Token inválido.'),
  body('newPassword')
    .trim()
    .notEmpty().withMessage('La nueva contraseña es obligatoria.')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una letra mayúscula.')
    .matches(/[0-9]/).withMessage('La contraseña debe contener al menos un número.'),
  body('confirmPassword')
    .trim()
    .notEmpty().withMessage('La confirmación de contraseña es obligatoria.')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Las contraseñas no coinciden.');
      }
      return true;
    }),
];
