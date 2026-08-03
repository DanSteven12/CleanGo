import { Request, Response, NextFunction } from 'express';

/**
 * Reusable service para validar permisos de acceso basados en roles.
 * Debe colocarse SIEMPRE después del authMiddleware, ya que confía
 * en que req.user ha sido poblado con el rol fresco desde la BD.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.rol) {
      res.status(401).json({ message: 'No autenticado.' });
      return;
    }

    if (!allowedRoles.includes(req.user.rol)) {
      res.status(403).json({ message: 'Permisos insuficientes para realizar esta acción.' });
      return;
    }

    next();
  };
};
