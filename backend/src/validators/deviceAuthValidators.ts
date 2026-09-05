// backend/src/validators/deviceAuthValidators.ts
/**
 * Validadores de entrada para la autenticación de dispositivos móviles.
 *
 * El campo 'usuario_dispositivo' sigue el patrón definido en camiones:
 * solo letras minúsculas, números y guiones bajos, 4-15 caracteres.
 *
 * No se valida el formato del password aquí (solo notEmpty),
 * para que un mensaje de validación no revele si el usuario existe.
 */
import { body, ValidationChain } from 'express-validator';

export const deviceLoginValidators: ValidationChain[] = [
  body('usuario_dispositivo')
    .trim()
    .notEmpty().withMessage('El usuario del dispositivo es obligatorio.')
    .isLength({ min: 4, max: 15 }).withMessage('Usuario inválido.')
    .matches(/^[a-z0-9_]+$/).withMessage('Usuario inválido.'),

  body('password')
    .trim()
    .notEmpty().withMessage('La contraseña es obligatoria.'),
];

export const deviceFcmTokenValidators: ValidationChain[] = [
  body('token')
    .trim()
    .notEmpty().withMessage('El token FCM es obligatorio.')
    .isString().withMessage('El token debe ser una cadena de texto.')
    .isLength({ min: 10, max: 4096 }).withMessage('El token FCM no tiene una longitud válida.'),

  body('plataforma')
    .optional()
    .trim()
    .isIn(['android', 'ios', 'web']).withMessage('Plataforma no soportada.'),
];
