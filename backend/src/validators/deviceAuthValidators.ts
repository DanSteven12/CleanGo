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
